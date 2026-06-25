/**
 * suggestCard.tool.js — Passo 1 da arquitetura modular.
 *
 * Wrapper FINO sobre functions/services/sentinel/cardSuggestionService.js.
 * Não duplica lógica: dá ao serviço determinístico `suggestBestCardForLocation`
 * um contrato uniforme de entrada/saída.
 *
 * deterministic: true — pontua cartões por benefício/ciclo de fatura, sem LLM.
 *
 * Envelope: o serviço retorna `null` quando nenhum cartão é bom o bastante; aqui
 * normalizamos para `{ suggestion: <obj>|null }` para que a saída seja sempre um
 * objeto validável pelo contrato (campo `suggestion` é nullable).
 */

"use strict";

const { defineTool } = require("../toolContract");
const { suggestBestCardForLocation } = require("../../sentinel/cardSuggestionService");

const suggestCardTool = defineTool({
  name: "credit.suggestCard",
  description:
    "Sugere o melhor cartão do usuário para um contexto de compra (cenário " +
    "geolocalizado), pontuando cashback, benefícios e dias até o fechamento da " +
    "fatura. Determinístico — não usa LLM. Retorna { suggestion } ou suggestion=null.",
  deterministic: true,

  inputSchema: {
    cards: { type: "array" },
    scenario: { type: "string", min: 1 },
  },

  outputSchema: {
    suggestion: {
      type: "object",
      nullable: true,
      fields: {
        name: { type: "string" },
        criteria: { type: "string" },
        reason: { type: "string" },
        daysToClose: { type: "number" },
      },
    },
  },

  run(input) {
    const suggestion = suggestBestCardForLocation(input.cards, input.scenario);
    return { suggestion: suggestion || null };
  },
});

module.exports = { suggestCardTool };
