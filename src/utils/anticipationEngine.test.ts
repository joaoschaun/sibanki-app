/**
 * anticipationEngine.test.ts
 *
 * Trava o "Contrato de quando falar" (docs/DESIGN-SYSTEM-RUBRIC.md §9) como código:
 * sem alavanca ⇒ silêncio; sem caixa ⇒ segura até a renda; ponto sem volta ⇒ urgente;
 * ranking por alavanca restante (não por urgência); dia calmo ⇒ topHorizonItem null.
 */
import { describe, it, expect } from 'vitest';
import {
  reaisToFreedomDays,
  nextIncomeDate,
  decideWhenToSpeak,
  buildHorizonItems,
  topHorizonItem,
  type AnticipationInput,
} from './anticipationEngine';
import type { Recurrent, CreditObligation } from '../types/userData';

const TODAY = new Date(2026, 6, 8); // 2026-07-08 (meia-noite local)
const BURN = 150; // R$/dia → R$ 900 = 6 dias de liberdade

function isoInDays(d: number): string {
  const dt = new Date(TODAY);
  dt.setDate(TODAY.getDate() + d);
  return dt.toISOString();
}

function obligation(over: Partial<CreditObligation>): CreditObligation {
  return { id: 'o1', kind: 'fatura', label: 'Fatura Itaú', amount: 900, dueDate: isoInDays(9), status: 'aberta', ...over };
}

const baseInput = (over: Partial<AnticipationInput> = {}): AnticipationInput => ({
  today: TODAY,
  liquidCash: 5000,
  dailyBurnRate: BURN,
  recurrents: [],
  creditObligations: [],
  cards: [],
  ...over,
});

describe('reaisToFreedomDays (§8.3)', () => {
  it('traduz R$ em dias de liberdade pelo burn diário', () => {
    expect(reaisToFreedomDays(900, 150)).toBe(6);
  });
  it('retorna 0 para valores ou burn inválidos', () => {
    expect(reaisToFreedomDays(0, 150)).toBe(0);
    expect(reaisToFreedomDays(900, 0)).toBe(0);
  });
});

describe('nextIncomeDate (renda / renda irregular §9.1)', () => {
  it('acha a próxima renda recorrente', () => {
    const recs: Recurrent[] = [
      { id: 1, type: 'receita', desc: 'Salário', value: 6000, day: 5, active: true },
    ];
    const d = nextIncomeDate(recs, TODAY);
    expect(d).not.toBeNull();
    // dia 8/jul → próxima ocorrência do dia 5 é 5/ago
    expect(d!.getMonth()).toBe(7); // agosto (0-index)
    expect(d!.getDate()).toBe(5);
  });
  it('retorna null quando não há recorrente de receita (renda irregular)', () => {
    expect(nextIncomeDate([], TODAY)).toBeNull();
  });
});

describe('decideWhenToSpeak (árvore §9.1)', () => {
  const ctx = (over: Partial<{ liquidCash: number; incomeDate: Date | null; leadPref: 'urgent-only' | 'week' | 'all' }> = {}) => ({
    today: TODAY,
    liquidCash: 5000,
    incomeDate: null as Date | null,
    leadPref: 'week' as const,
    ...over,
  });

  it('sem alavanca ⇒ silêncio', () => {
    expect(decideWhenToSpeak({ amount: 900, daysUntilDue: 9, hasLever: false }, ctx())).toBe('silence');
  });
  it('≤3 dias ⇒ urgente', () => {
    expect(decideWhenToSpeak({ amount: 900, daysUntilDue: 2, hasLever: true }, ctx())).toBe('urgent');
  });
  it('tem caixa e está na janela ativa (4–5d) ⇒ act', () => {
    expect(decideWhenToSpeak({ amount: 900, daysUntilDue: 5, hasLever: true }, ctx())).toBe('act');
  });
  it('tem caixa, dentro do dial mas além da janela ativa ⇒ plan', () => {
    expect(decideWhenToSpeak({ amount: 900, daysUntilDue: 7, hasLever: true }, ctx())).toBe('plan');
  });
  it('tem caixa e mais longe ⇒ plan (planejamento passivo §9.3, não silêncio)', () => {
    expect(decideWhenToSpeak({ amount: 900, daysUntilDue: 10, hasLever: true }, ctx())).toBe('plan');
  });
  it('sem caixa e a renda entra antes do vencimento ⇒ segura (silêncio)', () => {
    const income = new Date(TODAY); income.setDate(TODAY.getDate() + 4);
    expect(decideWhenToSpeak({ amount: 900, daysUntilDue: 9, hasLever: true }, ctx({ liquidCash: 100, incomeDate: income }))).toBe('silence');
  });
  it('sem caixa e renda irregular, dentro da semana ⇒ plan (fallback §9.1 passo 4)', () => {
    expect(decideWhenToSpeak({ amount: 900, daysUntilDue: 6, hasLever: true }, ctx({ liquidCash: 100, incomeDate: null }))).toBe('plan');
  });
});

describe('buildHorizonItems (ranking por alavanca §8.5 + filtro de silêncio)', () => {
  it('rankeia a fatura de 9 dias (mais alavanca) acima da de 2 dias (urgente, pouca margem)', () => {
    const input = baseInput({
      creditObligations: [
        obligation({ id: 'longe', label: 'Itaú 9d', amount: 900, dueDate: isoInDays(9) }),
        obligation({ id: 'perto', label: 'Nubank 2d', amount: 900, dueDate: isoInDays(2) }),
      ],
    });
    const items = buildHorizonItems(input);
    expect(items.map((i) => i.label)).toEqual(['Itaú 9d', 'Nubank 2d']);
    expect(items[0].leverageScore).toBeGreaterThan(items[1].leverageScore);
    expect(items[1].decision).toBe('urgent');
    expect(items[0].freedomDays).toBe(6);
  });

  it('filtra fora o que não deve ser falado (sem caixa, renda irregular, além do dial ⇒ silêncio)', () => {
    const input = baseInput({
      liquidCash: 100, // não cobre os 900
      recurrents: [],  // renda irregular (sem receita recorrente)
      creditObligations: [obligation({ dueDate: isoInDays(14), amount: 900 })], // 14d > dial 7d ⇒ silence
    });
    expect(buildHorizonItems(input)).toHaveLength(0);
  });

  it('não fala de conta já vencida (sem alavanca / reação, não antecipação)', () => {
    const input = baseInput({
      creditObligations: [obligation({ dueDate: isoInDays(-1), status: 'atrasada' })],
    });
    expect(buildHorizonItems(input)).toHaveLength(0);
  });
});

describe('topHorizonItem (§8.2 / dia calmo §9.2)', () => {
  it('dia calmo ⇒ null (nada a falar, melhor resultado)', () => {
    expect(topHorizonItem(baseInput())).toBeNull();
  });
  it('traz a única coisa que importa agora', () => {
    const input = baseInput({ creditObligations: [obligation({})] });
    const top = topHorizonItem(input);
    expect(top).not.toBeNull();
    expect(top!.label).toBe('Fatura Itaú');
    expect(top!.reason).toContain('preserva');
  });
});
