import { describe, it, expect } from 'vitest';
import {
  analyzeInstallmentDecision,
  analyzeDebtPayoffStrategy,
  analyzeFgtsAmortization,
  analyzeEmergencyReserve,
} from './decisionEngine';

// ─── 1. analyzeInstallmentDecision ───────────────────────────────────────────

describe('analyzeInstallmentDecision', () => {
  it('recomenda PARCELAR E INVESTIR quando o desconto é baixo e a saúde financeira está sob controle', () => {
    const result = analyzeInstallmentDecision({
      totalValue: 1000,
      cashDiscount: 0.01, // 1% de desconto
      installments: 10,
      investmentMonthlyRate: 0.012, // 1.2% a.m.
      creditPressureLevel: 'controlado',
      debtCommitmentPct: 10,
      emergencyReserveMonths: 6,
      hasCashAvailable: true,
    });

    expect(result.verdict).toBe('parcelar-e-investir');
    expect(result.monthlyPayment).toBe(100);
    expect(result.installmentTotalCost).toBe(1000);
    expect(result.investmentGainIfInstallment).toBeGreaterThan(0);
    expect(result.netAdvantage).toBeGreaterThan(0);
    expect(result.narrativa).toContain('💡 **Recomendação: PARCELAR e manter o capital rendendo.**');
  });

  it('recomenda PAGAR À VISTA quando há desconto alto que supera o rendimento esperado', () => {
    const result = analyzeInstallmentDecision({
      totalValue: 5000,
      cashDiscount: 0.10, // 10% de desconto
      installments: 5,
      investmentMonthlyRate: 0.008, // 0.8% a.m.
      creditPressureLevel: 'controlado',
      debtCommitmentPct: 15,
      emergencyReserveMonths: 5,
      hasCashAvailable: true,
    });

    expect(result.verdict).toBe('avista-com-desconto');
    expect(result.cashPrice).toBe(4500);
    expect(result.netAdvantage).toBe(500); // desconto bruto
    expect(result.narrativa).toContain('💡 **Recomendação: PAGAR À VISTA.**');
  });

  it('recomenda PAGAR À VISTA POR PRESSÃO quando a saúde financeira/reserva está frágil, mesmo com spread favorável', () => {
    const result = analyzeInstallmentDecision({
      totalValue: 2000,
      cashDiscount: 0.02, // 2% desconto
      installments: 10,
      investmentMonthlyRate: 0.015, // 1.5% a.m.
      creditPressureLevel: 'elevado', // pressão de crédito elevada
      debtCommitmentPct: 35, // endividamento alto
      emergencyReserveMonths: 2, // pouca reserva
      hasCashAvailable: true,
    });

    expect(result.verdict).toBe('avista-por-pressao');
    expect(result.narrativa).toContain('⚠️ **Recomendação: PAGAR À VISTA (por prudência, não por matemática).**');
  });

  it('recomenda NÃO COMPRAR AGORA quando a reserva de emergência é crítica ou pressão máxima', () => {
    const resultCriticalReserve = analyzeInstallmentDecision({
      totalValue: 1000,
      installments: 5,
      emergencyReserveMonths: 0.5, // reserva crítica (< 1 mês)
    });

    expect(resultCriticalReserve.verdict).toBe('nao-comprar-agora');
    expect(resultCriticalReserve.narrativa).toContain('🛑 **Recomendação: NÃO COMPRAR AGORA.**');

    const resultCriticalPressure = analyzeInstallmentDecision({
      totalValue: 1000,
      installments: 5,
      creditPressureLevel: 'critico', // pressão crítica
    });

    expect(resultCriticalPressure.verdict).toBe('nao-comprar-agora');
  });

  it('recomenda NEUTRO quando a diferença financeira líquida entre opções é menor que 1%', () => {
    const result = analyzeInstallmentDecision({
      totalValue: 100,
      cashDiscount: 0.005, // 0.5% desconto
      installments: 3,
      investmentMonthlyRate: 0.002, // rendimento muito baixo
      creditPressureLevel: 'controlado',
      emergencyReserveMonths: 6,
      hasCashAvailable: true,
    });

    expect(result.verdict).toBe('neutro');
    expect(result.narrativa).toContain('🔄 **Recomendação: INDIFERENTE — escolha pelo que for mais conveniente.**');
  });
});

// ─── 2. analyzeDebtPayoffStrategy ────────────────────────────────────────────

