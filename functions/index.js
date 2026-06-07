const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors")({origin: true});
const fmtBRL = (v) => "R$ " + Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fetch = require("node-fetch");
const { fetchJson, fetchText } = require("./httpClient");
const { logEvent, logError, logWarn, timer } = require("./logger");
const {
  BRAPI_TOKEN,
  BRAPI_BASE,
  GNEWS_KEY,
  NEWSDATA_KEY,
  STRIPE_WEBHOOK_SECRET,
  getStripe,
  RESEND_API_KEY,
  RESEND_FROM,
  GEMINI_KEY,
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN,
  LOMADEE_APP_TOKEN,
  LOMADEE_SOURCE_ID,
  LOMADEE_WEBHOOK_SECRET,
  MONETIZZE_API_KEY,
  MONETIZZE_TOKEN,
  MONETIZZE_WEBHOOK_SECRET,
  CASHBACK_CONVERSION_RATE,
  CASHBACK_RELEASE_DAYS
} = require("./config");
const { brapiRateCheck } = require("./services/market/brapiRateLimiter");
const brapiService = require("./services/market/brapiService");
const fixedIncomeService = require("./services/market/fixedIncomeService");
const { runWeeklySummaryEmail } = require("./services/email/weeklySummaryEmailService");
const newsService = require("./services/news/newsService");
const stripeService = require("./services/billing/stripeService");
const { generateAnalysis } = require("./services/llm/llmService");
const adminAuth = require("./services/admin/adminAuth");
const tenantRoutes = require("./services/tenant/tenantRoutes");
const { onUserCreated } = require("./services/user/userService");
const pluggyService = require("./services/pluggy/pluggyService");
const pluggySyncService = require("./services/pluggy/pluggySyncService");

// Controllers modularizados
const { valoresAReceberApi } = require("./services/market/valoresAReceberController");
const { getNews, getDailyBriefing } = require("./services/news/newsController");
const {
  sendFamilyInviteEmail,
  sendVerificationEmail,
  sendConsorcioInvite,
  sendCrediAmigoInvite
} = require("./services/email/emailController");
const { aplicarRecorrentesDoMes, aplicarRecorrentesManual } = require("./services/recorrentes/recorrentesController");
const {
  chatApi,
  chatStreamApi,
  visionToEntryApi,
  assistantEntryCaptureApi,
  trackPlatformEvent,
  proactiveInsightApi,
  ocrToEntry,
  sttToEntry
} = require("./services/assistant/assistantController");
const {
  whatsappWebhook,
  generateWhatsAppCode,
  sendWhatsAppInviteFamilia,
  sendWhatsAppInviteConsorcioCallable,
  sendWhatsAppInviteCrediAmigoCallable,
  weeklySummaryWhatsApp
} = require("./services/whatsapp/whatsappController");
const {
  sentinelaGeoCheck,
  sentinelaWeekly
} = require("./services/sentinel/sentinelController");
const {
  dailyPushAlerts,
  sendPushNotification
} = require("./services/push/pushController");
const {
  affiliateStoreCatalogApi,
  webhookParceiro,
  webhookLomadee,
  webhookMonetizze,
  registrarCliqueSolucao,
  creditarCashbackSibCoin,
  processarFiliadosDiario
} = require("./services/affiliate/affiliateController");

// Load .env for local development (sempre functions/.env, mesmo com cwd na raiz)
try {
  const path = require("path");
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch (e) {}

// Initialize admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const app = express();
app.use(cors);
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  const checks = { status: "ok", timestamp: new Date().toISOString(), services: {} };
  try {
    const snap = await db.collection("users").limit(1).get();
    checks.services.firestore = snap.empty ? "ok (empty)" : "ok";
  } catch (e) {
    checks.services.firestore = "error: " + e.message;
    checks.status = "degraded";
  }
  try {
    await admin.auth().listUsers(1);
    checks.services.auth = "ok";
  } catch (e) {
    checks.services.auth = "error: " + e.message;
    checks.status = "degraded";
  }
  checks.services.deepseek = process.env.DEEPSEEK_KEY ? "configured" : "missing";
  checks.services.gemini = process.env.GEMINI_KEY ? "configured" : "missing";
  checks.services.stripe = process.env.STRIPE_SECRET ? "configured" : "missing";
  checks.services.resend = process.env.RESEND_API_KEY ? "configured" : "missing";
  checks.services.whatsapp = process.env.WHATSAPP_TOKEN ? "configured" : "missing";
  checks.services.pluggy = process.env.PLUGGY_CLIENT_ID ? "configured" : "missing";
  checks.services.lomadee = LOMADEE_APP_TOKEN ? "configured" : "missing";
  checks.services.monetizze = MONETIZZE_API_KEY ? "configured" : "missing";
  checks.services.monetizzeToken = MONETIZZE_TOKEN ? "configured" : "missing";
  checks.services.cashbackEngine = (CASHBACK_CONVERSION_RATE > 0 && CASHBACK_RELEASE_DAYS >= 0)
    ? "configured"
    : "invalid";
  const code = checks.status === "ok" ? 200 : 503;
  res.status(code).json(checks);
});

