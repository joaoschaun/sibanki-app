import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, limit, orderBy } from 'firebase/firestore';
import type { UserData, Entry, Recurrent, InvestorProfile, CreditAccount, CreditObligation, CreditSnapshot } from '../types/userData';
import { calculateFinScore } from '../utils/calculateScore';
import { mergeInlineAndOverflowEntries, mergeAllEntries } from '../utils/entryUtils';

/**
 * Lê users/{uid} + lançamentos arquivados em:
 *   - users/{uid}/entriesOverflow  (Pluggy legacy)
 *   - users/{uid}/entries          (subcoleção nova — pós-migração)
 *
 * `entries` = merge das 3 fontes para UI (dedup por id/pluggyTransactionId).
 * `entriesInline` = apenas o array do documento principal (para mutações legadas).
 *
 * A subcoleção é ativada automaticamente quando o doc do usuário contém
 * `entriesMigratedAt` (setado pelo script de migração).
 */
export function useFinancialData(userId: string | undefined) {
  const [data, setData] = useState<UserData | null>(null);
  const [overflowEntries, setOverflowEntries] = useState<Entry[]>([]);
  const [subcollectionEntries, setSubcollectionEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [overflowLoading, setOverflowLoading] = useState(true);
  const [subcollectionLoading, setSubcollectionLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setOverflowEntries([]);
      setLoading(false);
      return;
    }

    const ref = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setData(snap.data() as UserData);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  // ── Listener: entriesOverflow (lançamentos Pluggy arquivados) ──────────────
  useEffect(() => {
    if (!userId) {
      setOverflowEntries([]);
      setOverflowLoading(false);
      return;
    }
    setOverflowLoading(true);
    // Limit para evitar downloads massivos — lançamentos mais recentes primeiro.
    // Overflow contém só entradas Pluggy arquivadas; 1.000 cobre anos de histórico.
    const col = collection(db, 'users', userId, 'entriesOverflow');
    const q = query(col, orderBy('date', 'desc'), limit(1000));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Entry[] = [];
        snap.forEach((d) => {
          const x = d.data() as Entry;
          if (x && typeof x.id === 'number') {
            list.push({ ...x, entryLocation: 'overflow' });
          }
        });
        setOverflowEntries(list);
        setOverflowLoading(false);
      },
      (err) => {
        console.warn('[useFinancialData] entriesOverflow error:', err.message);
        setError((prev) => prev ?? new Error('Falha ao carregar lançamentos arquivados (Open Finance).'));
        setOverflowEntries([]);
        setOverflowLoading(false);
      },
    );
    return () => unsub();
  }, [userId]);

  // ── Listener: entries subcoleção (pós-migração) ────────────────────────────
  // Ativado quando `data.entriesMigratedAt` está presente no documento.
  const isMigrated = Boolean((data as any)?.entriesMigratedAt);
  useEffect(() => {
    if (!userId || !isMigrated) {
      setSubcollectionEntries([]);
      setSubcollectionLoading(false);
      return;
    }
    setSubcollectionLoading(true);
    const col = collection(db, 'users', userId, 'entries');
    // Subcoleção suporta até 5.000 lançamentos sem risco de limite de 1MB
    const q = query(col, orderBy('date', 'desc'), limit(5000));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Entry[] = [];
        snap.forEach((d) => {
          const x = d.data() as Entry;
          if (x && (typeof x.id === 'number' || typeof x.id === 'string')) {
            list.push({ ...x, entryLocation: 'subcollection' as any });
          }
        });
        setSubcollectionEntries(list);
        setSubcollectionLoading(false);
      },
      (err) => {
        console.warn('[useFinancialData] entries subcollection error:', err.message);
        setSubcollectionEntries([]);
        setSubcollectionLoading(false);
      },
    );
    return () => unsub();
  }, [userId, isMigrated]);

  const entriesInline: Entry[] = data?.entries ?? [];
  const entries: Entry[] = useMemo(
    () => mergeAllEntries(entriesInline, overflowEntries, subcollectionEntries),
    [entriesInline, overflowEntries, subcollectionEntries],
  );

  const accounts = data?.accounts ?? [];
  const accountBalances = data?.accountBalances ?? {};
  const accountMeta = data?.accountMeta ?? {};
  const cards = data?.cards ?? [];
  const goals = data?.goals ?? [];
  const investments = data?.investments ?? [];
  const budgets = data?.budgets ?? {};
  const categories = data?.categories ?? [];
  const recurrents: Recurrent[] = data?.recurrents ?? [];
  const commProfile = data?.commProfile ?? null;
  const commBookmarks = data?.commBookmarks ?? [];
  const achievements: Record<string, { date?: string }> = data?.achievements ?? {};
  const creditAccounts: CreditAccount[] = data?.creditAccounts ?? [];
  const creditObligations: CreditObligation[] = data?.creditObligations ?? [];
  const creditSnapshot: CreditSnapshot | null = data?.creditSnapshot ?? null;

  const score = useMemo(() => {
    const localScore = calculateFinScore(
      entries,
      goals,
      budgets as Record<string, unknown>,
      accountBalances,
      accountMeta as Record<string, { incluirNaSoma?: boolean }>,
      creditSnapshot,
    );
    const serverScore = typeof (data as any)?.finScore === 'number'
      ? (data as any).finScore as number
      : null;

    // O score do servidor (calculado por Cloud Functions com dados completos)
    // tem prioridade sobre o score local — ele pode incluir dados de Open Finance
    // e históricos que o cliente não tem acesso completo.
    if (serverScore !== null) {
      if (import.meta.env.DEV && Math.abs(serverScore - localScore) > 5) {
        console.warn(
          `[FinScore] Divergência: server=${serverScore} local=${localScore}. ` +
          'Verifique se calculateFinScore e a Cloud Function usam a mesma lógica.',
        );
      }
      return serverScore;
    }
    return localScore;
  }, [entries, goals, budgets, accountBalances, accountMeta, creditSnapshot, data]);

  const isFullyLoaded = !loading && !overflowLoading && !subcollectionLoading;

  return {
    data,
    loading: !isFullyLoaded,
    error,
    entries,
    entriesInline,
    accounts,
    accountBalances,
    accountMeta,
    cards,
    goals,
    investments,
    budgets,
    categories,
    recurrents,
    commProfile,
    commBookmarks,
    creditAccounts,
    creditObligations,
    creditSnapshot,
    investorProfile: (data?.investorProfile as InvestorProfile | undefined) ?? undefined,
    score,
    achievements,
  };
}
