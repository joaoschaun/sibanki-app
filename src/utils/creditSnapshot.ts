import type { Card, CreditAccount, CreditObligation, CreditSnapshot, Recurrent } from '../types/userData';

type PressureLevel = 'controlado' | 'atencao' | 'elevado' | 'critico';

function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function roundPct(value: number): number {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isDebtLikeLabel(value: unknown): boolean {
  const text = normalizeText(value);
  return /emprest|financ|consign|parcela|credito|divida|cartao|rotativo/.test(text);
}

function resolvePressureLevel(input: {
  cardUtilizationPct: number;
  dueSoonAmount: number;
  availableBalance: number;
  monthlyDebtCommitment: number;
}): PressureLevel {
  if (
    input.cardUtilizationPct >= 85 ||
    (input.dueSoonAmount > 0 && input.availableBalance > 0 && input.availableBalance < input.dueSoonAmount)
  ) {
    return 'critico';
  }
  if (input.cardUtilizationPct >= 60 || input.monthlyDebtCommitment >= 1000) return 'elevado';
  if (input.cardUtilizationPct >= 35 || input.monthlyDebtCommitment > 0) return 'atencao';
  return 'controlado';
}

export function buildCreditSnapshot(input: {
  cards: Card[];
  recurrents?: Recurrent[];
  creditAccounts?: CreditAccount[];
  creditObligations?: CreditObligation[];
  availableBalance?: number;
  persistedSnapshot?: CreditSnapshot | null;
  now?: Date;
}): CreditSnapshot {
  const nowDate = input.now ?? new Date();
  const monthRef = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = nowDate.toISOString().slice(0, 10);
  const in7Days = new Date(nowDate);
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().slice(0, 10);
  const persisted = input.persistedSnapshot ?? null;

  const activeCards = input.cards.filter((card) => card.active !== false);
  let derivedTotalLimit = 0;
  let derivedTotalUsed = 0;
  let derivedHighUtilizationAccounts = 0;
  let dueSoonAmount = 0;
  let dueSoonCount = 0;

  for (const card of activeCards) {
    const limit = Number(card.limit || 0);
    const purchases = Array.isArray(card.purchases) ? card.purchases : [];
    const currentMonthUsage = purchases
      .filter((purchase) => (purchase.billingMonth || '').startsWith(monthRef))
      .reduce((subtotal, purchase) => subtotal + Number(purchase.value || 0), 0);

    derivedTotalLimit += limit;
    derivedTotalUsed += currentMonthUsage;
    if (limit > 0 && currentMonthUsage / limit >= 0.6) derivedHighUtilizationAccounts += 1;

    const bills = Array.isArray(card.faturas) ? (card.faturas as Array<{ vencimento?: string; total?: number }>) : [];
    for (const bill of bills) {
      const dueDate = typeof bill.vencimento === 'string' ? bill.vencimento : '';
      if (!dueDate || dueDate < todayStr || dueDate > in7DaysStr) continue;
      dueSoonCount += 1;
      dueSoonAmount += Number(bill.total || 0);
    }
  }

  let explicitLimit = 0;
  let explicitUsed = 0;
  let explicitHighUtilizationAccounts = 0;
  for (const account of input.creditAccounts || []) {
    if (account.status === 'quitado' || account.status === 'suspenso') continue;
    const limit = Number(account.limitTotal || 0);
    const used = Number(account.balanceUsed || 0);
    explicitLimit += limit;
    explicitUsed += used;
    if (limit > 0 && used / limit >= 0.6) explicitHighUtilizationAccounts += 1;
  }

  const monthlyDebtCommitment = roundCurrency(
    (input.recurrents || []).reduce((sum, recurrent) => {
      if (recurrent?.active === false || recurrent?.type !== 'despesa') return sum;
      if (isDebtLikeLabel(recurrent.category) || isDebtLikeLabel(recurrent.desc)) {
        return sum + Number(recurrent.value || 0);
      }
      return sum;
    }, 0) +
      (input.creditAccounts || []).reduce((sum, account) => sum + Number(account.monthlyInstallment || 0), 0),
  );

  const dueSoonOpenObligations = (input.creditObligations || []).filter((obligation) => {
    if (obligation.status === 'paga') return false;
    const dueDate = obligation.dueDate || '';
    return dueDate >= todayStr && dueDate <= in7DaysStr;
  });
  const explicitDueSoonAmount = dueSoonOpenObligations.reduce((sum, obligation) => sum + Number(obligation.amount || 0), 0);
  const explicitDueSoonCount = dueSoonOpenObligations.length;

  const totalLimit = roundCurrency(
    Math.max(Number(persisted?.totalLimit || 0), derivedTotalLimit, explicitLimit),
  );
  const totalUsed = roundCurrency(
    Math.max(Number(persisted?.totalUsed || 0), derivedTotalUsed, explicitUsed),
  );
  const availableLimit = roundCurrency(Math.max(0, totalLimit - totalUsed));
  const cardUtilizationPct = totalLimit > 0 ? roundPct((totalUsed / totalLimit) * 100) : 0;
  const pressureLevel = resolvePressureLevel({
    cardUtilizationPct,
    dueSoonAmount: Math.max(Number(persisted?.dueSoonAmount || 0), dueSoonAmount, explicitDueSoonAmount),
    availableBalance: Number(input.availableBalance || 0),
    monthlyDebtCommitment,
  });

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    accountsCount: Math.max(
      activeCards.length + (input.creditAccounts || []).length,
      Number(persisted?.accountsCount || 0),
    ),
    obligationsOpenCount: Math.max(
      (input.creditObligations || []).filter((obligation) => obligation.status !== 'paga').length,
      Number(persisted?.obligationsOpenCount || 0),
    ),
    totalLimit,
    totalUsed,
    availableLimit,
    cardUtilizationPct,
    monthlyDebtCommitment,
    dueSoonAmount: roundCurrency(Math.max(Number(persisted?.dueSoonAmount || 0), dueSoonAmount, explicitDueSoonAmount)),
    dueSoonCount: Math.max(Number(persisted?.dueSoonCount || 0), dueSoonCount, explicitDueSoonCount),
    highUtilizationAccounts: Math.max(
      Number(persisted?.highUtilizationAccounts || 0),
      derivedHighUtilizationAccounts,
      explicitHighUtilizationAccounts,
    ),
    pressureLevel,
  };
}
