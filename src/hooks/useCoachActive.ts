/**
 * useCoachActive — Hook centralizado e UNICA fonte de verdade para o onboarding
 * (Modo Coach). Determina se o onboarding ainda esta pendente E o status de cada
 * etapa, para que o gate do painel (isCoachActive) e o checklist visivel
 * (CoachSetup) nunca divirjam.
 *
 * Criterios de conclusao (todos devem ser verdadeiros):
 *  1. accounts   - pelo menos 1 conta cadastrada
 *  2. entries    - pelo menos 3 lancamentos (receita ou despesa)
 *  3. goals      - pelo menos 1 meta financeira
 *  4. debts      - pelo menos 1 divida/obrigacao de credito OU 1 cartao
 *  5. whatsapp   - telefone configurado (phone do Perfil ou whatsappPhone do bot)
 *
 * Tambem e desativado quando o usuario clica em "Dispensar" (localStorage).
 *
 * IMPORTANTE: toda a LOGICA de "concluido por etapa" vive aqui. O CoachSetup
 * consome `stepStatus` e so cuida da apresentacao (titulo, descricao, link).
 */

import { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

const STORAGE_KEY = 'sibanki_coach_dismissed';

export type CoachStepId = 'accounts' | 'entries' | 'goals' | 'debts' | 'whatsapp';

export type CoachStepStatus = Record<CoachStepId, boolean>;

export function useCoachActive() {
  const {
    accounts, entries, goals, creditObligations, cards, data,
  } = useAppContext();

  const [coachDismissed, setCoachDismissedState] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCoachDismissedState(true);
  }, []);

  // Status por etapa - fonte unica de verdade compartilhada pelo gate e pelo checklist.
  const stepStatus = useMemo<CoachStepStatus>(() => ({
    accounts: accounts.length > 0,
    entries: entries.filter((e) => e.type === 'despesa' || e.type === 'receita').length >= 3,
    goals: goals.length > 0,
    debts: creditObligations.length > 0 || (cards || []).length > 0,
    // Aceita tanto phone (gravado pelo Perfil) quanto whatsappPhone (gravado pelo bot WhatsApp).
    whatsapp: !!(data?.whatsappPhone) || !!(data?.phone),
  }), [accounts, entries, goals, creditObligations, cards, data]);

  const allDone = useMemo(
    () => (Object.values(stepStatus) as boolean[]).every(Boolean),
    [stepStatus],
  );

  const isCoachActive = coachDismissed ? false : !allDone;

  return { isCoachActive, coachDismissed, dismiss, stepStatus, allDone };
}
