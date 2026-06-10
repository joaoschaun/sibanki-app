/**
 * pluggySyncService.test.js
 * Testes unitários para as funções puras do serviço de sincronização Open Finance (Pluggy).
 *
 * Estratégia: testa apenas as funções puras exportadas via `_internals`.
 * Nenhuma chamada real à Pluggy API ou ao Firestore.
 *
 * Cobertura:
 *   - stableNumericId         — hash determinístico para IDs
 *   - formatYmd               — formatação de datas ISO YYYY-MM-DD
 *   - daysAgoYmd              — data N dias atrás
 *   - mapPluggyCategoryToApp  — mapeamento de categoria Pluggy → app
 *   - mapTransactionToEntry   — mapeamento de transação → Entry
 *   - mapCreditToCard         — mapeamento de conta crédito → Card
 *   - mapInvestmentToUser     — mapeamento de investimento → Investment
 *   - loanIsSettled           — detecção de empréstimo quitado
 *   - estimateMonthlyInstallment — estimativa de parcela mensal
 *   - mapLoanKind             — tipo de empréstimo
 *   - mapLoanToCreditAccount  — mapeamento de empréstimo → CreditAccount
 *   - mapBalloonObligations   — parcelas balloon
 *   - mapNextRegularInstallment — próxima parcela regular
 *   - round2                  — arredondamento de 2 casas decimais
 *   - pickBalance             — seleção de saldo correto
 *   - baseLabel               — rótulo base de conta
 *   - dayFromPluggyDate       — extração de dia do mês
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// ── Mock mínimo de firebase-functions (não é utilizado pelas funções puras) ──
const Module = require("module");
const _origLoad = Module._load;
Module._load = function (id, ...rest) {
  if (id === "firebase-functions") {
    return {
      https: { HttpsError: class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } } },
    };
  }
  if (id === "firebase-admin") return {};
  // As funções puras não chamam os serviços abaixo — mas o require() do módulo os carrega.
  if (id === "./pluggyService") return { getPluggyClientOrThrow: () => { throw new Error("not mocked"); } };
  if (id === "../../utils/creditSnapshot") return { buildCreditSnapshot: () => ({}) };
  if (id === "../../utils/calculateFinScore") return { calculateFinScore: () => 50 };
  if (id === "./entryOverflow") return { loadOverflowPluggyIds: async () => new Set(), trimPluggyEntriesToLimit: async (_, e) => ({ entries: e, archived: 0 }) };
  if (id === "./syncOpenFinanceExtras") return { syncOpenFinanceExtras: async () => ({ openFinanceIdentityByItem: {}, openFinanceCreditBills: [], openFinanceConsentsByItem: {}, counts: { identity: 0, bills: 0, consents: 0 } }) };
  return _origLoad.call(this, id, ...rest);
};

const {
  stableNumericId,
  formatYmd,
  daysAgoYmd,
  mapPluggyCategoryToApp,
  mapTransactionToEntry,
  mapCreditToCard,
  mapInvestmentToUser,
  loanIsSettled,
  estimateMonthlyInstallment,
  mapLoanKind,
  mapLoanToCreditAccount,
  mapBalloonObligations,
  mapNextRegularInstallment,
  round2,
  pickBalance,
  baseLabel,
  dayFromPluggyDate,
} = require("../services/pluggy/pluggySyncService")._internals;

// ─────────────────────────────────────────────────────────────────────────────
describe("round2", () => {
  it("arredonda para 2 casas decimais", () => {
    assert.equal(round2(1.234), 1.23);
    assert.equal(round2(1.235), 1.24);
    assert.equal(round2(1234.567), 1234.57);
  });

  it("aceita strings numéricas", () => {
    assert.equal(round2("9.999"), 10);
  });

  it("retorna NaN para valor NaN (comportamento real de Math.round)", () => {
    assert.ok(Number.isNaN(round2(NaN)));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("stableNumericId", () => {
  it("produz o mesmo número para a mesma seed", () => {
    const a = stableNumericId("pluggy-tx:abc123");
    const b = stableNumericId("pluggy-tx:abc123");
    assert.equal(a, b);
  });

  it("produz números diferentes para seeds diferentes", () => {
    const a = stableNumericId("pluggy-tx:abc");
    const b = stableNumericId("pluggy-tx:def");
    assert.notEqual(a, b);
  });

  it("retorna sempre um inteiro positivo", () => {
    for (const seed of ["", "a", "x".repeat(100), "0"]) {
      const v = stableNumericId(seed);
      assert.ok(Number.isInteger(v) && v >= 1, `esperado >=1 para seed "${seed}", obteve ${v}`);
    }
  });

  it("é limitado a 2 bilhões (safe int para Firestore ID)", () => {
    const v = stableNumericId("qualquer-coisa-grande-12345678901234567890");
    assert.ok(v <= 2_000_000_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("formatYmd", () => {
  it("formata Date para YYYY-MM-DD", () => {
    assert.equal(formatYmd(new Date("2024-03-15T12:00:00Z")), "2024-03-15");
  });

  it("aceita string ISO", () => {
    assert.equal(formatYmd("2025-11-01T00:00:00.000Z"), "2025-11-01");
  });

  it("retorna data de hoje para string inválida", () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(formatYmd("nao-e-data"), today);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("daysAgoYmd", () => {
  it("retorna data exatamente N dias atrás", () => {
    const n = 30;
    const expected = new Date();
    expected.setDate(expected.getDate() - n);
    assert.equal(daysAgoYmd(n), expected.toISOString().slice(0, 10));
  });

  it("daysAgoYmd(0) retorna hoje", () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(daysAgoYmd(0), today);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("dayFromPluggyDate", () => {
  it("extrai o dia do mês de uma data local (sem fuso)", () => {
    // Usa data sem componente de hora para evitar drift de timezone
    const result = dayFromPluggyDate("2024-06-15");
    assert.ok(result === 15 || result === 14, `esperado 14 ou 15, obteve ${result}`);
  });

  it("retorna 1 para null/undefined", () => {
    assert.equal(dayFromPluggyDate(null), 1);
    assert.equal(dayFromPluggyDate(undefined), 1);
  });

  it("retorna 1 para data inválida", () => {
    assert.equal(dayFromPluggyDate("invalido"), 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("pickBalance", () => {
  it("usa closingBalance para BANK quando disponível", () => {
    const acc = { type: "BANK", bankData: { closingBalance: 1234.56 }, balance: 0 };
    assert.equal(pickBalance(acc), 1234.56);
  });

  it("usa balance quando bankData não tem closingBalance", () => {
    const acc = { type: "BANK", bankData: {}, balance: 500 };
    assert.equal(pickBalance(acc), 500);
  });

  it("usa balance para conta CREDIT", () => {
    const acc = { type: "CREDIT", balance: -350.75 };
    assert.equal(pickBalance(acc), -350.75);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("baseLabel", () => {
  it("usa marketingName + tipo BANK", () => {
    const acc = { type: "BANK", marketingName: "Conta Corrente Ouro", name: "CC" };
    assert.equal(baseLabel(acc), "Conta Corrente Ouro (Conta · Open Finance)");
  });

  it("usa name quando marketingName ausente + tipo CREDIT", () => {
    const acc = { type: "CREDIT", name: "Visa Gold" };
    assert.equal(baseLabel(acc), "Visa Gold (Cartão · Open Finance)");
  });

  it("cai em 'Conta' quando name e marketingName ausentes", () => {
    const acc = { type: "BANK" };
    assert.equal(baseLabel(acc), "Conta (Conta · Open Finance)");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("mapPluggyCategoryToApp", () => {
  const cases = [
    [{ category: "food" }, "Alimentação"],
    [{ category: "restaurant" }, "Alimentação"],
    [{ category: "transport" }, "Transporte"],
    [{ category: "uber" }, "Transporte"],
    [{ category: "health" }, "Saúde"],
    [{ category: "farmacia" }, "Saúde"],
    [{ category: "education" }, "Educação"],
    [{ category: "escola" }, "Educação"],
    [{ category: "moradia" }, "Moradia"],
    [{ category: "aluguel" }, "Moradia"],
    [{ category: "invest" }, "Investimentos"],
    [{ category: "salary" }, "Salário"],
    [{ category: "xpto-desconhecido" }, "Outros"],
    [{ category: "" }, "Outros"],
    [{}, "Outros"],
    // via merchant.category
    [{ merchant: { category: "aliment" } }, "Alimentação"],
  ];

  for (const [tx, expected] of cases) {
    it(`"${tx.category ?? tx.merchant?.category ?? "(vazio)"}" → ${expected}`, () => {
      assert.equal(mapPluggyCategoryToApp(tx), expected);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
describe("mapTransactionToEntry", () => {
  const baseTx = {
    id: "pluggy-123",
    type: "DEBIT",
    amount: -150.5,
    description: "Supermercado Extra",
    category: "food",
    date: "2024-05-10T00:00:00Z",
    accountId: "acc-abc",
  };

  it("mapeia transação de débito corretamente", () => {
    const entry = mapTransactionToEntry(baseTx, "Conta Corrente");
    assert.equal(entry.type, "despesa");
    assert.equal(entry.value, 150.5);
    assert.equal(entry.category, "Alimentação");
    assert.equal(entry.date, "2024-05-10");
    assert.equal(entry.account, "Conta Corrente");
    assert.equal(entry.status, "confirmado");
    assert.equal(entry.pluggyTransactionId, "pluggy-123");
    assert.equal(entry.source, "open-finance");
    assert.ok(typeof entry.id === "number" && entry.id >= 1);
  });

  it("mapeia transação de crédito como receita", () => {
    const tx = { ...baseTx, type: "CREDIT", amount: 3000 };
    const entry = mapTransactionToEntry(tx, "Conta Salário");
    assert.equal(entry.type, "receita");
    assert.equal(entry.value, 3000);
  });

  it("trunca descrição muito longa em 500 chars", () => {
    const longDesc = "x".repeat(600);
    const entry = mapTransactionToEntry({ ...baseTx, description: longDesc }, "Conta");
    assert.equal(entry.desc.length, 500);
  });

  it("cai em 'Movimentação' quando descrição ausente", () => {
    const tx = { ...baseTx, description: undefined, descriptionRaw: undefined };
    const entry = mapTransactionToEntry(tx, "Conta");
    assert.equal(entry.desc, "Movimentação");
  });

  it("valor sempre positivo (abs)", () => {
    const entry = mapTransactionToEntry({ ...baseTx, amount: -999 }, "Conta");
    assert.equal(entry.value, 999);
  });

  it("ID é estável entre chamadas", () => {
    const e1 = mapTransactionToEntry(baseTx, "Conta");
    const e2 = mapTransactionToEntry(baseTx, "Outra Conta");
    assert.equal(e1.id, e2.id); // id é derivado de tx.id, não do label
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("mapCreditToCard", () => {
  const baseAcc = {
    id: "credit-abc",
    type: "CREDIT",
    name: "Visa Gold",
    balance: -850.0,
    creditData: {
      creditLimit: 5000,
      balanceCloseDate: "2024-06-20T00:00:00Z",
      balanceDueDate: "2024-06-27T00:00:00Z",
      brand: "VISA",
    },
  };

  it("mapeia conta crédito → Card corretamente", () => {
    const card = mapCreditToCard(baseAcc, "Visa Gold (Cartão · Open Finance)");
    assert.equal(card.limit, 5000);
    // closeDay/dueDay podem diferir ±1 por timezone — apenas verificar range válido
    assert.ok(card.closeDay >= 19 && card.closeDay <= 20, `closeDay=${card.closeDay}`);
    assert.ok(card.dueDay >= 26 && card.dueDay <= 27, `dueDay=${card.dueDay}`);
    assert.equal(card.currentBill, 850);
    assert.equal(card.active, true);
    assert.equal(card.pluggyAccountId, "credit-abc");
    assert.equal(card.source, "open-finance");
    assert.equal(card.flag, "VISA");
  });

  it("remove sufixo Open Finance do name", () => {
    const card = mapCreditToCard(baseAcc, "Visa Gold (Cartão · Open Finance)");
    assert.equal(card.name, "Visa Gold");
  });

  it("funciona sem creditData", () => {
    const acc = { ...baseAcc, creditData: undefined };
    const card = mapCreditToCard(acc, "Cartão Sem Dados");
    assert.equal(card.limit, 0);
    assert.equal(card.closeDay, 1);
    assert.equal(card.dueDay, 1);
  });

  it("ID é estável (baseado em acc.id)", () => {
    const c1 = mapCreditToCard(baseAcc, "Label A");
    const c2 = mapCreditToCard(baseAcc, "Label B");
    assert.equal(c1.id, c2.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("mapInvestmentToUser", () => {
  const baseInv = {
    id: "inv-xyz",
    itemId: "item-001",
    type: "FIXED_INCOME",
    name: "LCI Banco X",
    amountOriginal: 10000,
    balance: 10234.56,
    purchaseDate: "2023-01-15T00:00:00Z",
  };

  it("mapeia investimento corretamente", () => {
    const inv = mapInvestmentToUser(baseInv);
    assert.equal(inv.tipo, "FIXED_INCOME");
    assert.equal(inv.nome, "LCI Banco X");
    assert.equal(inv.valor, 10000);
    assert.equal(inv.atual, 10234.56);
    assert.equal(inv.date, "2023-01-15");
    assert.equal(inv.source, "open-finance");
    assert.equal(inv.pluggyInvestmentId, "inv-xyz");
  });

  it("usa value quando amountOriginal ausente", () => {
    // O campo do Pluggy para valor corrente é `value`, não `balance`
    const inv = mapInvestmentToUser({ ...baseInv, amountOriginal: undefined, value: 9876.54 });
    assert.equal(inv.valor, 9876.54);
  });

  it("trunca nome longo em 200 chars", () => {
    const inv = mapInvestmentToUser({ ...baseInv, name: "A".repeat(300) });
    assert.equal(inv.nome.length, 200);
  });

  it("ID estável entre chamadas", () => {
    const a = mapInvestmentToUser(baseInv);
    const b = mapInvestmentToUser(baseInv);
    assert.equal(a.id, b.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("loanIsSettled", () => {
  it("quitado quando settlementDate no passado", () => {
    assert.ok(loanIsSettled({ settlementDate: "2020-01-01", contractAmount: 1000 }));
  });

  it("não quitado quando settlementDate no futuro", () => {
    assert.ok(!loanIsSettled({ settlementDate: "2099-12-31", contractAmount: 1000 }));
  });

  it("quitado quando outstanding = 0 e contractAmount > 0", () => {
    const loan = {
      contractAmount: 5000,
      payments: { contractOutstandingBalance: 0 },
    };
    assert.ok(loanIsSettled(loan));
  });

  it("não quitado quando outstanding > 0", () => {
    const loan = {
      contractAmount: 5000,
      payments: { contractOutstandingBalance: 1500 },
    };
    assert.ok(!loanIsSettled(loan));
  });

  it("não quitado quando ambos ausentes", () => {
    assert.ok(!loanIsSettled({ contractAmount: 5000 }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("estimateMonthlyInstallment", () => {
  it("calcula parcela = contractAmount / totalInstallments", () => {
    const loan = {
      contractAmount: 12000,
      installments: { totalNumberOfInstallments: 12 },
    };
    assert.equal(estimateMonthlyInstallment(loan), 1000);
  });

  it("retorna null quando totalInstallments ausente", () => {
    assert.equal(estimateMonthlyInstallment({ contractAmount: 12000 }), null);
  });

  it("retorna null quando contractAmount = 0", () => {
    const loan = { contractAmount: 0, installments: { totalNumberOfInstallments: 12 } };
    assert.equal(estimateMonthlyInstallment(loan), null);
  });

  it("arredonda para 2 casas decimais", () => {
    const loan = { contractAmount: 1000, installments: { totalNumberOfInstallments: 3 } };
    assert.equal(estimateMonthlyInstallment(loan), 333.33);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("mapLoanKind", () => {
  const cases = [
    ["CONSIGNADO", "consignado"],
    ["EMPRESTIMO_CONSIGN", "consignado"],
    ["FINANCIAMENTO", "financiamento"],
    ["IMOBILIARIO", "financiamento"],
    ["REAL_ESTATE", "financiamento"],
    ["HOME_EQUITY", "financiamento"],
    ["PERSONAL_CREDIT", "emprestimo"],
    ["CDC", "emprestimo"],
    [undefined, "emprestimo"],
    ["", "emprestimo"],
  ];

  for (const [type, expected] of cases) {
    it(`"${type ?? "(undefined)"}" → "${expected}"`, () => {
      assert.equal(mapLoanKind(type), expected);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
describe("mapLoanToCreditAccount", () => {
  const baseLoan = {
    id: "loan-001",
    itemId: "item-abc",
    type: "PERSONAL_CREDIT",
    productName: "Empréstimo Pessoal",
    contractAmount: 10000,
    payments: { contractOutstandingBalance: 6000 },
    installments: { totalNumberOfInstallments: 24 },
    CET: 12.5,
  };

  it("mapeia empréstimo ativo corretamente", () => {
    const ca = mapLoanToCreditAccount(baseLoan);
    assert.equal(ca.kind, "emprestimo");
    assert.equal(ca.status, "ativo");
    assert.equal(ca.limitTotal, 10000);
    assert.equal(ca.balanceUsed, 6000);
    assert.equal(ca.monthlyInstallment, round2(10000 / 24));
    assert.equal(ca.annualInterestPct, 12.5);
    assert.equal(ca.source, "open-finance");
    assert.equal(ca.pluggyLoanId, "loan-001");
  });

  it("status 'quitado' quando outstanding = 0", () => {
    const loan = { ...baseLoan, payments: { contractOutstandingBalance: 0 } };
    const ca = mapLoanToCreditAccount(loan);
    assert.equal(ca.status, "quitado");
  });

  it("CET em decimal (<=1) é convertido para %", () => {
    const loan = { ...baseLoan, CET: 0.125 };
    const ca = mapLoanToCreditAccount(loan);
    assert.equal(ca.annualInterestPct, 12.5);
  });

  it("usa contractAmount como balanceUsed quando outstanding ausente", () => {
    const loan = { ...baseLoan, payments: undefined };
    const ca = mapLoanToCreditAccount(loan);
    assert.equal(ca.balanceUsed, 10000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("mapBalloonObligations", () => {
  const baseLoan = {
    id: "loan-001",
    productName: "Financiamento",
    contractAmount: 50000,
    payments: { contractOutstandingBalance: 30000 },
    installments: {
      balloonPayments: [
        { dueDate: "2025-03-10T00:00:00Z", amount: { value: 5000 } },
        { dueDate: "2025-09-10T00:00:00Z", amount: { value: 5000 } },
      ],
    },
  };

  it("gera uma obligation por balloon payment", () => {
    const obs = mapBalloonObligations(baseLoan);
    assert.equal(obs.length, 2);
  });

  it("cada obligation tem campos obrigatórios", () => {
    const [ob] = mapBalloonObligations(baseLoan);
    assert.equal(ob.kind, "parcela");
    assert.equal(ob.status, "aberta");
    assert.equal(ob.amount, 5000);
    assert.equal(ob.dueDate, "2025-03-10");
    assert.equal(ob.source, "open-finance");
    assert.equal(ob.pluggyLoanId, "loan-001");
  });

  it("retorna [] quando não há balloons", () => {
    const loan = { ...baseLoan, installments: {} };
    assert.deepEqual(mapBalloonObligations(loan), []);
  });

  it("status 'paga' quando empréstimo quitado", () => {
    const loan = { ...baseLoan, payments: { contractOutstandingBalance: 0 } };
    const [ob] = mapBalloonObligations(loan);
    assert.equal(ob.status, "paga");
  });

  it("ignora entradas sem dueDate ou amount", () => {
    const loan = {
      ...baseLoan,
      installments: {
        balloonPayments: [
          null,
          { dueDate: "2025-01-01", amount: null },
          { dueDate: "2025-02-01", amount: { value: 1000 } },
        ],
      },
    };
    const obs = mapBalloonObligations(loan);
    assert.equal(obs.length, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("mapNextRegularInstallment", () => {
  const futureDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  })();

  const baseLoan = {
    id: "loan-001",
    productName: "Empréstimo CDC",
    contractAmount: 12000,
    payments: { contractOutstandingBalance: 6000 },
    installments: { totalNumberOfInstallments: 12, contractRemainingNumber: 6 },
    firstInstallmentDueDate: futureDate,
  };

  it("retorna próxima parcela para empréstimo ativo com parcela estimável", () => {
    const obs = mapNextRegularInstallment(baseLoan);
    assert.equal(obs.length, 1);
    assert.equal(obs[0].kind, "parcela");
    assert.equal(obs[0].status, "aberta");
    assert.ok(obs[0].amount > 0);
    assert.equal(obs[0].source, "open-finance");
  });

  it("retorna [] quando empréstimo quitado", () => {
    const loan = { ...baseLoan, payments: { contractOutstandingBalance: 0 } };
    assert.deepEqual(mapNextRegularInstallment(loan), []);
  });

  it("retorna [] quando não há data futura", () => {
    const loan = { ...baseLoan, firstInstallmentDueDate: "2020-01-01", dueDate: undefined };
    assert.deepEqual(mapNextRegularInstallment(loan), []);
  });

  it("retorna [] quando outstanding = null e sem parcela estimável", () => {
    const loan = {
      ...baseLoan,
      payments: undefined,
      installments: undefined,
    };
    assert.deepEqual(mapNextRegularInstallment(loan), []);
  });
});
