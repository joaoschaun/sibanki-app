/**
 * twelveDataService.js
 * Adaptador Twelve Data → schema normalizado do Market Data Hub.
 *
 * Plano free: 800 req/dia, 8 req/min.
 * Forças: histórico de preços OHLCV extenso, indicadores técnicos (RSI, MACD, BB),
 *         cobertura global (B3, NYSE, NASDAQ, cripto, forex).
 * Fraquezas: fundamentais menos completos que Alpha Vantage.
 *
 * Documentação: https://twelvedata.com/docs
 * Para ativar: defina TWELVE_DATA_KEY no .env ou Firebase Secrets.
 */

const { fetchJson } = require("../../httpClient");
const { logError, logEvent } = require("../../logger");

const BASE = "https://api.twelvedata.com";

function getKey() {
  return process.env.TWELVE_DATA_KEY || "";
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
  if (_cache.size >= 200) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ── Normalização de ticker B3 para Twelve Data ───────────────────────────────
// Twelve Data: ativos B3 usam sufixo ":BVMF" (ex: PETR4:BVMF)
function toTDTicker(ticker, exchange = "BVMF") {
  const t = ticker.toUpperCase().trim();
  if (t.includes(":")) return t;
  // Criptoativos — usa par BRL (ex: BTC/BRL)
  const CRYPTOS = ["BTC", "ETH", "BNB", "SOL", "ADA", "XRP", "DOT", "MATIC", "AVAX", "LINK"];
  if (CRYPTOS.includes(t)) return `${t}/BRL`;
  return `${t}:${exchange}`;
}

// ── Cotação em tempo real ─────────────────────────────────────────────────────
/**
 * @returns {{ price, open, high, low, volume, change, changePct, ticker, source }}
 */
async function fetchQuote(ticker) {
  const key = getKey();
  if (!key) throw new Error("TWELVE_DATA_KEY not set");

  const tdTicker = toTDTicker(ticker);
  const cacheKey = `quote:${tdTicker}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}/quote?symbol=${encodeURIComponent(tdTicker)}&apikey=${key}`;
  const data = await fetchJson(url, { timeout: 10000 });

  if (data.status === "error") throw new Error(`Twelve Data: ${data.message}`);
  if (!data.close) throw new Error(`Twelve Data: no quote for ${ticker}`);

  const result = {
    ticker,
    price    : parseFloat(data.close),
    open     : parseFloat(data.open),
    high     : parseFloat(data.high),
    low      : parseFloat(data.low),
    volume   : parseInt(data.volume || 0),
    change   : parseFloat(data.change || 0),
    changePct: parseFloat(data.percent_change || 0),
    source   : "twelve_data",
  };

  cacheSet(cacheKey, result, 5 * 60 * 1000); // 5min
  logEvent("twelveData_quote", { ticker });
  return result;
}

// ── Histórico de preços ───────────────────────────────────────────────────────
/**
 * @param {string} ticker
 * @param {"1day"|"1week"|"1month"} interval
 * @param {number} outputSize  número de candles (máx 5000 no free)
 * @returns {Array<{ date, open, high, low, close, volume }>}
 */
async function fetchDailyHistory(ticker, interval = "1day", outputSize = 252) {
  const key = getKey();
  if (!key) throw new Error("TWELVE_DATA_KEY not set");

  const tdTicker = toTDTicker(ticker);
  const cacheKey = `history:${tdTicker}:${interval}:${outputSize}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}/time_series?symbol=${encodeURIComponent(tdTicker)}&interval=${interval}&outputsize=${outputSize}&apikey=${key}`;
  const data = await fetchJson(url, { timeout: 15000 });

  if (data.status === "error") throw new Error(`Twelve Data history: ${data.message}`);
  if (!data.values) throw new Error(`Twelve Data: no history for ${ticker}`);

  const result = data.values
    .map((v) => ({
      date  : v.datetime.slice(0, 10),
      open  : parseFloat(v.open),
      high  : parseFloat(v.high),
      low   : parseFloat(v.low),
      close : parseFloat(v.close),
      volume: parseInt(v.volume || 0),
    }))
    .reverse(); // Twelve retorna ordem decrescente; normalizamos para crescente

  cacheSet(cacheKey, result, 60 * 60 * 1000); // 1h
  logEvent("twelveData_history", { ticker, points: result.length });
  return result;
}

// ── Indicadores técnicos ──────────────────────────────────────────────────────
/**
 * RSI (Relative Strength Index) — 14 períodos.
 * @returns {{ value, signal: "oversold"|"neutral"|"overbought" }}
 */
async function fetchRSI(ticker, period = 14) {
  const key = getKey();
  if (!key) throw new Error("TWELVE_DATA_KEY not set");

  const tdTicker = toTDTicker(ticker);
  const cacheKey = `rsi:${tdTicker}:${period}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}/rsi?symbol=${encodeURIComponent(tdTicker)}&interval=1day&time_period=${period}&apikey=${key}&outputsize=1`;
  const data = await fetchJson(url, { timeout: 10000 });

  if (data.status === "error") throw new Error(`Twelve Data RSI: ${data.message}`);
  const latest = data.values?.[0];
  if (!latest) throw new Error(`Twelve Data: no RSI for ${ticker}`);

  const value = parseFloat(latest.rsi);
  const signal = value < 30 ? "oversold" : value > 70 ? "overbought" : "neutral";
  const result = { ticker, value, signal, source: "twelve_data" };

  cacheSet(cacheKey, result, 30 * 60 * 1000); // 30min
  return result;
}

/**
 * Fundamentais básicos disponíveis no Twelve Data.
 * Nota: para fundamentais completos, preferir Alpha Vantage.
 */
async function fetchFundamentals(ticker) {
  const key = getKey();
  if (!key) throw new Error("TWELVE_DATA_KEY not set");

  const tdTicker = toTDTicker(ticker);
  const cacheKey = `fundamentals:${tdTicker}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}/statistics?symbol=${encodeURIComponent(tdTicker)}&apikey=${key}`;
  const data = await fetchJson(url, { timeout: 12000 });

  if (data.status === "error") throw new Error(`Twelve Data fundamentals: ${data.message}`);
  if (!data.statistics) throw new Error(`Twelve Data: no fundamentals for ${ticker}`);

  const s = data.statistics;
  const safe = (v) => (v != null && v !== "" ? parseFloat(v) : undefined);

  const result = {
    ticker,
    name       : data.name || ticker,
    peRatio    : safe(s.valuations?.forward_pe),
    pbRatio    : safe(s.valuations?.price_to_book_mrq),
    eps        : safe(s.financials?.earnings_per_share_ttm), // LPA
    dy         : safe(s.dividends?.forward_annual_dividend_yield)
      ? safe(s.dividends?.forward_annual_dividend_yield) * 100 : undefined,
    roe        : safe(s.financials?.return_on_equity_ttm)
      ? safe(s.financials?.return_on_equity_ttm) * 100 : undefined,
    source     : "twelve_data",
  };

  cacheSet(cacheKey, result, 6 * 60 * 60 * 1000); // 6h
  logEvent("twelveData_fundamentals", { ticker });
  return result;
}

module.exports = { fetchQuote, fetchDailyHistory, fetchRSI, fetchFundamentals };
