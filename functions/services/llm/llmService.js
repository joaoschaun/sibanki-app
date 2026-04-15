/**
 * Sibanki - LLM Service (Multi-Provider)
 * Gemini Flash → OpenAI GPT-4o-mini → Claude Haiku → Fallback local
 */
const crypto = require("crypto");
const fetch = require("node-fetch");
const { logError } = require("../../logger");
const { GEMINI_KEY } = require("../../config");

const OPENAI_KEY = process.env.OPENAI_KEY || "";
const CLAUDE_KEY = process.env.CLAUDE_KEY || "";
const GROQ_KEY   = process.env.GROQ_KEY   || "";
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || ""; // Excelente custo-benefício e raciocínio financeiro

const errorCount = { gemini: 0, openai: 0, claude: 0, groq: 0, deepseek: 0 };
const MAX_ERR = 3;
setInterval(() => { errorCount.gemini = 0; errorCount.openai = 0; errorCount.claude = 0; errorCount.groq = 0; errorCount.deepseek = 0; }, 3600000);

const _cache = new Map();
const CACHE_TTL = 3600000;

/** Chave estável do prompt inteiro (o prefixo de 120 chars colidia entre chamadas diferentes, ex.: classificador de intenção). */
function _promptCacheKey(prompt) {
  return crypto.createHash("sha256").update(String(prompt), "utf8").digest("hex");
}

function _cacheGet(prompt) {
  const k = _promptCacheKey(prompt);
  const e = _cache.get(k);
  if (!e || Date.now() - e.ts > CACHE_TTL) { _cache.delete(k); return null; }
  return e.text;
}
function _cacheSet(prompt, text) {
  const k = _promptCacheKey(prompt);
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


// ─── Provedor GROQ (Llama 3.3 70B — GRATUITO: 14.400 req/dia) ───────────────
// Melhor free tier de LLM do mercado atualmente (março 2026)
async function _callGroq(prompt, maxTokens) {
  if (!GROQ_KEY || errorCount.groq >= MAX_ERR) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens || 512,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (res.status === 429) { errorCount.groq++; return null; }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content;
    if (!text) { errorCount.groq++; return null; }
    errorCount.groq = 0;
    return text.trim();
  } catch (e) {
    errorCount.groq++;
    logError("llm:groq", e);
    return null;
  }
}

