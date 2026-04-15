import { describe, it, expect } from 'vitest';
import { ValidationError } from './persistUserData';
import {
  validateEntry,
  validateCard,
  validateGoal,
  validateInvestment,
  validateRecurrent,
  validateAccount,
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
