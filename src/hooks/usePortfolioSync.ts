/**
 * usePortfolioSync — sincroniza preços reais de todos os ativos B3 da carteira.
 *
 * Itera investimentos do tipo Ações/FIIs/ETFs, chama brapiMulti em batch,
 * atualiza `atual` e `dy` no Firestore para cada ativo.
 *
 * Retorna: { syncing, progress, syncedAt, lastError, syncPortfolio }
 */
import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { updateInvestment } from '../services/persistUserData';
import type { Investment } from '../types/userData';

const RV_TYPES = ['ações', 'fiis', 'etf', 'etfs', 'fii', 'ação', 'acao', 'renda variável'];

function isB3Asset(inv: Investment): boolean {
  const tipo = (inv.tipo || '').toLowerCase();
  return RV_TYPES.some((t) => tipo.includes(t));
}

/** Extrai ticker limpo do nome do investimento (ex: "PETR4 - Petrobras" → "PETR4") */
function extractTicker(nome: string): string {
  return nome.trim().split(/\s/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
}

interface SyncResult {
  ticker: string;
  price: number;
  dy?: number;
  changePct?: number;
}

export interface PortfolioSyncState {
  syncing: boolean;
  progress: number;          // 0–100
  syncedAt: string | null;   // ISO string
  lastError: string | null;
  updatedCount: number;
  syncPortfolio: (uid: string, investments: Investment[]) => Promise<void>;
}

const SYNC_KEY = 'sib_portfolio_synced_at';

export function usePortfolioSync(): PortfolioSyncState {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncedAt, setSyncedAt] = useState<string | null>(() => localStorage.getItem(SYNC_KEY));
  const [lastError, setLastError] = useState<string | null>(null);
  const [updatedCount, setUpdatedCount] = useState(0);

  const syncPortfolio = useCallback(async (uid: string, investments: Investment[]) => {
    const b3Assets = investments.filter(isB3Asset);
    if (b3Assets.length === 0) return;

    setSyncing(true);
    setProgress(5);
    setLastError(null);
    setUpdatedCount(0);

    try {
      const fns = getFunctions(undefined, 'us-central1');
      const brapiMulti = httpsCallable<{ tickers: string[] }, { results?: SyncResult[] }>(
        fns, 'brapiMulti'
      );

      const tickers = [...new Set(b3Assets.map((inv) => extractTicker(inv.nome)).filter(Boolean))];
      setProgress(20);

      const result = await brapiMulti({ tickers });
      setProgress(60);

      const quoteMap: Record<string, SyncResult> = {};
      for (const q of result.data?.results ?? []) {
        if (q.ticker) quoteMap[q.ticker.toUpperCase()] = q;
      }

      // Atualiza cada ativo em sequência (não em paralelo — evita race condition no Firestore)
      let updated = 0;
      for (let i = 0; i < b3Assets.length; i++) {
        const inv = b3Assets[i];
        const ticker = extractTicker(inv.nome);
        const quote = quoteMap[ticker];
        if (!quote?.price) continue;

        const qtd = inv.qtd ?? 0;
        const novoAtual = qtd > 0 ? qtd * quote.price : quote.price;

        const patch: Partial<Investment> = {
          atual: Math.round(novoAtual * 100) / 100,
        };
        if (quote.dy != null && quote.dy > 0) {
          (patch as any).dy = quote.dy;
        }

        try {
          await updateInvestment(uid, investments, inv.id, { ...inv, ...patch });
          updated++;
        } catch {
          // Falha num ativo não deve parar os outros
        }

        setProgress(60 + Math.round(((i + 1) / b3Assets.length) * 35));
      }

      setUpdatedCount(updated);
      const now = new Date().toISOString();
      localStorage.setItem(SYNC_KEY, now);
      setSyncedAt(now);
      setProgress(100);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Erro ao sincronizar cotações.');
    } finally {
      setSyncing(false);
      setTimeout(() => setProgress(0), 1500);
    }
  }, []);

  return { syncing, progress, syncedAt, lastError, updatedCount, syncPortfolio };
}
