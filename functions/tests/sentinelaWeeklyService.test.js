/**
 * Testes unitários para o sentinelaWeeklyService:
 *   - calcSpreadGap (rendimento vs custo de dívida)
 *   - calcDaysOfFreedom (dias de liberdade)
 *   - buildBenefitsTips (dicas de benefícios)
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// ── Mocks mínimos para não carregar Firebase de verdade ──────────────────────
const Module = require("module");
const _origLoad = Module._load.bind(Module);
Module._load = function (request, ...args) {
  if (request === "firebase-admin") {
    return {
      apps: [{}],
      firestore: () => ({}),
      auth: () => ({}),
      initializeApp: () => {},
    };
  }
  if (request === "firebase-functions") {
    return {
      https: { HttpsError: class extends Error { constructor(c, m) { super(m); this.code = c; } } }
    };
  }
  return _origLoad(request, ...args);
};

// ── Imports após mocks ────────────────────────────────────────────────────────
const { calcSpreadGap, calcDaysOfFreedom, buildBenefitsTips } = require("../services/sentinel/sentinelaWeeklyService");

describe("sentinelaWeeklyService - calcSpreadGap", () => {
  it("calcula rendimento ponderado correto com taxaMensal", () => {
    const investments = [
      { currentValue: 10000, taxaMensal: 0.01 }, // R$100 de rendimento
      { currentValue: 20000, taxaMensal: 0.015 } // R$300 de rendimento
    ];
    const { totalInvested, weightedYield } = calcSpreadGap(investments, []);
    assert.equal(totalInvested, 30000);
    // (100 + 300) / 30000 = 0.013333...
    assert.ok(Math.abs(weightedYield - 0.01333) < 0.0001);
  });

  it("calcula rendimento com taxaAnual simples (taxaAnual / 12 / 100)", () => {
    const investments = [
      { valor: 10000, taxaAnual: 12 } // 12% a.a. / 12 = 1% = 0.01 a.m.
    ];
    const { weightedYield } = calcSpreadGap(investments, []);
    assert.equal(weightedYield, 0.01);
  });

  it("calcula custo de dívida correto usando interestRatePct (% a.m.)", () => {
    const obligations = [
      { amount: 5000, interestRatePct: 3.5 }, // 3.5% = 0.035
      { amount: 5000, interestRatePct: 4.5 }  // 4.5% = 0.045
    ];
    const { totalDebt, weightedDebtRate } = calcSpreadGap([], obligations);
    assert.equal(totalDebt, 10000);
    assert.equal(weightedDebtRate, 0.04);
  });

  it("calcula custo com fallbacks interestPct e interestRate", () => {
    const obligations = [
      { amount: 5000, interestPct: 2.5 },
      { amount: 5000, interestRate: 3.0 }
    ];
    const { weightedDebtRate } = calcSpreadGap([], obligations);
    assert.equal(weightedDebtRate, 0.0275);
  });

  it("aplica taxaMensal (decimal) convertida se nenhum outro campo estiver presente", () => {
    const obligations = [
      { amount: 10000, taxaMensal: 0.025 } // 2.5% = 0.025
    ];
    const { weightedDebtRate } = calcSpreadGap([], obligations);
    assert.equal(weightedDebtRate, 0.025);
  });

  it("aplica fallback de 2% a.m. se a obrigação não tiver nenhuma taxa", () => {
    const obligations = [
      { amount: 10000 }
    ];
    const { weightedDebtRate } = calcSpreadGap([], obligations);
    assert.equal(weightedDebtRate, 0.02);
  });

  it("calcula spreadGap e vazamento mensal corretos", () => {
    const investments = [{ currentValue: 10000, taxaMensal: 0.01 }]; // yield = 1%
    const obligations = [{ amount: 10000, interestRatePct: 3.0 }];    // cost = 3%
    const { spreadGap, monthlyLeakage } = calcSpreadGap(investments, obligations);
    // spreadGap = 1% - 3% = -2% = -0.02
    assert.ok(Math.abs(spreadGap - (-0.02)) < 0.0001);
    assert.ok(Math.abs(monthlyLeakage - 200) < 0.0001); // R$200/mês
  });
});

describe("sentinelaWeeklyService - calcDaysOfFreedom", () => {
  it("calcula dias de liberdade com base em saldo de contas e investimentos líquidos", () => {
    const balances = { Nubank: 2000, Itaú: 3000 }; // R$5000
    const investments = [
      { currentValue: 5000, liquido: true },   // Líquido: entra na liquidez
      { currentValue: 10000, liquido: false }  // Não-líquido: ignorado
    ];
    // Total liquidez = 5000 + 5000 = 10000

    // entries dos últimos 90 dias
    const today = new Date();
    const cutoff = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0, 10);
    const entries = [
      { date: cutoff, type: "despesa", value: 1000, isTransfer: false },
      { date: cutoff, type: "despesa", value: 2000, isTransfer: false },
      // Transferências — devem ser ignoradas
      { date: cutoff, type: "despesa", value: 5000, isTransfer: true },
      // Receitas — não afetam a queima de despesas
      { date: cutoff, type: "receita", value: 8000 }
    ];
    // Despesas totais = 3000. Burn rate diário = 3000 / 90 = 33.333
    // Dias de Liberdade = 10000 / 33.333 = 300 dias

    const { days, totalLiquido, dailyBurn } = calcDaysOfFreedom(entries, balances, investments);
    assert.equal(totalLiquido, 10000);
    assert.ok(Math.abs(dailyBurn - 33.333) < 0.01);
    assert.equal(days, 300);
  });

  it("calcula dias de liberdade com proventosMensais reduzindo a queima diária", () => {
    const balances = { Nubank: 5000 }; // R$5000
    const investments = [
      { currentValue: 5000, proventosMensais: 100 } // R$5000, proventos R$100/mês
    ];
    // Total liquidez = 5000 + 5000 = 10000

    const today = new Date();
    const cutoff = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0, 10);
    const entries = [
      { date: cutoff, type: "despesa", value: 9000, isTransfer: false } // R$9000 despesas nos 3 meses
    ];
    // Despesas totais = 9000 -> média mensal = 3000.
    // Proventos mensais = 100.
    // Queima líquida mensal = 3000 - 100 = 2900.
    // Burn rate diário = 2900 / 30 = 96.6666...
    // Dias de liberdade = 10000 / 96.6666... = 103 dias.

    const { days, totalLiquido, dailyBurn } = calcDaysOfFreedom(entries, balances, investments);
    assert.equal(totalLiquido, 10000);
    assert.ok(Math.abs(dailyBurn - 96.6666) < 0.01);
    assert.equal(days, 103);
  });

  it("calcula dias de liberdade com proventos cobrindo totalmente a queima diária (dailyBurn = 0, days = 99999)", () => {
    const balances = { Nubank: 5000 };
    const investments = [
      { currentValue: 5000, proventosMensais: 1500 } // R$1500 proventos/mês
    ];

    const today = new Date();
    const cutoff = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0, 10);
    const entries = [
      { date: cutoff, type: "despesa", value: 3000 } // R$3000 despesas nos 3 meses -> média mensal = 1000
    ];
    // Média despesas = 1000 < proventos = 1500 -> Queima líquida mensal = 0.
    // Burn rate diário = 0.
    // Dias de liberdade = 99999.

    const { days, dailyBurn } = calcDaysOfFreedom(entries, balances, investments);
    assert.equal(dailyBurn, 0);
    assert.equal(days, 99999);
  });
});

describe("sentinelaWeeklyService - buildBenefitsTips", () => {
  it("sugere benefícios de sala VIP se gastou com viagens e tem cartão VIP", () => {
    const cards = [
      { name: "XP Visa Infinite", cardBenefits: { vipLounge: true } }
    ];
    const entries = [
      { date: "2026-06-01", desc: "Passagem aérea Latam", value: 1200 }
    ];
    const tips = buildBenefitsTips(cards, entries);
    assert.ok(tips.length > 0);
    assert.ok(tips[0].includes("sala VIP"));
  });

  it("sugere cashback se tem cartão com cashback e não ativou VIP", () => {
    const cards = [
      { name: "C6 Carbon", cardBenefits: { cashbackPct: 1.2 } }
    ];
    const tips = buildBenefitsTips(cards, []);
    assert.ok(tips.length > 0);
    assert.ok(tips[0].includes("cashback"));
  });
});
