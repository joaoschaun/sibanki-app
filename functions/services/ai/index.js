/**
 * ai/index.js — Bootstrap da camada de inteligência modular do Sibanki.
 *
 * Ponto único de importação: cria o registry padrão e registra as tools do app.
 * Quem quiser usar uma capacidade faz:
 *
 *   const { registry } = require("./services/ai");
 *   const { graham, bazin, solidez } = await registry.run("valuation.equity", input);
 *
 * Tools registradas:
 *   • valuation.equity  (Passo 0) — Graham/Bazin/solidez
 *   • credit.suggestCard (Passo 1) — melhor cartão por contexto de compra
 *
 * Capacidades client-side (Ld/Sg em sovereigntyEngine.ts, à-vista×parcelado em
 * decisionEngine.ts) dependem de uma decisão de runtime antes de virarem tools
 * (ver ANALISE-ARQUITETURA-INTELIGENCIA-SIBANKI.md §2.4 — split de runtime).
 */

"use strict";

const { ToolRegistry } = require("./toolRegistry");
const { valuationEquityTool } = require("./tools/valuationEquity.tool");
const { suggestCardTool } = require("./tools/suggestCard.tool");

const registry = new ToolRegistry();
registry.register(valuationEquityTool);
registry.register(suggestCardTool);

module.exports = {
  registry,
  ToolRegistry, // exportado para testes que querem instância isolada
};
