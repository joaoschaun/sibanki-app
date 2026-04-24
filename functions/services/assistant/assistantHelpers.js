/**
 * assistantHelpers.js
 * Funções puras do orquestrador de IA — extraídas para facilitar testes unitários.
 *
 * Todas as funções aqui são determinísticas e sem efeitos colaterais:
 * não fazem I/O, não chamam APIs externas, não dependem de firebase-admin.
 */

// ── Parsing de mensagem com histórico ─────────────────────────────────────────

/**
 * Separa a mensagem mais recente do histórico de conversa quando o payload
 * usa o marcador [NOVA MENSAGEM DO USUÁRIO].
 */
function extractConsultantStreamParts(rawMessage) {
  const m = String(rawMessage || "");
  const marker = "[NOVA MENSAGEM DO USUÁRIO]";
  if (m.includes(marker)) {
    const idx = m.lastIndexOf(marker);
    const historySection = m.slice(0, idx).replace(/^\[HISTÓRICO RECENTE DA CONVERSA\]\s*/i, "").trim();
    const latestUser = m.slice(idx + marker.length).trim();
    const consolidated = historySection
      ? `${historySection}\n\n(Mensagem atual do usuário)\n${latestUser}`
      : latestUser;
    return { latestUser, consolidated };
  }
  return { latestUser: m.trim(), consolidated: m.trim() };
}

// ── Classificação de ativo ────────────────────────────────────────────────────

/**
 * Classifica um ticker como "equity", "etf" ou "fii" com base no sufixo
 * e nos metadados do payload BRAPI.
 */
function classifyQuoteAsset(ticker = "", payload = null) {
  const tk = String(ticker || "").toUpperCase();
  const profile = payload?.results?.[0]?.summaryProfile || {};
  const longName = String(payload?.results?.[0]?.longName || "");
  const sector = String(profile?.sector || "").toLowerCase();
  if (tk.endsWith("11") && /fundo|imobili|fii|real estate/i.test(`${longName} ${sector}`)) return "fii";
  if (tk.endsWith("11")) return "etf";
  return "equity";
}

// ── Diretivas de Raio-X ───────────────────────────────────────────────────────

/**
 * Retorna a diretiva de sistema para o modo Raio-X conforme o tipo de ativo.
 */
function buildRaioXDirective(intentData, assetClass = "equity") {
  if (intentData?.analysisMode !== "raio_x") return "";
  if (intentData.intent === "quote" && assetClass === "equity") {
    return "[MODO RAIO-X AÇÕES]\nUse Graham, Bazin, Lynch e Buffett. Proibido usar critérios de cripto/ETF/renda fixa.";
  }
  if (intentData.intent === "quote" && assetClass === "etf") {
    return "[MODO RAIO-X ETF]\nUse custo, risco e composição. Proibido usar Graham/Bazin/Lynch/Buffett e tokenomics.";
  }
  if (intentData.intent === "quote" && assetClass === "fii") {
    return "[MODO RAIO-X FII]\nUse DY/proventos, qualidade dos ativos e risco de concentração.";
  }
  if (intentData.intent === "crypto") {
    return "[MODO RAIO-X CRIPTO]\nUse trilema, tokenomics e adoção on-chain. PROIBIDO usar P/L, P/VP, Graham, Bazin, Lynch, Buffett.";
  }
  if (intentData.intent === "fixed_income" || intentData.intent === "inflation") {
    return "[MODO RAIO-X RENDA FIXA]\nUse crédito, ganho real e liquidez/prazo. Proibido usar ações/cripto.";
  }
  return "";
}

// ── Compactação de payload de mercado ─────────────────────────────────────────

/**
 * Reduz o payload BRAPI para os campos relevantes antes de incluir no prompt.
 */
