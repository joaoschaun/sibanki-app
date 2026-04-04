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
  };

  _clientCache.set(ticker, { data: result, ts: Date.now() });
  if (_clientCache.size > 100) {
    const oldest = _clientCache.keys().next().value;
    if (oldest) _clientCache.delete(oldest);
  }

  return result;
}