app.use("/api/v1/tenants", tenantRoutes);

exports.api = functions.https.onRequest(app);
exports.onUserCreated = functions.auth.user().onCreate(onUserCreated);

// =============================================
// ADMIN AUTH: validação de acesso ao painel
// =============================================
exports.validateAdminAccess = adminAuth.validateAdminAccess;
exports.revokeAdminAccess = adminAuth.revokeAdminAccess;
exports.grantAdminAccess = adminAuth.grantAdminAccess;
exports.listAdmins = adminAuth.listAdmins;

// =============================================
// STRIPE: delega para serviço de billing
// =============================================
exports.createCheckout = functions.https.onCall(async (data, context) => {
  return stripeService.createCheckout(data, context);
});

exports.createPortal = functions.https.onCall(async (data, context) => {
  return stripeService.createPortal(data, context);
});

exports.getUserPlan = functions.https.onCall(async (data, context) => {
  return stripeService.getUserPlan(data, context);
});

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  return stripeService.handleStripeWebhook(req, res);
});

// =============================================
// BRAPI: delega para serviço de mercado (rate limit por uid)
// =============================================

exports.brapiQuote = functions.https.onCall(async (data, context) => {
  await brapiRateCheck(context);
  return brapiService.quote(data, context);
});

exports.brapiMulti = functions.https.onCall(async (data, context) => {
  await brapiRateCheck(context);
  return brapiService.multi(data, context);
});

exports.brapiSearch = functions.https.onCall(async (data, context) => {
  await brapiRateCheck(context);
  return brapiService.search(data, context);
});

exports.brapiCrypto = functions.https.onCall(async (data, context) => {
  await brapiRateCheck(context);
  return brapiService.crypto(data, context);
});

exports.brapiInflation = functions.https.onCall(async (data, context) => {
  await brapiRateCheck(context);
  return brapiService.inflation(data, context);
});

exports.fixedIncomeCatalogApi = functions.https.onCall(async (data, context) => {
  await brapiRateCheck(context);
  const forceRefresh = !!data?.forceRefresh;
  return fixedIncomeService.getFixedIncomeCatalog(forceRefresh);
});

/**
 * Valores a Receber — BCB (Banco Central do Brasil)
 * Consulta a API pública do BC para verificar se o CPF tem valores esquecidos
 * (contas inativas, cotas de consórcio, tarifas cobradas indevidamente, etc.).
 * Não requer autenticação externa — apenas CPF do usuário.
 * Para resgatar: https://valoresareceber.bcb.gov.br (requer gov.br)
 */
exports.valoresAReceberApi = valoresAReceberApi;

/**
 * Catálogo da Loja (Lomadee) — `southamerica-east1` (latência/região BR; a API Lomadee é alcançável de qualquer região GCP).
 * O app DEVE chamar esta callable com `getFunctions(app, 'southamerica-east1')` — o default `us-central1` não a encontra.
 */
exports.affiliateStoreCatalogApi = affiliateStoreCatalogApi;

// =============================================
// NEWS: RSS PARSER HELPER
// =============================================
function parseRSSItems(xml, source, category) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const getTag = (tag) => {
      const r = new RegExp("<" + tag + "[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\/" + tag + ">", "s");
      const m = block.match(r);
      return m ? m[1].trim() : "";
    };
    const title = getTag("title");
    if (!title || title === "[Removed]") continue;

    let image = "";
    const mediaMatch = block.match(/url="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    if (mediaMatch) image = mediaMatch[1];
    if (!image) {
      const imgMatch = block.match(/<img[^>]+src="(https?:\/\/[^"]+)"/i);
      if (imgMatch) image = imgMatch[1];
    }
    const enclosureMatch = block.match(/<enclosure[^>]+url="(https?:\/\/[^"]+)"/i);
    if (!image && enclosureMatch) image = enclosureMatch[1];

    items.push({
      title: title.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
      description: getTag("description").replace(/<[^>]+>/g, "").substring(0, 200),
      url: getTag("link"),
      image: image,
      source: source,
      category: category,
      publishedAt: getTag("pubDate") || new Date().toISOString()
    });
  }
  return items;
}

