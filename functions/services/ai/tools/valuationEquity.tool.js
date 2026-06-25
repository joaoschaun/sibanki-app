/**
 * valuationEquity.tool.js — Tool PILOTO da arquitetura modular.
 *
 * Wrapper FINO sobre functions/services/market/valuationEngine.js. Não duplica
 * nenhuma matemática: apenas dá ao engine determinístico (Graham / Bazin /
 * checklist de solidez) um contrato uniforme de entrada e saída.
 *
 * deterministic: true — calcula valuation com fórmulas auditáveis, sem LLM.
 *
 * Objetivo do piloto: provar o contrato/registry com risco ~zero, sem tocar o
 * engine nem o assistantOrchestrator (que continua chamando o engine direto).
 * A tool existe em PARALELO; nenhum comportamento de produção muda.
 */

"use strict";

const { defineTool } = require("../toolContract");
const {
  calculateGrahamIntrinsicValue,
  calculateBazinPriceCeiling,
  buildSolidezChecklist,
} = require("../../market/valuationEngine");

const valuationEquityTool = defineTool({
  name: "valuation.equity",
  description:
    "Valuation fundamentalista de uma ação B3: preço justo de Graham, teto de " +
    "Bazin e checklist de solidez. Determinístico — não usa LLM. Entrada: preço " +
    "e fundamentos (LPA, VPA, DY e indicadores). Saída: vereditos com a matemática.",
  deterministic: true,

  inputSchema: {
    price: { type: "number", min: 0 },
    lpa: { type: "number", optional: true, nullable: true },
    vpa: { type: "number", optional: true, nullable: true },
    dy: { type: "number", optional: true, nullable: true },
    minYield: { type: "number", optional: true, min: 0 },
    fundamentals: { type: "object", optional: true, nullable: true },
  },

  outputSchema: {
    graham: { type: "object" },
    bazin: { type: "object" },
    solidez: { type: "array" },
  },

  run(input) {
    const price = Number(input.price) || 0;
    const f = input.fundamentals || {};

    const graham = calculateGrahamIntrinsicValue(price, input.lpa, input.vpa);
    const bazin = calculateBazinPriceCeiling(
      price,
      input.dy,
      input.minYield != null ? input.minYield : 6
    );
    const solidez = buildSolidezChecklist({
      roe: f.roe,
      margin: f.operatingMargin != null ? f.operatingMargin : f.margin,
      debtToEquity: f.debtToEquity,
      currentRatio: f.currentRatio,
      pvp: f.pbRatio != null ? f.pbRatio : f.pvp,
      pe: f.peRatio != null ? f.peRatio : f.pe,
      dy: f.dy != null ? f.dy : input.dy,
    });

    return { graham, bazin, solidez };
  },
});

module.exports = { valuationEquityTool };
