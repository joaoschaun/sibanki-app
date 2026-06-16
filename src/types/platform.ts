import type { Card, CreditAccount, CreditObligation, CreditSnapshot, Entry, Goal, Investment, InvestorProfile, Recurrent } from './userData';

export type FinancialHealthLevel = 'saudavel' | 'atencao' | 'pressao' | 'critico';
export type CreditPressureLevel = 'controlado' | 'atencao' | 'elevado' | 'critico';

export type JourneyStage =
  | 'primeiros-passos'
  | 'organizando-base'
  | 'pressionado'
  | 'estabilizando'
  | 'pronto-para-crescer';

export type PlatformEventName =
  | 'advisor_opened'
  | 'advisor_message_sent'
  | 'advisor_reply_received'
  | 'advisor_reply_failed'
  | 'insight_shown'
  | 'insight_cta_clicked'
  | 'ticker_quote_failed'
  | 'ticker_quote_success'
  // Funil de ativação (Ação #3 — Análise 360)
  | 'activation_signup_completed'
  | 'activation_of_connected'
  | 'activation_first_entry'
  | 'activation_ld_computed'
  // Navegação — uso real por módulo (métricas admin)
  | 'module_viewed';

export interface FinancialProfileInput {
  entries: Entry[];
  goals: Goal[];
  investments: Investment[];
  budgets: Record<string, unknown>;
  accounts: string[];
  accountBalances: Record<string, number>;
  accountMeta?: Record<string, { incluirNaSoma?: boolean }>;
  cards: Card[];
  recurrents?: Recurrent[];
  investorProfile?: InvestorProfile | null;
  creditAccounts?: CreditAccount[];
  creditObligations?: CreditObligation[];
  creditSnapshot?: CreditSnapshot | null;
  data?: Record<string, unknown> | null;
}

export interface ConsolidatedFinancialProfile {
  version: number;
  monthRef: string;
  cashflow: {
    income: number;
    expenses: number;
    balance: number;
    savingsRatePct: number;
  };
  liquidity: {
    includedAccounts: number;
    availableBalance: number;
  };
  budgets: {
    categoriesTracked: number;
    overBudgetCount: number;
  };
  goals: {
    total: number;
    completed: number;
    nearCompletion: number;
  };
  investments: {
    totalApplied: number;
    totalCurrent: number;
    hasPortfolio: boolean;
  };
  credit: {
    activeCards: number;
    totalCardLimit: number;
    estimatedCardUsage: number;
    cardUtilizationPct: number;
    availableLimit: number;
    highUtilizationCards: number;
    dueSoonAmount: number;
    dueSoonCount: number;
    monthlyDebtCommitment: number;
    pressureLevel: CreditPressureLevel;
    externalCreditKnown: boolean;
  };
  products: {
    hasOpenFinance: boolean;
    plan: string;
  };
  advisor: {
    healthLevel: FinancialHealthLevel;
    journeyStage: JourneyStage;
    topSignals: string[];
    nextBestActions: string[];
  };
}