// ─── Provedor DeepSeek (OpenAI-compatible; ótimo para raciocínio/matemática) ───
async function _callDeepSeek(prompt, maxTokens) {
  if (!DEEPSEEK_KEY || errorCount.deepseek >= MAX_ERR) return null;
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens || 512,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (res.status === 429 || res.status === 503) { errorCount.deepseek++; return null; }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content;
    if (!text) { errorCount.deepseek++; return null; }
    errorCount.deepseek = 0;
    return text.trim();
  } catch (e) {
    errorCount.deepseek++;
    logError("llm:deepseek", e);
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

  // Ordem de provedores por tipo de task (DeepSeek = fallback extra, bom para raciocínio financeiro)
  const fastOrder  = [_callGemini, _callGroq, _callDeepSeek, _callOpenAI, _callClaude];
  const smartOrder = [_callGroq, _callOpenAI, _callDeepSeek, _callGemini, _callClaude];
  const providers  = task === "smart" ? smartOrder : fastOrder;
  const names      = task === "smart"
    ? ["groq", "openai", "deepseek", "gemini", "claude"]
    : ["gemini", "groq", "deepseek", "openai", "claude"];

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
 * Quando `question` já contém o system prompt embutido (via prefixo),
 * ele é passado diretamente para o LLM sem duplicação.
 */
async function generateAnalysis(context, question) {
  // Se o question já traz o system prompt embutido (começa com "Você é o Sibanki")
  // usamos ele direto como prompt completo. Caso contrário, montamos o padrão genérico.
  const q = (question || '').trim();
  const hasSystemPrefix = /^Você é o Sibanki IA/i.test(q);
  /** Prompt já montado por buildConsultantPrompt (Arquiteto Soberano + dados + pergunta) */
  const isSovereignFullPrompt =
    /^Você é o Arquiteto Soberano|DADOS FINANCEIROS DO USUÁRIO:/i.test(q);
  const prompt = hasSystemPrefix || isSovereignFullPrompt
    ? question
    : `Você é o Siba, consultor financeiro IA do Sibanki. Dados do usuário:\n${context}\n\nPergunta: ${question}\n\nResponda de forma clara, com emojis e estrutura. Seja específico com valores em R$. Máx 300 palavras.`;

  return callLLM(prompt, {
    task: "smart",
    maxTokens: 600,
    cache: false,
    fallback: "Não foi possível gerar a análise no momento. Tente novamente em alguns instantes."
  });
}

/** System prompt do consultor proativo (insight acionável, anti-poluição). */
const PROACTIVE_CONSULTANT_SYSTEM = `Você é o consultor financeiro do Sibanki. Sua tarefa é gerar UM insight curto e acionável a partir do snapshot do usuário.

REGRAS:
- Objetividade: vá direto ao ponto, sem "Olá" ou rodeios.
- Use a regra 50-30-20 (essenciais, desejos, prioridades) como base.
- Nunca sugerir investimento de risco sem mencionar reserva de emergência.
- Se os dados não mostrarem nada relevante ou fora do padrão, responda APENAS: {"status":"OK"}.

FORMATO DE SAÍDA (JSON obrigatório, sem markdown):
{"insight_curto":"Frase de impacto (máx 60 caracteres)","detalhe":"Explicação lógica (máx 140 caracteres)","acao_sugerida":"O que fazer agora","deep_link":"/metas ou /lanc ou /cartões ou /orçamento ou /invest","relevancia_score":1 a 10}
Se não houver relevância, responda só: {"status":"OK"}.`;

/**
 * Gera insight proativo a partir de um snapshot em markdown (gatilhos já detectados no front).
 * Retorna objeto com insight_curto, detalhe, acao_sugerida, deep_link, relevancia_score ou { status: "OK" }.
 */
async function generateProactiveInsight(snapshotMarkdown) {
  const prompt = `${PROACTIVE_CONSULTANT_SYSTEM}\n\n---\n\nSNAPSHOT DO USUÁRIO:\n${(snapshotMarkdown || "").substring(0, 2500)}\n\n---\n\nGere o JSON do insight (ou {"status":"OK"} se não houver ação relevante). Resposta APENAS JSON, sem texto antes ou depois.`;

  const result = await callLLM(prompt, {
    task: "fast",
    maxTokens: 400,
    cache: false,
    fallback: null
  });

  if (!result || !result.text) return { status: "OK" };

  try {
    const raw = result.text.replace(/```\w*\n?/g, "").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { status: "OK" };
    const obj = JSON.parse(match[0]);
    if (obj.status === "OK" || obj.status === "ignore") return { status: "OK" };
    if (obj.insight_curto && typeof obj.relevancia_score === "number") {
      return {
        insight_curto: String(obj.insight_curto).substring(0, 80),
        detalhe: String(obj.detalhe || "").substring(0, 200),
        acao_sugerida: String(obj.acao_sugerida || "").substring(0, 120),
        deep_link: String(obj.deep_link || "/metas").replace(/[^a-zA-Z0-9/_\u00E7\u00E3\u00E1\u00E0\u00E2\u00E9\u00EA\u00ED\u00F3\u00F4\u00F5\u00FA\-]/g, ""),
        relevancia_score: Math.min(10, Math.max(1, Number(obj.relevancia_score)))
      };
    }
  } catch (e) {
    logError("llm:proactiveInsight:parse", e);
  }
  return { status: "OK" };
}

/**
 * Status dos provedores (útil para dashboard de admin).
 */
function getProviderStatus() {
  return {
    gemini: { available: !!GEMINI_KEY, errors: errorCount.gemini, healthy: errorCount.gemini < MAX_ERR },
    openai: { available: !!OPENAI_KEY, errors: errorCount.openai, healthy: errorCount.openai < MAX_ERR },
    claude: { available: !!CLAUDE_KEY, errors: errorCount.claude, healthy: errorCount.claude < MAX_ERR },
    groq:   { available: !!GROQ_KEY,   errors: errorCount.groq,   healthy: errorCount.groq < MAX_ERR },
    deepseek: { available: !!DEEPSEEK_KEY, errors: errorCount.deepseek, healthy: errorCount.deepseek < MAX_ERR },
    cacheSize: _cache.size,
  };
}

module.exports = {
  callLLM,
  extractEntry,
  generateInsight,
  generateAnalysis,
  generateProactiveInsight,
  getProviderStatus,
};

/**
 * Streaming Nativo do Arquiteto Soberano (SSE para Efeito Máquina de Escrever).
 * Retorna uma Promise que resolve quando o stream acaba, e dispara onChunk com os pedaços.
 */
async function generateAnalysisStream(_unusedLegacyContext, fullPrompt, onChunk) {
  const { GEMINI_KEY } = require("../../config");
  if (!GEMINI_KEY) throw new Error("GEMINI_KEY ausente para habilitar o streaming.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;

  /** Dados + persona já vêm em `fullPrompt` (buildConsultantPrompt). Não duplicar contexto aqui. */
  const systemInstruction =
    "Você é o consultor financeiro do Sibanki. Siga exatamente instruções, dados e formato do texto do usuário abaixo. Responda em português (Brasil).";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: 1536, temperature: 0.35 }
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) {
    throw new Error(`Erro na conexão de Streaming com Gemini: ${res.status}`);
  }

  return new Promise((resolve, reject) => {
    let rawBuffer = "";
    res.body.on('data', (chunk) => {
      rawBuffer += chunk.toString();
      const lines = rawBuffer.split('\n');
      rawBuffer = lines.pop(); // Guarda a última que pode estar incompleta
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textPart) {
              onChunk(textPart);
            }
          } catch (e) {
            // Pode haver chunks quebrados, ignora
          }
        }
      }
    });

    res.body.on('end', () => {
      resolve();
    });

    res.body.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports.generateAnalysisStream = generateAnalysisStream;
