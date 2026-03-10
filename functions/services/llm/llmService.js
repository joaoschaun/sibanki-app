/**
 * Sibanki - LLM Service (Multi-Provider)
 * Gemini Flash → OpenAI GPT-4o-mini → Claude Haiku → Fallback local
 */
const fetch = require("node-fetch");
const { logError } = require("../../logger");
const { GEMINI_KEY } = require("../../config");

const OPENAI_KEY = process.env.OPENAI_KEY || "";
const CLAUDE_KEY = process.env.CLAUDE_KEY || "";

const errorCount = { gemini: 0, openai: 0, claude: 0 };
const MAX_ERR = 3;
setInterval(() => { errorCount.gemini = 0; errorCount.openai = 0; errorCount.claude = 0; }, 3600000);

const _cache = new Map();
const CACHE_TTL = 3600000;

function _cacheGet(prompt) {
  const k = prompt.substring(0, 120).trim();
  const e = _cache.get(k);
  if (!e || Date.now() - e.ts > CACHE_TTL) { _cache.delete(k); return null; }
  return e.text;
}
function _cacheSet(prompt, text) {
  const k = prompt.substring(0, 120).trim();
  _cache.set(k, { text, ts: Date.now() });
  if (_cache.size > 500) {
    const old = [..._cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (old) _cache.delete(old[0]);
  }
}

// ─── Provedor 1: Gemini Flash ────────────────────────────────────────────────
async function _callGemini(prompt, maxTokens) {
  if (!GEMINI_KEY || errorCount.gemini >= MAX_ERR) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens || 512, temperature: 0.3 }
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (res.status === 429 || res.status === 503) {
      errorCount.gemini++;
      return null;
    }
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) { errorCount.gemini++; return null; }
    errorCount.gemini = 0;
    return text.trim();
  } catch (e) {
    errorCount.gemini++;
    logError("llm:gemini", e);
    return null;
  }
}

// ─── Provedor 2: OpenAI GPT-4o-mini ──────────────────────────────────────────
async function _callOpenAI(prompt, maxTokens) {
  if (!OPENAI_KEY || errorCount.openai >= MAX_ERR) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens || 512,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (res.status === 429 || res.status === 503) { errorCount.openai++; return null; }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content;
    if (!text) { errorCount.openai++; return null; }
    errorCount.openai = 0;
    return text.trim();
  } catch (e) {
    errorCount.openai++;
    logError("llm:openai", e);
    return null;
  }
}

// ─── Provedor 3: Claude Haiku (Anthropic) ────────────────────────────────────
async function _callClaude(prompt, maxTokens) {
  if (!CLAUDE_KEY || errorCount.claude >= MAX_ERR) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens || 512,
        messages: [{ role: "user", content: prompt }]
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (res.status === 429 || res.status === 529) { errorCount.claude++; return null; }
    const json = await res.json();
    const text = json.content?.[0]?.text;
    if (!text) { errorCount.claude++; return null; }
    errorCount.claude = 0;
    return text.trim();
  } catch (e) {
    errorCount.claude++;
    logError("llm:claude", e);
    return null;
  }
}

// ─── Roteador principal ───────────────────────────────────────────────────────

/**
 * Chama o melhor provedor disponível com fallback automático.
 *
 * @param {string} prompt         - Prompt completo para a LLM
 * @param {object} options
 * @param {string} options.task   - "fast" (padrão) | "smart"
 * @param {number} options.maxTokens - Limite de tokens na resposta
 * @param {boolean} options.cache - Usar cache? (padrão: true para "fast")
 * @param {string} options.fallback - Texto de fallback se todos falharem
 * @returns {Promise<{text: string, provider: string, cached: boolean}>}
 */
