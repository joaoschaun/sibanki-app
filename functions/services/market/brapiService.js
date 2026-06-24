const functions = require("firebase-functions/v1");
const { BRAPI_TOKEN, BRAPI_BASE } = require("../../config");
const { fetchJson } = require("../../httpClient");
const { logEvent, logError } = require("../../logger");

// ── Cache em memória (compartilhado entre invocações na mesma instância) ──────
const _cache = new Map();
const TTL = {
  quote: 2 * 60_000,       // cotações: 2 min
  multi: 2 * 60_000,       // cotações multi: 2 min
  search: 30 * 60_000,     // busca de ativos: 30 min
  crypto: 60_000,           // cripto: 1 min
  inflation: 6 * 3600_000, // inflação: 6 horas
};
const MAX_CACHE_SIZE = 500;

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data, ttl) {
  if (_cache.size >= MAX_CACHE_SIZE) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  _cache.set(key, { data, ts: Date.now(), ttl });
}

// COTAÇÃO DE 1 ATIVO (usa token do servidor: .env ou Firebase config brapi.token)
async function quote(data) {
  const ticker = (data.ticker || "").toUpperCase().trim();
  if (!ticker || !/^[A-Z0-9]{4,12}$/.test(ticker)) {
    throw new functions.https.HttpsError("invalid-argument", "Ticker inválido");
  }
  if (!BRAPI_TOKEN) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Token brapi não configurado. Em produção: firebase functions:config:set brapi.token=\"SEU_TOKEN\" e faça redeploy."
    );
  }

  const rawModules =
    data.modules ||
    "summaryProfile,defaultKeyStatistics,financialData,balanceSheetHistory,incomeStatementHistory";
  const range = data.range || "1mo";
  const interval = data.interval || "1d";
  /** Incluir histórico de proventos na resposta (melhora DY / Bazin). `dividends: false` desliga. */
  const includeDividends = data.dividends !== false;
  const cacheKey = `quote:${ticker}:${range}:${interval}:div:${includeDividends ? 1 : 0}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    logEvent("market", "brapi_quote_cache_hit", { ticker, dividends: includeDividends });
    return cached;
  }

  try {
    const blocked = ["cashflowStatementHistory", "dividendsData"];
    const modules = rawModules.split(",").map((m) => m.trim()).filter((m) => m && !blocked.includes(m)).join(",");
    const dividends = includeDividends ? "&dividends=true" : "";

    let url = `${BRAPI_BASE}/quote/${ticker}?token=${BRAPI_TOKEN}&fundamental=true&modules=${modules}&range=${range}&interval=${interval}${dividends}`;
    let result;
    try {
      result = await fetchJson(url, { timeout: 15000 }, "brapiQuote");
    } catch (firstErr) {
      if (firstErr.status === 400 && modules.includes("balanceSheetHistory")) {
        const fallbackModules = "summaryProfile,financialData,defaultKeyStatistics";
        url = `${BRAPI_BASE}/quote/${ticker}?token=${BRAPI_TOKEN}&fundamental=true&modules=${fallbackModules}&range=${range}&interval=${interval}${dividends}`;
        result = await fetchJson(url, { timeout: 15000 }, "brapiQuote");
      } else {
        throw firstErr;
      }
    }

    cacheSet(cacheKey, result, TTL.quote);
    return result;
  } catch (error) {
    logError("market", "brapi_quote_error", error, { ticker });
    const status = error && error.status;
    if (status === 404) {
      throw new functions.https.HttpsError(
        "not-found",
        `Ativo "${ticker}" não encontrado na BRAPI. Verifique o ticker (ex.: PETR4 para Petrobras).`,
      );
    }
    throw new functions.https.HttpsError("internal", "Erro ao buscar dados: " + error.message);
  }
}

// MÚLTIPLOS ATIVOS
async function multi(data) {
  const tickers = data.tickers || [];
  if (!Array.isArray(tickers) || tickers.length === 0 || tickers.length > 20) {
    throw new functions.https.HttpsError("invalid-argument", "Envie entre 1 e 20 tickers");
  }

  const cleanTickers = tickers
    .map(t => (t || "").toUpperCase().trim())
    .filter(t => /^[A-Z0-9]{4,12}$/.test(t));

  if (cleanTickers.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Nenhum ticker válido");
  }

  const tickerStr = cleanTickers.sort().join(",");
  const cacheKey = `multi:${tickerStr}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    logEvent("market", "brapi_multi_cache_hit", { tickers: cleanTickers });
    return cached;
  }

  try {
    const rawModules = data.modules || "defaultKeyStatistics,financialData";
    const blocked = ["cashflowStatementHistory", "dividendsData"];
    const modules = rawModules.split(",").map((m) => m.trim()).filter((m) => m && !blocked.includes(m)).join(",");
    const dividends = data.dividends ? "&dividends=true" : "";

    const url = `${BRAPI_BASE}/quote/${tickerStr}?token=${BRAPI_TOKEN}&fundamental=true&modules=${modules}${dividends}`;
    const result = await fetchJson(url, { timeout: 20000 }, "brapiMulti");
    cacheSet(cacheKey, result, TTL.multi);
    return result;
  } catch (error) {
    logError("market", "brapi_multi_error", error, { tickers: cleanTickers });
    throw new functions.https.HttpsError("internal", "Erro ao buscar dados: " + error.message);
  }
}

// BUSCAR ATIVOS
async function search(data) {
  const query = (data.query || "").trim();
  if (!query || query.length < 2) {
    throw new functions.https.HttpsError("invalid-argument", "Busca deve ter pelo menos 2 caracteres");
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BRAPI_BASE}/available?token=${BRAPI_TOKEN}&search=${encodeURIComponent(query)}`;
    const result = await fetchJson(url, { timeout: 10000 }, "brapiSearch");
    cacheSet(cacheKey, result, TTL.search);
    return result;
  } catch (error) {
    logError("market", "brapi_search_error", error, { query });
    throw new functions.https.HttpsError("internal", "Erro ao buscar: " + error.message);
  }
}

// CRIPTO
async function crypto(data) {
  const coin = (data.coin || "BTC").toUpperCase().trim();
  const currency = (data.currency || "BRL").toUpperCase().trim();

  const cacheKey = `crypto:${coin}:${currency}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BRAPI_BASE}/v2/crypto?coin=${coin}&currency=${currency}&token=${BRAPI_TOKEN}`;
    const result = await fetchJson(url, { timeout: 10000 }, "brapiCrypto");
    cacheSet(cacheKey, result, TTL.crypto);
    return result;
  } catch (error) {
    logError("market", "brapi_crypto_error", error, { coin, currency });
    throw new functions.https.HttpsError("internal", "Erro ao buscar crypto: " + error.message);
  }
}

// INFLAÇÃO
async function inflation(data) {
  const country = data.country || "brazil";
  const historical = data.historical ? "&historical=true" : "";
  const start = data.start ? `&start=${data.start}` : "";
  const end = data.end ? `&end=${data.end}` : "";
  const cacheKey = `inflation:${country}:${historical}:${start}:${end}`;

  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BRAPI_BASE}/v2/inflation?country=${country}&token=${BRAPI_TOKEN}${historical}${start}${end}`;
    const result = await fetchJson(url, { timeout: 10000 }, "brapiInflation");
    cacheSet(cacheKey, result, TTL.inflation);
    return result;
  } catch (error) {
    logError("market", "brapi_inflation_error", error, {});
    throw new functions.https.HttpsError("internal", "Erro: " + error.message);
  }
}

module.exports = {
  quote,
  multi,
  search,
  crypto,
  inflation
};

