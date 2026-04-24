/**
 * assistantOrchestrator.test.js
 * Testes unitários para as funções puras do orquestrador de IA.
 *
 * Testa: classifiers, formatters, builders determinísticos de Raio-X e
 * o enforcer de saída por classe de ativo — sem dependências externas.
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
  buildFixedIncomeDeterministicReply,
} = require("../services/assistant/assistantHelpers");

// ── extractConsultantStreamParts ──────────────────────────────────────────────
describe("extractConsultantStreamParts", () => {
  it("retorna mensagem inteira quando não há marcador", () => {
    const { latestUser, consolidated } = extractConsultantStreamParts("Qual o IPCA?");
    assert.equal(latestUser, "Qual o IPCA?");
    assert.equal(consolidated, "Qual o IPCA?");
  });

  it("separa histórico da mensagem atual com marcador", () => {
    const input = "[HISTÓRICO RECENTE DA CONVERSA]\nMensagem anterior\n[NOVA MENSAGEM DO USUÁRIO]\nMinha dúvida";
    const { latestUser, consolidated } = extractConsultantStreamParts(input);
    assert.equal(latestUser, "Minha dúvida");
    assert.ok(consolidated.includes("Mensagem anterior"));
    assert.ok(consolidated.includes("Minha dúvida"));
  });

  it("usa último marcador em caso de múltiplas ocorrências", () => {
    const input = "[NOVA MENSAGEM DO USUÁRIO]\nFirst\n[NOVA MENSAGEM DO USUÁRIO]\nSecond";
    const { latestUser } = extractConsultantStreamParts(input);
    assert.equal(latestUser, "Second");
  });

  it("trata input vazio sem erro", () => {
    const { latestUser, consolidated } = extractConsultantStreamParts("");
    assert.equal(latestUser, "");
    assert.equal(consolidated, "");
  });
});

// ── classifyQuoteAsset ────────────────────────────────────────────────────────
describe("classifyQuoteAsset", () => {
  it("classifica PETR4 como equity", () => {
    assert.equal(classifyQuoteAsset("PETR4", null), "equity");
  });

  it("classifica BOVA11 como etf (termina em 11 sem FII keywords)", () => {
    assert.equal(classifyQuoteAsset("BOVA11", null), "etf");
  });

  it("classifica MXRF11 como fii (termina em 11 + keyword 'fundo')", () => {
    const payload = { results: [{ longName: "Maxi Renda FII", summaryProfile: { sector: "fundo imobiliario" } }] };
    assert.equal(classifyQuoteAsset("MXRF11", payload), "fii");
  });

  it("classifica KNRI11 com longName contendo 'imobili' como fii", () => {
    const payload = { results: [{ longName: "Kinea Renda Imobiliaria", summaryProfile: {} }] };
    assert.equal(classifyQuoteAsset("KNRI11", payload), "fii");
  });
});

// ── buildRaioXDirective ───────────────────────────────────────────────────────
describe("buildRaioXDirective", () => {
  it("retorna string vazia quando analysisMode não é raio_x", () => {
    assert.equal(buildRaioXDirective({ analysisMode: "chat", intent: "quote" }), "");
    assert.equal(buildRaioXDirective(null), "");
  });

  it("retorna diretiva de ações para equity raio_x", () => {
    const d = buildRaioXDirective({ analysisMode: "raio_x", intent: "quote" }, "equity");
    assert.ok(d.includes("Graham"));
    assert.ok(d.includes("Buffett"));
    assert.ok(d.includes("AÇÕES"));
  });

  it("retorna diretiva de ETF correta", () => {
    const d = buildRaioXDirective({ analysisMode: "raio_x", intent: "quote" }, "etf");
    assert.ok(d.includes("ETF"));
    assert.ok(d.includes("tokenomics"));
  });

  it("retorna diretiva de cripto correta e proíbe Graham", () => {
    const d = buildRaioXDirective({ analysisMode: "raio_x", intent: "crypto" }, "equity");
    assert.ok(d.includes("PROIBIDO"));
    assert.ok(d.includes("Graham"));
    assert.ok(d.includes("trilema"));
  });

  it("retorna diretiva de renda fixa para inflation", () => {
    const d = buildRaioXDirective({ analysisMode: "raio_x", intent: "inflation" }, "equity");
    assert.ok(d.includes("RENDA FIXA"));
    assert.ok(d.includes("ganho real"));
  });
});

// ── normalizeTickerInput ──────────────────────────────────────────────────────
describe("normalizeTickerInput", () => {
  it("converte para maiúsculas e remove caracteres inválidos", () => {
    assert.equal(normalizeTickerInput("petr4"), "PETR4");
    assert.equal(normalizeTickerInput("BOVA 11"), "BOVA11");
    assert.equal(normalizeTickerInput("mxrf11."), "MXRF11");
  });

  it("trata input nulo/undefined sem erro", () => {
    assert.equal(normalizeTickerInput(null), "");
    assert.equal(normalizeTickerInput(undefined), "");
  });
});

// ── extractSearchTickers ──────────────────────────────────────────────────────
describe("extractSearchTickers", () => {
  it("extrai tickers de array direto", () => {
    const result = [{ stock: "PETR4" }, { stock: "VALE3" }];
    const tickers = extractSearchTickers(result);
    assert.deepEqual(tickers, ["PETR4", "VALE3"]);
  });

  it("extrai tickers de objeto com .stocks", () => {
    const result = { stocks: [{ symbol: "ITUB4" }, { symbol: "BBDC4" }] };
    const tickers = extractSearchTickers(result);
    assert.ok(tickers.includes("ITUB4"));
    assert.ok(tickers.includes("BBDC4"));
  });

  it("deduplica tickers repetidos", () => {
    const result = [{ stock: "PETR4" }, { symbol: "PETR4" }];
    const tickers = extractSearchTickers(result);
    assert.equal(tickers.length, 1);
  });

  it("ignora itens com ticker inválido (muito curto)", () => {
    const result = [{ stock: "A" }, { stock: "VALE3" }];
    const tickers = extractSearchTickers(result);
    assert.deepEqual(tickers, ["VALE3"]);
  });
});

// ── formatBrl ─────────────────────────────────────────────────────────────────
describe("formatBrl", () => {
  it("formata número como BRL", () => {
    const result = formatBrl(1234.56);
    assert.ok(result.startsWith("R$"));
    assert.ok(result.includes("1.234,56") || result.includes("1234,56"));
  });

  it("retorna n/d para NaN e Infinity", () => {
    assert.equal(formatBrl(NaN), "n/d");
    assert.equal(formatBrl(Infinity), "n/d");
    assert.equal(formatBrl("abc"), "n/d");
  });
});

// ── compactMarketPayload ──────────────────────────────────────────────────────
describe("compactMarketPayload", () => {
  it("retorna null para payload null", () => {
    assert.equal(compactMarketPayload("quote", null), null);
  });

  it("compacta payload de quote mantendo campos essenciais", () => {
    const payload = {
      results: [{
        symbol: "PETR4", longName: "Petrobras", regularMarketPrice: 36.50,
        dividendYield: 0.12, priceEarnings: 8.5, priceToBookRatio: 1.2,
        financialData: { returnOnEquity: 0.25 }, defaultKeyStatistics: { trailingPE: 8.5 },
      }],
    };
    const compact = compactMarketPayload("quote", payload);
    assert.equal(compact.symbol, "PETR4");
    assert.equal(compact.regularMarketPrice, 36.50);
    assert.ok("financialData" in compact);
    assert.ok("defaultKeyStatistics" in compact);
  });

  it("compacta payload de crypto", () => {
    const payload = { coins: [{ coin: "BTC", regularMarketPrice: 350000, marketCap: 5e12 }] };
    const compact = compactMarketPayload("crypto", payload);
    assert.equal(compact.coin, "BTC");
    assert.equal(compact.regularMarketPrice, 350000);
  });
});

// ── enforceMarketClassOutput ──────────────────────────────────────────────────
describe("enforceMarketClassOutput", () => {
  it("passa texto limpo de cripto sem alterar", () => {
    const text = "Análise de BTC usando trilema e tokenomics.";
    const out = enforceMarketClassOutput(text, { intent: "crypto" }, "equity", null);
    assert.equal(out, text);
  });

  it("substitui resposta de cripto que usa Graham/P/L", () => {
    const text = "Usando P/L e método Graham para analisar o Bitcoin.";
    const payload = { payload: { coins: [{ coin: "BTC" }] } };
    const out = enforceMarketClassOutput(text, { intent: "crypto" }, "equity", payload);
    assert.ok(out.includes("BTC"));
    assert.ok(out.includes("cripto"));
    assert.ok(!out.includes("Graham"));
  });

  it("substitui resposta de ETF que usa tokenomics", () => {
    const text = "ETF analisado com tokenomics e trilema blockchain.";
    const payload = { payload: { results: [{ symbol: "BOVA11" }] } };
    const out = enforceMarketClassOutput(
      text,
      { intent: "quote", analysisMode: "chat" },
      "etf",
      payload
    );
    assert.ok(out.includes("ETF"));
    assert.ok(!out.includes("tokenomics"));
  });

  it("não altera texto de equity sem violações", () => {
    const text = "PETR4 tem bom P/L e ROE consistente.";
    const out = enforceMarketClassOutput(text, { intent: "quote" }, "equity", null);
    assert.equal(out, text);
  });
});

// ── buildEtfDeterministicReply ────────────────────────────────────────────────
describe("buildEtfDeterministicReply", () => {
  it("inclui símbolo e seções obrigatórias", () => {
    const payload = {
      resolvedTicker: "BOVA11",
      payload: { results: [{ symbol: "BOVA11", regularMarketPrice: 95.50 }] },
    };
    const reply = buildEtfDeterministicReply(payload);
    assert.ok(reply.includes("BOVA11"));
    assert.ok(reply.includes("Veredito"));
    assert.ok(reply.includes("Risco/Retorno"));
    assert.ok(reply.includes("Ação recomendada"));
  });

  it("inclui nota de dados incompletos quando preço é inválido", () => {
    const payload = { resolvedTicker: "BOVA11", payload: { results: [{}] } };
    const reply = buildEtfDeterministicReply(payload);
    assert.ok(reply.includes("Nota:"));
  });
});

// ── buildCryptoDeterministicReply ─────────────────────────────────────────────
describe("buildCryptoDeterministicReply", () => {
  it("inclui nome da moeda e seções obrigatórias", () => {
    const payload = { payload: { coins: [{ coin: "BTC", regularMarketPrice: 350000 }] } };
    const reply = buildCryptoDeterministicReply(payload);
    assert.ok(reply.includes("BTC"));
    assert.ok(reply.includes("Veredito"));
    assert.ok(reply.includes("Trilema"));
    assert.ok(reply.includes("Tokenomics"));
  });

  it("usa fallback CRYPTO quando coin é indefinido", () => {
    const reply = buildCryptoDeterministicReply({ payload: { coins: [{}] } });
    assert.ok(reply.includes("CRYPTO"));
  });
});

// ── buildEquityDeterministicReply ─────────────────────────────────────────────
describe("buildEquityDeterministicReply", () => {
  it("inclui ticker e métricas-chave", () => {
    const payload = {
      payload: {
        results: [{
          symbol: "PETR4", longName: "Petrobras", regularMarketPrice: 36.5,
          priceEarnings: 8.5, priceToBookRatio: 1.2, dividendYield: 0.12,
          financialData: { returnOnEquity: 0.25, debtToEquity: 0.8 },
        }],
      },
    };
    const reply = buildEquityDeterministicReply(payload);
    assert.ok(reply.includes("PETR4"));
    assert.ok(reply.includes("P/L"));
    assert.ok(reply.includes("Dividend Yield"));
    assert.ok(reply.includes("ROE"));
    assert.ok(reply.includes("Checklist de decisão"));
  });
});

// ── buildFixedIncomeDeterministicReply ────────────────────────────────────────
describe("buildFixedIncomeDeterministicReply", () => {
  it("inclui label de inflação quando intent é inflation", () => {
    const payload = {
      payload: {
        indicators: { ipcaAnnual: 0.045, selicAnnual: 0.1075 },
        syntheticProducts: [
          { name: "CDB 120% CDI", realAnnualRatePct: 6.5 },
          { name: "Tesouro IPCA+", realAnnualRatePct: 5.8 },
        ],
      },
    };
    const reply = buildFixedIncomeDeterministicReply(payload, "inflation");
    assert.ok(reply.includes("Inflação (IPCA)"));
    assert.ok(reply.includes("Selic anual"));
    assert.ok(reply.includes("CDB 120% CDI"));
  });

  it("inclui label de renda fixa quando intent é fixed_income", () => {
    const reply = buildFixedIncomeDeterministicReply({ payload: {} }, "fixed_income");
    assert.ok(reply.includes("Renda fixa"));
  });

  it("ordena produtos por ganho real decrescente", () => {
    const payload = {
      payload: {
        syntheticProducts: [
          { name: "Produto A", realAnnualRatePct: 3 },
          { name: "Produto B", realAnnualRatePct: 7 },
          { name: "Produto C", realAnnualRatePct: 5 },
        ],
      },
    };
    const reply = buildFixedIncomeDeterministicReply(payload, "fixed_income");
    const idxB = reply.indexOf("Produto B");
    const idxC = reply.indexOf("Produto C");
    // Produto B (7%) deve aparecer antes de Produto C (5%)
    assert.ok(idxB < idxC);
  });
});
