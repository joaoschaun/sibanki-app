/**
 * alphaVantageService.js
 * Adaptador Alpha Vantage → schema normalizado do Market Data Hub.
 *
 * Plano free: 25 req/dia (suficiente para dados fundamentalistas sob demanda).
 * Forças: fundamentais completos (DRE, balanço, fluxo de caixa, ROE, LPA, VPA).
 * Fraquezas: cotações em tempo real têm delay 15min no free tier.
 *
 * Documentação: https://www.alphavantage.co/documentation/
 */

const { fetchJson } = require("../../httpClient");
const { logError, logEvent } = require("../../logger");

const BASE = "https://www.alphavantage.co/query";

function getKey() {
  return process.env.ALPHA_VANTAGE_KEY || "";
}

// ── Cache em memória ──────────────────────────────────────────────────────────
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data, ttlMs) {
  // Limite de 200 entradas
  if (_cache.size >= 200) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ── Normalização de ticker B3 para Alpha Vantage ──────────────────────────────
// Alpha Vantage usa sufixo ".SA" para ativos B3 (ex: PETR4 → PETR4.SA)
function toAVTicker(ticker) {
  const t = ticker.toUpperCase().trim();
  // Criptoativos — não adicionar .SA
  if (/^(BTC|ETH|BNB|SOL|ADA|XRP|DOT|MATIC|AVAX|LINK)$/.test(t)) return t;
  // Já tem sufixo
  if (t.includes(".")) return t;
  return `${t}.SA`;
}

// ── Cotação simples (com delay 15min no free tier) ────────────────────────────
/**
 * @returns {{ price, open, high, low, volume, change, changePct, ticker, source }}
 */
async function fetchQuote(ticker) {
  const key = getKey();
  if (!key) throw new Error("ALPHA_VANTAGE_KEY not set");

  const avTicker = toAVTicker(ticker);
  const cacheKey = `quote:${avTicker}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(avTicker)}&apikey=${key}`;
  const data = await fetchJson(url, { timeout: 10000 });

  const q = data["Global Quote"];
  if (!q || !q["05. price"]) throw new Error(`Alpha Vantage: no quote for ${ticker}`);

  const result = {
    ticker,
    price    : parseFloat(q["05. price"]),
    open     : parseFloat(q["02. open"]),
    high     : parseFloat(q["03. high"]),
    low      : parseFloat(q["04. low"]),
    volume   : parseInt(q["06. volume"]),
    change   : parseFloat(q["09. change"]),
    changePct: parseFloat(q["10. change percent"]?.replace("%", "")),
    source   : "alpha_vantage",
  };

  cacheSet(cacheKey, result, 15 * 60 * 1000); // 15min
  logEvent("alphaVantage_quote", { ticker });
  return result;
}

// ── Dados fundamentalistas ────────────────────────────────────────────────────
/**
 * Retorna indicadores-chave para Graham, Bazin e Piotroski.
 * @returns {{ lpa, vpa, dy, roe, peRatio, pbRatio, debtToEquity, currentRatio,
 *             revenueGrowthYoY, operatingMargin, sector, name, source }}
 */
async function fetchFundamentals(ticker) {
  const key = getKey();
  if (!key) throw new Error("ALPHA_VANTAGE_KEY not set");

  const avTicker = toAVTicker(ticker);
  const cacheKey = `fundamentals:${avTicker}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Alpha Vantage: OVERVIEW contém os principais fundamentais
  const url = `${BASE}?function=OVERVIEW&symbol=${encodeURIComponent(avTicker)}&apikey=${key}`;
  const data = await fetchJson(url, { timeout: 12000 });

  if (!data || !data.Symbol) throw new Error(`Alpha Vantage: no fundamentals for ${ticker}`);

  const safe = (v) => (v && v !== "None" && v !== "-" ? parseFloat(v) : undefined);

  const eps  = safe(data.EPS);          // LPA — Lucro por Ação
  const bvps = safe(data.BookValue);    // VPA — Valor Patrimonial por Ação
  const dy   = safe(data.DividendYield)
    ? safe(data.DividendYield) * 100    // Alpha retorna decimal (0.05 = 5%)
    : undefined;

  const result = {
    ticker,
    name            : data.Name || ticker,
    sector          : data.Sector || undefined,
    lpa             : eps,
    vpa             : bvps,
    dy,                                  // % a.a.
    roe             : safe(data.ReturnOnEquityTTM)
      ? safe(data.ReturnOnEquityTTM) * 100 : undefined,
    peRatio         : safe(data.PERatio),
    pbRatio         : safe(data.PriceToBookRatio),
    debtToEquity    : safe(data.DebtToEquityRatio),
    currentRatio    : safe(data.CurrentRatio),
    operatingMargin : safe(data.OperatingMarginTTM)
      ? safe(data.OperatingMarginTTM) * 100 : undefined,
    revenueGrowthYoY: safe(data.RevenueGrowthYoY),
    marketCap       : safe(data.MarketCapitalization),
    source          : "alpha_vantage",
  };

  cacheSet(cacheKey, result, 6 * 60 * 60 * 1000); // 6h — fundamentais mudam devagar
  logEvent("alphaVantage_fundamentals", { ticker });
  return result;
}

// ── Histórico de preços (série temporal diária) ───────────────────────────────
/**
 * @param {string} ticker
 * @param {"compact"|"full"} outputSize  compact=últimos 100 dias, full=20 anos
 * @returns {Array<{ date, open, high, low, close, volume }>}
 */
async function fetchDailyHistory(ticker, outputSize = "compact") {
  const key = getKey();
  if (!key) throw new Error("ALPHA_VANTAGE_KEY not set");

  const avTicker = toAVTicker(ticker);
  const cacheKey = `history:${avTicker}:${outputSize}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(avTicker)}&outputsize=${outputSize}&apikey=${key}`;
  const data = await fetchJson(url, { timeout: 15000 });

  const series = data["Time Series (Daily)"];
  if (!series) throw new Error(`Alpha Vantage: no history for ${ticker}`);

  const result = Object.entries(series)
    .map(([date, v]) => ({
      date,
      open  : parseFloat(v["1. open"]),
      high  : parseFloat(v["2. high"]),
      low   : parseFloat(v["3. low"]),
      close : parseFloat(v["4. close"]),
      volume: parseInt(v["5. volume"]),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  cacheSet(cacheKey, result, 60 * 60 * 1000); // 1h
  logEvent("alphaVantage_history", { ticker, points: result.length });
  return result;
}

// ── Preço de cripto em USD ────────────────────────────────────────────────────
async function fetchCryptoPrice(symbol) {
  const key = getKey();
  if (!key) throw new Error("ALPHA_VANTAGE_KEY not set");

  const cacheKey = `crypto:${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${encodeURIComponent(symbol)}&to_currency=BRL&apikey=${key}`;
  const data = await fetchJson(url, { timeout: 10000 });

  const rate = data["Realtime Currency Exchange Rate"];
  if (!rate) throw new Error(`Alpha Vantage: no crypto rate for ${symbol}`);

  const result = {
    symbol,
    price : parseFloat(rate["5. Exchange Rate"]),
    source: "alpha_vantage",
  };

  cacheSet(cacheKey, result, 5 * 60 * 1000); // 5min
  return result;
}

module.exports = { fetchQuote, fetchFundamentals, fetchDailyHistory, fetchCryptoPrice };
