import type { Card, CreditAccount } from '../types/userData';
import { getBillingMonth } from '../services/persistUserData';

export type UpcomingDueItem = {
  label: string;
  dueDay: number;
  daysUntil: number;
  amount: number;
};

/**
 * Lista vencimentos (dueDay) nos próximos `rangeDays` dias a partir de contas de crédito e cartões operacionais.
 */
export function upcomingDueDates(
  accounts: CreditAccount[],
  cards: Card[],
  rangeDays = 14,
): UpcomingDueItem[] {
  const today = new Date();
  const todayDay = today.getDate();
  const nowStr = today.toISOString().split('T')[0];
  const items: UpcomingDueItem[] = [];

  for (const a of accounts) {
    if (!a.dueDay) continue;
    const diff = a.dueDay - todayDay;
    const daysUntil = diff >= 0 ? diff : diff + 31;
    if (daysUntil < 0 || daysUntil > rangeDays) continue;
    items.push({
      label: a.label,
      dueDay: a.dueDay,
      daysUntil,
      amount: a.balanceUsed ?? 0,
    });
  }

  for (const card of cards) {
    if (card.active === false) continue;
    if (!card.dueDay) continue;
    const diff = card.dueDay - todayDay;
    const daysUntil = diff >= 0 ? diff : diff + 31;
    if (daysUntil < 0 || daysUntil > rangeDays) continue;
    if (accounts.some((a) => a.label === card.name)) continue;
    const bm = getBillingMonth(card, nowStr);
    const amount = (card.purchases ?? [])
      .filter((p) => p.billingMonth === bm)
      .reduce((s, p) => s + (p.value ?? 0), 0);
    items.push({
      label: card.name,
      dueDay: card.dueDay,
      daysUntil,
      amount,
    });
  }

  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}