async function callLLM(prompt, options = {}) {
  const { task = "fast", maxTokens = 512, fallback = null } = options;
  const useCache = options.cache !== false && task === "fast";

  // Verificar cache
  if (useCache) {
    const cached = _cacheGet(prompt);
    if (cached) return { text: cached, provider: "cache", cached: true };
  }

  // Ordem de provedores por tipo de task
  // "fast" → Gemini primeiro (mais barato), depois OpenAI mini, depois Claude Haiku
  // "smart" → OpenAI primeiro (melhor qualidade), depois Gemini, depois Claude
  const fastOrder  = [_callGemini, _callOpenAI, _callClaude];
  const smartOrder = [_callOpenAI, _callGemini, _callClaude];
  const providers  = task === "smart" ? smartOrder : fastOrder;
  const names      = task === "smart"
    ? ["openai", "gemini", "claude"]
    : ["gemini", "openai", "claude"];

  for (let i = 0; i < providers.length; i++) {
    const text = await providers[i](prompt, maxTokens);
    if (text) {
      if (useCache) _cacheSet(prompt, text);
      return { text, provider: names[i], cached: false };
    }
  }

  // Todos falharam
  logError("llm:allFailed", new Error("All LLM providers failed for prompt: " + prompt.substring(0, 80)));
  if (fallback) return { text: fallback, provider: "fallback", cached: false };
  return { text: null, provider: "none", cached: false };
}

// ─── Helpers de alto nível para o Sibanki ────────────────────────────────────

/**
 * Extrai lançamento financeiro de texto livre (WhatsApp, voz, chat).
 * Usa task "fast" — otimizado para velocidade e custo.
 */
async function extractEntry(text, categories) {
  const cats = (categories || []).join(", ");
  const prompt = `Extraia do texto de lançamento financeiro APENAS um JSON válido, sem markdown.
Categorias: ${cats}.
Formato: {"type":"despesa","value":120.50,"desc":"Supermercado","category":"Alimentação","date":"YYYY-MM-DD"}
Texto: "${text.substring(0, 300).replace(/"/g, '\\"')}"`;

  const result = await callLLM(prompt, { task: "fast", maxTokens: 256, cache: false });
  if (!result.text) return null;

  try {
    const cleaned = result.text.replace(/```\w*\n?/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return { ...JSON.parse(match[0]), _provider: result.provider };
  } catch {
    return null;
  }
}

/**
 * Gera insight financeiro personalizado.
 * Usa task "fast" para insights rápidos do dashboard.
 */
async function generateInsight(context, type = "geral") {
  const prompts = {
    geral:    `Dados: ${context}\nGere UMA dica financeira personalizada. Máx 80 palavras, tom amigável, emojis. Só português.`,
    alerta:   `Dados: ${context}\nGere 3 alertas financeiros (🔴 crítico, 🟡 atenção, 🟢 positivo). Máx 100 palavras. Só português.`,
    relatorio:`Dados: ${context}\nGere resumo financeiro mensal: Resumo, Destaques, Alertas, Recomendações. Máx 250 palavras. Só português.`,
    familia:  `Dados casal: ${context}\nAnalise finanças do casal. Mostre comparativo, metas e 2 sugestões práticas. Máx 200 palavras. Só português.`,
  };

  const prompt = prompts[type] || prompts.geral;
  const fallback = type === "alerta"
    ? "🟡 Continue monitorando seus gastos e receitas regularmente."
    : "💡 Mantenha seus lançamentos em dia para receber insights personalizados.";

  return callLLM(prompt, { task: "fast", maxTokens: 400, cache: true, fallback });
}

/**
 * Análise profunda (relatório, consultor IA, análise B3).
 * Usa task "smart" — prioriza qualidade sobre custo.
 */
async function generateAnalysis(context, question) {
  const prompt = `Você é o Siba, consultor financeiro IA do Sibanki. Dados do usuário:\n${context}\n\nPergunta: ${question}\n\nResponda de forma clara, com emojis e estrutura. Seja específico com valores em R$. Máx 300 palavras.`;

  return callLLM(prompt, {
    task: "smart",
    maxTokens: 600,
    cache: false,
    fallback: "Não foi possível gerar a análise no momento. Tente novamente em alguns instantes."
  });
}

/**
 * Status dos provedores (útil para dashboard de admin).
 */
function getProviderStatus() {
  return {
    gemini: { available: !!GEMINI_KEY, errors: errorCount.gemini, healthy: errorCount.gemini < MAX_ERR },
    openai: { available: !!OPENAI_KEY, errors: errorCount.openai, healthy: errorCount.openai < MAX_ERR },
    claude: { available: !!CLAUDE_KEY, errors: errorCount.claude, healthy: errorCount.claude < MAX_ERR },
    cacheSize: _cache.size,
  };
}

module.exports = {
  callLLM,
  extractEntry,
  generateInsight,
  generateAnalysis,
  getProviderStatus,
};
