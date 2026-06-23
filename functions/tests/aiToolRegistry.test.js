/**
 * aiToolRegistry.test.js
 * Testes da camada de inteligência modular (Passos 0 e 1):
 * contrato (defineTool + validação de I/O), registry e tools
 * valuation.equity e credit.suggestCard.
 * 100% determinístico — sem Firebase, BRAPI ou LLM.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  defineTool,
  ToolInputError,
  ToolOutputError,
} = require("../services/ai/toolContract");
const { ToolRegistry } = require("../services/ai/toolRegistry");
const { valuationEquityTool } = require("../services/ai/tools/valuationEquity.tool");
const { suggestCardTool } = require("../services/ai/tools/suggestCard.tool");
const {
  calculateGrahamIntrinsicValue,
  calculateBazinPriceCeiling,
} = require("../services/market/valuationEngine");
const { suggestBestCardForLocation } = require("../services/sentinel/cardSuggestionService");
const { registry } = require("../services/ai");

// ── defineTool: validação da definição ────────────────────────────────────────
describe("defineTool", () => {
  it("exige name, description e run", () => {
    assert.throws(() => defineTool({}), /name obrigatório/);
    assert.throws(() => defineTool({ name: "x" }), /description obrigatória/);
    assert.throws(() => defineTool({ name: "x", description: "y" }), /run deve ser função/);
  });

  it("default deterministic = true", () => {
    const t = defineTool({ name: "t.a", description: "d", run: () => 1 });
    assert.equal(t.deterministic, true);
  });

  it("rejeita type inválido no schema", () => {
    assert.throws(
      () => defineTool({ name: "t.b", description: "d", run: () => 1, inputSchema: { x: { type: "date" } } }),
      /type inválido/
    );
  });

  it("congela a tool retornada", () => {
    const t = defineTool({ name: "t.c", description: "d", run: () => 1 });
    assert.ok(Object.isFrozen(t));
  });
});

// ── Validação de input ────────────────────────────────────────────────────────
describe("contrato — validação de input", () => {
  const tool = defineTool({
    name: "t.sum",
    description: "soma",
    inputSchema: {
      a: { type: "number", min: 0 },
      b: { type: "number" },
      label: { type: "string", optional: true, max: 5 },
      kind: { type: "string", enum: ["x", "y"], optional: true },
    },
    outputSchema: { total: { type: "number" } },
    run: ({ a, b }) => ({ total: a + b }),
  });

  it("aceita input válido e valida output", async () => {
    const r = await tool.run({ a: 2, b: 3 });
    assert.deepEqual(r, { total: 5 });
  });

  it("rejeita campo ausente obrigatório", async () => {
    await assert.rejects(() => tool.run({ a: 1 }), ToolInputError);
  });

  it("rejeita tipo errado", async () => {
    await assert.rejects(() => tool.run({ a: "1", b: 2 }), ToolInputError);
  });

  it("rejeita number abaixo do min", async () => {
    await assert.rejects(() => tool.run({ a: -1, b: 2 }), ToolInputError);
  });

  it("rejeita string acima do max", async () => {
    await assert.rejects(() => tool.run({ a: 1, b: 2, label: "longa demais" }), ToolInputError);
  });

  it("rejeita valor fora do enum", async () => {
    await assert.rejects(() => tool.run({ a: 1, b: 2, kind: "z" }), ToolInputError);
  });

  it("aceita campo opcional ausente", async () => {
    const r = await tool.run({ a: 1, b: 1, kind: "x" });
    assert.equal(r.total, 2);
  });
});

// ── Validação de output (guarda-rail de saída) ─────────────────────────────────
describe("contrato — validação de output", () => {
  it("lança ToolOutputError quando run devolve formato errado", async () => {
    const bad = defineTool({
      name: "t.bad",
      description: "devolve errado",
      outputSchema: { total: { type: "number" } },
      run: () => ({ total: "não é número" }),
    });
    await assert.rejects(() => bad.run({}), ToolOutputError);
  });
});

// ── Registry ───────────────────────────────────────────────────────────────────
describe("ToolRegistry", () => {
  it("registra, consulta e lista", () => {
    const reg = new ToolRegistry();
    const t = defineTool({ name: "r.one", description: "um", run: () => 1 });
    reg.register(t);
    assert.ok(reg.has("r.one"));
    assert.equal(reg.get("r.one"), t);
    assert.deepEqual(reg.list(), [{ name: "r.one", description: "um", deterministic: true }]);
  });

  it("rejeita registro duplicado", () => {
    const reg = new ToolRegistry();
    const t = defineTool({ name: "r.dup", description: "d", run: () => 1 });
    reg.register(t);
    assert.throws(() => reg.register(t), /já registrada/);
  });

  it("get de tool inexistente lança", () => {
    const reg = new ToolRegistry();
    assert.throws(() => reg.get("nope"), /não encontrada/);
  });

  it("run invoca a tool com validação", async () => {
    const reg = new ToolRegistry();
    reg.register(defineTool({
      name: "r.run",
      description: "d",
      inputSchema: { n: { type: "number" } },
      run: ({ n }) => n * 2,
    }));
    assert.equal(await reg.run("r.run", { n: 21 }), 42);
    await assert.rejects(() => reg.run("r.run", { n: "x" }), ToolInputError);
  });
});

// ── Tool piloto: valuation.equity delega ao engine sem duplicar matemática ──────
describe("valuation.equity (Passo 0)", () => {
  it("metadados do contrato corretos", () => {
    assert.equal(valuationEquityTool.name, "valuation.equity");
    assert.equal(valuationEquityTool.deterministic, true);
  });

  it("resultado idêntico ao valuationEngine chamado direto", async () => {
    const input = {
      price: 30,
      lpa: 4,
      vpa: 20,
      dy: 8,
      fundamentals: { roe: 18, operatingMargin: 12, debtToEquity: 0.5, pbRatio: 1.5, peRatio: 8, dy: 8 },
    };
    const out = await valuationEquityTool.run(input);

    const expectedGraham = calculateGrahamIntrinsicValue(30, 4, 20);
    const expectedBazin = calculateBazinPriceCeiling(30, 8, 6);

    assert.deepEqual(out.graham, expectedGraham);
    assert.deepEqual(out.bazin, expectedBazin);
    assert.ok(Array.isArray(out.solidez) && out.solidez.length > 0);
  });

  it("lida com fundamentos ausentes (dados insuficientes)", async () => {
    const out = await valuationEquityTool.run({ price: 30 });
    assert.equal(out.graham.intrinsicValue, null);
    assert.equal(out.bazin.ceiling, null);
    assert.deepEqual(out.solidez, []);
  });

  it("rejeita input sem price (contrato)", async () => {
    await assert.rejects(() => valuationEquityTool.run({ lpa: 4 }), ToolInputError);
  });
});

// ── Tool Passo 1: credit.suggestCard delega ao cardSuggestionService ────────────
describe("credit.suggestCard (Passo 1)", () => {
  const cards = [
    { name: "Cartão A", cardBenefits: { cashbackPct: 1, vipLounge: true, travelInsurance: true }, closeDay: 20 },
    { name: "Cartão B", cardBenefits: { cashbackPct: 0, purchaseProtection: true }, closeDay: 5 },
  ];

  it("metadados do contrato corretos", () => {
    assert.equal(suggestCardTool.name, "credit.suggestCard");
    assert.equal(suggestCardTool.deterministic, true);
  });

  it("resultado idêntico ao serviço chamado direto (envelope suggestion)", async () => {
    const out = await suggestCardTool.run({ cards, scenario: "airport" });
    assert.deepEqual(out.suggestion, suggestBestCardForLocation(cards, "airport"));
    assert.equal(out.suggestion.criteria, "Sala VIP");
  });

  it("retorna suggestion=null quando nenhum cartão qualifica", async () => {
    const out = await suggestCardTool.run({ cards: [], scenario: "airport" });
    assert.equal(out.suggestion, null);
  });

  it("rejeita input sem scenario (contrato)", async () => {
    await assert.rejects(() => suggestCardTool.run({ cards }), ToolInputError);
  });

  it("rejeita cards não-array (contrato)", async () => {
    await assert.rejects(() => suggestCardTool.run({ cards: "x", scenario: "airport" }), ToolInputError);
  });
});

// ── Bootstrap: registry padrão expõe o catálogo das tools registradas ───────────
describe("registry padrão (ai/index.js)", () => {
  it("lista as tools registradas com metadados", () => {
    const names = registry.list().map((t) => t.name).sort();
    assert.deepEqual(names, ["credit.suggestCard", "valuation.equity"]);
    assert.ok(registry.list().every((t) => t.deterministic === true));
  });

  it("run via registry funciona ponta a ponta", async () => {
    const out = await registry.run("valuation.equity", { price: 30, lpa: 4, vpa: 20, dy: 8 });
    assert.ok(out.graham && out.bazin && Array.isArray(out.solidez));
  });
});
