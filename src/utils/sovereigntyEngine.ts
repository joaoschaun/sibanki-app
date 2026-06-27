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

import type { Entry, Investment, CreditObligation, Card, InvestorProfileAnswers, InvestorProfile } from '../types/userData';

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
  /** Indica se os dados foram estimados a partir do onboarding */
  isEstimated?: boolean;
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
  /** Dados de estimativas do onboarding */
  cadastroCompleto?: {
    rendaEstimada?: string | number;
    reservaEstimada?: string | number;
    criptoEstimada?: string | number;
    gastosEstimados?: string | number;
  } | null;
}): DaysOfFreedomResult {
  const {
    accountBalances,
    accountMeta = {},
    investments,
    entries,
    investmentYieldMonthly = 0.01,
    cadastroCompleto = null,
  } = params;

  // 1. Liquidez em contas (apenas as incluídas na soma)
  // SOV-1 (auditoria 26/04/2026, decisão produto): saldo negativo (cheque
  // especial) NÃO é tratado como zero. Subtrair do total — produto vende
  // soberania financeira; esconder dívida do cheque especial é o oposto disso.
  const accountLiquidity = Object.entries(accountBalances).reduce((sum, [name, bal]) => {
    if (accountMeta[name]?.incluirNaSoma === false) return sum;
    return sum + (Number(bal) || 0);
  }, 0);

  // 2. Investimentos líquidos (D+0 a D+30)
  // Classificação Pierre: Renda Fixa Líquida tem peso 1.0; Renda Variável tem peso 0.7; outros têm peso 0.0.
  const liquidRFTypeKeys = [
    'tesouro selic',
    'cdb liquidez diária',
    'cdb liquidez diaria',
    'fundo di',
    'fundos di',
    'poupança',
    'poupanca',
  ];
  const liquidRVTypeKeys = [
    'ações',
    'açoes',
    'acoes',
    'fiis',
    'fii',
    'etf',
    'cripto',
    'criptomoedas',
    'bitcoin',
    'ethereum',
    'renda variável',
    'renda variavel',
  ];

  let liquidRFValue = 0;
  let liquidRVValue = 0;

  investments.forEach((inv) => {
    const tipo = (inv.tipo || '').toLowerCase();
    const valor = Number(inv.atual ?? inv.valor) || 0;

    if (liquidRFTypeKeys.some((t) => tipo.includes(t))) {
      liquidRFValue += valor;
    } else if (liquidRVTypeKeys.some((t) => tipo.includes(t))) {
      liquidRVValue += valor;
    }
  });

  const weightedInvestments = (liquidRFValue * 1.0) + (liquidRVValue * 0.7);
  const realLiquidity = accountLiquidity + weightedInvestments;

  // Aplicação da lógica de fallback de liquidez
  let totalLiquidity = realLiquidity;
  let isLiquidityEstimated = false;

  const reservaEstimadaVal = Number(cadastroCompleto?.reservaEstimada) || 0;
  const criptoEstimadaVal = Number(cadastroCompleto?.criptoEstimada) || 0;

  if (realLiquidity <= 0 && (reservaEstimadaVal > 0 || criptoEstimadaVal > 0)) {
    totalLiquidity = reservaEstimadaVal + criptoEstimadaVal;
    isLiquidityEstimated = true;
  }

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

  const totalExpenses3m = relevantExpenses.reduce((sum, e) => sum + (Number(e.value) || 0), 0);

  // Calcula quantos meses distintos existem nos dados (mínimo 1)
  const distinctMonths = new Set(relevantExpenses.map((e) => (e.date || '').slice(0, 7))).size || 1;
  const effectiveMonths = Math.min(distinctMonths, 3);
  const avgMonthlyExpenseReal = totalExpenses3m / effectiveMonths;

  // Aplicação da lógica de fallback de gastos fixos
  let avgMonthlyExpense = avgMonthlyExpenseReal;
  let isExpensesEstimated = false;

  const gastosEstimadosVal = Number(cadastroCompleto?.gastosEstimados) || 0;
  if (avgMonthlyExpenseReal <= 0 && gastosEstimadosVal > 0) {
    avgMonthlyExpense = gastosEstimadosVal;
    isExpensesEstimated = true;
  }

  // SOV-3 (auditoria 26/04/2026): se há menos de 2 meses distintos OU menos
  // de 30 lançamentos, o burn rate é estatisticamente frágil — Ld pode ficar
  // muito otimista. Forçamos confiança 'baixa' nesses casos, mesmo que o
  // Open Finance esteja conectado, sinalizando ao usuário que o número é
  // provisório.
  const hasEnoughHistory = distinctMonths >= 2 && relevantExpenses.length >= 30;
  let dataConfidence: 'alta' | 'media' | 'baixa';

  if (isLiquidityEstimated || isExpensesEstimated) {
    dataConfidence = 'baixa';
  } else if (!hasEnoughHistory) {
    dataConfidence = 'baixa';
  } else if (verifiedExpensesPct >= 70) {
    dataConfidence = 'alta';
  } else if (verifiedExpensesPct >= 30) {
    dataConfidence = 'media';
  } else {
    dataConfidence = 'baixa';
  }

  // 4. Renda passiva mensal:
  //    - Rendimento estimado dos investimentos líquidos (juros mensais) — apenas Renda Fixa Líquida
  //    - + Soma dos proventos declarados (dividendos de FIIs, JCP de ações, etc.)
  //    SOV-7 (auditoria 26/04/2026): dividendos antes não contavam — sub-estimava
  //    renda passiva especialmente para usuários com FIIs (target Sibanki).
  //    Excluímos Renda Variável da base de juros presumidos para evitar dupla contagem com os proventos declarados.
  let yieldFromLiquid = 0;
  if (!isLiquidityEstimated) {
    investments.forEach((inv) => {
      const tipo = (inv.tipo || '').toLowerCase();
      const valor = Number(inv.atual ?? inv.valor) || 0;
      if (liquidRFTypeKeys.some((t) => tipo.includes(t))) {
        const rate = inv.taxaAnual
          ? Math.pow(1 + inv.taxaAnual / 100, 1 / 12) - 1
          : investmentYieldMonthly;
        yieldFromLiquid += valor * rate;
      }
    });
  }

  const declaredProventos = investments.reduce((s, inv) => {
    const p = Number(inv.proventosMensais) || 0;
    return p > 0 ? s + p : s;
  }, 0);
  const monthlyPassiveIncome = yieldFromLiquid + declaredProventos;

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
    isEstimated: isLiquidityEstimated || isExpensesEstimated,
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
  // SOV-2 (auditoria 26/04/2026, decisão sênior): canônico é `interestRatePct`
  // em % a.m. (padrão BR, alinhado com o legado). Fallbacks `interestPct` e
  // `interestRate` aceitos para retrocompat — também tratados como % a.m.
  // Heurístico anterior tentava adivinhar a unidade (`raw > 1 ? /100 : raw > 0.3 ? /12 : raw`)
  // e errava em vários ranges válidos; foi removido.
  for (const ob of creditObligations || []) {
    const amount = Number(ob.amount) || 0;
    if (amount <= 0) continue;
    // Aceita os 3 nomes de campo, todos em % a.m.
    const rawPct = Number(
      ob.interestRatePct ?? ob.interestPct ?? ob.interestRate ?? 0,
    );
    if (!Number.isFinite(rawPct) || rawPct < 0) continue;
    const monthlyRate = rawPct / 100; // 2.5 → 0.025
    allDebts.push({ amount, monthlyRate });
  }

  // Faturas de cartão abertas
  // SOV-6 (auditoria 26/04/2026): taxa rotativa hardcoded extraída para constante
  // documentada. Faixa real do mercado BR: 9-18% a.m.; usamos 14% como proxy
  // conservador. Quando o usuário cadastrar a taxa real do cartão (campo a ser
  // adicionado em Card), substituir aqui.
  // Fonte: BCB - Taxa média rotativo PF (atualizar trimestralmente).
  const ROTATIVO_CARTAO_PROXY_MENSAL = 0.14;
  // SOV-5 (auditoria 26/04/2026): match de cartão era por String.includes —
  // `card.name="Mastercard"` casava com qualquer obligation que mencionasse
  // "mastercard" no label. Falso positivo trivial fazia fatura desaparecer
  // do cálculo. Agora normalizamos e exigimos correspondência exata após
  // remoção de espaços extras.
  const normalizeForCardMatch = (s: string) => String(s ?? '').trim().toLowerCase();

  for (const card of cards || []) {
    const fatura = Number(card.currentBill ?? 0);
    if (fatura > 50) {
      const cardKey = normalizeForCardMatch(card.name || '');
      const alreadyCovered = !!cardKey && (creditObligations || []).some((ob) => {
        const obKey = normalizeForCardMatch(ob.label ?? '');
        // Exato OU prefixo "Cartão <nome>" / sufixo " <nome>" — comum em obligation autoadicionada
        return obKey === cardKey
          || obKey === `cartão ${cardKey}`
          || obKey === `cartao ${cardKey}`
          || obKey.endsWith(` ${cardKey}`);
      });
      if (!alreadyCovered) {
        allDebts.push({ amount: fatura, monthlyRate: ROTATIVO_CARTAO_PROXY_MENSAL });
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

// ─────────────────────────────────────────────────────────────────────────────
// 5. ANÁLISE FUNDAMENTALISTA DE INVESTIMENTOS
// ─────────────────────────────────────────────────────────────────────────────

export interface GrahamResult {
  value: number;
  marginOfSafety: number;
  status: 'desconto' | 'sobrepreco' | 'invalido';
}

export interface BazinResult {
  precoTeto: number;
  upside: number;
  status: 'compra' | 'caro' | 'invalido';
}

export interface SolidezResult {
  score: number;
  verdict: 'alta' | 'media' | 'baixa';
}

/**
 * Calcula o Valor Intrínseco de Benjamin Graham.
 * Fórmula: VI = sqrt(22.5 * LPA * VPA)
 */
export function calculateGrahamIntrinsicValue(price: number, lpa?: number, vpa?: number): GrahamResult {
  if (price <= 0 || lpa === undefined || vpa === undefined || lpa <= 0 || vpa <= 0) {
    return { value: 0, marginOfSafety: 0, status: 'invalido' };
  }
  const value = Math.sqrt(22.5 * lpa * vpa);
  const marginOfSafety = ((value - price) / value) * 100;
  const status = value > price ? 'desconto' : 'sobrepreco';
  return { 
    value: Math.round(value * 100) / 100, 
    marginOfSafety: Math.round(marginOfSafety * 100) / 100, 
    status 
  };
}

/**
 * Calcula o Preço Teto de Décio Bazin com base no Dividend Yield.
 * Mínimo exigido padrão: 6%
 */
export function calculateBazinPriceCeiling(price: number, dyPct?: number, minYield = 6): BazinResult {
  if (price <= 0 || dyPct === undefined || dyPct <= 0 || minYield <= 0) {
    return { precoTeto: 0, upside: 0, status: 'invalido' };
  }
  // Dividendo anual estimado = Preço atual * (DY / 100)
  const dividendosAnuais = price * (dyPct / 100);
  const precoTeto = dividendosAnuais / (minYield / 100);
  const upside = ((precoTeto - price) / price) * 100;
  const status = precoTeto > price ? 'compra' : 'caro';
  return { 
    precoTeto: Math.round(precoTeto * 100) / 100, 
    upside: Math.round(upside * 100) / 100, 
    status 
  };
}

/**
 * Calcula o Score de Solidez Contábil (0-9) baseado em múltiplos fundamentalistas,
 * inspirado no F-Score de Piotroski.
 */
export function calculateSolidezScore(params: {
  roe?: number;
  margemLiquida?: number;
  dividaEbitda?: number;
  pe?: number;
  pvp?: number;
  dy?: number;
}): SolidezResult {
  const { roe, margemLiquida, dividaEbitda, pe, pvp, dy } = params;
  let score = 0;

  // Normalizar decimais vs percentuais (ex: 0.15 ou 15.0)
  const roeVal = roe !== undefined ? (Math.abs(roe) > 1 ? roe / 100 : roe) : undefined;
  const margemVal = margemLiquida !== undefined ? (Math.abs(margemLiquida) > 1 ? margemLiquida / 100 : margemLiquida) : undefined;

  // 1. Rentabilidade (até 3 pontos)
  if (roeVal !== undefined && roeVal > 0) score += 1;
  if (roeVal !== undefined && roeVal > 0.15) score += 1; // ROE > 15%
  if (margemVal !== undefined && margemVal > 0.10) score += 1; // Margem > 10%

  // 2. Alavancagem & Valuation (até 3 pontos)
  if (dividaEbitda === undefined || dividaEbitda < 2.5) score += 1; // Alavancagem saudável ou ausente
  if (pvp !== undefined && pvp > 0 && pvp < 2.0) score += 1; // P/VP atrativo ou moderado
  if (pe !== undefined && pe > 0 && pe < 20) score += 1; // P/L atrativo ou moderado

  // 3. Eficiência de Capital (até 3 pontos)
  if (dy !== undefined && dy > 4.0) score += 1; // Distribui dividendos razoáveis (> 4%)
  if (margemVal !== undefined && margemVal > 0.20) score += 1; // Super eficiente (> 20%)
  if (roeVal !== undefined && roeVal > 0.25) score += 1; // ROE excelente (> 25%)

  let verdict: SolidezResult['verdict'];
  if (score >= 7) verdict = 'alta';
  else if (score >= 4) verdict = 'media';
  else verdict = 'baixa';

  return { score, verdict };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFIL DE INVESTIDOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o perfil de investidor a partir das respostas do questionário.
 *
 * Pontuação por dimensão (máx 100):
 *   objetivos       → 5 / 15 / 25  (preservar / crescimento / especulação)
 *   horizonte       → 5 / 10 / 20  (< 2 / 2-5 / > 5 anos)
 *   toleranciaQueda → 5 / 10 / 20  (baixa / média / alta)
 *   experiencia     → 5 / 10 / 15  (iniciante / intermediário / avançado)
 *   liquidez        → 5 / 10 / 15  (alta / média / baixa)
 *   renda           → 5 / 10 / 15  (baixa / média / alta)
 *
 * Categorias:
 *   0–30  → conservador
 *   31–65 → moderado
 *   66+   → arrojado
 */
export function calculateInvestorProfile(answers: InvestorProfileAnswers): InvestorProfile {
  let score = 0;

  // Objetivos
  if (answers.objetivos === 'preservar-capital') score += 5;
  else if (answers.objetivos === 'crescimento')   score += 15;
  else if (answers.objetivos === 'especulacao')   score += 25;

  // Horizonte
  if (answers.horizonte === '<2')  score += 5;
  else if (answers.horizonte === '2-5') score += 10;
  else if (answers.horizonte === '>5')  score += 20;

  // Tolerância a queda
  if (answers.toleranciaQueda === 'baixa') score += 5;
  else if (answers.toleranciaQueda === 'media') score += 10;
  else if (answers.toleranciaQueda === 'alta')  score += 20;

  // Experiência
  if (answers.experiencia === 'iniciante')      score += 5;
  else if (answers.experiencia === 'intermediario') score += 10;
  else if (answers.experiencia === 'avancado')  score += 15;

  // Liquidez (necessidade de liquidez alta = perfil mais conservador)
  if (answers.liquidez === 'alta')   score += 5;
  else if (answers.liquidez === 'media') score += 10;
  else if (answers.liquidez === 'baixa') score += 15;

  // Renda (capacidade de investir mais = perfil mais arrojado)
  if (answers.renda === 'baixa')   score += 5;
  else if (answers.renda === 'media') score += 10;
  else if (answers.renda === 'alta')  score += 15;

  const normalized = Math.max(0, Math.min(100, score));

  let profile: InvestorProfile['profile'];
  if (normalized <= 30) profile = 'conservador';
  else if (normalized <= 65) profile = 'moderado';
  else profile = 'arrojado';

  return {
    profile,
    score: normalized,
    version: 1,
    updatedAt: new Date().toISOString(),
    answers,
  };
}
