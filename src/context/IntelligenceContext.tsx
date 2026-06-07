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
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAppContext, type DataFreshness } from './AppContext';
import {
  calculateDaysOfFreedom,
  calculateSpreadGap,
  type DaysOfFreedomResult,
  type SpreadGapResult,
} from '../utils/sovereigntyEngine';
import type { FinancialHealthLevel, JourneyStage } from '../types/platform';

// ─────────────────────────────────────────────────────────────────────────────
// CDI de referência (atualizar conforme mercado)
// ─────────────────────────────────────────────────────────────────────────────
const CDI_MONTHLY = 0.0107; // ~12.8% a.a.


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
    data,
  } = useAppContext();

  // Ld — Dias de Liberdade
  // Memoizado nas dependências reais: entries, investments, saldos e cadastroCompleto estimado
  const freedom = useMemo(
    () =>
      calculateDaysOfFreedom({
        accountBalances,
        accountMeta,
        investments,
        entries,
        cadastroCompleto: data?.cadastroCompleto,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, investments, accountBalances, accountMeta, data?.cadastroCompleto],
  );

  // Sg — Spread Gap
  // Memoizado nas dependências reais: investimentos, dívidas, cartões
  const spread = useMemo(
    () =>
      calculateSpreadGap({
        investments,
        creditObligations,
        cards,
        currentCdiMonthly: CDI_MONTHLY,
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