// =============================================
// NEWS: AGGREGATOR (4 sources + Brazilian RSS)
// =============================================
exports.getNews = getNews;
exports.getDailyBriefing = getDailyBriefing;

// =============================================
// CONVITE FAMÍLIA & VERIFICAÇÃO DE E-MAIL
// =============================================
exports.sendFamilyInviteEmail = sendFamilyInviteEmail;
exports.sendVerificationEmail = sendVerificationEmail;

// =============================================
// RESUMO SEMANAL POR E-MAIL (agendado: segunda 8h BRT)
// =============================================
exports.weeklySummary = functions.pubsub
  .schedule("every monday 08:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => runWeeklySummaryEmail());

// =============================================
// RECORRENTES: aplicar lançamentos mensais automáticos
// =============================================
exports.aplicarRecorrentesDoMes = aplicarRecorrentesDoMes;
exports.aplicarRecorrentesManual = aplicarRecorrentesManual;

// =============================================
// CHAT IA (Gemini) - usado pelo FAB e módulo IA do app
// =============================================
exports.trackPlatformEvent = trackPlatformEvent;

// ─── NOTA: RAG_KNOWLEDGE, getRagChunksForMessage, CONSULTOR_SYSTEM_INSTRUCTION,
// funções de mercado (classify, compact, raioX, enforce, resolve) foram movidas
// para services/assistant/assistantOrchestrator.js e services/llm/brazilianFinanceKnowledge// =============================================
// ASSISTENTE DE IA (Gemini)
// =============================================
exports.chatApi = chatApi;
exports.chatStreamApi = chatStreamApi;
exports.visionToEntryApi = visionToEntryApi;
exports.assistantEntryCaptureApi = assistantEntryCaptureApi;
exports.proactiveInsightApi = proactiveInsightApi;

// =============================================
// WHATSAPP BUSINESS (Cloud API) - MVP lançamento por mensagem
// =============================================
// =============================================
// WEBHOOK WHATSAPP — bot completo v3
// Lançamentos, consultor IA, saldo, resumo, metas, consórcio, credi amigo
// =============================================
exports.whatsappWebhook = whatsappWebhook;

// =============================================
// BRIEFING IA — insight personalizado pós-login
// =============================================
exports.briefingIa = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  }
  const { rec, desp, saldo, pctGasto, patrimonio, metaNome, catEstourada, qtdEntradas } = data || {};
  const prompt = `Você é um consultor financeiro pessoal direto e empático. Analise os dados financeiros deste mês e escreva UM único insight personalizado de no máximo 2 frases curtas. Seja específico com os números. Use linguagem natural, sem markdown, sem títulos.

Dados do mês atual:
- Receitas: R$ ${(rec||0).toFixed(2)}
- Despesas: R$ ${(desp||0).toFixed(2)}
- Saldo: R$ ${(saldo||0).toFixed(2)} (${saldo<0?'NEGATIVO':'positivo'})
- % da receita gasta: ${pctGasto||0}%
- Patrimônio total: R$ ${(patrimonio||0).toFixed(2)}
- Lançamentos registrados: ${qtdEntradas||0}
${metaNome ? `- Meta quase concluída: "${metaNome}"` : ''}
${catEstourada ? `- Orçamento estourado: ${catEstourada}` : ''}

Escreva o insight agora (máx 2 frases, português brasileiro, tom amigável e direto):`;

  try {
    const result = await generateAnalysis("", prompt);
    if (!result || !result.text) throw new Error("sem resposta");
    return { insight: result.text.trim() };
  } catch(e) {
    let fallback = "";
    if (saldo < 0) {
      fallback = `Suas despesas superaram as receitas em R$ ${Math.abs(saldo||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} este mês. Vale revisar os lançamentos e cortar o que for possível.`;
    } else if (pctGasto > 85) {
      fallback = `Você já usou ${pctGasto}% da receita do mês — atenção para não estourar o orçamento nos próximos dias.`;
    } else if (pctGasto > 0) {
      fallback = `Bom controle! Você usou ${pctGasto}% da receita e ainda tem fôlego até o fim do mês.`;
    } else {
      fallback = `Registre suas receitas e despesas para receber um briefing personalizado.`;
    }
    return { insight: fallback };
  }
});

exports.generateWhatsAppCode = generateWhatsAppCode;

// =============================================
// TELEGRAM BOT
// =============================================
const telegramBot = require("./telegramBot");
exports.telegramWebhook = telegramBot.telegramWebhook;
exports.checkPriceAlerts = telegramBot.checkPriceAlerts;
exports.dailyNews = telegramBot.dailyNews;
exports.weeklyReport = telegramBot.weeklyReport;

