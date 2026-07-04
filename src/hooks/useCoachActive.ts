/**
 * useCoachActive — Hook centralizado para determinar se o onboarding (Modo Coach)
 * ainda está pendente. Elimina duplicação de lógica em Dashboard, Sidebar e
 * BottomNavigation.
 *
 * Critérios de conclusão (todos devem ser verdadeiros):
 *  1. Pelo menos 1 conta cadastrada
 *  2. Pelo menos 3 lançamentos (receita ou despesa)
 *  3. Pelo menos 1 meta financeira
 *  4. Pelo menos 1 dívida/obrigação de crédito registrada
 *  5. Pelo menos 1 investimento adicionado
 *  6. WhatsApp configurado no perfil
 *
 * Também é desativado quando o usuário clica em "Dispensar" (localStorage).
 */

import { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

const STORAGE_KEY = 'sibanki_coach_dismissed';

export function useCoachActive() {
  const {
    accounts, entries, goals, creditObligations, cards, data
  } = useAppContext();

  const [coachDismissed, setCoachDismissedState] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCoachDismissedState(true);
  }, []);

  const isCoachActive = useMemo(() => {
    if (coachDismissed) return false;
    const hasAccounts = accounts.length > 0;
    const hasMinEntries = entries.filter(e => e.type === 'despesa' || e.type === 'receita').length >= 3;
    const hasGoals = goals.length > 0;
    const hasDebts = creditObligations.length > 0 || (cards || []).length > 0;
    // Aceita tanto phone (gravado pelo Perfil) quanto whatsappPhone (gravado pelo bot WhatsApp).
    const hasWhatsapp = !!(data?.whatsappPhone) || !!(data?.phone);
    const allDone = hasAccounts && hasMinEntries && hasGoals && hasDebts && hasWhatsapp;
    return !allDone;
  }, [accounts, entries, goals, creditObligations, data, cards, coachDismissed]);

  return { isCoachActive, coachDismissed, dismiss };
}
