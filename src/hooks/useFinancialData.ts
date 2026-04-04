import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import type { UserData, Entry, Recurrent, InvestorProfile, CreditAccount, CreditObligation, CreditSnapshot } from '../types/userData';
import { calculateFinScore } from '../utils/calculateScore';
import { mergeInlineAndOverflowEntries } from '../utils/entryUtils';

/**
 * Lê users/{uid} + lançamentos Pluggy arquivados em users/{uid}/entriesOverflow.
 * `entries` = merge para UI; `entriesInline` = só o array do documento (mutações / gravar).
 */
export function useFinancialData(userId: string | undefined) {
  const [data, setData] = useState<UserData | null>(null);
  const [overflowEntries, setOverflowEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!userId) {
      setOverflowEntries([]);
      return;
    }
    const col = collection(db, 'users', userId, 'entriesOverflow');
    const unsub = onSnapshot(
      col,
      (snap) => {
        const list: Entry[] = [];
        snap.forEach((d) => {
          const x = d.data() as Entry;
          if (x && typeof x.id === 'number') {
            list.push({ ...x, entryLocation: 'overflow' });
          }
        });
        setOverflowEntries(list);
      },
      (err) => {
        console.warn('[useFinancialData] entriesOverflow error:', err.message);
        setError((prev) => prev ?? new Error('Falha ao carregar lançamentos arquivados (Open Finance).'));
        setOverflowEntries([]);
      },
    );
    return () => unsub();
  }, [userId]);

  const entriesInline: Entry[] = data?.entries ?? [];
  const entries: Entry[] = useMemo(
    () => mergeInlineAndOverflowEntries(entriesInline, overflowEntries),
    [entriesInline, overflowEntries],
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
    if (typeof (data as any)?.finScore === 'number') return (data as any).finScore as number;
    return calculateFinScore(
      entries,
      goals,
      budgets as Record<string, unknown>,
      accountBalances,
      accountMeta as Record<string, { incluirNaSoma?: boolean }>,
      creditSnapshot,
    );
  }, [entries, goals, budgets, accountBalances, accountMeta, creditSnapshot, data]);

  return {
    data,
    loading,
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
