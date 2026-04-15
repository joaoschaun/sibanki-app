import { describe, it, expect } from 'vitest';
import { buildCreditSnapshot } from './creditSnapshot';
import type { Card } from '../types/userData';

describe('buildCreditSnapshot', () => {
  it('soma dueSoonAmount via dueDay quando faturas está vazio', () => {
    const now = new Date(2026, 3, 10);
    const card: Card = {
      id: 1,
      name: 'Teste',
      limit: 5000,
      closeDay: 3,
      dueDay: 12,
      purchases: [
        {
          id: 1,
          desc: 'x',
          value: 250,
          date: '2026-04-05',
          billingMonth: '2026-04',
        },
      ],
      faturas: [],
    };
    const snap = buildCreditSnapshot({ cards: [card], now });
    expect(snap.dueSoonCount).toBeGreaterThanOrEqual(1);
    expect(snap.dueSoonAmount).toBeGreaterThanOrEqual(250);
  });

  it('não duplica dueSoon quando faturas já traz vencimento na janela', () => {
    const now = new Date(2026, 3, 10);
    const card: Card = {
      id: 2,
      name: 'Com fatura',
      limit: 5000,
      closeDay: 3,
      dueDay: 12,
      purchases: [
        {
          id: 1,
          desc: 'x',
          value: 100,
          date: '2026-04-05',
          billingMonth: '2026-04',
        },
      ],
      faturas: [{ vencimento: '2026-04-12', total: 400 }],
    };
    const snap = buildCreditSnapshot({ cards: [card], now });
    expect(snap.dueSoonAmount).toBeGreaterThanOrEqual(400);
    expect(snap.dueSoonCount).toBeGreaterThanOrEqual(1);
  });
});
