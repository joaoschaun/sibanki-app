/**
 * deriveCreditData.ts
 *
 * Deriva CreditAccount[] e CreditSnapshot a partir de cards[] do usuário.
 * Usado como fallback no CreditHub quando o usuário não conectou Open Finance.
 *
 * source = 'legacy-derived' para indicar que os dados são calculados localmente.
 */
import type { Card, CardPurchase, CreditAccount, CreditSnapshot } from '../types/userData';
import { getBillingMonth } from '../services/persistUserData';

/** Calcula o total da fatura do mês de fechamento atual para um cartão. */
function calcCurrentBill(card: Card): number {
  if (!card.purchases?.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  const bm = getBillingMonth(card, today);
  return (card.purchases as CardPurchase[])
    .filter((p) => p.billingMonth === bm)
    .reduce((sum, p) => sum + (p.value ?? 0), 0);
}

/**
 * Mapeia um Card para CreditAccount (kind='cartao').
 * Preenche apenas os campos que podem ser derivados sem dados externos.
 */
export function cardToCreditAccount(card: Card): CreditAccount {
  const balanceUsed = Math.round(calcCurrentBill(card) * 100) / 100;
  const limitTotal = card.limit ?? 0;
  return {
    id: `derived-${card.id}`,
    kind: 'cartao',
    label: card.name,
    institution: (card as Card & { bank?: string }).bank ?? undefined,
    source: 'legacy-derived',
    status: 'ativo',
    limitTotal,
    balanceUsed,
    availableLimit: Math.max(0, limitTotal - balanceUsed),
    closeDay: card.closeDay,
    dueDay: card.dueDay,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deriva CreditAccount[] a partir de cards[].
 * Filtra apenas cartões ativos (active !== false).
 */
export function deriveCreditAccountsFromCards(cards: Card[]): CreditAccount[] {
  return cards
    .filter((c) => c.active !== false)
    .map(cardToCreditAccount);
}

/**
 * Regras de pressão baseadas em utilização dos cartões:
 * < 30%   → controlado
 * 30–50%  → atencao
 * 50–80%  → elevado
 * > 80%   → critico
 */
function calcPressureLevel(utilizationPct: number): CreditSnapshot['pressureLevel'] {
  if (utilizationPct < 30) return 'controlado';
  if (utilizationPct < 50) return 'atencao';
  if (utilizationPct < 80) return 'elevado';
  return 'critico';
}

/**
 * Calcula dueSoonAmount: soma das faturas de cartões cujo vencimento
 * (dueDay do mês atual) cai nos próximos 7 dias.
 */
function calcDueSoon(accounts: CreditAccount[]): { amount: number; count: number } {
  const today = new Date();
  const todayDay = today.getDate();
  const soon = accounts.filter((a) => {
    if (a.kind !== 'cartao' || !a.dueDay) return false;
    const diff = a.dueDay - todayDay;
    return diff >= 0 && diff <= 7;
  });
  return {
    amount: Math.round(soon.reduce((s, a) => s + (a.balanceUsed ?? 0), 0) * 100) / 100,
    count: soon.length,
  };
}

/**
 * Deriva CreditSnapshot a partir de CreditAccount[].
 * Considera apenas contas 'cartao' para utilização.
 * (Empréstimos derivados podem ser adicionados futuramente.)
 */
export function deriveSnapshotFromAccounts(accounts: CreditAccount[]): CreditSnapshot {
  const cardAccts = accounts.filter((a) => a.kind === 'cartao');
  const totalLimit = cardAccts.reduce((s, a) => s + (a.limitTotal ?? 0), 0);
  const totalUsed = cardAccts.reduce((s, a) => s + (a.balanceUsed ?? 0), 0);
  const availableLimit = Math.max(0, totalLimit - totalUsed);
  const cardUtilizationPct = totalLimit > 0
    ? Math.round((totalUsed / totalLimit) * 1000) / 10
    : 0;
  const highUtilizationAccounts = cardAccts.filter((a) => {
    const pct = (a.limitTotal ?? 0) > 0
      ? ((a.balanceUsed ?? 0) / (a.limitTotal ?? 1)) * 100
      : 0;
    return pct >= 70;
  }).length;
  const dueSoon = calcDueSoon(cardAccts);
  const monthlyDebtCommitment = Math.round(totalUsed * 100) / 100;

  return {
    version: 0,
    updatedAt: new Date().toISOString(),
    accountsCount: accounts.length,
    obligationsOpenCount: cardAccts.filter((a) => (a.balanceUsed ?? 0) > 0).length,
    totalLimit,
    totalUsed: Math.round(totalUsed * 100) / 100,
    availableLimit: Math.round(availableLimit * 100) / 100,
    cardUtilizationPct,
    monthlyDebtCommitment,
    dueSoonAmount: dueSoon.amount,
    dueSoonCount: dueSoon.count,
    highUtilizationAccounts,
    pressureLevel: calcPressureLevel(cardUtilizationPct),
  };
}
