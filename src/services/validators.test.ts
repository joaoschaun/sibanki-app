import { describe, it, expect } from 'vitest';
import { ValidationError } from './persistUserData';
import {
  validateEntry,
  validateCard,
  validateGoal,
  validateInvestment,
  validateRecurrent,
  validateAccount,
  validateCreditObligation,
} from './validators';

describe('validators', () => {
  it('validateEntry rejeita desc vazia', () => {
    const r = validateEntry({ desc: '', value: 100, date: '2026-04-01', type: 'despesa' });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /descri/i.test(e))).toBe(true);
  });
  it('validateEntry rejeita value zero', () => {
    expect(validateEntry({ desc: 'teste', value: 0, date: '2026-04-01', type: 'receita' }).ok).toBe(false);
  });
  it('validateEntry ok com dados válidos', () => {
    expect(validateEntry({ desc: 'Aluguel', value: 1500, date: '2026-04-01', type: 'despesa' }).ok).toBe(true);
  });
  it('validateCard rejeita nome vazio', () => {
    expect(validateCard({ name: '' }).ok).toBe(false);
  });
  it('validateCard ok com nome e limite', () => {
    expect(validateCard({ name: 'Nubank', limit: 5000 }).ok).toBe(true);
  });
  it('validateGoal rejeita target zero', () => {
    expect(validateGoal({ title: 'Viagem', target: 0 }).ok).toBe(false);
  });
  it('ValidationError tem errors[]', () => {
    const e = new ValidationError(['erro 1', 'erro 2']);
    expect(e.errors).toHaveLength(2);
    expect(e.name).toBe('ValidationError');
  });
});

describe('validateInvestment / validateRecurrent / validateAccount', () => {
  it('validateInvestment ok com campos em português', () => {
    expect(
      validateInvestment({
        nome: 'Tesouro',
        tipo: 'renda-fixa',
        valor: 1000,
        atual: 1000,
        date: '2026-04-01',
      }).ok,
    ).toBe(true);
  });
  it('validateRecurrent rejeita valor zero', () => {
    expect(validateRecurrent({ desc: 'x', value: 0, type: 'despesa', day: 1, freq: 'mensal' }).ok).toBe(false);
  });
  it('validateAccount rejeita nome vazio', () => {
    expect(validateAccount('  ', 0).ok).toBe(false);
  });
});

describe('validateCreditObligation', () => {
  it('rejeita label vazio ou muito longo', () => {
    const ob = { label: '', amount: 1000, dueDate: '2026-06-07', kind: 'emprestimo' as const };
    expect(validateCreditObligation(ob).ok).toBe(false);

    const longLabel = 'a'.repeat(201);
    expect(validateCreditObligation({ ...ob, label: longLabel }).ok).toBe(false);
  });

  it('rejeita valor inválido', () => {
    const ob = { label: 'Empréstimo', amount: -100, dueDate: '2026-06-07', kind: 'emprestimo' as const };
    expect(validateCreditObligation(ob).ok).toBe(false);
    expect(validateCreditObligation({ ...ob, amount: 0 }).ok).toBe(false);
    expect(validateCreditObligation({ ...ob, amount: 2_000_000_000 }).ok).toBe(false);
  });

  it('rejeita vencimento inválido', () => {
    const ob = { label: 'Empréstimo', amount: 1000, dueDate: '07-06-2026', kind: 'emprestimo' as const };
    expect(validateCreditObligation(ob).ok).toBe(false);
    expect(validateCreditObligation({ ...ob, dueDate: 'data-invalida' }).ok).toBe(false);
  });

  it('rejeita tipo de obrigação inválido', () => {
    const ob = { label: 'Empréstimo', amount: 1000, dueDate: '2026-06-07', kind: 'invalido' as any };
    expect(validateCreditObligation(ob).ok).toBe(false);
  });

  it('rejeita taxa de juros inválida', () => {
    const ob = { label: 'Empréstimo', amount: 1000, dueDate: '2026-06-07', kind: 'emprestimo' as const };
    expect(validateCreditObligation({ ...ob, interestRatePct: -0.5 }).ok).toBe(false);
    expect(validateCreditObligation({ ...ob, interestRatePct: 600 }).ok).toBe(false);
    expect(validateCreditObligation({ ...ob, interestRatePct: NaN }).ok).toBe(false);
  });

  it('aceita obrigação válida com e sem taxa', () => {
    const ob = { label: 'CDC Itaú', amount: 12000, dueDate: '2026-06-15', kind: 'emprestimo' as const, interestRatePct: 2.85 };
    expect(validateCreditObligation(ob).ok).toBe(true);

    const obNoRate = { label: 'Fatura Nubank', amount: 3500, dueDate: '2026-06-10', kind: 'fatura' as const };
    expect(validateCreditObligation(obNoRate).ok).toBe(true);
  });
});
