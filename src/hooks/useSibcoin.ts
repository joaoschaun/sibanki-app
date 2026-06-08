/**
 * useSibcoin — Hook para consumir o rewardEngine no front-end.
 *
 * Responsabilidades:
 *   - Expor saldo, tier, missões e histórico do usuário
 *   - Disparar eventos SibCoin via Cloud Function (triggerSibcoinEvent)
 *   - Buscar missões disponíveis (getSibcoinMissions)
 *   - Cache local com invalidação automática
 */

import { useState, useCallback, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { fnsBR } from '../firebase';
import { useAppContext } from '../context/AppContext';
import type { SibcoinTransaction } from '../types/userData';

export type SibcoinTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface SibcoinMissionStatus {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: string;
  reward: number;
  requiredEvent: string;
  iconEmoji?: string;
  completed: boolean;
  active: boolean;
}

export interface SibcoinEventResult {
  completedMissions: Array<{ id: string; title: string; reward: number; iconEmoji?: string }>;
  sibcoinAwarded: number;
  newBalance: number;
  newTier: SibcoinTier;
}

export type SibcoinEventType =
  | 'entry_added'
  | 'goal_created'
  | 'open_finance_connected'
  | 'profile_completed'
  | 'investment_added'
  | 'budget_created'
  | 'login_streak'
  | 'referral_signup'
  | 'dda_boleto_detected';

const TIER_LABELS: Record<SibcoinTier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  diamond: 'Diamante',
};

const TIER_COLORS: Record<SibcoinTier, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  diamond: '#b9f2ff',
};

export function useSibcoin() {
  const { user, data } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missions, setMissions] = useState<SibcoinMissionStatus[]>([]);
  const [lastEvent, setLastEvent] = useState<SibcoinEventResult | null>(null);

  // Dados do Firestore (via AppContext)
  const balance = data?.sibcoinBalance ?? 0;
  const tier = (data?.sibcoinTier as SibcoinTier) ?? 'bronze';
  const earned = data?.sibcoinEarned ?? 0;
  const spent = data?.sibcoinSpent ?? 0;
  const history = (data?.sibcoinHistory ?? []) as SibcoinTransaction[];
  const completedMissions = data?.sibcoinMissionsCompleted ?? {};

  // Auto-load missions once per session when user is available
  useEffect(() => {
    if (user?.uid && missions.length === 0 && !missionsLoading) {
      fetchMissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  /**
   * Dispara um evento SibCoin.
   * Retorna as missões completadas e o SibCoin creditado.
   */
  const triggerEvent = useCallback(
    async (eventType: SibcoinEventType, eventMeta?: Record<string, unknown>): Promise<SibcoinEventResult | null> => {
      setLoading(true);
      try {
        const functions = fnsBR;
        const fn = httpsCallable<
          { eventType: string; eventMeta?: Record<string, unknown> },
          SibcoinEventResult
        >(functions, 'triggerSibcoinEvent');

        const result = await fn({ eventType, eventMeta });
        setLastEvent(result.data);
        return result.data;
      } catch (err) {
        console.error('[useSibcoin] triggerEvent error:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Busca a lista de missões com status do usuário.
   */
  const fetchMissions = useCallback(async () => {
    setMissionsLoading(true);
    try {
      const functions = fnsBR;
      const fn = httpsCallable<void, { missions: SibcoinMissionStatus[]; balance: number; tier: string; earned: number }>(
        functions,
        'getSibcoinMissions'
      );
      const result = await fn();
      setMissions(result.data.missions);
      return result.data.missions;
    } catch (err) {
      console.error('[useSibcoin] fetchMissions error:', err);
      return [];
    } finally {
      setMissionsLoading(false);
    }
  }, []);

  // Utilitários
  const tierLabel = TIER_LABELS[tier];
  const tierColor = TIER_COLORS[tier];

  const pendingMissions = missions.filter((m) => !m.completed && m.active);
  const completedMissionsCount = missions.filter((m) => m.completed).length;

  return {
    // Dados
    balance,
    tier,
    tierLabel,
    tierColor,
    earned,
    spent,
    history,
    completedMissions,
    // Missões
    missions,
    pendingMissions,
    completedMissionsCount,
    // Estado
    loading,
    missionsLoading,
    lastEvent,
    // Ações
    triggerEvent,
    fetchMissions,
  };
}
