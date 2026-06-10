/**
 * usePriceAlerts — CRUD para alertas de preço do usuário.
 *
 * Lê: AppContext.data.priceAlerts[]
 * Escreve: persistUserData.updateUserData({ priceAlerts })
 * Callback: triggerSibcoinEvent('alerta_preco_criado') ao criar alerta
 *
 * O job de verificação (`checkPriceAlerts` em telegramBot.js) já existe —
 * acessa users/{uid}.priceAlerts[] e dispara Telegram se preço atingido.
 *
 * TODO (quando implementar push no backend):
 *   Estender checkPriceAlerts para chamar pushService.sendPush() quando
 *   channels inclui 'push'.
 */

import { useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { updateUserDoc } from '../services/persistUserData';
import type { PriceAlert } from '../types/userData';

export interface UsePriceAlertsReturn {
  /** Todos os alertas ativos do usuário. */
  alerts: PriceAlert[];
  /** Adiciona ou atualiza um alerta. Se id já existir, substitui. */
  setAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  /** Remove um alerta pelo id. */
  deleteAlert: (id: string) => Promise<void>;
  /** Remove todos os alertas de um determinado ticker. */
  clearAlertsForTicker: (ticker: string) => Promise<void>;
  /** Retorna alertas para um ticker específico. */
  alertsForTicker: (ticker: string) => PriceAlert[];
  /** True enquanto operação de escrita estiver em andamento. */
  saving: boolean;
}

export function usePriceAlerts(): UsePriceAlertsReturn {
  const { user, data } = useAppContext();

  const alerts = useMemo<PriceAlert[]>(
    () => (data?.priceAlerts ?? []),
    [data?.priceAlerts],
  );

  const saveAlerts = useCallback(async (next: PriceAlert[]) => {
    if (!user?.uid) return;
    await updateUserDoc(user.uid, { priceAlerts: next } as any);
  }, [user?.uid]);

  const setAlert = useCallback(async (
    partial: Omit<PriceAlert, 'id' | 'createdAt'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const id = partial.id ?? crypto.randomUUID();

    const alert: PriceAlert = {
      id,
      createdAt: now,
      ...partial,
    } as PriceAlert;

    const exists = alerts.some((a) => a.id === id);
    const next = exists
      ? alerts.map((a) => (a.id === id ? { ...a, ...alert } : a))
      : [...alerts, alert];

    await saveAlerts(next);
  }, [alerts, saveAlerts]);

  const deleteAlert = useCallback(async (id: string) => {
    await saveAlerts(alerts.filter((a) => a.id !== id));
  }, [alerts, saveAlerts]);

  const clearAlertsForTicker = useCallback(async (ticker: string) => {
    const upper = ticker.toUpperCase();
    await saveAlerts(alerts.filter((a) => a.ticker.toUpperCase() !== upper));
  }, [alerts, saveAlerts]);

  const alertsForTicker = useCallback((ticker: string): PriceAlert[] => {
    const upper = ticker.toUpperCase();
    return alerts.filter((a) => a.ticker.toUpperCase() === upper);
  }, [alerts]);

  return {
    alerts,
    setAlert,
    deleteAlert,
    clearAlertsForTicker,
    alertsForTicker,
    saving: false, // placeholder — implementar loading state se necessário
  };
}
