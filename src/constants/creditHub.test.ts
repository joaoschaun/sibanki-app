import { describe, expect, it } from 'vitest';
import {
  buildCreditOpportunities,
  buildCreditPlanItems,
  CREDIT_EDUCATION_CARDS,
  CREDIT_GLOSSARY_TERMS,
} from './creditHub';

describe('creditHub constants', () => {
  it('mantem listas base de educação e glossário', () => {
    expect(CREDIT_EDUCATION_CARDS.length).toBeGreaterThanOrEqual(4);
    expect(CREDIT_GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(4);
  });
});

describe('buildCreditPlanItems', () => {
  it('gera 4 blocos com ordem e iconKey esperados', () => {
    const items = buildCreditPlanItems({
      topCardLabel: 'Nubank',
      loanText: 'CDC Itaú a 28.4% a.a.',
      dueSoonText: 'R$ 1.200,00 em 2 obrigações.',
      utilizationText: 'Utilização geral de 42,0%.',
    });

    expect(items).toHaveLength(4);
    expect(items.map((i) => i.iconKey)).toEqual(['alert', 'reneg', 'clock', 'check']);
    expect(items[0].body).toContain('Nubank');
    expect(items[1].body).toContain('CDC Itaú');
    expect(items[2].body).toContain('R$ 1.200,00');
    expect(items[3].body).toContain('42,0%');
  });
});

describe('buildCreditOpportunities', () => {
  it('quando pressão é crítica não inclui aumento de limite', () => {
    const items = buildCreditOpportunities('critico');
    const aumento = items.find((i) => i.title === 'Aumento de limite');
    expect(aumento?.show).toBe(false);
  });

  it('quando pressão é controlada inclui seguro prestamista', () => {
    const items = buildCreditOpportunities('controlado');
    const seguro = items.find((i) => i.title === 'Seguro prestamista');
    expect(seguro?.show).toBe(true);
  });
});
