const { callLLM } = require("./llmService");
const { logError } = require("../../logger");

const INTENT_SYSTEM_PROMPT = `Você é o classificador de intenção do Sibanki.
Sua única função é ler a mensagem e retornar JSON para o roteador de mercado.

Intents suportadas:
- "quote" -> ações/FIIs/ETFs B3 (ex: PETR4, BOVA11, MXRF11)
- "crypto" -> cripto (ex: BTC, ETH, SOL)
- "inflation" -> IPCA/SELIC/CDI
- "fixed_income" -> pedido de raio-x de renda fixa (sem ticker)
- "none" -> sem intenção de mercado

Formato de saída (JSON puro):
{
  "intent":"quote|crypto|inflation|fixed_income|none",
  "ticker":"PETR4 (quando quote)",
  "coin":"BTC (quando crypto)",
  "currency":"BRL (opcional, quando crypto)",
  "analysisMode":"raio_x|geral"
}

Regras:
1) Se o texto pedir "raio-x", "raio x", "analise completa", "fundamentalista", use analysisMode="raio_x".
2) Se citar ticker da B3, use quote com ticker em maiúsculo.
3) Para renda fixa sem ativo específico, use fixed_income.
4) Retorne apenas JSON válido, sem markdown.

Texto do usuário:
`;

const B3_TICKER_RE = /\b([A-Z]{4}\d{1,2}|[A-Z]{4}11)\b/i;

function extractTickerFromMessage(message) {
  const m = String(message || "").match(B3_TICKER_RE);
  return m?.[1] ? m[1].toUpperCase() : "";
}
const RAIO_X_RE = /\braio[\s-]?x\b|an[aá]lise\s+completa|fundamentalista|trilema|tokenomics|bogle|bazin|graham|lynch|buffett/i;
const FIXED_INCOME_RE = /renda\s+fixa|cdb|lci|lca|tesouro|prefixado|ipca\+|deb[êe]nture|duration|fgc/i;
const CRYPTO_RE = /cripto|bitcoin|ethereum|solana|btc|eth|sol/i;

/**
 * Detecta se a mensagem do chat demanda dados em tempo real da B3 ou Cripto.
 * @param {string} message - A mensagem enviada pelo usuário
 * @returns {Promise<{intent: string, ticker?: string, coin?: string, currency?: string}>}
 */
async function detectMarketIntent(message) {
  if (!message || message.length < 3) return { intent: "none" };

  try {
    const prompt = `${INTENT_SYSTEM_PROMPT}\n"${message}"`;
    const result = await callLLM(prompt, { task: "fast", maxTokens: 100, cache: true });
    
    if (!result || !result.text) return fallbackIntent(message);
    
    const textStr = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(textStr);
    if (!parsed?.intent) return fallbackIntent(message);
    let normalized = normalizeIntent(parsed, message);
    if (normalized.intent === "none") {
      const fb = fallbackIntent(message);
      if (fb.intent !== "none") return fb;
    }
    return normalized;
  } catch (error) {
    logError("llm:marketIntent", error);
    return fallbackIntent(message);
  }
}

function normalizeIntent(parsed, message) {
  const analysisMode = RAIO_X_RE.test(String(message || "")) ? "raio_x" : (parsed.analysisMode || "geral");
  const intent = String(parsed.intent || "none");
  if (intent === "quote") {
    let ticker = String(parsed.ticker || "").toUpperCase().trim();
    if (!ticker) ticker = extractTickerFromMessage(message);
    return {
      intent,
      ticker,
      analysisMode,
    };
  }
  if (intent === "crypto") {
    return {
      intent,
      coin: String(parsed.coin || "BTC").toUpperCase().trim(),
      currency: String(parsed.currency || "BRL").toUpperCase().trim(),
      analysisMode,
    };
  }
  if (intent === "inflation" || intent === "fixed_income") {
    return { intent, analysisMode };
  }
  return { intent: "none", analysisMode };
}

function fallbackIntent(message) {
  const txt = String(message || "");
  const analysisMode = RAIO_X_RE.test(txt) ? "raio_x" : "geral";

  const mTicker = txt.match(B3_TICKER_RE);
  if (mTicker?.[1]) {
    return { intent: "quote", ticker: mTicker[1].toUpperCase(), analysisMode };
  }
  if (CRYPTO_RE.test(txt)) {
    return { intent: "crypto", coin: "BTC", currency: "BRL", analysisMode };
  }
  if (FIXED_INCOME_RE.test(txt)) {
    return { intent: "fixed_income", analysisMode };
  }
  if (/ipca|selic|cdi|infla[cç][aã]o/i.test(txt)) {
    return { intent: "inflation", analysisMode };
  }
  return { intent: "none", analysisMode };
}

module.exports = {
  detectMarketIntent,
  extractTickerFromMessage,
};
