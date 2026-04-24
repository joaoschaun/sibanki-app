/**
 * recorrentesService.test.js
 * Testes unitários para applyRecurrentesForUser.
 *
 * Estratégia: mock completo de firebase-admin via Module._load.
 * Não acessa Firestore real — apenas valida a lógica de negócio:
 *   - quais recorrentes devem gerar entries
 *   - deduplicação por rcTag
 *   - frequências (mensal, bimestral, trimestral, semestral, anual)
 *   - limites de duração (durationType: data | qtd)
 */
const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// ── Mock de firebase-admin ────────────────────────────────────────────────────
let _mockEntries = [];
let _updatedEntries = null;
let _mockTags = new Set();

const mockDb = {
  collection: () => ({
    doc: () => ({
      get: async () => ({
        exists: true,
        data: () => ({
          entries: _mockEntries,
        }),
      }),
      collection: () => ({
        get: async () => ({ forEach: () => {} }),
      }),
      update: async (payload) => {
        // Captura o que foi enviado para arrayUnion
        const added = payload?.entries?.elements ?? payload?.entries ?? [];
        _updatedEntries = added;
      },
    }),
  }),
};

const Module = require("module");
const _origLoad = Module._load.bind(Module);
let mockInjected = false;
if (!mockInjected) {
  mockInjected = true;
  Module._load = function (request, ...args) {
    if (request === "firebase-admin") {
      return {
        apps: [{}],
        initializeApp: () => {},
        firestore: Object.assign(() => mockDb, {
          FieldValue: {
            arrayUnion: (...items) => ({ elements: items }),
            serverTimestamp: () => "ts",
          },
        }),
      };
    }
    return _origLoad(request, ...args);
  };
}

const { applyRecurrentesForUser } = require("../services/recorrentes/recorrentesService");

// ── Helpers de fixture ────────────────────────────────────────────────────────

function makeRecurrent(overrides = {}) {
  return {
    id: "r1",
    active: true,
    type: "despesa",
    desc: "Internet",
    category: "Moradia",
    value: 100,
    account: "Nubank",
    day: 5,
    freq: "mensal",
    ...overrides,
  };
}

// Data atual formatada como YYYY-MM
const now = new Date();
const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

// ── Testes ────────────────────────────────────────────────────────────────────

describe("applyRecurrentesForUser", () => {
  beforeEach(() => {
    _mockEntries = [];
    _updatedEntries = null;
    _mockTags = new Set();
  });

  it("gera 1 entry para recorrente ativo sem tag existente", async () => {
    const count = await applyRecurrentesForUser("uid_test", [makeRecurrent()]);
    assert.equal(count, 1);
    assert.ok(Array.isArray(_updatedEntries));
    assert.equal(_updatedEntries.length, 1);
    assert.equal(_updatedEntries[0].rcTag, `rc_r1_${ym}`);
    assert.equal(_updatedEntries[0].isFixed, true);
  });

  it("retorna 0 quando recorrente já tem tag no mês", async () => {
    _mockEntries = [{ rcTag: `rc_r1_${ym}` }];
    const count = await applyRecurrentesForUser("uid_test", [makeRecurrent()]);
    assert.equal(count, 0);
    assert.equal(_updatedEntries, null);
  });

  it("ignora recorrente com active = false", async () => {
    const count = await applyRecurrentesForUser("uid_test", [makeRecurrent({ active: false })]);
    assert.equal(count, 0);
    assert.equal(_updatedEntries, null);
  });

  it("ignora recorrente bimestral em mês ímpar", async () => {
    // Se o mês atual é ímpar, bimestral (m % 2 === 0) não deve rodar
    const currentMonth = now.getMonth(); // 0-indexado
    if (currentMonth % 2 !== 0) {
      const count = await applyRecurrentesForUser("uid_test", [makeRecurrent({ freq: "bimestral" })]);
      assert.equal(count, 0);
    } else {
      // Mês par: deve gerar
      const count = await applyRecurrentesForUser("uid_test", [makeRecurrent({ freq: "bimestral" })]);
      assert.equal(count, 1);
    }
  });

  it("ignora recorrente com durationType=data e endDate < mês atual", async () => {
    const count = await applyRecurrentesForUser("uid_test", [
      makeRecurrent({ durationType: "data", endDate: "2000-01" }),
    ]);
    assert.equal(count, 0);
    assert.equal(_updatedEntries, null);
  });

  it("gera entry quando durationType=data e endDate >= mês atual", async () => {
    const futureYm = `${now.getFullYear() + 1}-01`;
    const count = await applyRecurrentesForUser("uid_test", [
      makeRecurrent({ durationType: "data", endDate: futureYm }),
    ]);
    assert.equal(count, 1);
  });

  it("ignora recorrente com durationType=qtd quando repeatCount atingido", async () => {
    // Tag já existe 3 vezes → já atingiu repeatCount=3
    _mockEntries = [
      { rcTag: `rc_r1_2024-01` },
      { rcTag: `rc_r1_2024-02` },
      { rcTag: `rc_r1_2024-03` },
    ];
    const count = await applyRecurrentesForUser("uid_test", [
      makeRecurrent({ durationType: "qtd", repeatCount: 3 }),
    ]);
    assert.equal(count, 0);
  });

  it("gera entry quando durationType=qtd e repeatCount ainda não atingido", async () => {
    _mockEntries = [{ rcTag: `rc_r1_2024-01` }];
    const count = await applyRecurrentesForUser("uid_test", [
      makeRecurrent({ durationType: "qtd", repeatCount: 3 }),
    ]);
    assert.equal(count, 1);
  });

  it("processa múltiplos recorrentes e gera todos os válidos", async () => {
    const recs = [
      makeRecurrent({ id: "r1" }),
      makeRecurrent({ id: "r2", desc: "Netflix" }),
      makeRecurrent({ id: "r3", active: false }),
    ];
    const count = await applyRecurrentesForUser("uid_test", recs);
    assert.equal(count, 2); // r3 ignorado
    assert.equal(_updatedEntries.length, 2);
    const tags = _updatedEntries.map((e) => e.rcTag);
    assert.ok(tags.includes(`rc_r1_${ym}`));
    assert.ok(tags.includes(`rc_r2_${ym}`));
  });

  it("não gera duplicata quando mesmo id aparece 2x na lista", async () => {
    const recs = [makeRecurrent({ id: "r1" }), makeRecurrent({ id: "r1" })];
    const count = await applyRecurrentesForUser("uid_test", recs);
    assert.equal(count, 1); // segunda ocorrência usa tag já adicionada
  });

  it("entry gerada tem campos obrigatórios corretos", async () => {
    await applyRecurrentesForUser("uid_test", [makeRecurrent()]);
    const entry = _updatedEntries[0];
    assert.equal(typeof entry.id, "number");
    assert.equal(entry.type, "despesa");
    assert.ok(entry.date.startsWith(ym));
    assert.equal(entry.value, 100);
    assert.equal(entry.source, "recorrente-auto");
  });
});
