/**
 * useMarketRates — busca taxas de mercado reais (CDI/Selic) via Cloud Function.
 *
 * Cache em localStorage por 24h para evitar chamadas desnecessárias à API.
 * Fallback para valor estático se a API estiver indisponível.
 *
 * Usado pelo IntelligenceContext para calcular Spread Gap (Sg) com precisão.
 */
import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const CACHE_KEY = 'sib_market_rates';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/** CDI fallback caso a API esteja indisponível (atualizar manualmente se necessário). */
const CDI_FALLBACK_MONTHLY = 0.0107; // ~12.8% a.a.

export interface MarketRates {
  /** CDI mensal em decimal (ex: 0.0107 = 1,07%/mês) */
  cdiMonthly: number;
  /** Selic anual em decimal (ex: 0.1275 = 12,75% a.a.) */
  selicAnnual: number;
  /** IPCA anual em decimal */
  ipcaAnnual: number;
  /** Fonte dos dados */
  source: 'api' | 'cache' | 'fallback';
  /** ISO string da última atualização */
  updatedAt: string;
}

interface CachedRates {
  rates: MarketRates;
  cachedAt: number;
}

function loadCache(): MarketRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedRates = JSON.parse(raw);
    if (Date.now() - cached.cachedAt > CACHE_TTL_MS) return null;
    return { ...cached.rates, source: 'cache' };
  } catch {
    return null;
  }
}

function saveCache(rates: MarketRates) {
  try {
    const cached: CachedRates = { rates, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // localStorage cheio — ignora
  }
}

const fallbackRates: MarketRates = {
  cdiMonthly: CDI_FALLBACK_MONTHLY,
  selicAnnual: 0.1275,
  ipcaAnnual: 0.048,
  source: 'fallback',
  updatedAt: new Date().toISOString(),
};

export function useMarketRates(): MarketRates {
  const [rates, setRates] = useState<MarketRates>(() => loadCache() ?? fallbackRates);

  useEffect(() => {
    // Se já temos cache válido, não busca agora
    const cached = loadCache();
    if (cached) {
      setRates(cached);
      return;
    }

    let cancelled = false;

    async function fetchRates() {
      try {
        const fns = getFunctions(undefined, 'southamerica-east1');
        const fn = httpsCallable<unknown, {
          ok: boolean;
          indicators?: { selic?: number; ipca?: number; cdi?: number };
        }>(fns, 'fixedIncomeCatalogApi');

        const result = await fn({});
        if (cancelled) return;

        const ind = result.data?.indicators;
        if (!ind) throw new Error('Sem indicadores na resposta');

        // A API retorna taxas anuais; convertemos CDI para mensal:
        // CDI mensal ≈ (1 + CDI_anual)^(1/12) - 1
        const selicAnnual = (ind.selic ?? 12.75) / 100;
        const ipcaAnnual = (ind.ipca ?? 4.8) / 100;
        // CDI ≈ Selic (diferença histórica < 0.1%)
        const cdiAnnual = (ind.cdi ?? ind.selic ?? 12.75) / 100;
        const cdiMonthly = Math.pow(1 + cdiAnnual, 1 / 12) - 1;

        const fresh: MarketRates = {
          cdiMonthly,
          selicAnnual,
          ipcaAnnual,
          source: 'api',
          updatedAt: new Date().toISOString(),
        };

        saveCache(fresh);
        setRates(fresh);
      } catch (err) {
        if (cancelled) return;
        // Mantém fallback/cache — não quebra a UI por falha de taxa de mercado
        console.warn('[useMarketRates] Falha ao buscar taxas de mercado:', err);
      }
    }

    fetchRates();
    return () => { cancelled = true; };
  }, []);

  return rates;
}
