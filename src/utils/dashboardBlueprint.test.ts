import { describe, it, expect } from 'vitest';
import { buildDashboardBlueprint, type DashboardBlueprintInput } from './dashboardBlueprint';

describe('buildDashboardBlueprint', () => {
  it('deve priorizar onboarding no estágio primeiros-passos', () => {
    const input: DashboardBlueprintInput = {
      journeyStage: 'primeiros-passos',
      healthLevel: 'saudavel',
      hasOpenFinance: false,
      hasInvestments: false,
      hasDebts: false,
      balanceNegative: false,
      spreadLeakage: false,
      overBudget: false,
    };

    const widgets = buildDashboardBlueprint(input);
    expect(widgets[0].id).toBe('onboarding-ativacao');
    expect(widgets[1].id).toBe('sovereignty-hero');
    expect(widgets[2].id).toBe('spread-gap');
  });

  it('deve priorizar carteira de investimentos no estágio pronto-para-crescer com investimentos', () => {
    const input: DashboardBlueprintInput = {
      journeyStage: 'pronto-para-crescer',
      healthLevel: 'saudavel',
      hasOpenFinance: true,
      hasInvestments: true,
      hasDebts: false,
      balanceNegative: false,
      spreadLeakage: false,
      overBudget: false,
    };

    const widgets = buildDashboardBlueprint(input);
    expect(widgets[0].id).toBe('portfolio');
    expect(widgets[1].id).toBe('investment-insights');
  });

  it('deve aplicar a Regra de Ouro: priorizar alertas críticos e ocultar investimentos em saúde critica', () => {
    const input: DashboardBlueprintInput = {
      journeyStage: 'pronto-para-crescer',
      healthLevel: 'critico',
      hasOpenFinance: true,
      hasInvestments: true,
      hasDebts: true,
      balanceNegative: true,
      spreadLeakage: true,
      overBudget: true,
    };

    const widgets = buildDashboardBlueprint(input);
    
    // Alerta crítico deve ser prioridade máxima (0)
    expect(widgets[0].id).toBe('alerta-critico');
    expect(widgets[0].priority).toBe(0);

    // Deve conter credit-section, spread-gap e budgets
    const ids = widgets.map(w => w.id);
    expect(ids).toContain('credit-section');
    expect(ids).toContain('spread-gap');
    expect(ids).toContain('budgets');
    expect(ids).toContain('sovereignty-hero');

    // REGRA DE OURO: widgets de investimento supérfluos DEVEM sumir em saúde crítica
    expect(ids).not.toContain('portfolio');
    expect(ids).not.toContain('investment-insights');
  });

  it('deve manter a lista sempre ordenada por prioridade crescente', () => {
    const input: DashboardBlueprintInput = {
      journeyStage: 'organizando-base',
      healthLevel: 'pressao',
      hasOpenFinance: true,
      hasInvestments: true,
      hasDebts: true,
      balanceNegative: false,
      spreadLeakage: true,
      overBudget: true,
    };

    const widgets = buildDashboardBlueprint(input);
    
    for (let i = 0; i < widgets.length - 1; i++) {
      expect(widgets[i].priority).toBeLessThan(widgets[i + 1].priority);
    }
  });
});
