/**
 * cardCycleUtils.test.ts
 * Testes unitários para o engine de ciclos de fatura.
 * Roda com: npm run test:unit
 */
import { describe, it, expect } from 'vitest';
import {
  getCurrentCycle,
  getCycleKeyForPurchaseDate,
  getPastCycles,
  sumPurchasesForCycle,
  computeCardBillingState,
  expandInstallments,
  formatCycleKey,
  getCycleForDueMonth,
} from './cardCycleUtils';
import type { CardPurchaseNew } from './cardCycleUtils';

const CD = 3;  // closeDay
const DD = 10; // dueDay

// ── getCycleForDueMonth ───────────────────────────────────────────────────────
describe('getCycleForDueMonth', () => {
  it('calcula datas corretas para fev/2024', () => {
    const c = getCycleForDueMonth(3, 10, 2024, 2);
    expect(c.key).toBe('2024-02');
    expect(c.closeDate).toBe('2024-02-03');
    expect(c.dueDate).toBe('2024-02-10');
    expect(c.startDate).toBe('2024-01-04');
  });

  it('marca como fechado quando hoje > closeDate', () => {
    const today = new Date('2024-02-15');
    const c = getCycleForDueMonth(3, 10, 2024, 2, today);
    expect(c.isClosed).toBe(true);
    expect(c.isOverdue).toBe(true);
  });

  it('não marca como fechado quando hoje < closeDate', () => {
    const today = new Date('2024-02-01');
    const c = getCycleForDueMonth(3, 10, 2024, 2, today);
    expect(c.isClosed).toBe(false);
    expect(c.isOverdue).toBe(false);
  });

  it('lida com virada de ano (ciclo jan/2024)', () => {
    const c = getCycleForDueMonth(3, 10, 2024, 1);
    expect(c.key).toBe('2024-01');
    expect(c.closeDate).toBe('2024-01-03');
    expect(c.startDate).toBe('2023-12-04');
  });

  it('clamp em fev (closeDay=31 → 28 em 2023)', () => {
    const c = getCycleForDueMonth(31, 5, 2023, 2);
    expect(c.closeDate).toBe('2023-02-28');
  });
});

// ── getCurrentCycle ───────────────────────────────────────────────────────────
describe('getCurrentCycle', () => {
  it('retorna ciclo de fev quando hoje é 15/jan (após close de jan)', () => {
    const today = new Date('2024-01-15');
    expect(getCurrentCycle(CD, DD, today).key).toBe('2024-02');
  });

  it('retorna ciclo de jan quando hoje é 2/jan (antes do close)', () => {
    const today = new Date('2024-01-02');
    expect(getCurrentCycle(CD, DD, today).key).toBe('2024-01');
  });

  it('retorna ciclo de jan quando hoje é exatamente no closeDay=3', () => {
    const today = new Date('2024-01-03');
    expect(getCurrentCycle(CD, DD, today).key).toBe('2024-01');
  });

  it('retorna ciclo correto na virada de ano', () => {
    const today = new Date('2024-12-20');
    expect(getCurrentCycle(3, 10, today).key).toBe('2025-01');
  });
});

// ── getCycleKeyForPurchaseDate ────────────────────────────────────────────────
describe('getCycleKeyForPurchaseDate', () => {
  it('compra no dia 2 (antes close=3) → ciclo do mês atual', () => {
    expect(getCycleKeyForPurchaseDate('2024-01-02', CD, DD)).toBe('2024-01');
  });

  it('compra no dia 4 (após close=3) → próximo ciclo', () => {
    expect(getCycleKeyForPurchaseDate('2024-01-04', CD, DD)).toBe('2024-02');
  });

  it('compra no closeDay=3 → ciclo do mês atual', () => {
    expect(getCycleKeyForPurchaseDate('2024-01-03', CD, DD)).toBe('2024-01');
  });

  it('compra em dez após close → ciclo de jan do próximo ano', () => {
    expect(getCycleKeyForPurchaseDate('2024-12-10', 3, 10)).toBe('2025-01');
  });
});

// ── getPastCycles ─────────────────────────────────────────────────────────────
describe('getPastCycles', () => {
  const today = new Date('2024-03-15');

  it('retorna 6 ciclos passados por padrão', () => {
    expect(getPastCycles(CD, DD, 6, today)).toHaveLength(6);
  });

  it('todos têm isClosed=true', () => {
    expect(getPastCycles(CD, DD, 6, today).every(c => c.isClosed)).toBe(true);
  });

  it('ordem: mais recente primeiro', () => {
    const past = getPastCycles(CD, DD, 3, today);
    expect(past[0].key).toBe('2024-03');
    expect(past[1].key).toBe('2024-02');
    expect(past[2].key).toBe('2024-01');
  });
});

