/**
 * csvCategorizerService — Categorização em lote de lançamentos via IA
 *
 * Ação 17 (29/03/2026): implementa categorização inteligente de CSV.
 *
 * Responsabilidades:
 *   1. Receber até 50 descrições de lançamentos financeiros
 *   2. Enviar uma única chamada ao Gemini (batch, custo otimizado)
 *   3. Retornar a categoria sugerida para cada item
 *
 * Uso:
 *   Frontend chama `aiCategorizeCsv({ items: [{index, desc, type}] })`
 *   e recebe `{ results: [{index, category}] }`.
 *
 * Categorias disponíveis (padrão Sibanki):
 *   Alimentação, Transporte, Moradia, Saúde, Educação, Lazer,
 *   Vestuário, Tecnologia, Finanças, Trabalho, Utilidades,
 *   Viagens, Pets, Impostos, Doações, Investimentos, Outros
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { callLLM } = require('./llmService');

// Categorias canônicas do Sibanki
const SIBANKI_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
  'Lazer', 'Vestuário', 'Tecnologia', 'Finanças', 'Trabalho',
  'Utilidades', 'Viagens', 'Pets', 'Impostos', 'Doações',
  'Investimentos', 'Outros',
];

const MAX_ITEMS = 50;

/**
 * Monta o prompt de categorização em lote.
 * Retorna JSON compacto para minimizar tokens.
 *
 * @param {Array<{index:number, desc:string, type:string}>} items
 * @returns {string}
 */
function buildPrompt(items) {
  const cats = SIBANKI_CATEGORIES.join(', ');
  const list = items
    .map((it) => `${it.index}|${it.type}|${it.desc.substring(0, 80)}`)
    .join('\n');

  return (
    `Você é um classificador financeiro. Categorize cada lançamento abaixo ` +
    `usando APENAS uma das categorias: ${cats}.\n` +
    `Formato de entrada: índice|tipo|descrição\n` +
    `Retorne APENAS um JSON array: [{"index":0,"category":"..."},...]\n` +
    `Sem explicações, sem markdown.\n\n` +
    `Lançamentos:\n${list}`
  );
}

/**
 * Parseia a resposta do LLM, tolerando markdown e texto extra.
 *
 * @param {string} text
 * @returns {Array<{index:number, category:string}>|null}
 */
function parseResponse(text) {
  try {
    const cleaned = text.replace(/```\w*\n?/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (r) => typeof r.index === 'number' && typeof r.category === 'string'
    );
  } catch {
    return null;
  }
}

/**
 * Normaliza categoria: garante que está na lista canônica.
 * Fallback para 'Outros' se não reconhecida.
 *
 * @param {string} cat
 * @returns {string}
 */
function normalizeCategory(cat) {
  if (!cat) return 'Outros';
  const normalized = cat.trim();
  const found = SIBANKI_CATEGORIES.find(
    (c) => c.toLowerCase() === normalized.toLowerCase()
  );
  return found ?? 'Outros';
}

/**
 * Cloud Function callable: aiCategorizeCsv
 *
 * Payload: { items: [{index: number, desc: string, type: 'despesa'|'receita'}] }
 * Retorno: { results: [{index: number, category: string}], provider: string }
 *
 * Limites:
 *   - Máximo 50 itens por chamada
 *   - Requer autenticação Firebase
 */
exports.aiCategorizeCsv = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Autenticação necessária.');
    }

    const items = data?.items;
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpsError('invalid-argument', 'items deve ser um array não vazio.');
    }
    if (items.length > MAX_ITEMS) {
      throw new HttpsError(
        'invalid-argument',
        `Máximo de ${MAX_ITEMS} itens por chamada. Recebido: ${items.length}.`
      );
    }

    // Valida estrutura mínima de cada item
    for (const item of items) {
      if (typeof item.index !== 'number' || typeof item.desc !== 'string') {
        throw new HttpsError('invalid-argument', 'Cada item deve ter {index: number, desc: string}.');
      }
    }

    const prompt = buildPrompt(items);

    const llmResult = await callLLM(prompt, {
      task: 'fast',         // Gemini Flash — custo baixo para batch
      maxTokens: 512,
      cache: false,         // Resultados variam por dataset
    });

    if (!llmResult?.text) {
      // Fallback gracioso: retorna 'Outros' para todos
      return {
        results: items.map((it) => ({ index: it.index, category: 'Outros' })),
        provider: 'fallback',
      };
    }

    const parsed = parseResponse(llmResult.text);
    if (!parsed) {
      return {
        results: items.map((it) => ({ index: it.index, category: 'Outros' })),
        provider: llmResult.provider ?? 'unknown',
      };
    }

    // Normaliza categorias e preenche índices ausentes com 'Outros'
    const resultMap = new Map(parsed.map((r) => [r.index, normalizeCategory(r.category)]));
    const results = items.map((it) => ({
      index: it.index,
      category: resultMap.get(it.index) ?? 'Outros',
    }));

    return { results, provider: llmResult.provider ?? 'unknown' };
  }
);
