import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserData, Entry, Recurrent, InvestorProfile } from '../types/userData';

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

  // Score: pode vir de um campo futuro ou ser calculado (como no app atual)
  const score = typeof (data as any)?.finScore === 'number' ? (data as any).finScore : 90;

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
    investorProfile: (data?.investorProfile as InvestorProfile | undefined) ?? undefined,
    score,
  };
}
