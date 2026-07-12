import { describe, it, expect, vi } from 'vitest';

// Mock react-router-dom Link to prevent evaluation issues
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => ({
    type: 'a',
    props: { href: to, children, ...props }
  }),
}));

// Mock useState to return static state avoiding React dispatcher error
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: (initial: any) => [initial, vi.fn()],
  };
});

import { SovereigntyHero } from './SovereigntyHero';

describe('SovereigntyHero Component - Bento Top Header', () => {
  const baseFreedom = {
    days: 45,
    coverageMonths: 1.5,
    dailyBurnRate: 100,
    status: 'resiliente' as const,
    dataConfidence: 'alta' as const,
    verifiedExpensesPct: 85,
    isEstimated: false
  };

  const baseSpread = {
    spreadGap: 0.05,
    monthlyLeakage: 0,
    verdict: 'alavancagem-inteligente' as const
  };

  const defaultProps = {
    userName: 'João',
    score: 85,
    freedom: baseFreedom,
    spread: baseSpread,
    receitaMes: 5000,
    despesaMes: 3000,
    saldoMes: 2000,
    varReceita: 0.1,
    varDespesa: -0.05
  };

  it('1. O numero do Ld usa classe de peso leve e text-si-1', () => {
    const element = SovereigntyHero(defaultProps);
    expect(element).not.toBeNull();

    const mainContainer = element.props.children[1];
    const heroSection = mainContainer.props.children[1];
    const conditionResult = heroSection.props.children[1];
    const numberRow = conditionResult.props.children[0];
    const numberSpan = numberRow.props.children[0];
    const numberClass = numberSpan.props.className;

    expect(numberClass).toContain('font-extralight');
    expect(numberClass).toContain('text-si-1');
    expect(numberClass).not.toContain('text-emerald');
    expect(numberClass).not.toContain('text-amber');
    expect(numberClass).not.toContain('text-rose');
  });

  it('2. Com dados (!noLdData): renderiza FreedomSpectrum e as microlabels', () => {
    const element = SovereigntyHero(defaultProps);
    const str = JSON.stringify(element);
    
    expect(str).toContain('"status":"resiliente"');
    expect(str).toContain('Receitas');
    expect(str).toContain('Despesas');
    expect(str).toContain('Saldo');
    expect(str).toContain('Spread Gap');
  });

  it('3. noLdData: sem espectro, com CTA "Conectar banco"', () => {
    const element = SovereigntyHero({
      ...defaultProps,
      freedom: {
        ...baseFreedom,
        days: 9999,
        dailyBurnRate: 0
      }
    });

    const str = JSON.stringify(element);
    expect(str).not.toContain('FreedomSpectrum');
    expect(str).toContain('Conectar banco');
  });

  it('4. Nenhuma classe shadow-{hue} nova', () => {
    const element = SovereigntyHero(defaultProps);
    const str = JSON.stringify(element);

    expect(str).not.toContain('shadow-emerald');
    expect(str).not.toContain('shadow-amber');
    expect(str).not.toContain('shadow-rose');
  });
});
