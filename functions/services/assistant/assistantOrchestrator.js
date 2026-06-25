/**
 * assistantOrchestrator.js
 * Orquestrador do Consultor IA: detecta intenção de mercado, busca dados BRAPI,
 * monta prompt e chama o LLM (com fallback multi-modelo via llmService).
 *
 * Funções puras (formatters, builders, classifiers) extraídas para assistantHelpers.js.
 */
const { logEvent, logError } = require("../../logger");
const brapiService = require("../market/brapiService");
const fixedIncomeService = require("../market/fixedIncomeService");
const marketDataHub = require("../market/marketDataHub");
const { registry } = require("../ai");
const { detectMarketIntent } = require("../llm/marketIntentService");
const { retrieveRelevantChunks } = require("../llm/brazilianFinanceKnowledge");
const { buildConsultantPrompt } = require("../llm/sovereignSystemPrompt");
const { generateAnalysis, generateAnalysisStream } = require("../llm/llmService");
const {
  extractConsultantStreamParts,
  classifyQuoteAsset,
  buildRaioXDirective,
  compactMarketPayload,
  normalizeTickerInput,
  extractSearchTickers,
  enforceMarketClassOutput,
  buildEtfDeterministicReply,
  buildCryptoDeterministicReply,
  buildEquityDeterministicReply,
  buildFixedIncomeDeterministicReply,
} = require("./assistantHelpers");

// ── Helpers com I/O (não extraídos — dependem de brapiService) ────────────────

async function resolveTickerWithFallback(rawTicker) {
  const clean = normalizeTickerInput(rawTicker);
  if (!clean) return "";
  try {
    await brapiService.quote({ ticker: clean });
    return clean;
  } catch (_) {
    try {
      const search = await brapiService.search({ query: clean });
      const tickers = extractSearchTickers(search);
      if (tickers.includes(clean)) return clean;
      return tickers.find((t) => t.startsWith(clean.slice(0, 4))) || tickers[0] || clean;
    } catch (_) {
      return clean;
    }
  }
}

// ── Montagem do prompt com dados de mercado ───────────────────────────────────

async function buildAssistantPrompt(message, contextStr, loggerTag) {
  const { latestUser, consolidated } = extractConsultantStreamParts(message);
  let marketInfo = "";
  let payloadResponse = null;
  let detectedIntentData = null;
  let detectedAssetClass = "equity";

  try {
    const intentData = await detectMarketIntent(latestUser);
    detectedIntentData = intentData;
    if (intentData.intent !== "none") {
      logEvent(loggerTag, "market_intent_detected", intentData);
      let fetchedJson = null;
      let assetClass = "equity";
      if (intentData.intent === "quote" && intentData.ticker) {
        const resolvedTicker = await resolveTickerWithFallback(intentData.ticker);
        fetchedJson = await brapiService.quote({ ticker: resolvedTicker });
        payloadResponse = {
          type: "market", intent: "quote", payload: fetchedJson,
          requestedTicker: intentData.ticker, resolvedTicker,
        };
        assetClass = classifyQuoteAsset(resolvedTicker, fetchedJson);

        // Raio-X de ação: busca fundamentais do Market Data Hub em paralelo
        if (intentData.analysisMode === "raio_x" && assetClass === "equity") {
          try {
            const analysis = await marketDataHub.getAssetAnalysis(resolvedTicker);
            if (analysis.fundamentals) {
              const f = analysis.fundamentals;
              // Passo 2: valuation via registry de tools (delega ao mesmo valuationEngine
              // determinístico — saída idêntica, comportamento preservado).
              const { graham, bazin, solidez } = await registry.run("valuation.equity", {
                price: analysis.quote?.price || 0,
                lpa: f.lpa,
                vpa: f.vpa,
                dy: f.dy,
                fundamentals: f,
              });
              payloadResponse.fundamentals    = f;
              payloadResponse.grahamResult    = graham;
              payloadResponse.bazinResult     = bazin;
              payloadResponse.solidezChecklist = solidez;
              payloadResponse.rsi             = analysis.technicals?.rsi || null;
              payloadResponse.rsiSignal       = analysis.technicals?.rsiSignal || null;
              logEvent(loggerTag, "fundamentals_enriched", { ticker: resolvedTicker, source: f.source });
            }
          } catch (hubErr) {
            logError(loggerTag, "fundamentals_hub_failed", { ticker: resolvedTicker, error: hubErr.message });
          }
        }
      } else if (intentData.intent === "crypto" && intentData.coin) {
        fetchedJson = await brapiService.crypto({
          coin: intentData.coin, currency: intentData.currency || "BRL",
        });
        payloadResponse = { type: "market", intent: "crypto", payload: fetchedJson };
      } else if (intentData.intent === "inflation" || intentData.intent === "fixed_income") {
        fetchedJson = await fixedIncomeService.getFixedIncomeCatalog(false);
        payloadResponse = { type: "market", intent: "fixed_income", payload: fetchedJson };
      }
      if (fetchedJson) {
        const compact    = compactMarketPayload(intentData.intent, fetchedJson);
        const directive  = buildRaioXDirective(intentData, assetClass);
        marketInfo = `\n[DADOS DE MERCADO]\n${JSON.stringify(compact)}\n${directive}`;
      }
      detectedAssetClass = assetClass;
    }
  } catch (e) {
    logError(loggerTag, "failed_market_intent", e);
  }

  if (!marketInfo && detectedIntentData?.intent && detectedIntentData.intent !== "none") {
    const directive = buildRaioXDirective(detectedIntentData, detectedAssetClass);
    marketInfo = `\n[INTENÇÃO DE MERCADO DETECTADA]\n${JSON.stringify(detectedIntentData)}\n${directive}`;
  }

  const ragChunks     = retrieveRelevantChunks(latestUser);
  const financialBlock = [contextStr, marketInfo].filter(Boolean).join("\n\n");
  const isStrict = (
    !!payloadResponse ||
    (detectedIntentData?.analysisMode === "raio_x" && detectedIntentData?.intent !== "none")
  );
  const questionForPrompt = isStrict ? latestUser : consolidated;

  const tickerForRaio = (payloadResponse && payloadResponse.resolvedTicker) || detectedIntentData?.ticker || "";
  const raioXQuote = (
    detectedIntentData?.analysisMode === "raio_x" &&
    detectedIntentData?.intent === "quote" &&
    !!String(tickerForRaio).trim()
  );

  const fullPrompt = buildConsultantPrompt(financialBlock, questionForPrompt, ragChunks, {
    raioXQuote, ticker: tickerForRaio,
  });

  return { fullPrompt, payloadResponse, detectedIntentData, detectedAssetClass };
}

