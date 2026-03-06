const functions = require("firebase-functions");
const { BRAPI_TOKEN, BRAPI_BASE } = require("../../config");
const { fetchJson } = require("../../httpClient");
const { logError } = require("../../logger");

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

  try {
    const rawModules = data.modules || "defaultKeyStatistics,financialData,balanceSheetHistory,incomeStatementHistory";
    const blocked = ["cashflowStatementHistory", "dividendsData"];
    const modules = rawModules.split(",").map((m) => m.trim()).filter((m) => m && !blocked.includes(m)).join(",");
    const range = data.range || "1mo";
    const interval = data.interval || "1d";
    const dividends = data.dividends ? "&dividends=true" : "";

    let url = `${BRAPI_BASE}/quote/${ticker}?token=${BRAPI_TOKEN}&fundamental=true&modules=${modules}&range=${range}&interval=${interval}${dividends}`;
    try {
      return await fetchJson(url, { timeout: 15000 }, "brapiQuote");
    } catch (firstErr) {
      if (firstErr.status === 400 && modules.includes("balanceSheetHistory")) {
        const fallbackModules = "summaryProfile,financialData,defaultKeyStatistics";
        url = `${BRAPI_BASE}/quote/${ticker}?token=${BRAPI_TOKEN}&fundamental=true&modules=${fallbackModules}&range=${range}&interval=${interval}${dividends}`;
        return await fetchJson(url, { timeout: 15000 }, "brapiQuote");
      }
      throw firstErr;
    }
  } catch (error) {
    logError("market", "brapi_quote_error", error, { ticker });
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

  try {
    const tickerStr = cleanTickers.join(",");
    const rawModules = data.modules || "defaultKeyStatistics,financialData";
    const blocked = ["cashflowStatementHistory", "dividendsData"];
    const modules = rawModules.split(",").map((m) => m.trim()).filter((m) => m && !blocked.includes(m)).join(",");
    const dividends = data.dividends ? "&dividends=true" : "";

    const url = `${BRAPI_BASE}/quote/${tickerStr}?token=${BRAPI_TOKEN}&fundamental=true&modules=${modules}${dividends}`;
    return await fetchJson(url, { timeout: 20000 }, "brapiMulti");
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

  try {
    const url = `${BRAPI_BASE}/available?token=${BRAPI_TOKEN}&search=${encodeURIComponent(query)}`;
    return await fetchJson(url, { timeout: 10000 }, "brapiSearch");
  } catch (error) {
    logError("market", "brapi_search_error", error, { query });
    throw new functions.https.HttpsError("internal", "Erro ao buscar: " + error.message);
  }
}

// CRIPTO
async function crypto(data) {
  const coin = (data.coin || "BTC").toUpperCase().trim();
  const currency = (data.currency || "BRL").toUpperCase().trim();

  try {
    const url = `${BRAPI_BASE}/v2/crypto?coin=${coin}&currency=${currency}&token=${BRAPI_TOKEN}`;
    return await fetchJson(url, { timeout: 10000 }, "brapiCrypto");
  } catch (error) {
    logError("market", "brapi_crypto_error", error, { coin, currency });
    throw new functions.https.HttpsError("internal", "Erro ao buscar crypto: " + error.message);
  }
}

// INFLAÇÃO
async function inflation(data) {
  try {
    const country = data.country || "brazil";
    const historical = data.historical ? "&historical=true" : "";
    const start = data.start ? `&start=${data.start}` : "";
    const end = data.end ? `&end=${data.end}` : "";

    const url = `${BRAPI_BASE}/v2/inflation?country=${country}&token=${BRAPI_TOKEN}${historical}${start}${end}`;
    return await fetchJson(url, { timeout: 10000 }, "brapiInflation");
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

