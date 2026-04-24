/**
 * recorrentesService.test.js
 * Testes unitários para a lógica de geração de lançamentos recorrentes.
 *
 * Isola firebase-admin com mock em memória para testar frequências,
 * tags de deduplicação, limites de data/repeatCount sem I/O real.
 */
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");

// ── Mock firebase-admin ───────────────────────────────────────────────────────
let _mockEntries = [];
let _updatedEntries = null;
let _userExists = true;

const _origLoad = Module._load.bind(Module);
Module._load = function (request, ...args) {
  if (request === "firebase-admin") {
    return {
      apps: [{}],
      initializeApp: () => {},
      firestore: Object.assign(
        () => ({
          collection: () => ({
            doc: (uid) => ({
              get: async () => ({
                exists: _userExists,
                data: () => ({ entries: _mockEntries }),
              }),
              update: async (payload) => {
                _updatedEntries = payload.entries?.elements ?? payload.entries ?? null;
              },
              collection: () => ({
                get: async () => ({ forEach: () => {} }),
              }),
            }),
          }),
        }),
        {
          FieldValue: {
            serverTimestamp: () => "ts",
            arrayUnion: (...items) => ({ elements: items }),
            increment: (n) => n,
          },
        }
      ),
    };
  }
  return _origLoad(request, ...args);
};

const { applyRecurrentesForUser } = require("../services/recorrentes/recorrentesService");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRecurrent(overrides = {}) {
  return {
    id: 1,
    type: "despesa",
    desc: "Aluguel",
    category: "Moradia",
    value: 1500,
    account: "Nubank",
    day: 5,
    freq: "mensal",
    active: true,
    ...overrides,
  };
}

function currentYM() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

beforeEach(() => {
  _mockEntries = [];
  _updatedEntries = null;
  _userExists = true;
});

// ── Testes ────────────────────────────────────────────────────────────────────

describe("applyRecurrentesForUser — básico", () => {
  it("retorna 0 quando usuário não existe", async () => {
    _userExists = false;
    const count = await applyRecurrentesForUser("uid1", [makeRecurrent()]);
    assert.equal(count, 0);
  });

  it("retorna 0 quando lista de recorrentes está vazia", async () => {
    const count = await applyRecurrentesForUser("uid1", []);
    assert.equal(count, 0);
  });

  it("gera 1 lançamento para recorrente mensal novo", async () => {
    const count = await applyRecurrentesForUser("uid1", [makeRecurrent()]);
    assert.equal(count, 1);
    assert.ok(Array.isArray(_updatedEntries) && _updatedEntries.length === 1);
  });

  it("não duplica lançamento quando tag já existe", async () => {
    const ym = currentYM();
    _mockEntries = [{ rcTag: `rc_1_${ym}` }];
    const count = await applyRecurrentesForUser("uid1", [makeRecurrent()]);
    assert.equal(count, 0);
  });

  it("pula recorrente com active=false", async () => {
    const count = await applyRecurrentesForUser("uid1", [makeRecurrent({ active: false })]);
    assert.equal(count, 0);
  });
});

describe("applyRecurrentesForUser — campos do lançamento gerado", () => {
  it("gera lançamento com data no mês corrente e dia configurado", async () => {
    await applyRecurrentesForUser("uid1", [makeRecurrent({ day: 10 })]);
    const entry = _updatedEntries[0];
    assert.ok(entry.date.startsWith(currentYM()));
    assert.ok(entry.date.endsWith("-10"));
  });

  it("clipa dia maior que último dia do mês", async () => {
    await applyRecurrentesForUser("uid1", [makeRecurrent({ day: 31 })]);
    const entry = _updatedEntries[0];
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    assert.ok(entry.date.endsWith(`-${String(lastDay).padStart(2, "0")}`));
  });

  it("inclui tag rcTag correta", async () => {
    await applyRecurrentesForUser("uid1", [makeRecurrent({ id: 42 })]);
    const entry = _updatedEntries[0];
    assert.equal(entry.rcTag, `rc_42_${currentYM()}`);
  });

  it("inclui source=recorrente-auto", async () => {
    await applyRecurrentesForUser("uid1", [makeRecurrent()]);
    assert.equal(_updatedEntries[0].source, "recorrente-auto");
  });

  it("inclui isFixed=true", async () => {
    await applyRecurrentesForUser("uid1", [makeRecurrent()]);
    assert.equal(_updatedEntries[0].isFixed, true);
  });
});

