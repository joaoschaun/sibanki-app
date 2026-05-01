/**
 * Testes do Sovereignty Engine (Ld, Sg, Sv).
 *
 * Cobertura focada nos 4 fixes da auditoria 26/04/2026 + happy path.
 * Cada teste tem comentário marcando o achado que protege.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDaysOfFreedom,
  calculateSpreadGap,
  calculateSovereigntyScore,
} from './sovereigntyEngine';
import type { Entry, Investment, CreditObligation, Card } from '../types/userData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const expense = (value: number, daysBack: number, extras: Partial<Entry> = {}): Entry => ({
  id: Math.random(),
  type: 'despesa',
  desc: 'teste',
  category: 'Geral',
  value,
  date: daysAgo(daysBack),
  ...extras,
} as Entry);

const investment = (overrides: Partial<Investment>): Investment => ({
  id: Math.random(),
  date: todayStr,
  tipo: 'CDB Liquidez Diária',
  nome: 'CDB Banco X',
  valor: 1000,
  atual: 1000,
  ...overrides,
} as Investment);

// ─── 1. calculateDaysOfFreedom ───────────────────────────────────────────────

describe('calculateDaysOfFreedom', () => {
  it('cobre cenário base: 30k em conta + 30 dias de despesas → ~6 meses de Ld', () => {
    // Burn rate: 5000 R$/mês = ~166/dia. Liquidez 30k → ~180 dias.
    const entries = Array.from({ length: 90 }, (_, i) =>
      expense(166.66, i % 90)
    );
    const result = calculateDaysOfFreedom({
      accountBalances: { 'Itaú': 30_000 },
      investments: [],
      entries,
    });
    expect(result.totalLiquidity).toBe(30_000);
    expect(result.dailyBurnRate).toBeGreaterThan(140);
    expect(result.dailyBurnRate).toBeLessThan(180);
    expect(result.days).toBeGreaterThan(150);
    expect(result.days).toBeLessThan(220);
    expect(result.status).toMatch(/em-construcao|resiliente/);
  });

  it('SOV-1: saldo negativo (cheque especial) é SUBTRAÍDO da liquidez', () => {
    // Antes do fix: Math.max(0, bal) zerava negativos → Ld inflado
    const result = calculateDaysOfFreedom({
      accountBalances: {
        'Conta Corrente': 1_000,
        'Cheque Especial Usado': -500,  // dívida — deve subtrair
      },
      investments: [],
      entries: [expense(1000, 5), expense(1000, 35), expense(1000, 65)],
    });
    expect(result.totalLiquidity).toBe(500); // 1000 - 500
  });

  it('SOV-1: usuário endividado (saldo total negativo) tem Ld zerado', () => {
    const result = calculateDaysOfFreedom({
      accountBalances: { 'Banco': -2000 },
      investments: [],
      entries: [expense(500, 5), expense(500, 35)],
    });
    expect(result.totalLiquidity).toBeLessThan(0);
    // dailyBurnRate > 0, totalLiquidity < 0 → days = floor(neg/pos) = neg
    expect(result.days).toBeLessThanOrEqual(0);
  });

  it('SOV-3-liquidez: Tesouro IPCA+ NÃO conta como líquido', () => {
    const result = calculateDaysOfFreedom({
      accountBalances: { 'Conta': 1_000 },
      investments: [
        investment({ tipo: 'Tesouro IPCA+ 2035', atual: 50_000 }),
        investment({ tipo: 'CDB Liquidez Diária', atual: 5_000 }),
      ],
      entries: [expense(1000, 10), expense(1000, 40), expense(1000, 70)],
    });
    // Liquidez = conta (1k) + CDB Liquidez Diária (5k) = 6k. Tesouro IPCA+ longo NÃO entra.
    expect(result.totalLiquidity).toBe(6_000);
  });

  it('SOV-3-liquidez: lista restrita rejeita "renda fixa" genérico, "lci", "lca"', () => {
    const result = calculateDaysOfFreedom({
      accountBalances: { 'C': 0 },
      investments: [
        investment({ tipo: 'Renda Fixa', atual: 10_000 }),
        investment({ tipo: 'LCI Banco Y', atual: 10_000 }),
        investment({ tipo: 'LCA Banco Z', atual: 10_000 }),
      ],
      entries: [expense(100, 5)],
    });
    expect(result.totalLiquidity).toBe(0); // nenhum dos 3 entra
  });

  it('SOV-7: proventosMensais soma ao monthlyPassiveIncome', () => {
    const result = calculateDaysOfFreedom({
      accountBalances: { 'C': 1_000 },
      investments: [
        investment({ tipo: 'FII XYZ11', atual: 100_000, proventosMensais: 700 }),
        investment({ tipo: 'CDB Liquidez Diária', atual: 1_000 }), // entra na liquidez também
      ],
      entries: [expense(500, 5), expense(500, 35), expense(500, 65)],
      investmentYieldMonthly: 0.01,
    });
    // yieldFromLiquid = 1000 * 0.01 = 10. dividendos = 700. Total = 710.
    expect(result.monthlyPassiveIncome).toBeCloseTo(710, 0);
  });

  it('SOV-3-confiança: < 30 lançamentos OU < 2 meses → confiança baixa', () => {
    const result = calculateDaysOfFreedom({
      accountBalances: { 'C': 5_000 },
      investments: [],
      entries: [expense(100, 1), expense(100, 2)], // só 2 lançamentos, 1 mês
    });
    expect(result.dataConfidence).toBe('baixa');
  });

  it('SOV-3-confiança: ≥30 lançamentos + ≥2 meses + 70%+ Open Finance → alta', () => {
    const entries: Entry[] = [];
    for (let i = 0; i < 40; i++) {
      // metade no mês corrente, metade no mês passado
      entries.push(expense(100, i % 2 === 0 ? 5 : 35, { source: 'open-finance' } as Partial<Entry>));
    }
    const result = calculateDaysOfFreedom({
      accountBalances: { 'C': 5_000 },
      investments: [],
      entries,
    });
    expect(result.dataConfidence).toBe('alta');
  });

  it('passive income > expense → days = 99999 (inabalável)', () => {
    const result = calculateDaysOfFreedom({
      accountBalances: { 'C': 1_000 },
      investments: [
        investment({ tipo: 'Tesouro Selic', atual: 1_000_000 }), // dá 10k/mês a 1% — passa de qualquer despesa
      ],
      entries: [expense(100, 5), expense(100, 35), expense(100, 65)],
      investmentYieldMonthly: 0.01,
    });
    expect(result.dailyBurnRate).toBe(0);
    expect(result.days).toBe(99999);
  });
});

// ─── 2. calculateSpreadGap ────────────────────────────────────────────────────

describe('calculateSpreadGap', () => {
  const baseObligation: CreditObligation = {
    id: 'ob1',
    kind: 'emprestimo',
    label: 'Empréstimo X',
    amount: 10_000,
    dueDate: todayStr,
  };

  it('SOV-2: lê interestRatePct (campo canônico) — sem heurístico', () => {
    // 2.5% a.m. é típico de empréstimo pessoal mediano
    const result = calculateSpreadGap({
      investments: [investment({ tipo: 'CDB', atual: 5_000, taxaAnual: 12 })], // 12% a.a.
      creditObligations: [{ ...baseObligation, interestRatePct: 2.5 }],
      cards: [],
    });
    expect(result.avgDebtCostMonthly).toBeCloseTo(0.025, 4);
  });

  it('SOV-2: fallback para interestPct quando interestRatePct ausente', () => {
    const result = calculateSpreadGap({
      investments: [],
      creditObligations: [{ ...baseObligation, interestPct: 3.0 }],
      cards: [],
    });
    expect(result.avgDebtCostMonthly).toBeCloseTo(0.03, 4);
  });

  it('SOV-2: fallback para interestRate (legado) quando os outros ausentes', () => {
    const result = calculateSpreadGap({
      investments: [],
      creditObligations: [{ ...baseObligation, interestRate: 1.5 } as CreditObligation],
      cards: [],
    });
    expect(result.avgDebtCostMonthly).toBeCloseTo(0.015, 4);
  });

  it('SOV-2: BUG-PRÉ-FIX — antes interestRate era ignorado, dando 0', () => {
    // Este teste documenta o bug que existia: a obligação tinha taxa,
    // mas o engine antigo lia campo errado e tratava como 0.
    // Com o fix, qualquer um dos 3 nomes passa.
    const result = calculateSpreadGap({
      investments: [],
      creditObligations: [{ ...baseObligation, interestRatePct: 5 }],
      cards: [],
    });
    expect(result.avgDebtCostMonthly).toBeGreaterThan(0); // antes era 0
  });

  it('Sg negativo (dreno) gera monthlyLeakage', () => {
    const result = calculateSpreadGap({
      investments: [investment({ atual: 1_000, taxaAnual: 12 })], // ~0.95% a.m.
      creditObligations: [{ ...baseObligation, amount: 5_000, interestRatePct: 5 }], // 5% a.m.
      cards: [],
    });
    expect(result.spreadGap).toBeLessThan(0);
    expect(result.monthlyLeakage).toBeGreaterThan(0);
    expect(result.verdict).toMatch(/ineficiencia-moderada|dreno-critico/);
  });

  it('Sg muito negativo → "dreno-critico"', () => {
    const result = calculateSpreadGap({
      investments: [investment({ atual: 1_000, taxaAnual: 8 })],
      creditObligations: [{ ...baseObligation, amount: 10_000, interestRatePct: 14 }],
      cards: [],
    });
    expect(result.verdict).toBe('dreno-critico');
  });

  it('Sg ~zero → "zona-neutra"', () => {
    const result = calculateSpreadGap({
      investments: [investment({ atual: 5_000, taxaAnual: 12 })], // ~0.95% a.m.
      creditObligations: [{ ...baseObligation, amount: 5_000, interestRatePct: 0.95 }],
      cards: [],
    });
    expect(result.verdict).toBe('zona-neutra');
  });

  it('Sg positivo → "alavancagem-inteligente"', () => {
    const result = calculateSpreadGap({
      investments: [investment({ atual: 10_000, taxaAnual: 14 })], // ~1.1% a.m.
      creditObligations: [{ ...baseObligation, amount: 10_000, interestRatePct: 0.5 }],
      cards: [],
    });
    expect(result.verdict).toBe('alavancagem-inteligente');
  });

  it('SOV-5: cartão coberto por obligation NÃO é contado como rotativo extra', () => {
    const cards: Card[] = [
      { id: 1, name: 'Nubank', currentBill: 2_000, limite: 5_000 } as Card,
    ];
    const obligations: CreditObligation[] = [
      { ...baseObligation, label: 'Nubank', amount: 2_000, interestRatePct: 12 },
    ];
    const result = calculateSpreadGap({
      investments: [],
      creditObligations: obligations,
      cards,
    });
    // Apenas 1 dívida (a obligation), valor 2k. NÃO 2 (obligation + rotativo).
    expect(result.avgDebtCostMonthly).toBeCloseTo(0.12, 4);
  });

  it('SOV-5: match exato — "Nubank" não casa com obligation "Cartão Itaú"', () => {
    const cards: Card[] = [
      { id: 1, name: 'Nubank', currentBill: 2_000, limite: 5_000 } as Card,
    ];
    const obligations: CreditObligation[] = [
      { ...baseObligation, label: 'Cartão Itaú', amount: 1_000, interestRatePct: 10 },
    ];
    const result = calculateSpreadGap({
      investments: [],
      creditObligations: obligations,
      cards,
    });
    // 2 dívidas: Itaú obligation (10% a.m. sobre 1k) + Nubank rotativo (14% a.m. sobre 2k)
    // weighted: (1000*0.10 + 2000*0.14) / 3000 = (100 + 280)/3000 = 0.1267
    expect(result.avgDebtCostMonthly).toBeCloseTo(0.1267, 3);
  });
});

// ─── 3. calculateSovereigntyScore ─────────────────────────────────────────────

describe('calculateSovereigntyScore', () => {
  const baseInput = {
    value: 100,
    category: 'Geral',
    isEssential: false,
    liquidity: 10_000,
    dailyBurnRate: 100,
  };

  it('investimento → score 100 (soberano)', () => {
    const r = calculateSovereigntyScore({ ...baseInput, category: 'Investimento' });
    expect(r.verdict).toBe('soberano');
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it('essencial → penalidade reduzida', () => {
    const a = calculateSovereigntyScore({ ...baseInput, isEssential: true });
    const b = calculateSovereigntyScore({ ...baseInput, isEssential: false });
    expect(a.score).toBeGreaterThan(b.score);
  });

  it('lazer + impacto alto + orçamento estourado → score baixo', () => {
    const r = calculateSovereigntyScore({
      ...baseInput,
      value: 5_000, // 50% da liquidez
      category: 'Lazer',
      budgetRemaining: -200,
    });
    expect(r.verdict).toMatch(/atencao|auto-sabotagem/);
  });

  it('value=0 → score 100', () => {
    const r = calculateSovereigntyScore({ ...baseInput, value: 0 });
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('soberano');
  });

  it('opportunityCost10y cresce com juros compostos', () => {
    const r = calculateSovereigntyScore({ ...baseInput, value: 1000 });
    // 1000 * (1.008)^120 ≈ 2599
    expect(r.opportunityCost10y).toBeGreaterThan(2500);
    expect(r.opportunityCost10y).toBeLessThan(2700);
  });

  it('impulseStreakCount aplica até 20pts de penalidade', () => {
    const noStreak = calculateSovereigntyScore({ ...baseInput, impulseStreakCount: 0 });
    const fullStreak = calculateSovereigntyScore({ ...baseInput, impulseStreakCount: 4 });
    expect(noStreak.score - fullStreak.score).toBe(20);
  });
});
