/**
 * marketDataHub.js
 * Orquestrador central de dados de mercado — "LLM router" para dados financeiros.
 *
 * Arquitetura: Roteamento por tipo de dado + cascata de fallback por provider.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │                     MARKET DATA HUB                              │
 * │                                                                  │
 * │  quotes (tempo real)     BRAPI → Twelve Data → Alpha Vantage     │
 * │  fundamentais            Alpha Vantage → Twelve Data             │
 * │  histórico de preços     Twelve Data → Alpha Vantage → BRAPI     │
 * │  cripto                  BRAPI → CoinGecko → Alpha Vantage       │
 * │  indicadores técnicos    Twelve Data                              │
 * │  taxas macro (Selic/CDI) BCB/SGS (já integrado)                  │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Cache unificado: in-memory com TTL por tipo.
 * Rate limiting: registra uso por provider (prevenção de ban).
 * Normalização: todos os providers retornam o mesmo schema.
 */

const brapiService   = require("./brapiService");
const { fetchJson }  = require("../../httpClient");
const { BRAPI_TOKEN, BRAPI_BASE } = require("../../config");
const alphaVantage = require("./alphaVantageService");
const twelveData   = require("./twelveDataService");
const coinGecko    = require("./coinGeckoService");
const { logEvent, logError } = require("../../logger");

// ── Rate limit tracker por provider ──────────────────────────────────────────
const _usage = {
  brapi        : { count: 0, resetAt: 0 },
  alpha_vantage: { count: 0, resetAt: 0 },  // 25/dia
  twelve_data  : { count: 0, resetAt: 0 },  // 800/dia
  coingecko    : { count: 0, resetAt: 0 },  // 50/min
};

const DAILY_LIMITS = {
  alpha_vantage: 24,   // deixa 1 de margem do limite 25
  twelve_data  : 780,  // deixa 20 de margem do limite 800
};

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isRateLimited(provider) {
  const limit = DAILY_LIMITS[provider];
  if (!limit) return false;
  const u = _usage[provider];
  if (Date.now() > u.resetAt) {
    u.count = 0;
    u.resetAt = todayMidnight() + 24 * 60 * 60 * 1000;
  }
  return u.count >= limit;
}

function markUsage(provider) {
  const u = _usage[provider];
  if (!u) return;
  u.count++;
}

// ── Utilitário de cascata ─────────────────────────────────────────────────────
/**
 * Tenta cada provider na ordem; retorna o primeiro que funcionar.
 * @param {Array<{name: string, fn: () => Promise}>} providers
 */
async function cascade(providers) {
  const errors = [];
  for (const { name, fn } of providers) {
    if (isRateLimited(name)) {
      errors.push(`${name}: rate limit reached`);
      continue;
    }
    try {
      const result = await fn();
      markUsage(name);
      return result;
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
      logError(`marketHub.cascade.${name}`, { error: e.message });
    }
  }
  throw new Error(`All providers failed: ${errors.join(" | ")}`);
}

// ── COTAÇÃO (tempo real) ──────────────────────────────────────────────────────
/**
 * Chama BRAPI diretamente (sem passar pelo handler de CF que exige contexto Firebase).
 */
async function brapiQuoteAdapter(ticker) {
  if (!BRAPI_TOKEN) throw new Error("BRAPI: token not configured");
  const url = `${BRAPI_BASE || "https://brapi.dev"}/api/quote/${encodeURIComponent(ticker)}?token=${BRAPI_TOKEN}&fundamental=true`;
  const data = await fetchJson(url, { timeout: 10000 });
  const results = data?.results;
  if (!Array.isArray(results) || results.length === 0) throw new Error("BRAPI: empty quote");
  const q = results[0];
  return {
    ticker,
    price    : q.regularMarketPrice,
    open     : q.regularMarketOpen,
    high     : q.regularMarketDayHigh,
    low      : q.regularMarketDayLow,
    volume   : q.regularMarketVolume,
    change   : q.regularMarketChange,
    changePct: q.regularMarketChangePercent,
    dy       : q.dividendYield,
    source   : "brapi",
  };
}

