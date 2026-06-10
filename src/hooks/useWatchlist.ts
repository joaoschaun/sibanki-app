/**
 * useWatchlist — CRUD para watchlist de ativos monitorados.
 *
 * Cada item guarda análise Graham/Bazin/RSI snapshot do momento da adição.
 * A UI pode atualizar a análise chamando refreshItem() com nova cotação.
 *
 * Lê: AppContext.data.watchlist[]
 * Escreve: persistUserData.updateUserData({ watchlist })
 *
 * Análise fundamentalista: marketAssetAnalysis CF (southamerica-east1)
 * já existente — mesmo callable usado pelo Consultor IA Raio-X.
 *
 * Uso típico:
 *   const wl = useWatchlist();
 *   await wl.addItem({ ticker: 'ITUB4', nome: 'Itaú PN', tipo: 'Ações', precoAlvo: 25 });
 *   await wl.removeItem(id);
 *   const items = wl.items; // WatchlistItem[]
 */

import { useCallback, useMemo } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAppContext } from '../context/AppContext';
import { updateUserDoc } from '../services/persistUserData';
import type { WatchlistItem } from '../types/userData';

// ─── Types ────────────────────────────────────────────────────────────────────

type AddItemInput = Pick<WatchlistItem, 'ticker' | 'nome' | 'tipo'> & {
  precoAlvo?: number;
  notas?: string;
};

export interface UseWatchlistReturn {
  items: WatchlistItem[];
  /** Adiciona ativo à watchlist e busca análise Graham/Bazin automática. */
  addItem: (input: AddItemInput) => Promise<WatchlistItem>;
  /** Remove item pelo id. */
  removeItem: (id: string) => Promise<void>;
  /** Atualiza campos de um item existente (ex: precoAlvo, notas). */
  updateItem: (id: string, patch: Partial<WatchlistItem>) => Promise<void>;
  /**
   * Re-busca cotação e análise para um item e salva o snapshot atualizado.
   * Usa a mesma CF marketAssetAnalysis do Consultor IA.
   */
  refreshItem: (id: string) => Promise<void>;
  /** Verifica se um ticker já está na watchlist. */
  hasItem: (ticker: string) => boolean;
  /** Retorna item pelo ticker (case-insensitive). */
  getItem: (ticker: string) => WatchlistItem | undefined;
  loading: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWatchlist(): UseWatchlistReturn {
  const { user, data } = useAppContext();

  const items = useMemo<WatchlistItem[]>(
    () => (data?.watchlist ?? []),
    [data?.watchlist],
  );

  const saveItems = useCallback(async (next: WatchlistItem[]) => {
    if (!user?.uid) return;
    await updateUserDoc(user.uid, { watchlist: next } as any);
  }, [user?.uid]);

  /**
   * Busca análise do ativo via marketAssetAnalysis (southamerica-east1).
   * Retorna campos para preencher o snapshot Graham/Bazin/RSI.
   * Falhas são silenciosas — item é salvo sem análise.
   */
  const fetchAnalysis = useCallback(async (ticker: string): Promise<Partial<WatchlistItem>> => {
    try {
      const fns = getFunctions(undefined, 'southamerica-east1');
      const fn  = httpsCallable<{ ticker: string }, any>(fns, 'marketAssetAnalysis');
      const { data: result } = await fn({ ticker: ticker.toUpperCase() });

      const snapshot: Partial<WatchlistItem> = {};

      if (result?.quote?.price) {
        snapshot.precoNaAdicao = result.quote.price;
      }

      if (result?.graham) {
        snapshot.grahamIntrinsicValue = result.graham.intrinsicValue ?? undefined;
        snapshot.grahamDiscount       = result.graham.discount ?? undefined;
        snapshot.grahamVerdict        = result.graham.verdict ?? undefined;
      }
      if (result?.bazin) {
        snapshot.bazinCeiling  = result.bazin.ceiling ?? undefined;
        snapshot.bazinVerdict  = result.bazin.verdict ?? undefined;
      }
      if (result?.technicals?.rsi != null) {
        snapshot.rsi       = result.technicals.rsi;
        snapshot.rsiSignal = result.technicals.rsiSignal ?? undefined;
      }

      return snapshot;
    } catch {
      return {};
    }
  }, []);

  const addItem = useCallback(async (input: AddItemInput): Promise<WatchlistItem> => {
    const id      = crypto.randomUUID();
    const now     = new Date().toISOString();
    const analysis = await fetchAnalysis(input.ticker);

    const item: WatchlistItem = {
      id,
      addedAt: now,
      updatedAt: now,
      ...analysis,
      ...input,
      ticker: input.ticker.toUpperCase(),
    };

    await saveItems([...items, item]);
    return item;
  }, [items, saveItems, fetchAnalysis]);

  const removeItem = useCallback(async (id: string) => {
    await saveItems(items.filter((i) => i.id !== id));
  }, [items, saveItems]);

  const updateItem = useCallback(async (id: string, patch: Partial<WatchlistItem>) => {
    const now  = new Date().toISOString();
    const next = items.map((i) =>
      i.id === id ? { ...i, ...patch, updatedAt: now } : i,
    );
    await saveItems(next);
  }, [items, saveItems]);

  const refreshItem = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const analysis = await fetchAnalysis(item.ticker);
    const now      = new Date().toISOString();

    const next = items.map((i) =>
      i.id === id ? { ...i, ...analysis, updatedAt: now } : i,
    );
    await saveItems(next);
  }, [items, saveItems, fetchAnalysis]);

  const hasItem = useCallback((ticker: string): boolean => {
    const upper = ticker.toUpperCase();
    return items.some((i) => i.ticker === upper);
  }, [items]);

  const getItem = useCallback((ticker: string): WatchlistItem | undefined => {
    const upper = ticker.toUpperCase();
    return items.find((i) => i.ticker === upper);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    refreshItem,
    hasItem,
    getItem,
    loading: false,
  };
}
