/**
 * coinGeckoService.js
 * Adaptador CoinGecko → schema normalizado do Market Data Hub.
 *
 * Plano free: 50 req/min, sem limite diário, sem API key necessária.
 * Forças: melhor cobertura de criptoativos do mercado (10.000+ moedas),
 *         histórico de preços, dominância de mercado, DeFi TVL.
 *
 * Documentação: https://www.coingecko.com/en/api/documentation
 */

const { fetchJson } = require("../../httpClient");
const { logError, logEvent } = require("../../logger");

const BASE = "https://api.coingecko.com/api/v3";

// Mapa de tickers comuns → IDs do CoinGecko
const TICKER_TO_ID = {
  BTC  : "bitcoin",
  ETH  : "ethereum",
  BNB  : "binancecoin",
  SOL  : "solana",
  ADA  : "cardano",
  XRP  : "ripple",
  DOT  : "polkadot",
  MATIC: "matic-network",
  AVAX : "avalanche-2",
  LINK : "chainlink",
  USDT : "tether",
  USDC : "usd-coin",
  DOGE : "dogecoin",
  SHIB : "shiba-inu",
  LTC  : "litecoin",
  UNI  : "uniswap",
  AAVE : "aave",
  ATOM : "cosmos",
  FIL  : "filecoin",
  TRX  : "tron",
};

// ── Cache ─────────────────────────────────────────────────────────────────────
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data, ttlMs) {
  if (_cache.size >= 300) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function resolveId(symbol) {
  const s = symbol.toUpperCase().trim();
  return TICKER_TO_ID[s] || s.toLowerCase();
}

// ── Cotação simples ───────────────────────────────────────────────────────────
/**
 * @returns {{ symbol, price, change24h, changePct24h, marketCap, volume24h,
 *             high24h, low24h, source }}
 */
async function fetchCryptoPrice(symbol, vsCurrency = "brl") {
  const id = resolveId(symbol);
  const cacheKey = `price:${id}:${vsCurrency}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}/coins/markets?vs_currency=${vsCurrency}&ids=${encodeURIComponent(id)}&sparkline=false`;
  const data = await fetchJson(url, { timeout: 10000 });

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`CoinGecko: no data for ${symbol}`);
  }

  const coin = data[0];
  const result = {
    symbol       : symbol.toUpperCase(),
    coinGeckoId  : id,
    price        : coin.current_price,
    change24h    : coin.price_change_24h || 0,
    changePct24h : coin.price_change_percentage_24h || 0,
    marketCap    : coin.market_cap || 0,
    volume24h    : coin.total_volume || 0,
    high24h      : coin.high_24h || 0,
    low24h       : coin.low_24h || 0,
    rank         : coin.market_cap_rank || null,
    image        : coin.image || null,
    source       : "coingecko",
  };

  cacheSet(cacheKey, result, 3 * 60 * 1000); // 3min
  return result;
}

// ── Múltiplas cotações em 1 chamada ──────────────────────────────────────────
/**
 * @param {string[]} symbols  ex: ["BTC", "ETH", "SOL"]
 * @returns {Record<string, object>}  keyed by symbol
 */
async function fetchMultipleCryptoPrices(symbols, vsCurrency = "brl") {
  const ids = symbols.map(resolveId);
  const cacheKey = `multi:${ids.sort().join(",")}:${vsCurrency}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}/coins/markets?vs_currency=${vsCurrency}&ids=${encodeURIComponent(ids.join(","))}&sparkline=false&per_page=50`;
  const data = await fetchJson(url, { timeout: 12000 });

  if (!Array.isArray(data)) throw new Error("CoinGecko: invalid response");

  const result = {};
  for (const coin of data) {
    // Encontrar o símbolo original
    const origSymbol = symbols.find(s => resolveId(s) === coin.id) || coin.symbol.toUpperCase();
    result[origSymbol] = {
      symbol       : origSymbol,
      coinGeckoId  : coin.id,
      price        : coin.current_price,
      change24h    : coin.price_change_24h || 0,
      changePct24h : coin.price_change_percentage_24h || 0,
      marketCap    : coin.market_cap || 0,
      volume24h    : coin.total_volume || 0,
      high24h      : coin.high_24h || 0,
      low24h       : coin.low_24h || 0,
      rank         : coin.market_cap_rank || null,
      source       : "coingecko",
    };
  }

  cacheSet(cacheKey, result, 3 * 60 * 1000); // 3min
  logEvent("coinGecko_multiPrice", { count: symbols.length });
  return result;
}

// ── Histórico de preços ───────────────────────────────────────────────────────
/**
 * @param {string} symbol
 * @param {number} days  1, 7, 30, 90, 180, 365, "max"
 * @returns {Array<{ date, price }>}
 */
async function fetchCryptoHistory(symbol, days = 30, vsCurrency = "brl") {
  const id = resolveId(symbol);
  const cacheKey = `history:${id}:${days}:${vsCurrency}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=daily`;
  const data = await fetchJson(url, { timeout: 15000 });

  if (!data.prices) throw new Error(`CoinGecko: no history for ${symbol}`);

  const result = data.prices.map(([ts, price]) => ({
    date : new Date(ts).toISOString().slice(0, 10),
    price: parseFloat(price.toFixed(2)),
  }));

  cacheSet(cacheKey, result, 60 * 60 * 1000); // 1h
  return result;
}

// ── Dominância de mercado (contexto macro) ────────────────────────────────────
async function fetchMarketDominance() {
  const cacheKey = "dominance";
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${BASE}/global`;
  const data = await fetchJson(url, { timeout: 10000 });

  if (!data.data) throw new Error("CoinGecko: no global data");

  const dom = data.data.market_cap_percentage || {};
  const result = {
    btcDominance : dom.btc ? parseFloat(dom.btc.toFixed(1)) : null,
    ethDominance : dom.eth ? parseFloat(dom.eth.toFixed(1)) : null,
    totalMarketCap: data.data.total_market_cap?.brl || null,
    source       : "coingecko",
  };

  cacheSet(cacheKey, result, 10 * 60 * 1000); // 10min
  return result;
}

module.exports = {
  fetchCryptoPrice,
  fetchMultipleCryptoPrices,
  fetchCryptoHistory,
  fetchMarketDominance,
  TICKER_TO_ID,
};