// ── sumPurchasesForCycle ──────────────────────────────────────────────────────
describe('sumPurchasesForCycle', () => {
  const purchases: CardPurchaseNew[] = [
    { id: '1', desc: 'Mercado',  value: 200, date: '2024-01-10', cycleKey: '2024-01' },
    { id: '2', desc: 'Farmácia', value: 80,  date: '2024-01-20', cycleKey: '2024-01' },
    { id: '3', desc: 'Uber',     value: 45,  date: '2024-02-10', cycleKey: '2024-02' },
  ];

  it('soma apenas compras do ciclo especificado', () => {
    expect(sumPurchasesForCycle(purchases, '2024-01')).toBe(280);
    expect(sumPurchasesForCycle(purchases, '2024-02')).toBe(45);
  });

  it('retorna 0 para ciclo sem compras', () => {
    expect(sumPurchasesForCycle(purchases, '2024-03')).toBe(0);
  });
});

// ── computeCardBillingState ───────────────────────────────────────────────────
describe('computeCardBillingState', () => {
  const today = new Date('2024-03-15');
  const purchases: CardPurchaseNew[] = [
    { id: '1', desc: 'A', value: 100, date: '2024-01-10', cycleKey: '2024-01' },
    { id: '2', desc: 'B', value: 200, date: '2024-02-10', cycleKey: '2024-02' },
    { id: '3', desc: 'C', value: 50,  date: '2024-03-10', cycleKey: '2024-04' },
  ];

  it('identifica ciclo atual corretamente', () => {
    const state = computeCardBillingState(purchases, [], CD, DD, today);
    expect(state.currentCycleKey).toBe('2024-04');
  });

  it('ciclos fechados com compras aparecem como unpaid', () => {
    const state = computeCardBillingState(purchases, [], CD, DD, today);
    expect(state.unpaidCycles).toContain('2024-01');
    expect(state.unpaidCycles).toContain('2024-02');
  });

  it('ciclos pagos são removidos dos unpaid', () => {
    const state = computeCardBillingState(purchases, ['2024-01'], CD, DD, today);
    expect(state.unpaidCycles).not.toContain('2024-01');
    expect(state.unpaidCycles).toContain('2024-02');
  });
});

// ── expandInstallments ────────────────────────────────────────────────────────
describe('expandInstallments', () => {
  it('gera N parcelas com valor correto', () => {
    const ps = expandInstallments('TV Samsung', 1200, 12, '2024-01-10', CD, DD, 'tv1');
    expect(ps).toHaveLength(12);
    expect(ps[0].installment?.installmentValue).toBe(100);
    expect(ps[0].desc).toBe('TV Samsung (1/12)');
  });

  it('total das parcelas = valor original', () => {
    const ps = expandInstallments('Curso', 1000, 3, '2024-01-10', CD, DD, 'c1');
    expect(ps.reduce((s, p) => s + p.value, 0)).toBeCloseTo(1000, 2);
  });

  it('cada parcela tem cycleKey em meses consecutivos', () => {
    const ps = expandInstallments('Notebook', 600, 3, '2024-01-10', CD, DD, 'nb1');
    expect(ps[0].cycleKey).toBe('2024-02');
    expect(ps[1].cycleKey).toBe('2024-03');
    expect(ps[2].cycleKey).toBe('2024-04');
  });

  it('groupId é igual em todas as parcelas', () => {
    const ps = expandInstallments('Sofá', 900, 3, '2024-01-10', CD, DD, 'sofa1');
    const ids = new Set(ps.map(p => p.installment?.groupId));
    expect(ids.size).toBe(1);
  });

  it('uma parcela = compra direta', () => {
    const ps = expandInstallments('Remédio', 50, 1, '2024-01-10', CD, DD, 'r1');
    expect(ps).toHaveLength(1);
    expect(ps[0].value).toBe(50);
  });
});

// ── formatCycleKey ────────────────────────────────────────────────────────────
describe('formatCycleKey', () => {
  it('formata YYYY-MM como Mês/Ano', () => {
    expect(formatCycleKey('2024-01')).toBe('Jan/2024');
    expect(formatCycleKey('2024-12')).toBe('Dez/2024');
  });
});
