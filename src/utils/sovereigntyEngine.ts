/**
 * Sibanki — Sovereignty Engine
 *
 * Transforma dados brutos do usuário nas três métricas centrais do sistema:
 *   • Ld  — Dias de Liberdade (quanto tempo o usuário vive sem trabalhar)
 *   • Sg  — Spread Gap       (diferença entre custo das dívidas e rendimento)
 *   • Sv  — Sovereignty Score (0-100; avalia qualidade de uma transação ou do momento)
 *
 * Todos os cálculos são puros (sem side-effects) e testáveis unitariamente.
 */

import type { Entry, Investment, CreditObligation, Card } from '../types/userData';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS PÚBLICOS
// ─────────────────────────────────────────────────────────────────────────────

export type FreedomStatus =
  | 'fragil'        // < 30 dias
  | 'em-construcao' // 30–179 dias
  | 'resiliente'    // 180–364 dias
  | 'soberano'      // 1–9 anos
  | 'inabalavel';   // ≥ 10 anos (≥ 3650 dias)

export interface DaysOfFreedomResult {
  /** Dias de vida paga com o padrão atual de gastos */
  days: number;
  /** Custo médio diário (burn rate) em R$ */
  dailyBurnRate: number;
  /** Liquidez total disponível em ≤ D+30 */
  totalLiquidity: number;
  /** Renda passiva mensal detectada (dividendos, JCP, rendimentos automáticos) */
  monthlyPassiveIncome: number;
  /** Classificação qualitativa */
  status: FreedomStatus;
  /** Meses de cobertura (arredondado) */
  coverageMonths: number;
  /**
   * Confiança no cálculo, baseada na proporção de despesas verificadas pelo Open Finance.
   * - 'alta'  → ≥ 70% das despesas dos últimos 3 meses vieram do extrato bancário real
   * - 'media' → 30–69% verificadas
   * - 'baixa' → < 30% ou Open Finance não conectado
   */
  dataConfidence: 'alta' | 'media' | 'baixa';
  /** Percentual das despesas recentes confirmadas via Open Finance (0–100) */
  verifiedExpensesPct: number;
}

export type SpreadVerdict =
  | 'alavancagem-inteligente'  // dívida mais barata que investimento
  | 'zona-neutra'              // spread < 0.5% — diferença desprezível
  | 'ineficiencia-moderada'    // spread negativo leve (0.5–2%)
  | 'dreno-critico';           // spread muito negativo (> 2%)

export interface SpreadGapResult {
  /** Taxa média mensal dos investimentos líquidos (estimada) */
  avgInvestmentYieldMonthly: number;
  /** Taxa média mensal das dívidas ativas */
  avgDebtCostMonthly: number;
  /** Diferença: positivo = dívida mais barata que investimento */
  spreadGap: number;
  /** Valor mensal sendo "perdido" por ineficiência (0 se alavancagem inteligente) */
  monthlyLeakage: number;
  verdict: SpreadVerdict;
}

export interface SovereigntyScoreInput {
  /** Valor da transação em R$ */
  value: number;
  /** Categoria (ex: "Alimentação", "Lazer", "Investimento") */
  category: string;
  /** É gasto essencial (aluguel, saúde, educação, alimentação básica)? */
  isEssential: boolean;
  /** Liquidez disponível atual */
  liquidity: number;
  /** Burn rate diário */
  dailyBurnRate: number;
  /** Orçamento restante da categoria no mês (negativo = já estourou) */
  budgetRemaining?: number;
  /** Quantas vezes este padrão (mesma categoria, mesmo dia da semana) ocorreu nos últimos 30 dias */
  impulseStreakCount?: number;
}