function compactMarketPayload(intent, payload) {
  if (!payload) return null;
  try {
    if (intent === "quote") {
      const r = payload?.results?.[0] || {};
      const fd = r?.financialData || {};
      const dks = r?.defaultKeyStatistics || {};
      return {
        symbol: r.symbol,
        longName: r.longName,
        regularMarketPrice: r.regularMarketPrice,
        dividendYield: r.dividendYield,
        priceEarnings: r.priceEarnings,
        priceToBookRatio: r.priceToBookRatio,
        financialData: {
          returnOnEquity: fd.returnOnEquity,
          debtToEquity: fd.debtToEquity,
          currentRatio: fd.currentRatio,
          earningsGrowth: fd.earningsGrowth,
          freeCashflow: fd.freeCashflow,
        },
        defaultKeyStatistics: {
          trailingPE: dks.trailingPE,
          priceToBook: dks.priceToBook,
          trailingEps: dks.trailingEps,
          yield: dks.yield,
        },
      };
    }
    if (intent === "crypto") {
      const c = payload?.coins?.[0] || payload?.results?.[0] || {};
      return {
        coin: c.coin || c.symbol || c.name,
        regularMarketPrice: c.regularMarketPrice || c.price,
        marketCap: c.marketCap,
        volume24h: c.regularMarketVolume || c.volume24h,
      };
    }
    return payload;
  } catch (_) {
    return payload;
  }
}

// ── Normalização de tickers ───────────────────────────────────────────────────

