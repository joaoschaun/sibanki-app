import type {
  ConsolidatedFinancialProfile,
  FinancialProfileInput,
  FinancialHealthLevel,
  JourneyStage,
} from '../types/platform';
import { isTransferEntry } from './entryUtils';
import { buildCreditSnapshot } from './creditSnapshot';

function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function roundPct(value: number): number {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function resolvePlan(data?: Record<string, unknown> | null): string {
  const raw = typeof data?.plan === 'string' ? data.plan : 'gratuito';
  return raw.trim() || 'gratuito';
}

function resolveHealthLevel(input: {
  balance: number;
  savingsRatePct: number;
  overBudgetCount: number;
  cardUtilizationPct: number;
  hasOpenFinance: boolean;
}): FinancialHealthLevel {
  if (input.balance < 0 || input.cardUtilizationPct >= 85) return 'critico';
  if (input.savingsRatePct < 0 || input.overBudgetCount >= 2 || input.cardUtilizationPct >= 60) return 'pressao';
  if (input.savingsRatePct < 10 || !input.hasOpenFinance) return 'atencao';
  return 'saudavel';
}

function resolveJourneyStage(input: {
  entriesCount: number;
  goalsCount: number;
  hasOpenFinance: boolean;
  healthLevel: FinancialHealthLevel;
  hasInvestments: boolean;
}): JourneyStage {
  if (input.entriesCount < 5) return 'primeiros-passos';
  if (input.healthLevel === 'critico' || input.healthLevel === 'pressao') return 'pressionado';
  if (input.goalsCount === 0 || !input.hasOpenFinance) return 'organizando-base';
  if (!input.hasInvestments) return 'estabilizando';
  return 'pronto-para-crescer';
}

function buildNextBestActions(input: {
  hasOpenFinance: boolean;
  goalsCount: number;
  overBudgetCount: number;
  healthLevel: FinancialHealthLevel;
  hasInvestments: boolean;
  cardUtilizationPct: number;
  monthlyDebtCommitment: number;
  dueSoonAmount: number;
}): string[] {
  const actions: string[] = [];
  if (!input.hasOpenFinance) actions.push('conectar-open-finance');
  if (input.cardUtilizationPct >= 60) actions.push('revisar-credito');
  if (input.monthlyDebtCommitment > 0 || input.dueSoonAmount > 0) actions.push('organizar-dividas');
  if (input.overBudgetCount > 0) actions.push('ajustar-orcamento');
  if (input.goalsCount === 0) actions.push('criar-meta');
  if (!input.hasInvestments && input.healthLevel === 'saudavel') actions.push('avaliar-investimentos');
  if (actions.length === 0) actions.push('aprofundar-consultoria');
  return actions.slice(0, 3);
}

function buildTopSignals(input: {
  balance: number;
  savingsRatePct: number;
  overBudgetCount: number;
  cardUtilizationPct: number;
  hasOpenFinance: boolean;
  goalsNearCompletion: number;
  dueSoonAmount: number;
  monthlyDebtCommitment: number;
}): string[] {
  const signals: string[] = [];
  if (input.balance < 0) signals.push('saldo-mensal-negativo');
  if (input.savingsRatePct >= 15) signals.push('boa-capacidade-de-poupar');
  if (input.overBudgetCount > 0) signals.push('orcamento-sob-pressao');
  if (input.cardUtilizationPct >= 60) signals.push('uso-elevado-de-limite');
  if (input.dueSoonAmount > 0) signals.push('fatura-ou-parcela-vencendo');
  if (input.monthlyDebtCommitment > 0) signals.push('compromisso-mensal-com-dividas');
  if (!input.hasOpenFinance) signals.push('dados-bancarios-ainda-nao-conectados');
  if (input.goalsNearCompletion > 0) signals.push('meta-perto-da-conclusao');
  return signals.slice(0, 5);
}

export function buildFinancialProfile(input: FinancialProfileInput): ConsolidatedFinancialProfile {
  const now = new Date();
  const monthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const entriesNoTransfer = input.entries.filter((entry) => !isTransferEntry(entry));
  const monthEntries = entriesNoTransfer.filter((entry) => (entry.date || '').startsWith(monthRef));

  const income = roundCurrency(
    monthEntries.filter((entry) => entry.type === 'receita').reduce((sum, entry) => sum + Number(entry.value || 0), 0),
  );
  const expenses = roundCurrency(
    monthEntries.filter((entry) => entry.type === 'despesa').reduce((sum, entry) => sum + Number(entry.value || 0), 0),
  );
  const balance = roundCurrency(income - expenses);
  const savingsRatePct = income > 0 ? roundPct((balance / income) * 100) : 0;

  const includedAccounts = input.accounts.filter((account) => input.accountMeta?.[account]?.incluirNaSoma !== false);
  const availableBalance = roundCurrency(
    includedAccounts.reduce((sum, account) => sum + Number(input.accountBalances?.[account] || 0), 0),
  );

  const categoryTotals: Record<string, number> = {};
  for (const entry of monthEntries) {
    if (entry.type !== 'despesa') continue;
    const category = String(entry.category || 'Outros');
    categoryTotals[category] = (categoryTotals[category] || 0) + Number(entry.value || 0);
  }

  const budgetsNumeric = Object.entries(input.budgets || {}).reduce<Record<string, number>>((acc, [key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) acc[key] = value;
    return acc;
  }, {});

  const overBudgetCount = Object.entries(budgetsNumeric).filter(([category, budgetValue]) => {
    const spent = categoryTotals[category] || 0;
    return budgetValue > 0 && spent > budgetValue;
  }).length;

  const goalsCompleted = input.goals.filter((goal) => Number(goal.target || 0) > 0 && Number(goal.current || 0) >= Number(goal.target || 0)).length;
  const goalsNearCompletion = input.goals.filter((goal) => {
    const target = Number(goal.target || 0);
    const current = Number(goal.current || 0);
    return target > 0 && current < target && current / target >= 0.7;
  }).length;

  const totalApplied = roundCurrency(input.investments.reduce((sum, investment) => sum + Number(investment.valor || 0), 0));
  const totalCurrent = roundCurrency(input.investments.reduce((sum, investment) => sum + Number(investment.atual ?? investment.valor ?? 0), 0));

  const creditSnapshot = buildCreditSnapshot({
    cards: input.cards,
    recurrents: input.recurrents,
    creditAccounts: input.creditAccounts,
    creditObligations: input.creditObligations,
    availableBalance,
    persistedSnapshot: input.creditSnapshot ?? null,
    now,
  });
  const activeCards = input.cards.filter((card) => card.active !== false);

  const hasOpenFinance = input.data?.openBankingAtivo === true;
  const healthLevel = resolveHealthLevel({
    balance,
    savingsRatePct,
    overBudgetCount,
    cardUtilizationPct: creditSnapshot.cardUtilizationPct,
    hasOpenFinance,
  });
  const journeyStage = resolveJourneyStage({
    entriesCount: entriesNoTransfer.length,
    goalsCount: input.goals.length,
    hasOpenFinance,
    healthLevel,
    hasInvestments: input.investments.length > 0,
  });

  return {
    version: 1,
    monthRef,
    cashflow: {
      income,
      expenses,
      balance,
      savingsRatePct,
    },
    liquidity: {
      includedAccounts: includedAccounts.length,
      availableBalance,
    },
    budgets: {
      categoriesTracked: Object.keys(budgetsNumeric).length,
      overBudgetCount,
    },
    goals: {
      total: input.goals.length,
      completed: goalsCompleted,
      nearCompletion: goalsNearCompletion,
    },
    investments: {
      totalApplied,
      totalCurrent,
      hasPortfolio: input.investments.length > 0,
    },
    credit: {
      activeCards: activeCards.length,
      totalCardLimit: creditSnapshot.totalLimit,
      estimatedCardUsage: creditSnapshot.totalUsed,
      cardUtilizationPct: creditSnapshot.cardUtilizationPct,
      availableLimit: creditSnapshot.availableLimit,
      highUtilizationCards: creditSnapshot.highUtilizationAccounts,
      dueSoonAmount: creditSnapshot.dueSoonAmount,
      dueSoonCount: creditSnapshot.dueSoonCount,
      monthlyDebtCommitment: creditSnapshot.monthlyDebtCommitment,
      pressureLevel: creditSnapshot.pressureLevel || 'controlado',
      externalCreditKnown:
        (input.creditAccounts || []).length > 0 ||
        (input.creditObligations || []).length > 0 ||
        Boolean(input.creditSnapshot),
    },
    products: {
      hasOpenFinance,
      plan: resolvePlan(input.data),
    },
    advisor: {
      healthLevel,
      journeyStage,
      topSignals: buildTopSignals({
        balance,
        savingsRatePct,
        overBudgetCount,
        cardUtilizationPct: creditSnapshot.cardUtilizationPct,
        hasOpenFinance,
        goalsNearCompletion,
        dueSoonAmount: creditSnapshot.dueSoonAmount,
        monthlyDebtCommitment: creditSnapshot.monthlyDebtCommitment,
      }),
      nextBestActions: buildNextBestActions({
        hasOpenFinance,
        goalsCount: input.goals.length,
        overBudgetCount,
        healthLevel,
        hasInvestments: input.investments.length > 0,
        cardUtilizationPct: creditSnapshot.cardUtilizationPct,
        monthlyDebtCommitment: creditSnapshot.monthlyDebtCommitment,
        dueSoonAmount: creditSnapshot.dueSoonAmount,
      }),
    },
  };
}
