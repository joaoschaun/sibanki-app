import { describe, expect, it } from 'vitest';
import { inferCardBenefitsFromMeta } from './inferCardBenefitsFromMeta';
import { buildFinancialContextString } from './consultantContext';

describe('inferCardBenefitsFromMeta', () => {
  it('Nubank Ultraviolet + Mastercard → VIP e confiança alta', () => {
    const r = inferCardBenefitsFromMeta('Nubank Ultraviolet', 'Mastercard');
    expect(r).not.toBeNull();
    expect(r!.confidence).toBe('high');
    expect(r!.benefits.vipLounge).toBe(true);
    expect(r!.catalogId).toBe('mc-topo');
  });

  it('Cartão Padrão + bandeira vazia → null', () => {
    expect(inferCardBenefitsFromMeta('Cartão Padrão', '')).toBeNull();
  });

  it('Itaú Platinum Visa → premium Visa', () => {
    const r = inferCardBenefitsFromMeta('Itaú Platinum Visa', 'Visa');
    expect(r).not.toBeNull();
    expect(r!.benefits.vipLounge).toBe(true);
    expect(r!.catalogId).toBe('visa-premium');
  });
});

describe('buildFinancialContextString — cartões com benefícios', () => {
  it('inclui linha de benefícios por cartão', () => {
    const ctx = buildFinancialContextString({
      entries: [],
      goals: [],
      investments: [],
      budgets: {},
      accounts: [],
      accountBalances: {},
      cards: [
        {
          name: 'Nubank Ultraviolet',
          flag: 'Mastercard',
          limit: 15000,
          currentBill: 2300,
          active: true,
          cardBenefits: {
            vipLounge: true,
            cashbackPct: 1.5,
            source: 'open-finance',
          },
        },
      ],
    });
    expect(ctx).toContain('Cartões ativos:');
    expect(ctx).toContain('Nubank Ultraviolet');
    expect(ctx).toContain('sala VIP');
    expect(ctx).toContain('cashback');
  });
});