/**
 * getQuote — cotação em tempo real de ativo B3 ou global.
 * Cascata: BRAPI → Twelve Data → Alpha Vantage
 */
async function getQuote(ticker) {
  return cascade([
    { name: "brapi",         fn: () => brapiQuoteAdapter(ticker) },
    { name: "twelve_data",   fn: () => twelveData.fetchQuote(ticker) },
    { name: "alpha_vantage", fn: () => alphaVantage.fetchQuote(ticker) },
  ]);
}

// ── DADOS FUNDAMENTALISTAS ────────────────────────────────────────────────────
/**
 * getFundamentals — retorna LPA, VPA, DY, ROE, P/L, P/VP para Graham, Bazin e Piotroski.
 * Cascata: Alpha Vantage → Twelve Data
 *
 * Schema de retorno:
 * {
 *   ticker, name, sector,
 *   lpa,         // Lucro por Ação (EPS)
 *   vpa,         // Valor Patrimonial por Ação (Book Value per Share)
 *   dy,          // Dividend Yield % a.a.
 *   roe,         // Return on Equity %
 *   peRatio,     // P/L
 *   pbRatio,     // P/VP
 *   debtToEquity,
 *   currentRatio,
 *   operatingMargin,
 *   source
 * }
 */
async function getFundamentals(ticker) {
  return cascade([
    { name: "alpha_vantage", fn: () => alphaVantage.fetchFundamentals(ticker) },
    { name: "twelve_data",   fn: () => twelveData.fetchFundamentals(ticker) },
  ]);
}

// ── HISTÓRICO DE PREÇOS ───────────────────────────────────────────────────────
/**
 * getDailyHistory — série temporal de preços OHLCV.
 * Cascata: Twelve Data → Alpha Vantage
 *
 * @param {string} ticker
 * @param {number} days  número de dias de histórico (default: 252 = ~1 ano útil)
 * @returns {Array<{ date, open, high, low, close, volume }>}
 */
async function getDailyHistory(ticker, days = 252) {
  return cascade([
    { name: "twelve_data",   fn: () => twelveData.fetchDailyHistory(ticker, "1day", days) },
    { name: "alpha_vantage", fn: () => alphaVantage.fetchDailyHistory(ticker, days > 100 ? "full" : "compact") },
  ]);
}

// ── CRIPTO ────────────────────────────────────────────────────────────────────
/**
 * getCryptoPrice — cotação de criptoativo em BRL.
 * Cascata: BRAPI → CoinGecko → Alpha Vantage
 */
async function getCryptoPrice(symbol) {
  return cascade([
    {
      name: "brapi",
      fn: async () => {
        if (!BRAPI_TOKEN) throw new Error("BRAPI: token not configured");
        const url = `${BRAPI_BASE || "https://brapi.dev"}/api/quote/${encodeURIComponent(symbol)}?token=${BRAPI_TOKEN}`;
        const data = await fetchJson(url, { timeout: 8000 });
        const q = data?.results?.[0];
        if (!q || !q.regularMarketPrice) throw new Error("BRAPI: no crypto data");
        return { symbol, price: q.regularMarketPrice, source: "brapi" };
      },
    },
    { name: "coingecko",    fn: () => coinGecko.fetchCryptoPrice(symbol) },
    { name: "alpha_vantage", fn: () => alphaVantage.fetchCryptoPrice(symbol) },
  ]);
}

/**
 * getMultipleCryptoPrices — cotações de múltiplos cripto em 1 chamada (CoinGecko).
 */
async function getMultipleCryptoPrices(symbols) {
  return coinGecko.fetchMultipleCryptoPrices(symbols);
}

// ── INDICADORES TÉCNICOS (via Twelve Data) ────────────────────────────────────
/**
 * getTechnicalIndicators — RSI e contexto de mercado.
 */
