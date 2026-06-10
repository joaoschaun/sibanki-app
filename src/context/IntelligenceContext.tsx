/**
 * IntelligenceContext — camada de inteligência separada do AppContext.
 *
 * Responsabilidade única: transformar dados brutos em insights acionáveis.
 *
 * AppContext  →  "o que o usuário TEM"  (dados, contas, transações)
 * IntelligenceContext  →  "o que isso SIGNIFICA"  (Ld, Sg, healthLevel, nextBestActions)
 *
 * Benefícios:
 *   - Sovereignty Engine roda uma vez, memoizado por dependências reais
 *   - Nenhuma página conhece os engines diretamente — consomem via useIntelligence()
 *   - Testável isoladamente com dados mockados
 */
import { createContext, useContext, useMemo, useEffect, type ReactNode } from 'react';
import { useAppContext, type DataFreshness } from './AppContext';
import { trackPlatformEvent } from '../services/platformEvents';
import { useMarketRates } from '../hooks/useMarketRates';
import {
  calculateDaysOfFreedom,
  calculateSpreadGap,
  type DaysOfFreedomResult,
  type SpreadGapResult,
} from '../utils/sovereigntyEngine';
import type { FinancialHealthLevel, JourneyStage } from '../types/platform';

// Fallback para quando a API de mercado estiver indisponível
const CDI_FALLBACK_MONTHLY = 0.0107; // ~12.8% a.a.


// ─────────────────────────────────────────────────────────────────────────────
// INTERFACE PÚBLICA
// ─────────────────────────────────────────────────────────────────────────────
export interface IntelligenceState {
  // ── Advisor (Financial Profile Engine) ──────────────────────────────────
  healthLevel: FinancialHealthLevel;
  journeyStage: JourneyStage;
  nextBestActions: string[];
  topSignals: string[];

  // ── Cashflow do mês atual ────────────────────────────────────────────────
  income: number;
  expenses: number;
  balance: number;
  savingsRatePct: number;

  // ── Sovereignty Engine ───────────────────────────────────────────────────
  /** Ld — Dias de Liberdade */
  freedom: DaysOfFreedomResult;
  /** Sg — Spread Gap */
  spread: SpreadGapResult;

  // ── Investimentos ────────────────────────────────────────────────────────
  totalInvested: number;
  hasPortfolio: boolean;

  // ── Liquidez disponível ──────────────────────────────────────────────────
  availableBalance: number;

  // ── Meta / qualidade dos dados ───────────────────────────────────────────
  hasOpenFinance: boolean;
  dataFreshness: DataFreshness;
  /** true quando auth + Firestore terminaram de carregar */
  isReady: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTO
// ─────────────────────────────────────────────────────────────────────────────
const IntelligenceContext = createContext<IntelligenceState | null>(null);

export function IntelligenceProvider({ children }: { children: ReactNode }) {
  const {
    user,
    financialProfile,
    entries,
    investments,
    creditObligations,
    cards,
    accountBalances,
    accountMeta,
    hasOpenFinance,
    dataFreshness,
    loading,
    authLoading,
  } = useAppContext();

  const { cdiMonthly } = useMarketRates();

  // Ld — Dias de Liberdade
  // Memoizado nas dependências reais: entries, investments, saldos
  const freedom = useMemo(
    () =>
      calculateDaysOfFreedom({
        accountBalances,
        accountMeta,
        investments,
        entries,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, investments, accountBalances, accountMeta],
  );

  // Funil de ativação (Ação #3 — Análise 360): marco "primeiro Ld real".
  // Dispara uma única vez por uid quando o Ld é calculado com dados de verdade
  // (0 < days < 99999). Dedup em localStorage; fire-and-forget.
  useEffect(() => {
    if (!user?.uid || loading) return;
    if (!(freedom.days > 0 && freedom.days < 99999)) return;
    const key = `sib_funnel_ld_${user.uid}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    void trackPlatformEvent('activation_ld_computed', {
      days: freedom.days,
      status: freedom.status,
      dataConfidence: freedom.dataConfidence,
      isEstimated: Boolean(freedom.isEstimated),
    });
  }, [user?.uid, loading, freedom]);

  // Sg — Spread Gap
  // Memoizado nas dependências reais: investimentos, dívidas, cartões
  const spread = useMemo(
    () =>
      calculateSpreadGap({
        investments,
        creditObligations,
        cards,
        currentCdiMonthly: cdiMonthly ?? CDI_FALLBACK_MONTHLY,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investments, creditObligations, cards],
  );

  // Estado unificado de inteligência
  const state = useMemo<IntelligenceState>(
    () => ({
      // Advisor
      healthLevel: financialProfile.advisor.healthLevel,
      journeyStage: financialProfile.advisor.journeyStage,
      nextBestActions: financialProfile.advisor.nextBestActions,
      topSignals: financialProfile.advisor.topSignals,
      // Cashflow
      income: financialProfile.cashflow.income,
      expenses: financialProfile.cashflow.expenses,
      balance: financialProfile.cashflow.balance,
      savingsRatePct: financialProfile.cashflow.savingsRatePct,
      // Sovereignty
      freedom,
      spread,
      // Investimentos
      totalInvested: financialProfile.investments.totalCurrent,
      hasPortfolio: financialProfile.investments.hasPortfolio,
      // Liquidez
      availableBalance: financialProfile.liquidity.availableBalance,
      // Meta
      hasOpenFinance,
      dataFreshness,
      isReady: !loading && !authLoading,
    }),
    [financialProfile, freedom, spread, hasOpenFinance, dataFreshness, loading, authLoading],
  );

  return (
    <IntelligenceContext.Provider value={state}>
      {children}
    </IntelligenceContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PÚBLICO
// ─────────────────────────────────────────────────────────────────────────────
/** Consome a camada de inteligência em qualquer componente filho. */
export function useIntelligence(): IntelligenceState {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) throw new Error('useIntelligence deve ser usado dentro de <IntelligenceProvider>');
  return ctx;
}