describe('analyzeDebtPayoffStrategy', () => {
  it('retorna resultado padrão para sem dívidas', () => {
    const result = analyzeDebtPayoffStrategy([]);
    expect(result.orderedDebts).toEqual([]);
    expect(result.totalMonthlyCost).toBe(0);
    expect(result.narrativa).toContain('Nenhuma dívida ativa detectada');
  });

  it('recomenda estratégia AVALANCHE (quitar maior taxa primeiro) no cenário comum', () => {
    const debts = [
      { name: 'Financiamento', balance: 50000, monthlyRate: 0.008 }, // 0.8% a.m.
      { name: 'Cartão de Crédito', balance: 4000, monthlyRate: 0.14 }, // 14% a.m.
      { name: 'Empréstimo Pessoal', balance: 10000, monthlyRate: 0.03 }, // 3% a.m.
    ];

    const result = analyzeDebtPayoffStrategy(debts);

    expect(result.strategy).toBe('avalanche');
    expect(result.orderedDebts[0].name).toBe('Cartão de Crédito'); // maior taxa primeiro
    expect(result.orderedDebts[1].name).toBe('Empréstimo Pessoal');
    expect(result.orderedDebts[2].name).toBe('Financiamento'); // menor taxa por último
    expect(result.narrativa).toContain('Avalanche (máxima economia)');
  });

  it('recomenda estratégia BOLA DE NEVE (quitar menor valor primeiro) quando há muitas dívidas pequenas', () => {
    const debts = [
      { name: 'Dívida A', balance: 200, monthlyRate: 0.02 },
      { name: 'Dívida B', balance: 350, monthlyRate: 0.05 },
      { name: 'Dívida C', balance: 400, monthlyRate: 0.03 },
      { name: 'Dívida D', balance: 15000, monthlyRate: 0.08 },
    ];

    const result = analyzeDebtPayoffStrategy(debts);

    expect(result.strategy).toBe('bola-de-neve');
    expect(result.orderedDebts[0].name).toBe('Dívida A'); // menor saldo primeiro (200)
    expect(result.orderedDebts[1].name).toBe('Dívida B'); // 350
    expect(result.orderedDebts[2].name).toBe('Dívida C'); // 400
    expect(result.orderedDebts[3].name).toBe('Dívida D'); // 15000
    expect(result.narrativa).toContain('Bola de Neve (máxima motivação)');
  });
});

// ─── 3. analyzeFgtsAmortization ──────────────────────────────────────────────

describe('analyzeFgtsAmortization', () => {
  it('indica que vale a pena amortizar com FGTS se a taxa de juros do financiamento for alta', () => {
    const result = analyzeFgtsAmortization({
      fgtsBalance: 10000,
      remainingDebt: 100000,
      currentMonthlyPayment: 1200,
      annualInterestRate: 0.10, // 10% a.a.
      remainingMonths: 180,
    });

    expect(result.worthIt).toBe(true);
    expect(result.monthlySavings).toBeGreaterThan(0);
    expect(result.narrativa).toContain('Vale usar o FGTS para amortizar');
  });

  it('indica que NÃO vale a pena amortizar com FGTS se a taxa de juros for muito baixa', () => {
    const result = analyzeFgtsAmortization({
      fgtsBalance: 10000,
      remainingDebt: 100000,
      currentMonthlyPayment: 600,
      annualInterestRate: 0.04, // 4% a.a. (muito próxima do rendimento do FGTS de ~3.5%)
      remainingMonths: 180,
    });

    expect(result.worthIt).toBe(false);
    expect(result.narrativa).toContain('pode não ser a melhor opção agora');
  });
});

// ─── 4. analyzeEmergencyReserve ──────────────────────────────────────────────

describe('analyzeEmergencyReserve', () => {
  it('indica reserva adequada quando o saldo ultrapassa a meta', () => {
    const result = analyzeEmergencyReserve({
      monthlyExpense: 3000,
      incomeType: 'clt', // meta: 3 meses = 9k
      hasDependents: false,
      currentReserve: 10000,
    });

    expect(result.isAdequate).toBe(true);
    expect(result.targetMonths).toBe(3);
    expect(result.targetAmount).toBe(9000);
    expect(result.missingAmount).toBe(0);
    expect(result.narrativa).toContain('reserva de emergência está adequada');
  });

  it('indica reserva inadequada com valores faltantes para profissional autônomo com dependentes', () => {
    const result = analyzeEmergencyReserve({
      monthlyExpense: 4000,
      incomeType: 'autonomo', // meta: 8 meses + 2 (dependentes) = 10 meses = 40k
      hasDependents: true,
      currentReserve: 15000,
    });

    expect(result.isAdequate).toBe(false);
    expect(result.targetMonths).toBe(10);
    expect(result.targetAmount).toBe(40000);
    expect(result.missingAmount).toBe(25000);
    expect(result.narrativa).toContain('Faltam R$ 25000.00');
  });
});