describe("applyRecurrentesForUser — filtros de frequência", () => {
  it("pula bimestral em mês ímpar (m%2 !== 0)", async () => {
    // Simula um mês ímpar (ex: fev=1, abr=3, jun=5...)
    // Como não controlamos Date.now() aqui, este teste é condicional
    const now = new Date();
    const m = now.getMonth();
    const shouldRun = m % 2 === 0;
    const count = await applyRecurrentesForUser("uid1", [makeRecurrent({ freq: "bimestral" })]);
    assert.equal(count, shouldRun ? 1 : 0);
  });

  it("pula trimestral quando m%3 !== 0", async () => {
    const now = new Date();
    const m = now.getMonth();
    const shouldRun = m % 3 === 0;
    const count = await applyRecurrentesForUser("uid1", [makeRecurrent({ freq: "trimestral" })]);
    assert.equal(count, shouldRun ? 1 : 0);
  });

  it("mensal sempre roda", async () => {
    const count = await applyRecurrentesForUser("uid1", [makeRecurrent({ freq: "mensal" })]);
    assert.equal(count, 1);
  });
});

describe("applyRecurrentesForUser — durationType", () => {
  it("pula recorrente com durationType=data e endDate passado", async () => {
    const count = await applyRecurrentesForUser("uid1", [
      makeRecurrent({ durationType: "data", endDate: "2020-01" }),
    ]);
    assert.equal(count, 0);
  });

  it("executa recorrente com durationType=data e endDate futuro", async () => {
    const count = await applyRecurrentesForUser("uid1", [
      makeRecurrent({ durationType: "data", endDate: "2099-12" }),
    ]);
    assert.equal(count, 1);
  });

  it("pula quando repeatCount atingido", async () => {
    // 2 tags já existem para este recorrente
    _mockEntries = [
      { rcTag: "rc_99_2024-01" },
      { rcTag: "rc_99_2024-02" },
    ];
    const count = await applyRecurrentesForUser("uid1", [
      makeRecurrent({ id: 99, durationType: "qtd", repeatCount: 2 }),
    ]);
    assert.equal(count, 0);
  });

  it("executa quando repeatCount não atingido", async () => {
    _mockEntries = [{ rcTag: "rc_99_2024-01" }];
    const count = await applyRecurrentesForUser("uid1", [
      makeRecurrent({ id: 99, durationType: "qtd", repeatCount: 5 }),
    ]);
    assert.equal(count, 1);
  });
});

describe("applyRecurrentesForUser — múltiplos recorrentes", () => {
  it("gera lançamentos para múltiplos recorrentes ativos sem conflito", async () => {
    const recs = [
      makeRecurrent({ id: 1, desc: "Aluguel" }),
      makeRecurrent({ id: 2, desc: "Internet" }),
      makeRecurrent({ id: 3, desc: "Streaming" }),
    ];
    const count = await applyRecurrentesForUser("uid1", recs);
    assert.equal(count, 3);
    assert.equal(_updatedEntries.length, 3);
  });

  it("ignora recorrente inativo e gera os ativos", async () => {
    const recs = [
      makeRecurrent({ id: 1, active: false }),
      makeRecurrent({ id: 2, desc: "Internet" }),
    ];
    const count = await applyRecurrentesForUser("uid1", recs);
    assert.equal(count, 1);
    assert.equal(_updatedEntries[0].desc, "Internet (mensal)");
  });
});