// =============================================
// SIBCOIN — Motor de Recompensas
// =============================================
const rewardEngine = require("./services/sibcoin/rewardEngine");
exports.triggerSibcoinEvent  = rewardEngine.triggerSibcoinEvent;
exports.getSibcoinMissions   = rewardEngine.getSibcoinMissions;
exports.adminCreditSibcoin   = rewardEngine.adminCreditSibcoin;

// =============================================
// IA - Categorizacao em lote de CSV
// Acao 17 (29/03/2026): Gemini Flash categoriza lancamentos
// importados via CSV que nao possuem categoria definida.
// =============================================
const csvCategorizerService = require("./services/llm/csvCategorizerService");
exports.aiCategorizeCsv = csvCategorizerService.aiCategorizeCsv;

// =============================================
// PROGRAMA FILIADO — validação diária de ativação
// (lógica extraída para services/filiado/filiadoService.js)
// =============================================
exports.processarFiliadosDiario = processarFiliadosDiario;

/**
 * Callable: gera Connect Token Pluggy para abrir o widget no React (Open Finance).
 * Requer PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET no .env (dev) ou env vars Firebase (prod).
 */
exports.pluggyCreateConnectToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }
  return pluggyService.createConnectToken(context.auth.uid);
});

/**
 * Callable: puxa contas dos itens Pluggy do usuário e grava em accounts / accountBalances / accountMeta
 */
exports.pluggySyncAccounts = functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }
  return pluggySyncService.syncAccountsToUser(context.auth.uid, db);
});

/**
 * Callable: registrar Open Banking ativo (chamado pelo app quando usuário conecta)
 */
exports.registrarOpenBanking = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login necessário');
  const uid = context.auth.uid;
  const db = admin.firestore();

  // Marcar usuário como tendo Open Banking ativo
  await db.collection('users').doc(uid).set(
    { openBankingAtivo: true, openBankingAtivoEm: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  // O cron diário processará o crédito. Retorna OK.
  return { success: true };
});

// =============================================
// SOLUÇÕES FINANCEIRAS — Cashback SibCoin por parceiros
// (constantes e lógica extraídas para services/affiliate/affiliateWebhookService.js)
// =============================================

/**
 * Callable interno: creditar cashback SibCoin após confirmação de contratação.
 * Chamado por admin para creditar manualmente o cashback de um usuário (`data.uid`).
 *
 * Parâmetros: { uid: string, produtoId: string, valorContratado: number, contratoId?: string }
 *
 * Autorização: somente admin/superadmin (custom claim `role`).
 *
 * SEG-03 (auditoria 26/04/2026): Antes a função usava `context.auth.uid` (UID do
 * próprio admin) como destinatário do crédito — bug que permitia ao admin auto-creditar
 * SibCoin indefinidamente, e tornava o callable inútil para o intent documentado.
 * Agora lemos `data.uid`, validamos que é string não-vazia, e creditamos no usuário
 * alvo. Mantida idempotência por `contratoId`.
 */
exports.creditarCashbackSibCoin = creditarCashbackSibCoin;

// =============================================
// WEBHOOKS DE AFILIADOS (Lomadee, Monetizze, genérico)
// (lógica extraída para services/affiliate/affiliateWebhookService.js)
// =============================================
exports.webhookParceiro = webhookParceiro;
exports.webhookLomadee = webhookLomadee;
exports.webhookMonetizze = webhookMonetizze;
exports.registrarCliqueSolucao = registrarCliqueSolucao;

// =============================================
// CONVITE FAMÍLIA VIA WHATSAPP — callable
// =============================================

exports.sendWhatsAppInviteFamilia = sendWhatsAppInviteFamilia;

// =============================================
// CONVITE CONSÓRCIO AMIGOS — e-mail para participantes
// =============================================
exports.sendConsorcioInvite = sendConsorcioInvite;
exports.sendCrediAmigoInvite = sendCrediAmigoInvite;

// =============================================
// CONVITE CONSÓRCIO VIA WHATSAPP — callable
// =============================================
exports.sendWhatsAppInviteConsorcioCallable = sendWhatsAppInviteConsorcioCallable;
exports.sendWhatsAppInviteCrediAmigoCallable = sendWhatsAppInviteCrediAmigoCallable;

// =============================================
// SENTINELA GPS — GEOFENCING FINANCEIRO
// =============================================
exports.sentinelaGeoCheck = sentinelaGeoCheck;
exports.sentinelaWeekly = sentinelaWeekly;
exports.ocrToEntry = ocrToEntry;
exports.sttToEntry = sttToEntry;
exports.dailyPushAlerts = dailyPushAlerts;
exports.sendPushNotification = sendPushNotification;
exports.weeklySummaryWhatsApp = weeklySummaryWhatsApp;
