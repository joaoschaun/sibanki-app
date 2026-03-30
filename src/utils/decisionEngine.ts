/**
 * Sibanki — Decision Engine
 *
 * Motor de decisão financeira para os cenários mais comuns do brasileiro:
 *
 *   1. analyzeInstallmentDecision  — À Vista vs. Parcelado
 *   2. analyzeDebtPayoffStrategy   — Qual dívida quitar primeiro (bola de neve vs avalanche)
 *   3. analyzeFgtsAmortization     — Vale usar FGTS para amortizar financiamento?
 *   4. analyzeEmergencyReserve     — Quanto de reserva construir antes de investir
 *
 * Toda função retorna um resultado estruturado + narrativa pronta para o consultor.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface InstallmentDecisionParams {
  /** Valor total do item */
  totalValue: number;
  /** Desconto negociado ao pagar à vista (decimal, ex: 0.05 = 5%) */
  cashDiscount?: number;
  /** Número de parcelas sem juros */
  installments: number;
  /** Taxa mensal real que o dinheiro rende se mantido investido (decimal) */
  investmentMonthlyRate?: number;
  /** Nível de pressão de crédito atual do usuário */
  creditPressureLevel?: 'controlado' | 'atencao' | 'elevado' | 'critico';
  /** Comprometimento mensal de renda com dívidas (%) */
  debtCommitmentPct?: number;
  /** Reserva de emergência em meses */
  emergencyReserveMonths?: number;
  /** Tem o dinheiro disponível à vista? */
  hasCashAvailable?: boolean;
}

export type InstallmentVerdict =
  | 'parcelar-e-investir'    // parcelar e manter o capital rendendo
  | 'avista-com-desconto'    // desconto supera o rendimento do período
  | 'avista-por-pressao'     // matematicamente parcelar seria melhor, mas a pressão de crédito contraindica
  | 'nao-comprar-agora'      // reserva baixa ou pressão crítica
  | 'neutro';                // diferença menor que 1% — indiferente

export interface InstallmentDecisionResult {
  verdict: InstallmentVerdict;
  /** Valor que seria pago à vista (com desconto) */
  cashPrice: number;
  /** Valor total pago parcelado */
  installmentTotalCost: number;
  /** Valor que o capital renderia se mantido investido pelo período das parcelas */
  investmentGainIfInstallment: number;
  /** Vantagem financeira líquida da opção recomendada vs a alternativa (em R$) */
  netAdvantage: number;
  /** Parcela mensal */
  monthlyPayment: number;
  /** Narrativa pronta para o consultor (texto do Arquiteto Soberano) */
  narrativa: string;
  /** Dados para o Portal do Tempo */
  opportunityCost10y: number;
  /** Detalhamento numérico para exibir na UI */
  breakdown: {
    cashOption: { price: number; description: string };
    installmentOption: { totalCost: number; monthlyPayment: number; investmentGain: number; netCost: number; description: string };
    recommendation: string;
  };
}

export interface DebtPayoffResult {
  strategy: 'avalanche' | 'bola-de-neve';
  orderedDebts: Array<{
    name: string;
    balance: number;
    monthlyRate: number;
    monthlyInterestCost: number;
    payoffPriority: number;
    estimatedMonthsToPayoff: number;
  }>;
  totalMonthlyCost: number;
  totalInterestSaved: string;
  narrativa: string;
}

