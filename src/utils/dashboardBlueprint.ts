import type { JourneyStage, FinancialHealthLevel } from '../types/platform';

export type DashboardWidgetId =
  | 'alerta-critico'
  | 'onboarding-ativacao'
  | 'sovereignty-hero'
  | 'spread-gap'
  | 'credit-section'
  | 'budgets'
  | 'portfolio'
  | 'investment-insights';

export interface DashboardWidget {
  id: DashboardWidgetId;
  priority: number;
}

export interface DashboardBlueprintInput {
  journeyStage: JourneyStage;
  healthLevel: FinancialHealthLevel;
  hasOpenFinance: boolean;
  hasInvestments: boolean;
  hasDebts: boolean;
  balanceNegative: boolean;
  spreadLeakage: boolean;
  overBudget: boolean;
}

/**
 * Constrói e ordena dinamicamente os widgets do Dashboard do Sibanki com base no perfil financeiro
 * e no estágio da jornada do usuário. Segue a Regra de Ouro: nunca ocultar riscos críticos.
 */
export function buildDashboardBlueprint(input: DashboardBlueprintInput): DashboardWidget[] {
  const {
    journeyStage,
    healthLevel,
    hasInvestments,
    hasDebts,
    balanceNegative,
    spreadLeakage,
    overBudget,
  } = input;

  const widgets: DashboardWidget[] = [];

  const isCritical = healthLevel === 'critico' || journeyStage === 'pressionado';

  // ───────────────────────────────────────────────────────────────────────────
  // REGRA DE OURO (ESTADO CRÍTICO / PRESSIONADO)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCritical) {
    // Alertas críticos sempre no topo absoluto
    if (balanceNegative || spreadLeakage) {
      widgets.push({ id: 'alerta-critico', priority: 0 });
    }

    // Se houver dívidas ou faturas, a seção de crédito vem logo a seguir
    if (hasDebts) {
      widgets.push({ id: 'credit-section', priority: 1 });
    }

    // Spread gap vem para evidenciar o dreno
    if (spreadLeakage) {
      widgets.push({ id: 'spread-gap', priority: 2 });
    }

    // Orçamento sob pressão
    if (overBudget) {
      widgets.push({ id: 'budgets', priority: 3 });
    }

    // Hero de liberdade vem mais para baixo para mostrar a queima diária
    widgets.push({ id: 'sovereignty-hero', priority: 4 });

    // Em onboarding crítico, exibe onboarding para ajudar na ativação
    if (journeyStage === 'primeiros-passos') {
      widgets.push({ id: 'onboarding-ativacao', priority: 5 });
    }

    // Sob estado crítico, ocultamos widgets de investimentos e insights de crescimento (supérfluos no momento)
    // para focar na recuperação de caixa e redução de dívidas.
    return widgets.sort((a, b) => a.priority - b.priority);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ESTADOS CONVERSADORES / SAUDÁVEIS / NORMAIS
  // ───────────────────────────────────────────────────────────────────────────
  if (journeyStage === 'primeiros-passos') {
    // Foco em integração e Open Finance
    widgets.push({ id: 'onboarding-ativacao', priority: 0 });
    widgets.push({ id: 'sovereignty-hero', priority: 1 });
    widgets.push({ id: 'spread-gap', priority: 2 });

    if (hasDebts) {
      widgets.push({ id: 'credit-section', priority: 3 });
    }
  } 
  else if (journeyStage === 'organizando-base') {
    // Foco em orçamentos e organização de gastos
    widgets.push({ id: 'budgets', priority: 0 });
    widgets.push({ id: 'sovereignty-hero', priority: 1 });
    widgets.push({ id: 'spread-gap', priority: 2 });

    if (hasDebts) {
      widgets.push({ id: 'credit-section', priority: 3 });
    }
    if (hasInvestments) {
      widgets.push({ id: 'portfolio', priority: 4 });
    }
  } 
  else if (journeyStage === 'estabilizando') {
    // Foco nos Dias de Liberdade (Ld)
    widgets.push({ id: 'sovereignty-hero', priority: 0 });
    widgets.push({ id: 'budgets', priority: 1 });
    widgets.push({ id: 'spread-gap', priority: 2 });

    if (hasDebts) {
      widgets.push({ id: 'credit-section', priority: 3 });
    }
    if (hasInvestments) {
      widgets.push({ id: 'portfolio', priority: 4 });
    }
  } 
  else if (journeyStage === 'pronto-para-crescer') {
    // Foco em carteira de investimentos e valuation
    if (hasInvestments) {
      widgets.push({ id: 'portfolio', priority: 0 });
      widgets.push({ id: 'investment-insights', priority: 1 });
    } else {
      // Se não possui investimentos ainda, incentiva começar
      widgets.push({ id: 'investment-insights', priority: 0 });
    }

    widgets.push({ id: 'sovereignty-hero', priority: 2 });
    widgets.push({ id: 'spread-gap', priority: 3 });
    widgets.push({ id: 'budgets', priority: 4 });

    if (hasDebts) {
      widgets.push({ id: 'credit-section', priority: 5 });
    }
  }

  return widgets.sort((a, b) => a.priority - b.priority);
}
