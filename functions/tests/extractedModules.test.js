/**
 * Testes para os módulos extraídos do index.js:
 *   - weeklySummaryEmailService (computeWeeklySummary, formatDateBR)
 *   - filiadoService (getNivelFil, FILIADO_MULT)
 *   - brapiRateLimiter (brapiRateCheck)
 *   - affiliateWebhookService (normalizeAffiliateEvent, calculateSibcoinFromReais)
 */

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

// ── Mocks mínimos para não precisar de firebase-admin real ───────────────────
process.env.LOMADEE_APP_TOKEN     = "test";
process.env.LOMADEE_SOURCE_ID     = "test";
process.env.CASHBACK_CONVERSION_RATE = "10";
process.env.CASHBACK_RELEASE_DAYS   = "7";

// Mock do firebase-admin antes de qualquer require do projeto
const Module = require("module");
const _origLoad = Module._load.bind(Module);
Module._load = function (request, ...args) {
  if (request === "firebase-admin") {
    return {
      apps: [{}],
      firestore: () => ({ batch: () => ({ set: () => {}, commit: async () => {} }) }),
      firestore: { FieldValue: { serverTimestamp: () => "ts", increment: (n) => n } },
      auth: () => ({}),
      initializeApp: () => {},
    };
  }
  if (request === "firebase-functions") {
    const err = (code, msg) => { const e = new Error(msg); e.code = code; return e; };
    const fn = { https: { HttpsError: class extends Error { constructor(c,m){ super(m); this.code=c; } } } };
    return fn;
  }
  return _origLoad(request, ...args);
};

// ── Imports após mocks ────────────────────────────────────────────────────────
const { computeWeeklySummary, formatDateBR } = require("../services/email/weeklySummaryEmailService");
const { getNivelFil, FILIADO_MULT, FILIADO_REWARDS } = require("../services/filiado/filiadoService");

// ── weeklySummaryEmailService ─────────────────────────────────────────────────

describe("computeWeeklySummary", () => {
  const entries = [
    { date: "2024-01-15", type: "receita", value: 3000, category: "Salário",    status: "pago", isTransfer: false },
    { date: "2024-01-16", type: "despesa", value: 500,  category: "Alimentação",status: "pago", isTransfer: false },
    { date: "2024-01-17", type: "despesa", value: 200,  category: "Transporte", status: "pago", isTransfer: false },
    { date: "2024-01-20", type: "despesa", value: 100,  category: "Alimentação",status: "pago", isTransfer: false },
    // Fora do intervalo
    { date: "2024-01-10", type: "despesa", value: 9999, category: "Outros",     status: "pago", isTransfer: false },
    // Pendente — deve ser ignorado
    { date: "2024-01-16", type: "despesa", value: 9999, category: "Outros",     status: "pendente", isTransfer: false },
    // Transferência — deve ser ignorada
    { date: "2024-01-16", type: "despesa", value: 9999, category: "Transferencia", status: "pago", isTransfer: true },
  ];

  it("calcula receita total corretamente", () => {
    const { receitaTotal } = computeWeeklySummary(entries, "2024-01-14", "2024-01-21");
    assert.equal(receitaTotal, 3000);
  });

  it("calcula despesa total corretamente (sem pendentes/transferências)", () => {
    const { despesaTotal } = computeWeeklySummary(entries, "2024-01-14", "2024-01-21");
    assert.equal(despesaTotal, 800);
  });

  it("agrupa top categorias corretamente", () => {
    const { topCategorias } = computeWeeklySummary(entries, "2024-01-14", "2024-01-21");
    assert.equal(topCategorias[0].name, "Alimentação");
    assert.equal(topCategorias[0].value, 600);
    assert.equal(topCategorias[1].name, "Transporte");
  });

  it("retorna zeros quando não há entries", () => {
    const { receitaTotal, despesaTotal, topCategorias } = computeWeeklySummary([], "2024-01-01", "2024-01-31");
    assert.equal(receitaTotal, 0);
    assert.equal(despesaTotal, 0);
    assert.deepEqual(topCategorias, []);
  });

  it("ignora entries fora do intervalo", () => {
    const { despesaTotal } = computeWeeklySummary(entries, "2024-01-18", "2024-01-21");
    assert.equal(despesaTotal, 100);
  });
});

describe("formatDateBR", () => {
  it("converte YYYY-MM-DD para DD/MM/YYYY", () => {
    assert.equal(formatDateBR("2024-03-15"), "15/03/2024");
  });

  it("retorna string vazia para input vazio", () => {
    assert.equal(formatDateBR(""), "");
    assert.equal(formatDateBR(null), "");
  });
});

// ── filiadoService ────────────────────────────────────────────────────────────

describe("getNivelFil", () => {
  it("retorna iniciante para 0 ativos", ()  => assert.equal(getNivelFil(0),  "iniciante"));
  it("retorna iniciante para 4 ativos", ()  => assert.equal(getNivelFil(4),  "iniciante"));
  it("retorna parceiro para 5 ativos",  ()  => assert.equal(getNivelFil(5),  "parceiro"));
  it("retorna parceiro para 14 ativos", ()  => assert.equal(getNivelFil(14), "parceiro"));
  it("retorna embaixador para 15",      ()  => assert.equal(getNivelFil(15), "embaixador"));
  it("retorna embaixador para 49",      ()  => assert.equal(getNivelFil(49), "embaixador"));
  it("retorna elite para 50+",          ()  => assert.equal(getNivelFil(50), "elite"));
  it("retorna elite para 999",          ()  => assert.equal(getNivelFil(999),"elite"));
});

describe("FILIADO_MULT", () => {
  it("multiplicador de iniciante é 1.0",   () => assert.equal(FILIADO_MULT.iniciante, 1.0));
  it("multiplicador de elite é 2.0",       () => assert.equal(FILIADO_MULT.elite, 2.0));
});

describe("FILIADO_REWARDS", () => {
  it("recompensa de ativação é 100",       () => assert.equal(FILIADO_REWARDS.ativacao, 100));
  it("recompensa de assinou é 500",        () => assert.equal(FILIADO_REWARDS.assinou, 500));
});
