import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserData, Entry, Recurrent, InvestorProfile, CreditAccount, CreditObligation, CreditSnapshot } from '../types/userData';
import { calculateFinScore } from '../utils/calculateScore';

/**
 * Lê os dados do documento único users/{uid} (mesmo modelo do app atual).
 * Nada é perdido: entries, accountBalances, cards, goals, etc.
 */
export function useFinancialData(userId: string | undefined) {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
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
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const entries: Entry[] = data?.entries ?? [];
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

  // Score: calculado em tempo real; finScore salvo no Firestore tem prioridade
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