/** Remove caracteres inválidos e converte para maiúsculas. */
function normalizeTickerInput(raw) {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

/** Extrai lista de tickers de um resultado de busca BRAPI (múltiplos formatos). */
function extractSearchTickers(searchResult) {
  const buckets = [];
  if (Array.isArray(searchResult)) buckets.push(searchResult);
  if (Array.isArray(searchResult?.stocks)) buckets.push(searchResult.stocks);
  if (Array.isArray(searchResult?.results)) buckets.push(searchResult.results);
  if (Array.isArray(searchResult?.quotes)) buckets.push(searchResult.quotes);
  if (Array.isArray(searchResult?.indexes)) buckets.push(searchResult.indexes);
  if (Array.isArray(searchResult?.funds)) buckets.push(searchResult.funds);
  const all = buckets.flat();
  const out = [];
  for (const item of all) {
    const candidate = item?.stock || item?.symbol || item?.ticker || item?.code || item?.asset || item?.name;
    const tk = normalizeTickerInput(candidate);
    if (/^[A-Z0-9]{4,12}$/.test(tk)) out.push(tk);
  }
  return Array.from(new Set(out));
}

// ── Formatação de moeda ───────────────────────────────────────────────────────

function formatBrl(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/d";
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Builders de resposta determinística (Raio-X) ──────────────────────────────

function buildEtfDeterministicReply(payloadResponse) {
  const r = payloadResponse?.payload?.results?.[0] || {};
  const symbol = String(r.symbol || payloadResponse?.resolvedTicker || "ETF").toUpperCase();
  const longName = String(r.longName || r.shortName || symbol);
  const price = formatBrl(r.regularMarketPrice);
  const range = r.fiftyTwoWeekRange || "n/d";
  const dayRange = r.regularMarketDayRange || "n/d";
  const volume = Number.isFinite(Number(r.regularMarketVolume))
    ? Number(r.regularMarketVolume).toLocaleString("pt-BR")
    : "n/d";
  const adminFee =
    Number.isFinite(Number(r.expenseRatio)) && Number(r.expenseRatio) > 0
      ? `${(Number(r.expenseRatio) * 100).toFixed(2)}%`
      : "n/d";
  const benchmark = r?.summaryProfile?.fundFamily || r?.summaryProfile?.sector || "n/d";
  const hasMarketData = Number.isFinite(Number(r.regularMarketPrice));

  const lines = [
    `Veredito: ${symbol} é um ETF de índice. Use-o para exposição ampla ao benchmark, não para stock picking.`,
    "",
    "Estrutura (estilo ETFBrasil):",
    `- Ativo: ${symbol} (${longName})`,
    `- Preço atual: ${price}`,
    `- Faixa do dia: ${dayRange}`,
    `- Faixa 52 semanas: ${range}`,
    `- Liquidez (volume): ${volume}`,
    `- Taxa de administração: ${adminFee}`,
    `- Índice/benchmark (quando disponível): ${benchmark}`,
    "",
    "Risco/Retorno (leitura prática):",
    "- Concentração: verifique os 10 maiores pesos do índice antes de aumentar posição.",
    "- Tracking/custo: sem taxa baixa + boa liquidez, ETF perde eficiência no longo prazo.",
    "- Volatilidade: ETF de ações segue o ciclo da bolsa; tenha horizonte >= 5 anos.",
    "",
    "Ação recomendada:",
    "- Se sua reserva e caixa estão ok, use alocação fracionada e rebalanceamento periódico.",
    "- Se o financeiro pessoal estiver pressionado, priorize caixa/reserva antes de ampliar risco.",
  ];

  if (!hasMarketData) {
    lines.push("", "Nota: os dados de preço vieram incompletos agora; o enquadramento acima usa estrutura do produto.");
  }

  return lines.join("\n");
}

function buildCryptoDeterministicReply(payloadResponse) {
  const c = payloadResponse?.payload?.coins?.[0] || payloadResponse?.payload?.results?.[0] || {};
  const coin = String(c.coin || c.symbol || c.name || "CRYPTO").toUpperCase();
  const price = formatBrl(c.regularMarketPrice || c.price);
  const changePct = Number.isFinite(Number(c.regularMarketChangePercent))
    ? `${Number(c.regularMarketChangePercent).toFixed(2)}%`
    : "n/d";
  const volume = Number.isFinite(Number(c.regularMarketVolume || c.volume24h))
    ? formatBrl(c.regularMarketVolume || c.volume24h)
    : "n/d";
  const marketCap = Number.isFinite(Number(c.marketCap)) ? formatBrl(c.marketCap) : "n/d";
  const dayLow = Number.isFinite(Number(c.regularMarketDayLow)) ? formatBrl(c.regularMarketDayLow) : "n/d";
  const dayHigh = Number.isFinite(Number(c.regularMarketDayHigh)) ? formatBrl(c.regularMarketDayHigh) : "n/d";

  return [
    `Veredito: ${coin} é cripto de alta volatilidade. A decisão depende de risco e disciplina de posição.`,
    "",
    "Estrutura (Raio-X cripto):",
    `- Ativo: ${coin}`,
    `- Preço atual: ${price}`,
    `- Variação 24h: ${changePct}`,
    `- Faixa do dia: ${dayLow} - ${dayHigh}`,
    `- Volume 24h: ${volume}`,
    `- Market cap: ${marketCap}`,
    "",
    "Framework técnico:",
    "- Trilema: validar segurança, descentralização e escalabilidade.",
    "- Tokenomics: oferta, inflação, emissão e risco de diluição.",
    "- Adoção/Liquidez: volume, listagem e profundidade de mercado.",
    "",
    "Ação recomendada:",
    "- Use posição pequena e escalonada; nunca concentre patrimônio em um único criptoativo.",
    "- Defina perda máxima por posição e rebalanceamento periódico.",
  ].join("\n");
}

function buildEquityDeterministicReply(payloadResponse) {
  const r = payloadResponse?.payload?.results?.[0] || {};
  const symbol = String(r.symbol || payloadResponse?.resolvedTicker || "ACAO").toUpperCase();
  const longName = String(r.longName || r.shortName || symbol);
  const price = formatBrl(r.regularMarketPrice);
  const dayRange = r.regularMarketDayRange || "n/d";
  const range52 = r.fiftyTwoWeekRange || "n/d";
  const pe = Number.isFinite(Number(r.priceEarnings)) ? Number(r.priceEarnings).toFixed(2) : "n/d";
  const pb = Number.isFinite(Number(r.priceToBookRatio)) ? Number(r.priceToBookRatio).toFixed(2) : "n/d";
  const dy = Number.isFinite(Number(r.dividendYield)) ? `${(Number(r.dividendYield) * 100).toFixed(2)}%` : "n/d";
  const roe = Number.isFinite(Number(r?.financialData?.returnOnEquity))
    ? `${(Number(r.financialData.returnOnEquity) * 100).toFixed(2)}%`
    : "n/d";
  const debtToEquity = Number.isFinite(Number(r?.financialData?.debtToEquity))
    ? Number(r.financialData.debtToEquity).toFixed(2)
    : "n/d";
  const vol = Number.isFinite(Number(r.regularMarketVolume))
    ? Number(r.regularMarketVolume).toLocaleString("pt-BR")
    : "n/d";

  return [
    `Veredito: ${symbol} é ação individual. A tese depende de valuation + qualidade + risco de execução.`,
    "",
    "Estrutura (Raio-X ações):",
    `- Ativo: ${symbol} (${longName})`,
    `- Preço atual: ${price}`,
    `- Faixa do dia: ${dayRange}`,
    `- Faixa 52 semanas: ${range52}`,
    `- Liquidez (volume): ${vol}`,
    "",
    "Métricas-chave:",
    `- P/L: ${pe}`,
    `- P/VP: ${pb}`,
    `- Dividend Yield: ${dy}`,
    `- ROE: ${roe}`,
    `- Dívida/Patrimônio: ${debtToEquity}`,
    "",
    "Checklist de decisão:",
    "- Valuation: só aumenta posição com margem de segurança.",
    "- Qualidade: priorize geração de caixa e consistência de lucro.",
    "- Risco: limite de exposição por ativo e rebalanceamento.",
  ].join("\n");
}

function buildFixedIncomeDeterministicReply(payloadResponse, intentName) {
  const catalog = payloadResponse?.payload || {};
  const indicators = catalog?.indicators || {};
  const currentInflation = Number.isFinite(Number(indicators?.ipcaAnnual))
    ? `${(Number(indicators.ipcaAnnual) * 100).toFixed(2)}%`
    : "n/d";
  const selic = Number.isFinite(Number(indicators?.selicAnnual))
    ? `${(Number(indicators.selicAnnual) * 100).toFixed(2)}%`
    : "n/d";
  const products = Array.isArray(catalog?.syntheticProducts) ? catalog.syntheticProducts : [];
  const top = products
    .slice()
    .sort((a, b) => (Number(b?.realAnnualRatePct) || -999) - (Number(a?.realAnnualRatePct) || -999))
    .slice(0, 2)
    .map((p) => `${p.name}: real ~${Number(p.realAnnualRatePct).toFixed(2)}% a.a.`)
    .join(" | ") || "n/d";
  const modeLabel = intentName === "inflation" ? "Inflação (IPCA)" : "Renda fixa";

  return [
    `Veredito: ${modeLabel} deve ser decidido por ganho real, prazo e risco de crédito.`,
    "",
    "Estrutura (Raio-X renda fixa):",
    `- País/base de referência: BRAZIL`,
    `- Selic anual: ${selic}`,
    `- Inflação atual disponível: ${currentInflation}`,
    "- Ganho real alvo: taxa contratada - inflação esperada",
    "- Liquidez: D+0/D+1 para caixa; prazos maiores para objetivo de longo prazo",
    `- Benchmarks atuais: ${top}`,
    "",
    "Checklist prático:",
    "- Reserva: manter parte em liquidez diária (Tesouro Selic/CDB D+0).",
    "- Crédito: quanto maior taxa, maior risco do emissor (avaliar FGC e rating).",
    "- Prazo: casar vencimento do título com a meta financeira.",
    "",
    "Ação recomendada:",
    "- Para perfil conservador: priorize liquidez e previsibilidade.",
    "- Para alongar carteira: combinar pós-fixado + IPCA+ com diversificação de emissores.",
  ].join("\n");
}

// ── Enforcer de saída por classe de ativo ─────────────────────────────────────

/**
 * Verifica se o texto da IA usou métricas proibidas para a classe de ativo.
 * Se sim, substitui pela resposta determinística correta.
 */
function enforceMarketClassOutput(text, intentData, assetClass, payloadResponse) {
  const raw = String(text || "").trim();
  if (!raw) return raw;
  if (intentData?.intent === "crypto") {
    const invalid = /graham|bazin|lynch|buffett|p\/l|p\/vp|pre[çc]o justo/i.test(raw);
    if (!invalid) return raw;
    const coin = payloadResponse?.payload?.coins?.[0] || payloadResponse?.payload?.results?.[0] || {};
    const coinName = coin?.coin || coin?.symbol || coin?.name || "ativo cripto";
    return (
      `Veredito: ⚠️ ${String(coinName).toUpperCase()} é cripto de alta volatilidade.\n\n` +
      `Trilema: avalie descentralização, segurança e escalabilidade.\n` +
      `Tokenomics: valide oferta/inflação e risco de diluição.\n` +
      `Adoção on-chain: valide atividade e liquidez do ecossistema.\n` +
      `Checklist: ✅ Framework cripto aplicado sem critérios de ações.\n` +
      `Ação: posição pequena, diversificação e gestão de risco.`
    );
  }
  if (intentData?.intent === "quote" && assetClass === "etf") {
    if (intentData?.analysisMode === "raio_x") return buildEtfDeterministicReply(payloadResponse);
    const invalid =
      /tokenomics|on-?chain|trilema|graham|bazin|lynch|buffett/i.test(raw) ||
      /dados\s+limitados|n[aã]o\s+permitindo\s+uma\s+an[aá]lise|n[aã]o\s+tem\s+dados/i.test(raw);
    if (!invalid) return raw;
    return buildEtfDeterministicReply(payloadResponse);
  }
  return raw;
}

module.exports = {
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
};