async function getTechnicalIndicators(ticker) {
  if (isRateLimited("twelve_data")) {
    return { ticker, rsi: null, source: "unavailable", reason: "rate_limit" };
  }
  try {
    const rsi = await twelveData.fetchRSI(ticker);
    markUsage("twelve_data");
    return { ticker, rsi: rsi.value, rsiSignal: rsi.signal, source: "twelve_data" };
  } catch (e) {
    logError("marketHub.getTechnicalIndicators", { ticker, error: e.message });
    return { ticker, rsi: null, source: "error", reason: e.message };
  }
}

// ── ANÁLISE COMPLETA DE ATIVO (bundle) ────────────────────────────────────────
/**
 * getAssetAnalysis — bundle com cotação + fundamentais + indicadores técnicos.
 * Pensado para alimentar o Consultor IA ao analisar um ticker no Raio-X.
 *
 * @returns {{
 *   quote, fundamentals, technicals,
 *   grahamInputs: { lpa, vpa, price },      // pronto para calculateGrahamIntrinsicValue
 *   bazinInputs:  { avgDividends3y, price }, // pronto para calculateBazinPriceCeiling
 *   solidezInputs: { roe, margin, debtToEquity, currentRatio, peRatio, pvp, dy }
 * }}
 */
async function getAssetAnalysis(ticker) {
  // Executa em paralelo para minimizar latência
  const [quote, fundamentals, technicals] = await Promise.allSettled([
    getQuote(ticker),
    getFundamentals(ticker),
    getTechnicalIndicators(ticker),
  ]);

  const q = quote.status === "fulfilled" ? quote.value : null;
  const f = fundamentals.status === "fulfilled" ? fundamentals.value : null;
  const t = technicals.status === "fulfilled" ? technicals.value : null;

  // Monta inputs prontos para as funções do sovereigntyEngine
  const price = q?.price || 0;

  const grahamInputs = f ? {
    lpa  : f.lpa,
    vpa  : f.vpa,
    price,
  } : null;

  const bazinInputs = f?.dy ? {
    // Bazin usa média de dividendos dos últimos 3 anos — aproximamos com DY * preço atual
    avgDividends3y: price * (f.dy / 100),
    price,
  } : null;

  const solidezInputs = f ? {
    roe         : f.roe,
    margin      : f.operatingMargin,
    debtToEquity: f.debtToEquity,
    currentRatio: f.currentRatio,
    pvp         : f.pbRatio,
    pe          : f.peRatio,
    dy          : f.dy,
  } : null;

  return {
    ticker,
    quote        : q,
    fundamentals : f,
    technicals   : t,
    grahamInputs,
    bazinInputs,
    solidezInputs,
  };
}

// ── Status dos providers ──────────────────────────────────────────────────────
function getProviderStatus() {
  return {
    brapi        : { available: true, usageToday: _usage.brapi?.count ?? 0 },
    alpha_vantage: {
      available: !isRateLimited("alpha_vantage") && !!process.env.ALPHA_VANTAGE_KEY,
      usageToday: _usage.alpha_vantage.count,
      limitDaily: DAILY_LIMITS.alpha_vantage,
    },
    twelve_data: {
      available: !isRateLimited("twelve_data") && !!process.env.TWELVE_DATA_KEY,
      usageToday: _usage.twelve_data.count,
      limitDaily: DAILY_LIMITS.twelve_data,
    },
    coingecko: {
      available: true,
      usageToday: _usage.coingecko.count,
    },
  };
}

module.exports = {
  getQuote,
  getFundamentals,
  getDailyHistory,
  getCryptoPrice,
  getMultipleCryptoPrices,
  getTechnicalIndicators,
  getAssetAnalysis,
  getProviderStatus,
  // Re-exports especializados
  fetchMarketDominance: coinGecko.fetchMarketDominance,
  fetchCryptoHistory  : coinGecko.fetchCryptoHistory,
};
