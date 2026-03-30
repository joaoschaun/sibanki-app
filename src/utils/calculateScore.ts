import type { CreditSnapshot, Entry, Goal, UserData } from '../types/userData';

type AccountMetaMap = NonNullable<UserData['accountMeta']>;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function scoreSavingsRate(ratePct: number, hasCashflowData: boolean): number {
  if (!hasCashflowData) return 0;
  if (ratePct >= 20) return 30;
  if (ratePct >= 10) return 24;
  if (ratePct >= 0) return 18;
  if (ratePct >= -10) return 10;
  return 0;
}

function scoreEmergencyReserve(months: number, hasExpenseHistory: boolean): number {
  if (!hasExpenseHistory) return 6;
  if (months >= 6) return 20;
  if (months >= 3) return 14;
  if (months >= 1) return 8;
  if (months > 0) return 4;
  return 0;
}

function scoreBudgetAdherence(overBudgetRatio: number | null): number {
  if (overBudgetRatio === null) return 8;
  if (overBudgetRatio <= 0) return 15;
  if (overBudgetRatio <= 0.25) return 11;
  if (overBudgetRatio <= 0.5) return 7;
  return 2;
}

function scoreCreditPressure(snapshot: CreditSnapshot | null | undefined): number {
  if (!snapshot) return 10;
  const level = snapshot?.pressureLevel ?? 'controlado';
  if (level === 'critico') return 0;
  if (level === 'elevado') return 5;
  if (level === 'atencao') return 10;
  return 15;
}

function scoreGoals(goals: Goal[]): number {
  if (!goals.length) return 4;
  const avgProgress =
    goals.reduce((sum, goal) => {
      const target = Number(goal.target || 0);
      const current = Number(goal.current || 0);
      const pct = target > 0 ? Math.min(1, current / target) : 0;
      return sum + pct;
    }, 0) / goals.length;
  return Math.max(0, Math.min(10, Math.round(avgProgress * 10)));
}

function scoreEntryConsistency(recentEntriesCount: number): number {
  if (recentEntriesCount >= 12) return 10;
  if (recentEntriesCount >= 6) return 8;
  if (recentEntriesCount >= 3) return 5;
  if (recentEntriesCount >= 1) return 2;
  return 0;
}

export function calculateFinScore(
  entries: Entry[],
  goals: Goal[],
  budgets: Record<string, unknown>,
  accountBalances: Record<string, number>,
  accountMeta: AccountMetaMap = {},
  creditSnapshot?: CreditSnapshot | null,
): number {
  const now = new Date();
  const currentMonth = monthKey(now);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentThreshold = thirtyDaysAgo.toISOString().slice(0, 10);

  let incomeMonth = 0;
  let expenseMonth = 0;
  const categoryTotals: Record<string, number> = {};
  const monthlyExpenseByMonth: Record<string, number> = {};
  let recentEntriesCount = 0;

  const accountCurrentBalances: Record<string, number> = {};
  for (const account of Object.keys(accountBalances ?? {})) {
    accountCurrentBalances[account] = Number(accountBalances[account] || 0);
  }

  for (const entry of entries) {
    const entryDate = entry.date ?? '';
    const entryValue = Number(entry.value) || 0;
    const isPending = entry.status === 'pendente' || entry.status === 'agendado';

    if (entry.account) {
      accountCurrentBalances[entry.account] = (accountCurrentBalances[entry.account] ?? 0)
        + (entry.type === 'receita' ? entryValue : -entryValue);
    }

    if (entry.isTransfer || isPending) continue;

    if (entryDate >= recentThreshold) recentEntriesCount += 1;

    const entryMonth = entryDate.slice(0, 7);
    if (entry.type === 'despesa') {
      monthlyExpenseByMonth[entryMonth] = (monthlyExpenseByMonth[entryMonth] ?? 0) + entryValue;
    }

    if (entryMonth !== currentMonth) continue;

    if (entry.type === 'receita') incomeMonth += entryValue;
    if (entry.type === 'despesa') {
      expenseMonth += entryValue;
      const category = entry.category || 'Outros';
      categoryTotals[category] = (categoryTotals[category] ?? 0) + entryValue;
    }
  }

  const savingsRatePct = incomeMonth > 0 ? ((incomeMonth - expenseMonth) / incomeMonth) * 100 : expenseMonth > 0 ? -100 : 0;
  const expenseMonths = Object.values(monthlyExpenseByMonth).filter((value) => value > 0);
  const avgMonthlyExpense = expenseMonths.length
    ? expenseMonths.reduce((sum, value) => sum + value, 0) / expenseMonths.length
    : expenseMonth;

  const availableBalance = Object.entries(accountCurrentBalances).reduce((sum, [account, balance]) => {
    if (accountMeta?.[account]?.incluirNaSoma === false) return sum;
    return sum + balance;
  }, 0);

  const reserveMonths = avgMonthlyExpense > 0 ? availableBalance / avgMonthlyExpense : 0;

  const trackedBudgets = Object.entries(budgets ?? {}).filter(([, limit]) => Number(limit) > 0);
  let overBudgetRatio: number | null = null;
  if (trackedBudgets.length > 0) {
    let overBudgetCount = 0;
    for (const [category, limit] of trackedBudgets) {
      if ((categoryTotals[category] ?? 0) > Number(limit)) overBudgetCount += 1;
    }
    overBudgetRatio = overBudgetCount / trackedBudgets.length;
  }

  const total =
    scoreSavingsRate(savingsRatePct, incomeMonth > 0 || expenseMonth > 0) +
    scoreEmergencyReserve(reserveMonths, avgMonthlyExpense > 0) +
    scoreBudgetAdherence(overBudgetRatio) +
    scoreCreditPressure(creditSnapshot) +
    scoreGoals(goals) +
    scoreEntryConsistency(recentEntriesCount);

  return Math.max(0, Math.min(100, total));
}