// ── Handlers públicos ─────────────────────────────────────────────────────────

async function runAssistantAnalysis({ message, contextStr }) {
  const prep = await buildAssistantPrompt(message, contextStr, "chatApi");

  const isFixedIncomeRaioX = (
    (prep.detectedIntentData?.intent === "fixed_income" || prep.detectedIntentData?.intent === "inflation") &&
    prep.detectedIntentData?.analysisMode === "raio_x"
  );
  if (isFixedIncomeRaioX) {
    return {
      reply: buildFixedIncomeDeterministicReply(prep.payloadResponse, prep.detectedIntentData?.intent),
      marketPayload: prep.payloadResponse,
    };
  }

  const isEquityRaioX = (
    prep.payloadResponse?.intent === "quote" &&
    !String(prep.payloadResponse?.resolvedTicker || "").toUpperCase().endsWith("11") &&
    prep.detectedIntentData?.analysisMode === "raio_x"
  );
  if (isEquityRaioX) {
    return { reply: buildEquityDeterministicReply(prep.payloadResponse), marketPayload: prep.payloadResponse };
  }

  const isCryptoRaioX = (
    prep.payloadResponse?.intent === "crypto" &&
    prep.detectedIntentData?.analysisMode === "raio_x"
  );
  if (isCryptoRaioX) {
    return { reply: buildCryptoDeterministicReply(prep.payloadResponse), marketPayload: prep.payloadResponse };
  }

  const isEtfRaioX = (
    prep.payloadResponse?.intent === "quote" &&
    String(prep.payloadResponse?.resolvedTicker || "").toUpperCase().endsWith("11") &&
    prep.detectedIntentData?.analysisMode === "raio_x"
  );
  if (isEtfRaioX) {
    return { reply: buildEtfDeterministicReply(prep.payloadResponse), marketPayload: prep.payloadResponse };
  }

  const result = await generateAnalysis(contextStr, prep.fullPrompt);
  const safeReply = enforceMarketClassOutput(
    result?.text || "", prep.detectedIntentData, prep.detectedAssetClass, prep.payloadResponse
  );
  return { reply: safeReply, marketPayload: prep.payloadResponse };
}

async function runAssistantAnalysisStream({ message, contextStr }) {
  const prep = await buildAssistantPrompt(message, contextStr, "chatStreamApi");

  const isFixedIncomeRaioX = (
    (prep.detectedIntentData?.intent === "fixed_income" || prep.detectedIntentData?.intent === "inflation") &&
    prep.detectedIntentData?.analysisMode === "raio_x"
  );
  if (isFixedIncomeRaioX) {
    return {
      text: buildFixedIncomeDeterministicReply(prep.payloadResponse, prep.detectedIntentData?.intent),
      marketPayload: prep.payloadResponse,
    };
  }

  const isEquityRaioX = (
    prep.payloadResponse?.intent === "quote" &&
    !String(prep.payloadResponse?.resolvedTicker || "").toUpperCase().endsWith("11") &&
    prep.detectedIntentData?.analysisMode === "raio_x"
  );
  if (isEquityRaioX) {
    return { text: buildEquityDeterministicReply(prep.payloadResponse), marketPayload: prep.payloadResponse };
  }

  const isCryptoRaioX = (
    prep.payloadResponse?.intent === "crypto" &&
    prep.detectedIntentData?.analysisMode === "raio_x"
  );
  if (isCryptoRaioX) {
    return { text: buildCryptoDeterministicReply(prep.payloadResponse), marketPayload: prep.payloadResponse };
  }

  const isEtfRaioX = (
    prep.payloadResponse?.intent === "quote" &&
    String(prep.payloadResponse?.resolvedTicker || "").toUpperCase().endsWith("11") &&
    prep.detectedIntentData?.analysisMode === "raio_x"
  );
  if (isEtfRaioX) {
    return { text: buildEtfDeterministicReply(prep.payloadResponse), marketPayload: prep.payloadResponse };
  }

  let streamText = "";
  await generateAnalysisStream("", prep.fullPrompt, (chunk) => { streamText += chunk; });
  const safeText = enforceMarketClassOutput(
    streamText, prep.detectedIntentData, prep.detectedAssetClass, prep.payloadResponse
  );
  return { text: safeText, marketPayload: prep.payloadResponse };
}

module.exports = { runAssistantAnalysis, runAssistantAnalysisStream };
