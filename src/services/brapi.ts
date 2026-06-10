import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export interface B3Quote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  type?: string;
  sector?: string;
  dy?: number;
  pe?: number;
  pvp?: number;
  vpa?: number;
  lpa?: number;
  roe?: number;
  margemLiquida?: number;
  dividaEbitda?: number;
}

interface BrapiQuoteResponse {
  results?: any[];
  [key: string]: unknown;
}

const CLIENT_CACHE_TTL = 2 * 60_000; // 2 min
const _clientCache = new Map<string, { data: B3Quote; ts: number }>();

export async function fetchB3Quote(tickerRaw: string): Promise<B3Quote> {
  const ticker = tickerRaw.trim().toUpperCase();
  if (!ticker) {
    throw new Error('Informe um ticker válido.');
  }

  const cached = _clientCache.get(ticker);
  if (cached && Date.now() - cached.ts < CLIENT_CACHE_TTL) {
    return cached.data;
  }

  const callable = httpsCallable<{ ticker: string }, BrapiQuoteResponse>(functions, 'brapiQuote');
  const res = await callable({ ticker });
  const json = res.data;

  const stockSource = (json && (json as BrapiQuoteResponse).results) || [];
  const stock = Array.isArray(stockSource) ? stockSource[0] : (stockSource as any)[0] ?? stockSource;

  if (!stock) {
    throw new Error('Ticker não encontrado na B3.');
  }

  const price = Number(stock.regularMarketPrice ?? stock.close ?? stock.price ?? 0);
  const change = Number(stock.regularMarketChange ?? 0);
  const changePct = Number(stock.regularMarketChangePercent ?? 0);
  const type = stock.type ?? stock.stockType ?? undefined;
  const sector = stock.sector ?? stock.sectorName ?? stock.industry ?? undefined;
  const dy = stock.dividendYield ?? stock.dy ?? undefined;
  const pe = stock.priceEarnings ?? stock.pe ?? undefined;

  // Extrair campos dos módulos defaultKeyStatistics e financialData
  const pvp = stock.defaultKeyStatistics?.priceToBook ?? stock.priceToBook ?? undefined;
  let vpa = stock.defaultKeyStatistics?.bookValue ?? stock.bookValue ?? undefined;
  let lpa = stock.defaultKeyStatistics?.trailingEps ?? stock.eps ?? stock.lpa ?? undefined;
  const roe = stock.financialData?.returnOnEquity ?? stock.roe ?? undefined;
  const margemLiquida = stock.financialData?.profitMargins ?? stock.profitMargins ?? undefined;
  const dividaEbitda = stock.financialData?.debtToEquity ?? stock.debtToEquity ?? undefined;

  // Fallbacks matemáticos de consistência de dados
  if (price > 0) {
    if (lpa === undefined && typeof pe === 'number' && pe > 0) {
      lpa = price / pe;
    }
    if (vpa === undefined && typeof pvp === 'number' && pvp > 0) {
      vpa = price / pvp;
    }
  }

  const result: B3Quote = {
    ticker: stock.symbol || ticker,
    name: stock.longName || stock.shortName || stock.name || ticker,
    price,
    change,
    changePct,
    type,
    sector,
    dy: typeof dy === 'number' ? dy : undefined,
    pe: typeof pe === 'number' ? pe : undefined,
    pvp: typeof pvp === 'number' ? pvp : undefined,
    vpa: typeof vpa === 'number' ? vpa : undefined,
    lpa: typeof lpa === 'number' ? lpa : undefined,
    roe: typeof roe === 'number' ? roe : undefined,
    margemLiquida: typeof margemLiquida === 'number' ? margemLiquida : undefined,
    dividaEbitda: typeof dividaEbitda === 'number' ? dividaEbitda : undefined,
  };

  _clientCache.set(ticker, { data: result, ts: Date.now() });
  if (_clientCache.size > 100) {
    const oldest = _clientCache.keys().next().value;
    if (oldest) _clientCache.delete(oldest);
  }

  return result;
}

export interface B3SearchResult {
  ticker: string;
  name: string;
  type?: string;
}

interface BrapiSearchResponse {
  stocks?: Array<{ stock: string; name?: string; type?: string }>;
  [key: string]: unknown;
}

export async function searchB3Tickers(query: string): Promise<B3SearchResult[]> {
  const q = query.trim().toUpperCase();
  if (!q || q.length < 2) return [];
  const callable = httpsCallable<{ query: string }, BrapiSearchResponse>(functions, 'brapiSearch');
  const res = await callable({ query: q });
  const stocks = res.data?.stocks ?? [];
  return stocks.slice(0, 8).map((s) => ({
    ticker: s.stock,
    name: s.name ?? s.stock,
    type: s.type,
  }));
}