export interface FgtsAmortizationResult {
  worthIt: boolean;
  fgtsBalance: number;
  remainingDebt: number;
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  monthlySavings: number;
  monthsToBreakeven: number;
  totalSaved10y: number;
  narrativa: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. À VISTA VS. PARCELADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A decisão mais brasileira de todas.
 *
 * Lógica:
 *   - Se sem juros, parcelar é quase sempre melhor SE o dinheiro render mais que o desconto
 *   - O CDI atual (~1% a.m.) é a taxa de referência mínima
 *   - Pressão de crédito alta contraindica parcelar mesmo que seja matematicamente vantajoso
 *   - Reserva de emergência < 3 meses = compra deve ser reconsiderada
 */
export function analyzeInstallmentDecision(
  params: InstallmentDecisionParams,
): InstallmentDecisionResult {
  const {
    totalValue,
    cashDiscount = 0,
    installments,
    investmentMonthlyRate = 0.01, // CDI conservador
    creditPressureLevel = 'controlado',
    debtCommitmentPct = 0,
    emergencyReserveMonths = 6,
    hasCashAvailable = true,
  } = params;

  const cashPrice = totalValue * (1 - cashDiscount);
  const monthlyPayment = totalValue / installments;

  // Valor futuro do capital se mantido investido durante o período das parcelas
  // Investimos o cashPrice (o que pagaria à vista) e sacamos mensalmente para pagar as parcelas
  // Ganho líquido = FV do capital - total pago em parcelas
  const capitalIfInvested = cashPrice * Math.pow(1 + investmentMonthlyRate, installments);
  const investmentGainIfInstallment = capitalIfInvested - cashPrice;
  const installmentTotalCost = monthlyPayment * installments;

  // Vantagem de parcelar = (rendimento do capital no período) - (eventual juro das parcelas)
  // Como é sem juros, o custo das parcelas = totalValue (mesmo sem desconto)
  // Mas o valor à vista com desconto é menor: cashPrice
  // Então comparamos:
  //   Opção A (à vista): pagar cashPrice agora
  //   Opção B (parcelar): pagar totalValue ao longo do tempo MAS manter cashPrice rendendo
  //
  // Vantagem B = investmentGainIfInstallment - (installmentTotalCost - cashPrice)
  const extraCostInstallment = installmentTotalCost - cashPrice; // custo extra por não ter desconto
  const netAdvantageInstallment = investmentGainIfInstallment - extraCostInstallment;

  // Custo de oportunidade em 10 anos (para Portal do Tempo)
  const REAL_MONTHLY_RATE_10Y = 0.008;
  const opportunityCost10y = Math.round(cashPrice * Math.pow(1 + REAL_MONTHLY_RATE_10Y, 120));

  // ─── Regras de decisão ────────────────────────────────────────────────────

  // Regra 0: reserva crítica ou pressão máxima
  if (emergencyReserveMonths < 1 || creditPressureLevel === 'critico') {
    return buildResult({
      verdict: 'nao-comprar-agora',
      cashPrice, installmentTotalCost, investmentGainIfInstallment,
      netAdvantage: 0, monthlyPayment, opportunityCost10y,
      totalValue, installments, cashDiscount, investmentMonthlyRate,
      emergencyReserveMonths, creditPressureLevel, debtCommitmentPct,
    });
  }

  // Regra 1: não tem dinheiro para pagar à vista → só parcelar faz sentido
  if (!hasCashAvailable) {
    const verdict = creditPressureLevel === 'elevado' ? 'nao-comprar-agora' : 'parcelar-e-investir';
    return buildResult({
      verdict, cashPrice, installmentTotalCost, investmentGainIfInstallment,
      netAdvantage: netAdvantageInstallment, monthlyPayment, opportunityCost10y,
      totalValue, installments, cashDiscount, investmentMonthlyRate,
      emergencyReserveMonths, creditPressureLevel, debtCommitmentPct,
    });
  }

  // Regra 2: desconto alto + pressão elevada → à vista para reduzir risco
  const discountValue = totalValue * cashDiscount;
  if (discountValue > investmentGainIfInstallment * 1.2 || creditPressureLevel === 'elevado') {
    if (debtCommitmentPct > 30 || emergencyReserveMonths < 3) {
      return buildResult({
        verdict: 'avista-por-pressao',
        cashPrice, installmentTotalCost, investmentGainIfInstallment,
        netAdvantage: discountValue, monthlyPayment, opportunityCost10y,
        totalValue, installments, cashDiscount, investmentMonthlyRate,
        emergencyReserveMonths, creditPressureLevel, debtCommitmentPct,
      });
    }
  }

  // Regra 3: desconto supera claramente o rendimento → pagar à vista
  if (discountValue > investmentGainIfInstallment * 1.5 && cashDiscount >= 0.05) {
    return buildResult({
      verdict: 'avista-com-desconto',
      cashPrice, installmentTotalCost, investmentGainIfInstallment,
      netAdvantage: discountValue, monthlyPayment, opportunityCost10y,
      totalValue, installments, cashDiscount, investmentMonthlyRate,
      emergencyReserveMonths, creditPressureLevel, debtCommitmentPct,
    });
  }

  // Regra 4: diferença menor que 1% do valor → neutro
  const diffPct = Math.abs(netAdvantageInstallment) / totalValue;
  if (diffPct < 0.01) {
    return buildResult({
      verdict: 'neutro',
      cashPrice, installmentTotalCost, investmentGainIfInstallment,
      netAdvantage: Math.abs(netAdvantageInstallment), monthlyPayment, opportunityCost10y,
      totalValue, installments, cashDiscount, investmentMonthlyRate,
      emergencyReserveMonths, creditPressureLevel, debtCommitmentPct,
    });
  }

  // Regra 5 (padrão): parcelar é melhor matematicamente e a situação permite
  return buildResult({
    verdict: 'parcelar-e-investir',
    cashPrice, installmentTotalCost, investmentGainIfInstallment,
    netAdvantage: netAdvantageInstallment, monthlyPayment, opportunityCost10y,
    totalValue, installments, cashDiscount, investmentMonthlyRate,
    emergencyReserveMonths, creditPressureLevel, debtCommitmentPct,
  });
}

function buildResult(p: {
  verdict: InstallmentVerdict;
  cashPrice: number;
  installmentTotalCost: number;
  investmentGainIfInstallment: number;
  netAdvantage: number;
  monthlyPayment: number;
  opportunityCost10y: number;
  totalValue: number;
  installments: number;
  cashDiscount: number;
  investmentMonthlyRate: number;
  emergencyReserveMonths: number;
  creditPressureLevel: string;
  debtCommitmentPct: number;
}): InstallmentDecisionResult {
  const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const narrativas: Record<InstallmentVerdict, string> = {
    'parcelar-e-investir': `
💡 **Recomendação: PARCELAR e manter o capital rendendo.**

Análise do Arquiteto:
• À vista${p.cashDiscount > 0 ? ` com ${pct(p.cashDiscount)} de desconto` : ''}: ${fmt(p.cashPrice)}
• Parcelado em ${p.installments}x: ${fmt(p.monthlyPayment)}/mês (total ${fmt(p.installmentTotalCost)})
• Se você mantiver ${fmt(p.cashPrice)} investido a ${pct(p.investmentMonthlyRate)}/mês por ${p.installments} meses, o rendimento será de aproximadamente ${fmt(p.investmentGainIfInstallment)}

**Vantagem líquida de parcelar: ${fmt(p.netAdvantage)}**

Visão Estoica: Seu dinheiro continua trabalhando enquanto o bem se paga sozinho. É alavancagem gratuita — o banco financia, você lucra.
`.trim(),

    'avista-com-desconto': `
💡 **Recomendação: PAGAR À VISTA.**

Análise do Arquiteto:
• O desconto de ${pct(p.cashDiscount)} vale ${fmt(p.totalValue * p.cashDiscount)} — superior ao rendimento que você obteria mantendo o capital investido (${fmt(p.investmentGainIfInstallment)}).
• Preço à vista: ${fmt(p.cashPrice)} | Economia real: ${fmt(p.netAdvantage)}

Visão Wall Street: Desconto garantido bate rendimento incerto. Quando o prêmio à vista é sólido, aproveite. Aqui o banco te pagou para ser disciplinado.
`.trim(),

    'avista-por-pressao': `
⚠️ **Recomendação: PAGAR À VISTA (por prudência, não por matemática).**

Análise do Arquiteto:
• Matematicamente parcelar seria melhor — mas seu comprometimento de renda atual (${p.debtCommitmentPct.toFixed(0)}%) ou sua reserva de emergência (${p.emergencyReserveMonths} meses) está no limite.
• Adicionar mais uma parcela mensal de ${fmt(p.monthlyPayment)} aumenta sua fragilidade financeira.

Visão Estoica: A tranquilidade vale mais que o spread. Pague à vista, quite essa conta da cabeça e fortaleça sua muralha antes de novos compromissos.
`.trim(),

    'nao-comprar-agora': `
🛑 **Recomendação: NÃO COMPRAR AGORA.**

Análise do Arquiteto:
${p.emergencyReserveMonths < 3
  ? `• Sua reserva de emergência (${p.emergencyReserveMonths} meses) está abaixo do mínimo seguro. Qualquer imprevisto pode te jogar no rotativo.`
  : `• Sua pressão de crédito está em nível crítico. Qualquer nova parcela aumenta o risco de inadimplência.`}

Prioridade agora:
1. Construir reserva de pelo menos 3 meses de gastos
2. Quitar dívidas caras (rotativo/cheque especial)
3. Então considerar esta compra

Visão Estoica: Adiamento não é derrota — é estratégia. Seu "Eu do Futuro" agradece a disciplina de hoje.
`.trim(),

    'neutro': `
🔄 **Recomendação: INDIFERENTE — escolha pelo que for mais conveniente.**

A diferença entre as opções é menor que 1% do valor (${fmt(p.netAdvantage)}). Não vale a pena se estressar por isso.

• Se você gosta de ter o bem quitado: pague à vista (${fmt(p.cashPrice)})
• Se você quer manter liquidez: parcele em ${p.installments}x de ${fmt(p.monthlyPayment)}

Visão do Arquiteto: Reserve sua energia de decisão para escolhas que realmente impactam sua liberdade.
`.trim(),
  };

  return {
    verdict: p.verdict,
    cashPrice: p.cashPrice,
    installmentTotalCost: p.installmentTotalCost,
    investmentGainIfInstallment: p.investmentGainIfInstallment,
    netAdvantage: p.netAdvantage,
    monthlyPayment: p.monthlyPayment,
    narrativa: narrativas[p.verdict],
    opportunityCost10y: p.opportunityCost10y,
    breakdown: {
      cashOption: {
        price: p.cashPrice,
        description: p.cashDiscount > 0
          ? `${fmt(p.cashPrice)} com ${(p.cashDiscount * 100).toFixed(0)}% de desconto`
          : `${fmt(p.cashPrice)} sem desconto`,
      },
      installmentOption: {
        totalCost: p.installmentTotalCost,
        monthlyPayment: p.monthlyPayment,
        investmentGain: p.investmentGainIfInstallment,
        netCost: p.installmentTotalCost - p.investmentGainIfInstallment,
        description: `${p.installments}x de ${fmt(p.monthlyPayment)} sem juros`,
      },
      recommendation: narrativas[p.verdict].split('\n')[0],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ESTRATÉGIA DE QUITAÇÃO DE DÍVIDAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decide entre Método Avalanche (quitar a dívida mais cara primeiro)
 * e Bola de Neve (quitar a menor dívida primeiro para motivação psicológica).
 *
 * Para o brasileiro médio com dívidas de cartão (14% a.m.):
 *   - Avalanche quase sempre economiza mais em juros
 *   - Bola de neve é recomendada quando há 4+ dívidas pequenas que drenam atenção
 */
export function analyzeDebtPayoffStrategy(debts: Array<{
  name: string;
  balance: number;
  monthlyRate: number; // decimal, ex: 0.14 = 14% a.m.
  minimumPayment?: number;
}>): DebtPayoffResult {
  if (!debts || debts.length === 0) {
    return {
      strategy: 'avalanche',
      orderedDebts: [],
      totalMonthlyCost: 0,
      totalInterestSaved: 'N/A',
      narrativa: 'Nenhuma dívida ativa detectada. Excelente posição!',
    };
  }

  const totalMonthlyCost = debts.reduce((s, d) => s + d.balance * d.monthlyRate, 0);

  // Ordena por taxa (avalanche = maior taxa primeiro)
  const avalancheOrder = [...debts].sort((a, b) => b.monthlyRate - a.monthlyRate);

  // Usa avalanche como padrão
  // Exceção: se há muitas dívidas pequenas (< R$ 500), bola de neve pode motivar
  const smallDebtsCount = debts.filter((d) => d.balance < 500).length;
  const strategy = smallDebtsCount >= 3 ? 'bola-de-neve' : 'avalanche';
  const ordered = strategy === 'bola-de-neve'
    ? [...debts].sort((a, b) => a.balance - b.balance)
    : avalancheOrder;

  const processedDebts = ordered.map((d, i) => {
    const estimatedMonths = d.minimumPayment && d.minimumPayment > d.balance * d.monthlyRate
      ? Math.ceil(d.balance / (d.minimumPayment - d.balance * d.monthlyRate))
      : 999;
    return {
      name: d.name,
      balance: d.balance,
      monthlyRate: d.monthlyRate,
      monthlyInterestCost: Math.round(d.balance * d.monthlyRate * 100) / 100,
      payoffPriority: i + 1,
      estimatedMonthsToPayoff: Math.min(estimatedMonths, 999),
    };
  });

  // Economia estimada (comparação simplificada: avalanche vs mínimo)
  const highestRateDebt = avalancheOrder[0];
  const monthlySavingByPrioritizing = highestRateDebt
    ? `R$ ${(highestRateDebt.balance * highestRateDebt.monthlyRate).toFixed(2)}/mês`
    : 'N/A';

  const narrativa = `
**Estratégia recomendada: ${strategy === 'avalanche' ? '🏔️ Avalanche (máxima economia)' : '⛄ Bola de Neve (máxima motivação)'}**

${strategy === 'avalanche'
  ? `Você economiza mais atacando a dívida mais cara primeiro. A dívida "${highestRateDebt?.name}" cobra ${(highestRateDebt?.monthlyRate * 100).toFixed(1)}% a.m. — um parasita de R$ ${(highestRateDebt?.balance * (highestRateDebt?.monthlyRate ?? 0)).toFixed(2)}/mês.`
  : `Com ${smallDebtsCount} dívidas pequenas, eliminar as menores primeiro libera parcelas e te dá força para atacar as maiores. Cada dívida zerada é uma vitória psicológica concreta.`
}

Custo mensal atual em juros: R$ ${totalMonthlyCost.toFixed(2)}/mês
Prioridade de ataque: ${processedDebts.map((d) => `${d.payoffPriority}. ${d.name} (${(d.monthlyRate * 100).toFixed(1)}% a.m.)`).join(' → ')}

Visão Wall Street: ${strategy === 'avalanche' ? `Ao eliminar a dívida mais cara primeiro, você economiza ${monthlySavingByPrioritizing} já no próximo mês.` : 'Cada dívida quitada é um soldado a mais na sua muralha.'}
`.trim();

  return { strategy, orderedDebts: processedDebts, totalMonthlyCost, totalInterestSaved: monthlySavingByPrioritizing, narrativa };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AMORTIZAÇÃO COM FGTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analisa se vale usar o FGTS para amortizar financiamento imobiliário.
 *
 * Regra de ouro: se a taxa do financiamento > CDI atual, FGTS rende mais amortizando.
 * O FGTS rende 3% a.a. + TR (historicamente ~3-4% a.a.) — muito menos que o CDI.
 * Portanto, quase sempre vale usar FGTS para amortizar financiamento acima de ~8% a.a.
 */
export function analyzeFgtsAmortization(params: {
  fgtsBalance: number;
  remainingDebt: number;
  currentMonthlyPayment: number;
  annualInterestRate: number; // ex: 0.105 = 10.5% a.a.
  remainingMonths: number;
  currentCdiAnnual?: number; // ex: 0.1225 = 12.25% a.a.
}): FgtsAmortizationResult {
  const {
    fgtsBalance,
    remainingDebt,
    currentMonthlyPayment,
    annualInterestRate,
    remainingMonths,
    currentCdiAnnual = 0.1225,
  } = params;

  // FGTS rende ~3% a.a. + TR (estimado ~0.5%) = ~3.5% a.a.
  const fgtsEffectiveAnnualRate = 0.035;
  const financingMonthlyRate = Math.pow(1 + annualInterestRate, 1 / 12) - 1;

  // Novo saldo após amortização
  const newRemainingDebt = Math.max(0, remainingDebt - fgtsBalance);

  // Nova parcela estimada (sistema Price simplificado)
  const newMonthlyPayment = newRemainingDebt > 0
    ? (newRemainingDebt * financingMonthlyRate) / (1 - Math.pow(1 + financingMonthlyRate, -remainingMonths))
    : 0;

  const monthlySavings = currentMonthlyPayment - newMonthlyPayment;
  const monthsToBreakeven = monthlySavings > 0 ? Math.ceil(fgtsBalance / monthlySavings) : 999;

  // Economia total em 10 anos vs manter FGTS rendendo
  const fgtsGainIn10y = fgtsBalance * Math.pow(1 + fgtsEffectiveAnnualRate, 10);
  const savingsIn10y = monthlySavings * 120; // 120 meses
  const totalSaved10y = Math.round(savingsIn10y - (fgtsGainIn10y - fgtsBalance));

  // Vale a pena se a taxa do financiamento > rendimento do FGTS com margem
  const worthIt = annualInterestRate > fgtsEffectiveAnnualRate * 1.5;

  const narrativa = worthIt
    ? `
✅ **Vale usar o FGTS para amortizar.**

Seu financiamento custa ${(annualInterestRate * 100).toFixed(1)}% a.a., enquanto o FGTS rende ~${(fgtsEffectiveAnnualRate * 100).toFixed(1)}% a.a.
Ao usar R$ ${fgtsBalance.toFixed(2)} do FGTS:
• Sua parcela cai de R$ ${currentMonthlyPayment.toFixed(2)} para R$ ${newMonthlyPayment.toFixed(2)} (economia de R$ ${monthlySavings.toFixed(2)}/mês)
• Break-even: ${monthsToBreakeven} meses
• Ganho líquido estimado em 10 anos: R$ ${Math.abs(totalSaved10y).toFixed(2)}

Visão Wall Street: O FGTS é um ativo de baixo rendimento. Usá-lo para quitar uma dívida cara é a melhor aplicação possível para ele.
`.trim()
    : `
🔄 **Amortização com FGTS pode não ser a melhor opção agora.**

Seu financiamento está a ${(annualInterestRate * 100).toFixed(1)}% a.a., relativamente próximo do rendimento do FGTS (~${(fgtsEffectiveAnnualRate * 100).toFixed(1)}% a.a.).
Com o CDI atual em ${(currentCdiAnnual * 100).toFixed(1)}% a.a., considere se não há outras dívidas mais caras para quitar primeiro.

Se o objetivo é reduzir a parcela mensal para melhorar o fluxo de caixa, aí sim pode fazer sentido.
`.trim();

  return {
    worthIt,
    fgtsBalance,
    remainingDebt,
    currentMonthlyPayment,
    newMonthlyPayment: Math.round(newMonthlyPayment * 100) / 100,
    monthlySavings: Math.round(monthlySavings * 100) / 100,
    monthsToBreakeven,
    totalSaved10y,
    narrativa,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RESERVA DE EMERGÊNCIA IDEAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula quanto de reserva de emergência o usuário deve ter antes de investir.
 * Leva em conta estabilidade da renda e nível de dependência financeira da família.
 */
export function analyzeEmergencyReserve(params: {
  monthlyExpense: number;
  incomeType: 'clt' | 'mei' | 'pj' | 'autonomo' | 'aposentado';
  hasDependents: boolean;
  currentReserve: number;
}): {
  targetMonths: number;
  targetAmount: number;
  currentMonths: number;
  missingAmount: number;
  isAdequate: boolean;
  narrativa: string;
} {
  const { monthlyExpense, incomeType, hasDependents, currentReserve } = params;

  // Meses recomendados por perfil
  const baseMonths: Record<typeof incomeType, number> = {
    clt: 3,
    aposentado: 4,
    mei: 6,
    pj: 6,
    autonomo: 8,
  };

  let targetMonths = baseMonths[incomeType] || 6;
  if (hasDependents) targetMonths += 2;

  const targetAmount = monthlyExpense * targetMonths;
  const currentMonths = monthlyExpense > 0 ? currentReserve / monthlyExpense : 0;
  const missingAmount = Math.max(0, targetAmount - currentReserve);
  const isAdequate = currentReserve >= targetAmount;

  const narrativa = isAdequate
    ? `✅ Sua reserva de emergência está adequada (${currentMonths.toFixed(1)} meses). Você pode investir o excedente com tranquilidade.`
    : `⚠️ Sua reserva atual cobre apenas ${currentMonths.toFixed(1)} meses. Para o seu perfil (${incomeType}${hasDependents ? ' com dependentes' : ''}), o ideal são ${targetMonths} meses = R$ ${targetAmount.toFixed(2)}. Faltam R$ ${missingAmount.toFixed(2)}. Priorize isso antes de investir em ativos de risco.`;

  return { targetMonths, targetAmount, currentMonths, missingAmount, isAdequate, narrativa };
}