export interface SovereigntyScoreResult {
  score: number; // 0–100
  /** Categoria de risco */
  verdict: 'soberano' | 'consciente' | 'atencao' | 'auto-sabotagem';
  /** Dias de liberdade que esta transação "queima" */
  daysLost: number;
  /** Custo de oportunidade projetado em 10 anos (juros compostos reais) */
  opportunityCost10y: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DIAS DE LIBERDADE (Ld)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula quantos dias o usuário consegue manter o padrão de vida atual
 * sem nenhuma nova receita.
 *
 * Fórmula:
 *   Ld = Ltotal / ((Gmensal - Rpassiva) / 30)
 *
 * Onde:
 *   Ltotal   = contas + investimentos líquidos (D+0 a D+30)
 *   Gmensal  = média de gastos dos últimos 3 meses (excluindo transfers)
 *   Rpassiva = rendimentos automáticos mensais detectados
 */
export function calculateDaysOfFreedom(params: {
  accountBalances: Record<string, number>;
  accountMeta?: Record<string, { incluirNaSoma?: boolean; tipo?: string }>;
  investments: Investment[];
  entries: Entry[];
  /** Taxa de rendimento mensal estimada dos investimentos líquidos (decimal, ex: 0.01 = 1%) */
  investmentYieldMonthly?: number;
}): DaysOfFreedomResult {
  const {
    accountBalances,
    accountMeta = {},
    investments,
    entries,
    investmentYieldMonthly = 0.01,
  } = params;

  // 1. Liquidez em contas (apenas as incluídas na soma)
  const accountLiquidity = Object.entries(accountBalances).reduce((sum, [name, bal]) => {
    if (accountMeta[name]?.incluirNaSoma === false) return sum;
    return sum + Math.max(0, Number(bal) || 0);
  }, 0);

  // 2. Investimentos líquidos (D+0 a D+30)
  const liquidInvestments = investments
    .filter((inv) => {
      const tipo = (inv.tipo || '').toLowerCase();
      // Considera líquido: CDB liquidez diária, Tesouro Selic, fundos DI, poupança
      const liquidTypes = ['cdb', 'tesouro selic', 'lci', 'lca', 'fundo di', 'poupança', 'fundos di', 'renda fixa'];
      return liquidTypes.some((t) => tipo.includes(t));
    })
    .reduce((sum, inv) => sum + (Number(inv.atual ?? inv.valor) || 0), 0);

  const totalLiquidity = accountLiquidity + liquidInvestments;

  // 3. Burn rate: média dos últimos 3 meses de despesas (excluindo transfers e pendentes)
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const thresholdDate = threeMonthsAgo.toISOString().slice(0, 10);

  const relevantExpenses = entries.filter(
    (e) =>
      e.type === 'despesa' &&
      !e.isTransfer &&
      e.status !== 'pendente' &&
      e.status !== 'agendado' &&
      (e.date || '') >= thresholdDate,
  );

  // Confiança: proporção de despesas confirmadas pelo Open Finance
  const verifiedCount = relevantExpenses.filter((e) => e.source === 'open-finance').length;
  const verifiedExpensesPct =
    relevantExpenses.length > 0
      ? Math.round((verifiedCount / relevantExpenses.length) * 100)
      : 0;
  const dataConfidence: 'alta' | 'media' | 'baixa' =
    verifiedExpensesPct >= 70 ? 'alta' : verifiedExpensesPct >= 30 ? 'media' : 'baixa';

  const totalExpenses3m = relevantExpenses.reduce((sum, e) => sum + (Number(e.value) || 0), 0);

  // Calcula quantos meses distintos existem nos dados (mínimo 1)
  const distinctMonths = new Set(relevantExpenses.map((e) => (e.date || '').slice(0, 7))).size || 1;
  const avgMonthlyExpense = totalExpenses3m / distinctMonths;

  // 4. Renda passiva mensal: rendimentos dos investimentos líquidos
  const monthlyPassiveIncome = liquidInvestments * investmentYieldMonthly;

  // 5. Burn rate líquido
  const netMonthlyCost = Math.max(0, avgMonthlyExpense - monthlyPassiveIncome);
  const dailyBurnRate = netMonthlyCost / 30;

  // 6. Dias de liberdade
  const days = dailyBurnRate > 0 ? Math.floor(totalLiquidity / dailyBurnRate) : 99999;
  const coverageMonths = Math.floor(days / 30);

  // 7. Status
  let status: FreedomStatus;
  if (days < 30) status = 'fragil';
  else if (days < 180) status = 'em-construcao';
  else if (days < 365) status = 'resiliente';
  else if (days < 3650) status = 'soberano';
  else status = 'inabalavel';

  return {
    days,
    dailyBurnRate,
    totalLiquidity,
    monthlyPassiveIncome,
    status,
    coverageMonths,
    dataConfidence,
    verifiedExpensesPct,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SPREAD GAP (Sg)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compara o custo médio das dívidas ativas com o rendimento médio dos investimentos.
 * Um spread negativo significa que o usuário está pagando mais de juro do que ganha —
 * o clássico "dreno de capital" brasileiro.
 */
export function calculateSpreadGap(params: {
  investments: Investment[];
  creditObligations: CreditObligation[];
  cards: Card[];
  /** CDI atual (taxa mensal, decimal). Padrão conservador caso não haja dado real. */
  currentCdiMonthly?: number;
}): SpreadGapResult {
  const {
    investments,
    creditObligations,
    cards,
    currentCdiMonthly = 0.01, // ~12% a.a. — atualizar via BRAPI
  } = params;

  // 1. Rendimento médio dos investimentos (ponderado pelo valor)
  const totalInvested = investments.reduce((s, i) => s + (Number(i.atual ?? i.valor) || 0), 0);

  let weightedInvestmentYield = 0;
  if (totalInvested > 0) {
    const yieldSum = investments.reduce((s, inv) => {
      const value = Number(inv.atual ?? inv.valor) || 0;
      // Tenta usar a taxa real cadastrada; caso não exista, usa CDI como proxy
      const monthlyRate = inv.taxaAnual
        ? Math.pow(1 + inv.taxaAnual / 100, 1 / 12) - 1
        : currentCdiMonthly * 0.9; // LCI/LCA isenta, CDB ~90% CDI em média
      return s + value * monthlyRate;
    }, 0);
    weightedInvestmentYield = yieldSum / totalInvested;
  } else {
    weightedInvestmentYield = currentCdiMonthly; // referência de mercado
  }

  // 2. Custo médio das dívidas (ponderado pelo saldo devedor)
  const allDebts: Array<{ amount: number; monthlyRate: number }> = [];

  // Dívidas estruturadas (creditObligations)
  for (const ob of creditObligations || []) {
    const amount = Number(ob.amount) || 0;
    if (amount <= 0) continue;
    // interestRate pode vir em % a.m. ou a.a. — normaliza para mensal
    const raw = Number(ob.interestRate) || 0;
    const monthlyRate = raw > 1 ? raw / 100 : raw > 0.3 ? raw / 12 : raw;
    allDebts.push({ amount, monthlyRate });
  }

  // Faturas de cartão abertas (usa 14% a.m. como proxy do rotativo brasileiro)
  for (const card of cards || []) {
    const fatura = Number(card.currentBill ?? 0);
    if (fatura > 50) {
      // Pressupõe rotativo apenas se não há obligation cadastrada para o cartão
      const alreadyCovered = creditObligations?.some((ob) =>
        String(ob.label ?? '').toLowerCase().includes((card.name || '').toLowerCase()),
      );
      if (!alreadyCovered) {
        allDebts.push({ amount: fatura, monthlyRate: 0.14 }); // 14% a.m. rotativo médio BR
      }
    }
  }

  const totalDebt = allDebts.reduce((s, d) => s + d.amount, 0);
  let avgDebtCostMonthly = 0;
  if (totalDebt > 0) {
    const debtYieldSum = allDebts.reduce((s, d) => s + d.amount * d.monthlyRate, 0);
    avgDebtCostMonthly = debtYieldSum / totalDebt;
  }

  const spreadGap = weightedInvestmentYield - avgDebtCostMonthly;

  // 3. Vazamento mensal (em R$) quando spread é negativo
  const monthlyLeakage =
    spreadGap < 0 && totalDebt > 0 ? Math.abs(spreadGap) * totalDebt : 0;

  // 4. Veredicto
  let verdict: SpreadVerdict;
  if (spreadGap > 0.005) verdict = 'alavancagem-inteligente';
  else if (spreadGap >= -0.005) verdict = 'zona-neutra';
  else if (spreadGap >= -0.02) verdict = 'ineficiencia-moderada';
  else verdict = 'dreno-critico';

  return {
    avgInvestmentYieldMonthly: weightedInvestmentYield,
    avgDebtCostMonthly,
    spreadGap,
    monthlyLeakage,
    verdict,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SOVEREIGNTY SCORE (Sv)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Avalia a "qualidade soberana" de uma transação específica.
 * Usado pelo Sentinela para decidir se deve intervir.
 *
 * Escala:
 *   80–100 → soberano       (investimento estratégico ou gasto essencial proporcional)
 *   50–79  → consciente     (consumo dentro do padrão esperado)
 *   25–49  → atenção        (impacto relevante na liberdade)
 *   0–24   → auto-sabotagem (gasto impulsivo com alto impacto)
 */
export function calculateSovereigntyScore(input: SovereigntyScoreInput): SovereigntyScoreResult {
  const {
    value,
    category,
    isEssential,
    liquidity,
    dailyBurnRate,
    budgetRemaining,
    impulseStreakCount = 0,
  } = input;

  if (value <= 0 || dailyBurnRate <= 0) {
    return { score: 100, verdict: 'soberano', daysLost: 0, opportunityCost10y: 0 };
  }

  // 1. Impacto na liquidez (0–50 pontos, invertido)
  const liquidityImpactPct = (value / Math.max(liquidity, 1)) * 100;
  let liquidityPenalty = 0;
  if (liquidityImpactPct >= 30) liquidityPenalty = 50;
  else if (liquidityImpactPct >= 15) liquidityPenalty = 35;
  else if (liquidityImpactPct >= 5) liquidityPenalty = 20;
  else if (liquidityImpactPct >= 2) liquidityPenalty = 10;
  else liquidityPenalty = 5;

  // 2. Multiplicador de categoria
  const cat = category.toLowerCase();
  let categoryMultiplier = 1.0;
  if (isEssential) {
    categoryMultiplier = 0.3; // gastos essenciais: penalidade mínima
  } else if (
    cat.includes('invest') ||
    cat.includes('reserva') ||
    cat.includes('poupan') ||
    cat.includes('prev')
  ) {
    categoryMultiplier = 0; // investimento: score máximo
  } else if (
    cat.includes('lazer') ||
    cat.includes('shopping') ||
    cat.includes('luxo') ||
    cat.includes('roupas') ||
    cat.includes('delivery') ||
    cat.includes('restaurante')
  ) {
    categoryMultiplier = 1.4; // desejo/impulso: penalidade maior
  }

  // 3. Penalidade por orçamento estourado
  const budgetPenalty = budgetRemaining !== undefined && budgetRemaining < 0 ? 15 : 0;

  // 4. Penalidade por reincidência (Oráculo comportamental)
  const impulsePenalty = Math.min(20, impulseStreakCount * 5);

  // 5. Score final
  const totalPenalty = liquidityPenalty * categoryMultiplier + budgetPenalty + impulsePenalty;
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  // 6. Dias perdidos
  const daysLost = Math.round(value / dailyBurnRate);

  // 7. Custo de oportunidade em 10 anos (0.8% a.m. real = ~10% a.a. real)
  const REAL_MONTHLY_RATE = 0.008;
  const opportunityCost10y = Math.round(value * Math.pow(1 + REAL_MONTHLY_RATE, 120));

  // 8. Veredicto
  let verdict: SovereigntyScoreResult['verdict'];
  if (score >= 80) verdict = 'soberano';
  else if (score >= 50) verdict = 'consciente';
  else if (score >= 25) verdict = 'atencao';
  else verdict = 'auto-sabotagem';

  return { score, verdict, daysLost, opportunityCost10y };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SNAPSHOT SOBERANO (para o SuperContextBuilder)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consolida as três métricas em um objeto pronto para o SuperContextBuilder
 * e para o contexto enviado ao LLM.
 */
export function buildSovereigntySnapshot(params: {
  accountBalances: Record<string, number>;
  accountMeta?: Record<string, { incluirNaSoma?: boolean; tipo?: string }>;
  investments: Investment[];
  entries: Entry[];
  creditObligations: CreditObligation[];
  cards: Card[];
  currentCdiMonthly?: number;
  investmentYieldMonthly?: number;
}): {
  freedom: DaysOfFreedomResult;
  spread: SpreadGapResult;
  /** Texto formatado pronto para injetar no prompt do LLM */
  promptContext: string;
} {
  const freedom = calculateDaysOfFreedom({
    accountBalances: params.accountBalances,
    accountMeta: params.accountMeta,
    investments: params.investments,
    entries: params.entries,
    investmentYieldMonthly: params.investmentYieldMonthly,
  });

  const spread = calculateSpreadGap({
    investments: params.investments,
    creditObligations: params.creditObligations,
    cards: params.cards,
    currentCdiMonthly: params.currentCdiMonthly,
  });

  const promptContext = `
SOBERANIA FINANCEIRA:
- Dias de Liberdade (Ld): ${freedom.days} dias (${freedom.coverageMonths} meses) — Status: ${freedom.status.toUpperCase()}
- Liquidez Total: R$ ${freedom.totalLiquidity.toFixed(2)}
- Burn Rate Diário: R$ ${freedom.dailyBurnRate.toFixed(2)}/dia
- Renda Passiva Mensal: R$ ${freedom.monthlyPassiveIncome.toFixed(2)}
- Confiança no cálculo: ${freedom.dataConfidence.toUpperCase()} (${freedom.verifiedExpensesPct}% das despesas verificadas pelo banco${freedom.dataConfidence === 'baixa' ? ' — conectar Open Finance melhorará a precisão' : ''})

ANÁLISE DE SPREAD (Wall Street):
- Rendimento médio investimentos: ${(spread.avgInvestmentYieldMonthly * 100).toFixed(2)}% a.m.
- Custo médio das dívidas: ${(spread.avgDebtCostMonthly * 100).toFixed(2)}% a.m.
- Spread: ${(spread.spreadGap * 100).toFixed(2)}% a.m. — Veredicto: ${spread.verdict.toUpperCase()}
${spread.monthlyLeakage > 0 ? `- ALERTA: Vazamento de R$ ${spread.monthlyLeakage.toFixed(2)}/mês por ineficiência de spread` : '- Estrutura de capital eficiente'}
`.trim();

  return { freedom, spread, promptContext };
}
