/**
 * assistantHelpers.test.js
 * Testes unitários para as funções puras do orquestrador de IA.
 * Sem dependências de Firebase, BRAPI ou LLM — 100% determinístico.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  extractConsultantStreamParts,
  classifyQuoteAsset,
  buildRaioXDirective,
  compactMarketPayload,
  normalizeTickerInput,
  extractSearchTickers,
  formatBrl,
  enforceMarketClassOutput,
  buildEtfDeterministicReply,
  buildCryptoDeterministicReply,
  buildEquityDeterministicReply,
} = require("../services/assistant/assistantHelpers");

// ── extractConsultantStreamParts ──────────────────────────────────────────────
describe("extractConsultantStreamParts", () => {
  it("retorna mensagem inteira quando não há marcador", () => {
    const { latestUser, consolidated } = extractConsultantStreamParts("Quanto é Selic?");
    assert.equal(latestUser, "Quanto é Selic?");
    assert.equal(consolidated, "Quanto é Selic?");
  });

  it("separa histórico da mensagem atual pelo marcador", () => {
    const msg = "[HISTÓRICO RECENTE DA CONVERSA]\nPergunta anterior\n[NOVA MENSAGEM DO USUÁRIO]\nNova pergunta";
    const { latestUser, consolidated } = extractConsultantStreamParts(msg);
    assert.equal(latestUser, "Nova pergunta");
    assert.ok(consolidated.includes("Pergunta anterior"));
    assert.ok(consolidated.includes("Nova pergunta"));
  });

  it("usa a última ocorrência do marcador quando há múltiplos", () => {
    const msg = "[NOVA MENSAGEM DO USUÁRIO]\nA\n[NOVA MENSAGEM DO USUÁRIO]\nB";
    const { latestUser } = extractConsultantStreamParts(msg);
    assert.equal(latestUser, "B");
  });

  it("lida com string vazia", () => {
    const { latestUser } = extractConsultantStreamParts("");
    assert.equal(latestUser, "");
  });
});

// ── classifyQuoteAsset ────────────────────────────────────────────────────────
describe("classifyQuoteAsset", () => {
  it("classifica BOVA11 como etf", () => {
    assert.equal(classifyQuoteAsset("BOVA11", null), "etf");
  });

  it("classifica MXRF11 com longName FII como fii", () => {
    const payload = { results: [{ longName: "Maxi Renda FII" }] };
    assert.equal(classifyQuoteAsset("MXRF11", payload), "fii");
  });

  it("classifica PETR4 como equity", () => {
    assert.equal(classifyQuoteAsset("PETR4", null), "equity");
  });

  it("MXRF11 sem payload FII cai como etf (default para suffix 11)", () => {
    assert.equal(classifyQuoteAsset("MXRF11", null), "etf");
  });

  it("classifica ticker vazio como equity", () => {
    assert.equal(classifyQuoteAsset("", null), "equity");
  });
});

// ── buildRaioXDirective ───────────────────────────────────────────────────────
describe("buildRaioXDirective", () => {
  it("retorna string vazia quando não é raio_x", () => {
    const d = buildRaioXDirective({ analysisMode: "consulta", intent: "quote" }, "equity");
    assert.equal(d, "");
  });

  it("retorna diretiva de ações para quote+equity+raio_x", () => {
    const d = buildRaioXDirective({ analysisMode: "raio_x", intent: "quote" }, "equity");
    assert.ok(d.includes("RAIO-X AÇÕES"));
    assert.ok(d.includes("Graham"));
  });

  it("retorna diretiva de ETF para quote+etf+raio_x", () => {
    const d = buildRaioXDirective({ analysisMode: "raio_x", intent: "quote" }, "etf");
    assert.ok(d.includes("RAIO-X ETF"));
    assert.ok(d.includes("custo"));
  });

  it("retorna diretiva de cripto para crypto+raio_x", () => {
    const d = buildRaioXDirective({ analysisMode: "raio_x", intent: "crypto" }, "equity");
    assert.ok(d.includes("RAIO-X CRIPTO"));
    assert.ok(d.includes("tokenomics"));
  });

  it("retorna diretiva de renda fixa para fixed_income+raio_x", () => {
    const d = buildRaioXDirective({ analysisMode: "raio_x", intent: "fixed_income" }, "equity");
    assert.ok(d.includes("RAIO-X RENDA FIXA"));
  });
});

// ── normalizeTickerInput ──────────────────────────────────────────────────────
describe("normalizeTickerInput", () => {
  it("converte para maiúsculas e remove caracteres especiais", () => {
    assert.equal(normalizeTickerInput("petr4!"), "PETR4");
  });

  it("lida com string vazia", () => {
    assert.equal(normalizeTickerInput(""), "");
  });

  it("lida com null/undefined", () => {
    assert.equal(normalizeTickerInput(null), "");
    assert.equal(normalizeTickerInput(undefined), "");
  });

  it("mantém números e letras", () => {
    assert.equal(normalizeTickerInput("bova11"), "BOVA11");
  });
});

// ── extractSearchTickers ──────────────────────────────────────────────────────
describe("extractSearchTickers", () => {
  it("extrai tickers de array de stocks", () => {
    const res = { stocks: [{ stock: "PETR4" }, { stock: "VALE3" }] };
    const tickers = extractSearchTickers(res);
    assert.ok(tickers.includes("PETR4"));
    assert.ok(tickers.includes("VALE3"));
  });

  it("extrai de array direto", () => {
    const tickers = extractSearchTickers([{ symbol: "BOVA11" }]);
    assert.ok(tickers.includes("BOVA11"));
  });

  it("deduplica tickers", () => {
    const res = { stocks: [{ stock: "PETR4" }, { stock: "PETR4" }] };
    const tickers = extractSearchTickers(res);
    assert.equal(tickers.filter((t) => t === "PETR4").length, 1);
  });

  it("ignora itens sem ticker válido", () => {
    const tickers = extractSearchTickers([{ symbol: "AB" }, { symbol: "PETR4" }]);
    assert.ok(!tickers.includes("AB")); // muito curto
    assert.ok(tickers.includes("PETR4"));
  });

  it("retorna array vazio para input inválido", () => {
    assert.deepEqual(extractSearchTickers(null), []);
    assert.deepEqual(extractSearchTickers({}), []);
  });
});

// ── formatBrl ─────────────────────────────────────────────────────────────────
describe("formatBrl", () => {
  it("formata número em BRL", () => {
    const s = formatBrl(1000);
    assert.ok(s.startsWith("R$"));
    assert.ok(s.includes("1.000") || s.includes("1,000"));
  });

  it("retorna n/d para NaN", () => {
    assert.equal(formatBrl("abc"), "n/d");
    assert.equal(formatBrl(NaN), "n/d");
  });

  it("formata zero corretamente", () => {
    const s = formatBrl(0);
    assert.ok(s.includes("0"));
  });
});

// ── enforceMarketClassOutput ──────────────────────────────────────────────────
describe("enforceMarketClassOutput", () => {
  it("passa texto válido de cripto sem alteração", () => {
    const intentData = { intent: "crypto" };
    const text = "Veredito: BTC — tokenomics e trilema são as chaves.";
    const result = enforceMarketClassOutput(text, intentData, "equity", null);
    assert.equal(result, text);
  });

  it("substitui resposta de cripto que usa termos de ações (Graham/Bazin)", () => {
    const intentData = { intent: "crypto" };
    const badText = "BTC tem P/L de 30 e Graham diz que está subavaliado.";
    const result = enforceMarketClassOutput(badText, intentData, "equity", {
      payload: { coins: [{ coin: "BTC" }] },
    });
    assert.ok(!result.includes("Graham"));
    assert.ok(result.includes("Veredito"));
    assert.ok(result.includes("BTC"));
  });

  it("passa texto de ações sem alteração quando intent é quote+equity", () => {
    const intentData = { intent: "quote", analysisMode: "consulta" };
    const text = "PETR4 tem P/L razoável.";
    const result = enforceMarketClassOutput(text, intentData, "equity", null);
    assert.equal(result, text);
  });

  it("retorna string vazia para texto vazio", () => {
    assert.equal(enforceMarketClassOutput("", null, null, null), "");
  });
});

// ── buildCryptoDeterministicReply ─────────────────────────────────────────────
describe("buildCryptoDeterministicReply", () => {
  it("gera resposta sem dados de mercado (payload vazio)", () => {
    const reply = buildCryptoDeterministicReply({ payload: { coins: [] } });
    assert.ok(reply.includes("Veredito"));
    assert.ok(reply.includes("Trilema"));
    assert.ok(reply.includes("Tokenomics"));
  });

  it("inclui nome da moeda quando disponível", () => {
    const reply = buildCryptoDeterministicReply({
      payload: { coins: [{ coin: "ETH", regularMarketPrice: 15000 }] },
    });
    assert.ok(reply.includes("ETH"));
  });
});

// ── buildEquityDeterministicReply ─────────────────────────────────────────────
describe("buildEquityDeterministicReply", () => {
  it("gera resposta com métricas de ação", () => {
    const payload = {
      resolvedTicker: "PETR4",
      payload: {
        results: [{
          symbol: "PETR4", longName: "Petróleo Brasileiro",
          regularMarketPrice: 38.5,
          priceEarnings: 5.2, priceToBookRatio: 1.1,
          dividendYield: 0.12,
          financialData: { returnOnEquity: 0.18, debtToEquity: 30 },
        }],
      },
    };
    const reply = buildEquityDeterministicReply(payload);
    assert.ok(reply.includes("PETR4"));
    assert.ok(reply.includes("P/L"));
    assert.ok(reply.includes("Veredito"));
  });

  it("lida com payload vazio sem exceção", () => {
    const reply = buildEquityDeterministicReply({ payload: { results: [] } });
    assert.ok(reply.includes("Veredito"));
  });
});
