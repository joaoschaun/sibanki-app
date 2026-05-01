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
const { handleAffiliateWebhook, SOL_CASHBACK, SOL_NOMES, calculateSibcoinFromReais } = require("./services/affiliate/affiliateWebhookService");
const { runWeeklySummaryEmail } = require("./services/email/weeklySummaryEmailService");
const { processarFiliadosDiario, emitirSibCoin } = require("./services/filiado/filiadoService");
const { routeWhatsAppMessage } = require("./services/whatsapp/whatsappCommandHandler");
const lomadeeCatalogService = require("./services/affiliate/lomadeeCatalogService");
const newsService = require("./services/news/newsService");
const stripeService = require("./services/billing/stripeService");
const whatsappService = require("./services/whatsapp/whatsappService");
const { generateAnalysis, generateProactiveInsight, generateAnalysisStream } = require("./services/llm/llmService");
const { buildProactiveInsightPrompt } = require("./services/llm/sovereignSystemPrompt");
const {
  runAssistantAnalysis,
  runAssistantAnalysisStream,
} = require("./services/assistant/assistantOrchestrator");
const { enforceChatQuota } = require("./services/assistant/chatRateLimiter");
const {
  processEntryCapture,
  runVoiceToEntry,
  runVisionToEntry,
} = require("./services/assistant/entryCaptureOrchestrator");
const { runSentinelaGeo } = require("./services/sentinel/sentinelaGeoService");
const adminAuth = require("./services/admin/adminAuth");
const { runSentinelaWeekly } = require("./services/sentinel/sentinelaWeeklyService");
const tenantRoutes = require("./services/tenant/tenantRoutes");
const { onUserCreated } = require("./services/user/userService");
const pluggyService = require("./services/pluggy/pluggyService");
const pluggySyncService = require("./services/pluggy/pluggySyncService");
const recorrentesService = require("./services/recorrentes/recorrentesService");

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
exports.valoresAReceberApi = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
  }
  const cpf = String(data?.cpf || "").replace(/\D/g, "");
  if (cpf.length !== 11) {
    throw new functions.https.HttpsError("invalid-argument", "CPF inválido.");
  }

  // Cascata de endpoints BCB — a URL exata varia por versão da API
  const BCB_ENDPOINTS = [
    `https://valoresareceber.bcb.gov.br/publico/api/v1/cpf/${cpf}`,
    `https://valoresareceber.bcb.gov.br/publico/api/v1/cliente/${cpf}`,
  ];

  for (const url of BCB_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": "Sibanki/1.0" },
        timeout: 12_000,
      });
      if (!res.ok) continue;
      const json = await res.json();

      // Normaliza resposta — BCB mudou o formato ao longo das versões
      const items = Array.isArray(json)
        ? json
        : Array.isArray(json?.resultado)
        ? json.resultado
        : Array.isArray(json?.data)
        ? json.data
        : [];

      const available = items.filter(
        (i) => i?.valorDisponivel !== false && i?.habilitado !== false
      );
      const institutions = [
        ...new Set(
          available
            .map((i) => i?.nomeInstituicao || i?.nome || i?.instituicao || "")
            .filter(Boolean)
        ),
      ];

      // Salva snapshot em Firestore para o Consultor IA usar depois
      if (available.length > 0) {
        try {
          await db.collection("users").doc(context.auth.uid).set(
            {
              valoresAReceber: {
                hasValues: true,
                institutions,
                total: available.length,
                checkedAt: new Date().toISOString(),
                claimUrl: "https://valoresareceber.bcb.gov.br",
              },
            },
            { merge: true }
          );
        } catch (_) { /* não bloqueia resposta */ }
      }

      return {
        hasValues: available.length > 0,
        count: available.length,
        institutions,
        claimUrl: "https://valoresareceber.bcb.gov.br",
        source: "bcb",
      };
    } catch (e) {
      console.warn("[valoresAReceberApi] endpoint falhou:", url, e.message);
    }
  }

  // API BCB indisponível — retorna null para o front tratar
  return { hasValues: null, error: "API do Banco Central indisponível agora.", institutions: [] };
});

/**
 * Catálogo da Loja (Lomadee) — `southamerica-east1` (latência/região BR; a API Lomadee é alcançável de qualquer região GCP).
 * O app DEVE chamar esta callable com `getFunctions(app, 'southamerica-east1')` — o default `us-central1` não a encontra.
 */
exports.affiliateStoreCatalogApi = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Faça login para ver a loja.");
    }
    const page = Math.max(1, parseInt(String(data?.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(data?.limit || "24"), 10) || 24));
    const search = typeof data?.search === "string" ? data.search : "";
    const price = typeof data?.price === "string" ? data.price : "";
    const organizationIds = typeof data?.organizationIds === "string" ? data.organizationIds : "";
    const forceRefresh = !!data?.forceRefresh;
    const includeFacets = data?.includeFacets !== false;
    return lomadeeCatalogService.getCatalog({
      page, limit, search, forceRefresh, price, organizationIds, includeFacets,
    });
  });

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
exports.getNews = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const category = req.query.category || "all";
      const forceRefresh = req.query.refresh === "true";
      const result = await newsService.getNews({ category, forceRefresh });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// =============================================
// NEWS: DAILY BRIEFING (Altas/Baixas + Índices)
// =============================================
exports.getDailyBriefing = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const forceRefresh = req.query.refresh === "true";
      const briefing = await newsService.getDailyBriefing({ forceRefresh });
      res.json(briefing);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// =============================================
// CONVITE FAMÍLIA: enviar e-mail com template profissional (Resend)
// =============================================
const APP_URL = process.env.APP_URL || "https://virtus-financeiro-cd7bd.web.app/app";
const { getFamilyInviteEmailHtml } = require("./templates/familyInviteEmail");
const { getVerifyEmailHtml } = require("./templates/verifyEmail");
const { getWeeklySummaryEmailHtml } = require("./templates/weeklySummaryEmail");
const { getConsorcioInviteEmailHtml } = require("./templates/consorcioInviteEmail");
const { getCrediAmigoInviteEmailHtml } = require("./templates/crediAmigoInviteEmail");

function getResendApiKey() {
  return process.env.RESEND_API_KEY || "";
}

function genCodigoConvite() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

exports.sendFamilyInviteEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar o convite.");
  }
  const { inviteId, toEmail, fromName, toNome } = data || {};
  if (!inviteId || !toEmail) {
    throw new functions.https.HttpsError("invalid-argument", "inviteId e toEmail são obrigatórios.");
  }
  const inviteSnap = await db.collection("invites").doc(inviteId).get();
  if (!inviteSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Convite não encontrado.");
  }
  const invite = inviteSnap.data();
  if (invite.from !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Este convite não é seu.");
  }
  if (invite.status !== "pending") {
    return { ok: false, message: "Convite já foi usado ou cancelado." };
  }

  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { ok: false, error: "EMAIL_NOT_CONFIGURED", message: "Envio por e-mail não configurado." };
  }

  const nomeConvidador = fromName || invite.fromName || "Seu parceiro(a)";
  const nomeConvidado = toNome || invite.toNome || "";
  const inviteLink = APP_URL + "#invite=" + inviteId;
  const codigoConvite = invite.codigoConvite || genCodigoConvite();

  if (!invite.codigoConvite) {
    await db.collection("invites").doc(inviteId).update({ codigoConvite });
  }

  const html = getFamilyInviteEmailHtml(nomeConvidador, inviteLink, codigoConvite, nomeConvidado);
  const subject = nomeConvidador + (nomeConvidado ? `, ${nomeConvidado},` : "") + " te convidou para gerenciar as finanças juntos no Sibanki 💑";

  try {
    const { Resend } = require("resend");
    const resend = new Resend(apiKey);
    const { data: sendData, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [toEmail],
      subject,
      html
    });
    if (error) {
      logError("Resend error", { error });
      return { ok: false, message: error.message || "Falha ao enviar e-mail." };
    }
    // Disparar WhatsApp se o convidado tiver telefone vinculado
    try {
      const inviteeSnap = await db.collection("users").where("email","==",toEmail).limit(1).get();
      const inviteePhone = inviteeSnap.empty ? null : inviteeSnap.docs[0].data().whatsappPhone;
      if (inviteePhone) {
        await whatsappSvc.sendWhatsAppInviteFamilia(inviteePhone, nomeConvidador, inviteLink);
        logEvent("sendFamilyInviteWA", { to: inviteePhone });
      }
    } catch (_) {}
    return { ok: true, messageId: sendData?.id };
  } catch (e) {
    logError("sendFamilyInviteEmail", e);
    throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail. Tente novamente.");
  }
});

// =============================================
// VERIFICAÇÃO DE E-MAIL (Resend) - mesmo fluxo do módulo família
// =============================================
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para reenviar o e-mail.");
  }
  let email = context.auth.token.email;
  if (!email) {
    const userRecord = await admin.auth().getUser(context.auth.uid);
    email = userRecord.email;
  }
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "E-mail não encontrado.");
  }
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "Envio por e-mail não configurado.");
  }
  try {
    const continueUrl = (data && data.continueUrl) || APP_URL;
    const link = await admin.auth().generateEmailVerificationLink(email, { url: continueUrl });
    const html = getVerifyEmailHtml(link);
    const { Resend } = require("resend");
    const resend = new Resend(apiKey);
    const { data: sendData, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [email],
      subject: "Confirme seu e-mail - Sibanki",
      html
    });
    if (error) {
      logError("Resend verification error", { error });
      throw new functions.https.HttpsError("internal", error.message || "Falha ao enviar e-mail.");
    }
    return { ok: true, messageId: sendData?.id };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("sendVerificationEmail", e);
    throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail. Tente novamente.");
  }
});

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
exports.aplicarRecorrentesDoMes = functions.pubsub
  .schedule("0 6 1 * *")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    logEvent("recorrentes", "inicio", { at: new Date().toISOString() });

    const BATCH_SIZE = 100;
    let lastDoc = null;
    let totalUsers = 0;
    let totalEntries = 0;
    let errors = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query = db.collection("users").limit(BATCH_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);

      const snap = await query.get();
      if (snap.empty) break;

      lastDoc = snap.docs[snap.docs.length - 1];

      for (const doc of snap.docs) {
        const data = doc.data();
        const recurrents = Array.isArray(data.recurrents) ? data.recurrents : [];
        const active = recurrents.filter((r) => r.active !== false);
        if (active.length === 0) continue;

        totalUsers++;
        try {
          const generated = await recorrentesService.applyRecurrentesForUser(doc.id, active);
          totalEntries += generated;
          if (generated > 0) {
            logEvent("recorrentes", "user_ok", { uid: doc.id, generated });
          }
        } catch (e) {
          errors++;
          logError("aplicarRecorrentesDoMes", { uid: doc.id, error: e.message });
        }
      }

      if (snap.docs.length < BATCH_SIZE) break;
    }

    logEvent("recorrentes", "fim", { totalUsers, totalEntries, errors });
    return null;
  });

exports.aplicarRecorrentesManual = functions
  .region("southamerica-east1")
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
    }
    const uid = context.auth.uid;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Usuário não encontrado.");
    }
    const recurrents = Array.isArray(userSnap.data().recurrents)
      ? userSnap.data().recurrents
      : [];
    const active = recurrents.filter((r) => r.active !== false);
    if (active.length === 0) {
      return { ok: true, generated: 0, message: "Nenhum recorrente ativo." };
    }

    try {
      const generated = await recorrentesService.applyRecurrentesForUser(uid, active);
      logEvent("recorrentes", "manual", { uid, generated });
      return {
        ok: true,
        generated,
        message:
          generated > 0
            ? `${generated} lançamento(s) gerado(s) com sucesso.`
            : "Todos os recorrentes deste mês já foram aplicados.",
      };
    } catch (e) {
      logError("aplicarRecorrentesManual", { uid, error: e.message });
      throw new functions.https.HttpsError("internal", "Erro ao aplicar recorrentes.");
    }
  });

// =============================================
// CHAT IA (Gemini) - usado pelo FAB e módulo IA do app
// =============================================
const PLATFORM_EVENT_ALLOWLIST = new Set([
  "advisor_opened",
  "advisor_message_sent",
  "advisor_reply_received",
  "advisor_reply_failed",
  "insight_shown",
  "insight_cta_clicked",
]);

function sanitizePlatformPayload(value, depth = 0) {
  if (depth > 3) return undefined;
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.substring(0, 500);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => sanitizePlatformPayload(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const out = {};
    Object.keys(value).slice(0, 30).forEach((key) => {
      const sanitized = sanitizePlatformPayload(value[key], depth + 1);
      if (sanitized !== undefined) out[key] = sanitized;
    });
    return out;
  }
  return undefined;
}

exports.trackPlatformEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
  }

  const uid = context.auth.uid;
  const name = data && data.name ? String(data.name).trim() : "";
  if (!PLATFORM_EVENT_ALLOWLIST.has(name)) {
    throw new functions.https.HttpsError("invalid-argument", "Evento não permitido.");
  }

  const payload = sanitizePlatformPayload((data && data.payload) || {}, 0) || {};
  const eventData = {
    uid,
    name,
    payload,
    source: "react",
    ts: admin.firestore.FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(db.collection("users").doc(uid).collection("platform_events").doc(), eventData);
  batch.set(db.collection("platform_events").doc(), eventData);
  await batch.commit();

  logEvent("platform", "trackEvent", { uid, name });
  return { ok: true };
});

// ─── NOTA: RAG_KNOWLEDGE, getRagChunksForMessage, CONSULTOR_SYSTEM_INSTRUCTION,
// funções de mercado (classify, compact, raioX, enforce, resolve) foram movidas
// para services/assistant/assistantOrchestrator.js e services/llm/brazilianFinanceKnowledge.js.
// O chatApi delega integralmente para runAssistantAnalysis. ───

const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";
const chatApiOptions = {
  timeoutSeconds: 300,
  memory: '512MB',
  ...(enforceAppCheck ? { enforceAppCheck: true } : {}),
};

// SEG-11 (auditoria 26/04/2026): caps de input para impedir cost overrun de LLM.
// Mensagem do usuário típica = ~200 chars; consultor tem ocasionalmente 1-2KB.
// Contexto financeiro completo (snapshot) já circula em ~8-16KB hoje.
// Margem de segurança: mensagem 4KB (~1k tokens), contexto 32KB (~8k tokens).
// Atacante autenticado mandando 100KB era trivial; agora paga 400 erros 400.
const CHAT_MESSAGE_MAX = 4_096;          // 4 KB
const CHAT_CONTEXT_MAX = 32_768;         // 32 KB

exports.chatApi = functions.runWith(chatApiOptions).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para usar a IA.");
  }
  const message = (data && data.message) ? String(data.message).trim() : "";
  if (!message) {
    throw new functions.https.HttpsError("invalid-argument", "Mensagem vazia.");
  }
  if (message.length > CHAT_MESSAGE_MAX) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Mensagem muito longa (${message.length} chars > ${CHAT_MESSAGE_MAX}).`
    );
  }
  const contextStr = (data && data.context) ? String(data.context).trim() : "";
  if (contextStr.length > CHAT_CONTEXT_MAX) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Contexto muito longo (${contextStr.length} chars > ${CHAT_CONTEXT_MAX}).`
    );
  }
  // SEG-12: rate limit + quota diária por uid (decisão sênior 26/04/2026)
  await enforceChatQuota({ functions, uid: context.auth.uid, kind: "chat" });
  const t = timer("chatApi", "generate");
  try {
    const result = await runAssistantAnalysis({ message, contextStr });
    if (!result || !result.reply) {
      throw new functions.https.HttpsError("resource-exhausted", "Todos os provedores de IA atingiram o limite. Tente em alguns minutos.");
    }
    t.end({ uid: context.auth.uid });
    return { reply: result.reply, marketPayload: result.marketPayload || null };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("chatApi", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao processar. Tente novamente.");
  }
});

/** Conversa com Consultor usando SSE (Server-Sent Events) para Efeito Máquina de Escrever */
exports.chatStreamApi = functions.runWith(chatApiOptions).https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Apenas POST é permitido
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    // Validação Manual de Auth via Bearer Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Auth header missing or malformed' });
    }
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { context: contextStr, message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: 'Mensagem ausente ou estruturada incorretamente' });
    }
    // SEG-11: caps de input (mesmos limites de chatApi)
    if (message.length > CHAT_MESSAGE_MAX) {
      return res.status(400).json({ error: `Mensagem muito longa (${message.length} > ${CHAT_MESSAGE_MAX}).` });
    }
    if (typeof contextStr === "string" && contextStr.length > CHAT_CONTEXT_MAX) {
      return res.status(400).json({ error: `Contexto muito longo (${contextStr.length} > ${CHAT_CONTEXT_MAX}).` });
    }

    // SEG-12: rate limit. onRequest não usa HttpsError; capturamos e devolvemos 429.
    try {
      await enforceChatQuota({ functions, uid: decodedToken.uid, kind: "stream" });
    } catch (e) {
      if (e instanceof functions.https.HttpsError) {
        return res.status(429).json({ error: e.message, code: e.code });
      }
      throw e;
    }

    // Prepara Cabeçalhos SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const result = await runAssistantAnalysisStream({ message, contextStr });
      const safeStreamText = result.text || "";

      const chunks = String(safeStreamText || "").match(/[\s\S]{1,220}/g) || [];
      for (const part of chunks) {
        res.write(`data: ${JSON.stringify({ text: part })}\n\n`);
      }

      if (result.marketPayload) {
         res.write(`data: ${JSON.stringify({ marketPayload: result.marketPayload })}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      logError("chatStreamApi", error);
      res.write(`data: ${JSON.stringify({ error: "Erro interno no servidor de streaming." })}\n\n`);
      res.end();
    }
  });
});

/** Visão Mágica: OCR de Notas fiscais diretamente extraindo para JSON via Gemini 1.5 Flash */
exports.visionToEntryApi = functions.runWith({ timeoutSeconds: 30, memory: "512MB" }).https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login necessário para usar Visão IA.");
  const base64Image = data.image; // base64 payload
  const mimeType = data.mimeType || "image/jpeg";
  if (!base64Image) throw new functions.https.HttpsError("invalid-argument", "Nenhuma imagem enviada.");

  try {
    const result = await runVisionToEntry({
      imageBase64: base64Image,
      mimeType,
      uid: context.auth.uid,
    });
    if (!result.entryPayload) {
      throw new functions.https.HttpsError("internal", "Não foi possível extrair os dados do recibo.");
    }
    return {
      reply: result.reply,
      entryPayload: result.entryPayload,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    if (error.code === "invalid-argument") {
      throw new functions.https.HttpsError("invalid-argument", error.message);
    }
    logError("visionToEntryApi", "process", error);
    throw new functions.https.HttpsError("internal", "Falha de processamento na Visão Gemini.");
  }
});

/** Callable única: { kind: 'voice'|'vision', ... } → mesmo contrato entry_draft (reply + entryPayload). */
exports.assistantEntryCaptureApi = functions.runWith({ timeoutSeconds: 30, memory: "512MB" }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  }
  try {
    return await processEntryCapture({
      kind: data?.kind,
      audioBase64: data?.audioBase64,
      mimeType: data?.mimeType,
      image: data?.image,
      imageBase64: data?.imageBase64,
      uid: context.auth.uid,
      db,
    });
  } catch (e) {
    if (e.code === "invalid-argument") {
      throw new functions.https.HttpsError("invalid-argument", e.message);
    }
    logError("assistantEntryCaptureApi", "process", e, { uid: context.auth.uid });
    throw new functions.https.HttpsError("internal", "Falha ao processar seu envio. Tente novamente.");
  }
});

/** Insight proativo (consultor invisível): recebe snapshot em markdown, retorna JSON do insight ou { status: "OK" }. */
exports.proactiveInsightApi = functions.runWith(chatApiOptions).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para usar a IA.");
  }
  const snapshot = (data && data.snapshot) ? String(data.snapshot).trim() : "";
  if (!snapshot) {
    throw new functions.https.HttpsError("invalid-argument", "Snapshot vazio.");
  }
  // SEG-11: cap de input no snapshot (mesma família dos limites do chatApi)
  if (snapshot.length > CHAT_CONTEXT_MAX) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Snapshot muito longo (${snapshot.length} chars > ${CHAT_CONTEXT_MAX}).`
    );
  }
  // SEG-12: rate limit também aqui — proactive é menos exposto mas conta na quota.
  await enforceChatQuota({ functions, uid: context.auth.uid, kind: "insight" });
  try {
    const proactivePrompt = buildProactiveInsightPrompt(snapshot);
    const result = await generateProactiveInsight(proactivePrompt);
    logEvent("proactiveInsightApi", { hasInsight: !result.status, uid: context.auth.uid });
    return result;
  } catch (e) {
    logError("proactiveInsightApi", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao gerar insight. Tente novamente.");
  }
});

// =============================================
// WHATSAPP BUSINESS (Cloud API) - MVP lançamento por mensagem
// =============================================
// =============================================
// WEBHOOK WHATSAPP — bot completo v3
// Lançamentos, consultor IA, saldo, resumo, metas, consórcio, credi amigo
// =============================================
const whatsappSvc = require("./services/whatsapp/whatsappService");

exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
  // SEG-04 (auditoria 26/04/2026): se WHATSAPP_VERIFY_TOKEN não estiver configurado,
  // retornar 503 em vez de aceitar o default "sibanki_wa_verify" público.
  if (!WHATSAPP_VERIFY_TOKEN) {
    logError("whatsappWebhook", new Error("WHATSAPP_VERIFY_TOKEN ausente — configure via firebase functions:secrets:set"));
    return res.status(503).send("WhatsApp webhook not configured");
  }

  // Verificação do webhook (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // Responder imediatamente (Meta exige <5s)
  res.status(200).send("OK");

  const body = req.body;
  const entry = body?.entry?.[0];
  const value = entry?.changes?.[0]?.value;
  const messages = value?.messages;
  if (!messages?.[0]) return;

  const msg = messages[0];
  const from = String(msg.from);
  const text = (msg.text?.body || "").trim();
  if (!text) return;
  const phoneNumberId = value?.metadata?.phone_number_id || WHATSAPP_PHONE_NUMBER_ID;

  try {
    // Delega todo o roteamento de comandos para o handler centralizado
    // (vinculação, saldo, resumo, metas, consórcio, crediamigo, boletos, cpf, wizard, IA)
    await routeWhatsAppMessage({ db, from, text, whatsappSvc, phoneNumberId });
  } catch (e) {
    logError("whatsappWebhook", e);
    try {
      await whatsappSvc.sendWhatsAppText(phoneNumberId, from, "Ocorreu um erro. Tente de novo em instantes. 🙏");
    } catch (_) {}
  }
});

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

exports.generateWhatsAppCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para vincular o WhatsApp.");
  }
  const uid = context.auth.uid;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.collection("whatsappCodes").doc(code).set({
    uid,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  });
  return { code, expiresIn: 600 };
});

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
exports.processarFiliadosDiario = functions.pubsub
  .schedule("every 24 hours")
  .onRun(() => processarFiliadosDiario());

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
exports.creditarCashbackSibCoin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login necessário');
  }

  const claims = (await admin.auth().getUser(context.auth.uid)).customClaims || {};
  if (claims.role !== 'admin' && claims.role !== 'superadmin') {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem creditar cashback.');
  }

  const { uid: targetUid, produtoId, valorContratado, contratoId } = data || {};
  const db = admin.firestore();

  // SEG-03: validar uid alvo. Sem isso, voltaríamos ao bug histórico.
  if (typeof targetUid !== 'string' || !targetUid.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'uid alvo é obrigatório.');
  }
  const uid = targetUid.trim();

  if (!produtoId || !SOL_CASHBACK[produtoId]) {
    throw new functions.https.HttpsError('invalid-argument', 'Produto inválido');
  }
  if (!valorContratado || isNaN(valorContratado) || valorContratado <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valor inválido');
  }

  // Confirmar que o usuário alvo existe antes de gravar
  const targetSnap = await db.collection('users').doc(uid).get();
  if (!targetSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Usuário alvo não encontrado.');
  }

  // Verificar se este contratoId já foi processado (idempotência)
  if (contratoId) {
    const existing = await db.collection('users').doc(uid)
      .collection('sibcoin').where('contratoId', '==', contratoId).limit(1).get();
    if (!existing.empty) {
      return { success: true, sibCoins: 0, msg: 'Cashback já creditado para este contrato' };
    }
  }

  // Calcular SibCoins: 1 SC = R$0,10
  const cashbackReais = valorContratado * SOL_CASHBACK[produtoId];
  const sibCoins = Math.round(cashbackReais / 0.10);

  if (sibCoins <= 0) {
    return { success: false, msg: 'Valor muito baixo para gerar cashback' };
  }

  const batch = db.batch();

  // 1. Registrar transação SibCoin
  const txRef = db.collection('users').doc(uid).collection('sibcoin').doc();
  batch.set(txRef, {
    tipo:         'emissao',
    origem:       'parceiro',
    produtoId,
    produto:      SOL_NOMES[produtoId] || produtoId,
    valor:        sibCoins,
    valorReais:   valorContratado,
    cashbackPct:  SOL_CASHBACK[produtoId],
    cashbackReais,
    contratoId:   contratoId || null,
    desc:         `Cashback por contratar ${SOL_NOMES[produtoId]}`,
    ts:           admin.firestore.FieldValue.serverTimestamp(),
  });

  // 2. Atualizar saldo no documento filiado
  const filRef = db.collection('users').doc(uid).collection('filiado').doc('dados');
  batch.set(filRef, {
    totalSibCoins: admin.firestore.FieldValue.increment(sibCoins),
    totalCashbackSC: admin.firestore.FieldValue.increment(sibCoins),
  }, { merge: true });

  // 3. Log global de cashbacks (para analytics admin) — inclui actorUid para auditoria
  const logRef = db.collection('cashback_log').doc();
  batch.set(logRef, {
    uid, produtoId, valorContratado, sibCoins, cashbackReais,
    contratoId: contratoId || null,
    source: 'manual_admin',
    actorUid: context.auth.uid,        // SEG-03: rastreia QUAL admin creditou
    actorEmail: context.auth.token?.email || null,
    ts: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  console.log(`Cashback (admin=${context.auth.uid}): uid=${uid} produto=${produtoId} valor=R$${valorContratado} → +${sibCoins} SC`);
  return { success: true, sibCoins, cashbackReais };
});

// =============================================
// WEBHOOKS DE AFILIADOS (Lomadee, Monetizze, genérico)
// (lógica extraída para services/affiliate/affiliateWebhookService.js)
// =============================================
exports.webhookParceiro = functions.https.onRequest(async (req, res) => {
  return handleAffiliateWebhook(req, res);
});

exports.webhookLomadee = functions.https.onRequest(async (req, res) => {
  return handleAffiliateWebhook(req, res, "lomadee");
});

exports.webhookMonetizze = functions.https.onRequest(async (req, res) => {
  return handleAffiliateWebhook(req, res, "monetizze");
});

/**
 * Callable: registrar clique em produto parceiro (analytics).
 * Parâmetros: { produtoId, produto, parceiro, categoria }
 */
exports.registrarCliqueSolucao = functions.https.onCall(async (data, context) => {
  if (!context.auth) return { success: false };
  const uid = context.auth.uid;
  const db = admin.firestore();
  const batch = db.batch();

  // Log global de cliques
  const globalRef = db.collection('sol_cliques_global').doc();
  batch.set(globalRef, {
    uid, ...data,
    ts: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Se veio mdasc (deeplink Lomadee), salva o mapeamento mdasc→uid
  // para que o postback de conversão possa atribuir o cashback ao usuário correto
  const mdasc = data?.mdasc || data?.clickId || null;
  if (mdasc) {
    const clickRef = db.collection('lomadee_clicks').doc();
    batch.set(clickRef, {
      uid,
      mdasc,
      produtoId: data?.produtoId || null,
      merchant: data?.produto || null,
      network: data?.parceiro || null,
      ts: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit().catch(() => {});
  return { success: true };
});

// =============================================
// CONVITE FAMÍLIA VIA WHATSAPP — callable
// =============================================

exports.sendWhatsAppInviteFamilia = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated","Faça login.");
  const { toPhone, nomeConvidador, toNome, linkConvite } = data || {};
  if (!toPhone) throw new functions.https.HttpsError("invalid-argument","toPhone obrigatório.");
  const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";
  const link = linkConvite || APP_URL;
  const nome = nomeConvidador || "Alguém";
  const nomeConv = toNome || "";
  const saudacao = nomeConv ? `Olá *${nomeConv}*! ` : "";
  const msg = `👨‍👩‍👧 *Convite Sibanki — Modo Família*\n\n${saudacao}*${nome}* quer gerenciar as finanças junto com você no *Sibanki*! 💰\n\nCom o Modo Família vocês podem:\n✅ Ver saldos e gastos em conjunto\n✅ Definir metas familiares\n✅ Consultor IA financeiro compartilhado\n\n👇 Aceite o convite:\n${link}\n\n_Sibanki — Controle Financeiro Inteligente com IA_`;
  try {
    const ok = await whatsappSvc.sendWhatsAppText(null, toPhone, msg);
    if (!ok) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Falha ao enviar WhatsApp (verifique token/Logs do Cloud Functions)."
      );
    }
    logEvent("sendWhatsAppInviteFamilia", { toPhone, nomeConvidador });
    return { ok: true };
  } catch(e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("sendWhatsAppInviteFamilia", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao enviar WhatsApp.");
  }
});

// =============================================
// CONVITE CONSÓRCIO AMIGOS — e-mail para participantes
// =============================================
exports.sendConsorcioInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar convites.");
  }
  const { emails, participantes, nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, grupoId } = data || {};
  // Aceitar tanto array de emails simples quanto array de {nome, email, whatsapp}
  const listaParticipantes = participantes || (emails ? emails.map(e => ({ email: e, nome: "", whatsapp: "" })) : []);
  if (!listaParticipantes.length || !nomeGrupo) {
    throw new functions.https.HttpsError("invalid-argument", "participantes e nomeGrupo são obrigatórios.");
  }
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };

  const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";
  const { Resend } = require("resend");
  const resend = new Resend(apiKey);
  const db = admin.firestore();

  const results = [];
  for (const part of listaParticipantes) {
    const email = typeof part === "string" ? part : (part.email || "");
    const nomeConvite = typeof part === "string" ? "" : (part.nome || "");
    if (!email || email.indexOf("@") < 0) continue;
    // Criar registro de convite no Firestore
    const inviteRef = await db.collection("consorcio_invites").add({
      grupoId: grupoId || null,
      nomeGrupo,
      nomeAdmin,
      toEmail: email,
      toNome: nomeConvite,
      fromUid: context.auth.uid,
      status: "pending",
      ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    const link = `${APP_URL}/#consorcio_invite=${inviteRef.id}`;
    // Template com saudação personalizada pelo nome
    const saudacaoHtml = nomeConvite ? `<strong>${nomeConvite}</strong>, você foi` : "Você foi";
    const html = getConsorcioInviteEmailHtml(nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, link);
    try {
      const assunto = nomeConvite
        ? `${nomeConvite}, ${nomeAdmin} te convidou para um consórcio no Sibanki 🤝`
        : `${nomeAdmin} te convidou para um consórcio no Sibanki 🤝`;
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "Sibanki <noreply@sibanki.com.br>",
        to: [email],
        subject: assunto,
        html,
      });
      results.push({ email, ok: !error, error: error?.message });
      logEvent("sendConsorcioInvite", { to: email, grupoId });
      // WhatsApp paralelo ao e-mail
      try {
        const uSnap = await db.collection("users").where("email","==",email).limit(1).get();
        const waPhone = uSnap.empty ? null : uSnap.docs[0].data().whatsappPhone;
        if (waPhone) await whatsappSvc.sendWhatsAppInviteConsorcio(waPhone, nomeAdmin, nomeGrupo, valorParcela, boloMensal, prazo, link);
      } catch (_) {}    } catch (e) {
      results.push({ email, ok: false, error: e.message });
      logError("sendConsorcioInvite", e);
    }
  }
  return { ok: true, results };
});

// =============================================
// CONVITE CREDI AMIGO — e-mail para o amigo do acordo
// =============================================
exports.sendCrediAmigoInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar convites.");
  }
  const { emailAmigo, nomeCredor, nomeDev, valor, parcelas, valorParcela, emprestimoId, tipoCredor } = data || {};
  if (!emailAmigo || emailAmigo.indexOf("@") < 0) {
    throw new functions.https.HttpsError("invalid-argument", "emailAmigo inválido.");
  }
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };

  const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";
  const db = admin.firestore();

  // Criar registro do convite
  const inviteRef = await db.collection("crediamigo_invites").add({
    emprestimoId: emprestimoId || null,
    nomeCredor,
    nomeDev,
    emailAmigo,
    fromUid: context.auth.uid,
    valor,
    status: "pending",
    ts: admin.firestore.FieldValue.serverTimestamp(),
  });
  const link = `${APP_URL}/#credi_invite=${inviteRef.id}`;
  const html = getCrediAmigoInviteEmailHtml(nomeCredor, nomeDev, valor, parcelas, valorParcela, link, !!tipoCredor);

  try {
    const { Resend } = require("resend");
    const resend = new Resend(apiKey);
    const assunto = tipoCredor
      ? `${nomeCredor} registrou um empréstimo para você no Sibanki 💸`
      : `${nomeCredor} registrou que você tem R$ ${Number(valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} a receber`;
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "Sibanki <noreply@sibanki.com.br>",
      to: [emailAmigo],
      subject: assunto,
      html,
    });
    if (error) { logError("sendCrediAmigoInvite", { error }); return { ok: false, error: error.message }; }
    logEvent("sendCrediAmigoInvite", { to: emailAmigo, emprestimoId });
    return { ok: true, inviteId: inviteRef.id };
  } catch (e) {
    logError("sendCrediAmigoInvite", e);
    throw new functions.https.HttpsError("internal", e.message);
  }
});

// =============================================
// CONVITE CONSÓRCIO VIA WHATSAPP — callable
// =============================================
exports.sendWhatsAppInviteConsorcioCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  const { toPhone, nomeAdmin, toNome, nomeGrupo, valorParcela, boloMensal, prazo } = data || {};
  if (!toPhone) throw new functions.https.HttpsError("invalid-argument", "toPhone obrigatório.");
  const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";
  const saudacao = toNome ? `Olá *${toNome}*! ` : "";
  const msg = `🤝 *${saudacao}Você foi convidado para um Consórcio!*\n\n*${nomeAdmin}* criou o grupo *"${nomeGrupo}"* no Sibanki.\n\n💰 Contribuição: *${fmtBRL(valorParcela)}/mês*\n🎯 Bolo mensal: *${fmtBRL(boloMensal)}*\n📅 Duração: *${prazo} meses*\n\nComo funciona:\n• Todo mês todos contribuem\n• Sorteio auditável e transparente\n• Em ${prazo} meses todo mundo recebe!\n\n👇 Ver detalhes e participar:\n${APP_URL}\n\n_Sibanki — Consórcio entre amigos, sem banco e sem juros_`;
  try {
    const ok = await whatsappSvc.sendWhatsAppText(null, toPhone, msg);
    if (!ok) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Falha ao enviar WhatsApp (verifique token/Logs do Cloud Functions)."
      );
    }
    logEvent("sendWhatsAppInviteConsorcioCallable", { toPhone, nomeGrupo });
    return { ok: true };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("sendWhatsAppInviteConsorcioCallable", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao enviar WhatsApp.");
  }
});

// =============================================
// CONVITE CREDI AMIGO VIA WHATSAPP — callable
// =============================================
exports.sendWhatsAppInviteCrediAmigoCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  const { toPhone, nomeCredor, toNome, valor, parcelas, valorParcela, tipoCredor } = data || {};
  if (!toPhone) throw new functions.https.HttpsError("invalid-argument", "toPhone obrigatório.");
  const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";
  const saudacao = toNome ? `Olá *${toNome}*! ` : "";
  const msg = tipoCredor
    ? `💸 *${saudacao}${nomeCredor} registrou um empréstimo para você*\n\nVocê deve *${fmtBRL(valor)}* para ${nomeCredor}${parcelas > 1 ? ` em ${parcelas}x de ${fmtBRL(valorParcela)}` : ""}.\n\nAcompanhe o acordo e receba lembretes no *Sibanki Credi Amigo* — grátis!\n\n👇 Ver meu acordo:\n${APP_URL}\n\n_Sibanki — Empréstimos entre amigos com transparência_`
    : `💰 *${saudacao}${nomeCredor} registrou que você tem a receber*\n\nVocê tem *${fmtBRL(valor)} a receber* de ${nomeCredor}${parcelas > 1 ? ` em ${parcelas}x de ${fmtBRL(valorParcela)}` : ""}.\n\nAcompanhe no *Sibanki Credi Amigo* — grátis!\n\n👇 Ver meu acordo:\n${APP_URL}\n\n_Sibanki — Empréstimos entre amigos com transparência_`;
  try {
    const ok = await whatsappSvc.sendWhatsAppText(null, toPhone, msg);
    if (!ok) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Falha ao enviar WhatsApp (verifique token/Logs do Cloud Functions)."
      );
    }
    logEvent("sendWhatsAppInviteCrediAmigoCallable", { toPhone, nomeCredor });
    return { ok: true };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("sendWhatsAppInviteCrediAmigoCallable", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao enviar WhatsApp.");
  }
});

// =============================================
// SENTINELA GPS — GEOFENCING FINANCEIRO
// =============================================
exports.sentinelaGeoCheck = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Faça login.");

  const { lat, lng, snapshot = {}, phone } = data || {};
  if (!lat || !lng) {
    throw new functions.https.HttpsError("invalid-argument", "lat e lng são obrigatórios.");
  }

  // Valida coordenadas básicas
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new functions.https.HttpsError("invalid-argument", "Coordenadas inválidas.");
  }

  try {
    let sendFn = null;

    // Se phone foi fornecido, envia via WhatsApp
    if (phone) {
      const whatsappSvc = require("./services/whatsapp/whatsappService");
      sendFn = (msg) => whatsappSvc.sendWhatsAppText(null, phone, msg);
    }
    const userSnap = await db.collection("users").doc(context.auth.uid).get();
    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const cards = Array.isArray(userData.cards) ? userData.cards : [];

    const result = await runSentinelaGeo(lat, lng, snapshot, sendFn, cards);

    logEvent("sentinelaGeoCheck", {
      uid: context.auth.uid,
      scenario: result.scenario,
      placeName: result.placeName,
      sent: result.sent,
    });

    return {
      scenario: result.scenario,
      placeName: result.placeName,
      message: result.message,
      sent: result.sent,
    };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("sentinelaGeoCheck", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro no Sentinela GPS.");
  }
});

// =============================================
// SENTINELA SEMANAL — SCHEDULED FUNCTION
// Toda segunda-feira às 08:00 BRT (11:00 UTC)
// =============================================
exports.sentinelaWeekly = functions.pubsub
  .schedule("every monday 11:00")
  .timeZone("UTC")
  .onRun(async () => {
    const whatsappSvc = require("./services/whatsapp/whatsappService");
    try {
      const result = await runSentinelaWeekly(db, whatsappSvc.sendWhatsAppText);
      logEvent("sentinelaWeekly_scheduled", result);
    } catch (e) {
      logError("sentinelaWeekly_scheduled", e);
    }
    return null;
  });

// =============================================
// OCR — FOTO → LANÇAMENTO FINANCEIRO
// =============================================
exports.ocrToEntry = functions.runWith({ timeoutSeconds: 30, memory: "512MB" }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  }
  const { imageBase64, mimeType } = data || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "imageBase64 é obrigatório.");
  }
  const maxSize = 4 * 1024 * 1024;
  const buf = Buffer.from(imageBase64, "base64");
  if (buf.length > maxSize) {
    throw new functions.https.HttpsError("invalid-argument", "Imagem excede 4MB.");
  }
  const t = timer("ocrToEntry", "process");
  try {
    const { imageToEntry } = require("./services/llm/ocrService");
    const userSnap = await db.collection("users").doc(context.auth.uid).get();
    const categories = userSnap.exists ? (userSnap.data().categories || []) : [];
    const result = await imageToEntry(buf, mimeType || "image/jpeg", categories);
    t.end({ uid: context.auth.uid, provider: result.provider, hasEntry: !!result.entry });
    return result;
  } catch (e) {
    t.fail(e, { uid: context.auth.uid });
    throw new functions.https.HttpsError("internal", "Falha ao processar imagem.");
  }
});

// =============================================
// STT — VOZ → LANÇAMENTO FINANCEIRO
// =============================================
exports.sttToEntry = functions.runWith({ timeoutSeconds: 30, memory: "512MB" }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  }
  const { audioBase64, mimeType } = data || {};
  if (!audioBase64 || typeof audioBase64 !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "audioBase64 é obrigatório.");
  }
  try {
    const result = await runVoiceToEntry({
      audioBase64,
      mimeType,
      uid: context.auth.uid,
      db,
    });
    return { entry: result.entry, transcript: result.transcript, provider: result.provider };
  } catch (e) {
    if (e.code === "invalid-argument") {
      throw new functions.https.HttpsError("invalid-argument", e.message);
    }
    logError("sttToEntry", "process", e);
    throw new functions.https.HttpsError("internal", "Falha ao processar áudio.");
  }
});

// ── Push Notifications — alertas diários de orçamento e faturas ──────────────
exports.dailyPushAlerts = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    const { runDailyPushAlerts } = require("./services/push/pushService");
    await runDailyPushAlerts();
    return null;
  });

exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  }
  const { title, body, targetUid, clickAction } = data || {};
  if (!title || !body) {
    throw new functions.https.HttpsError("invalid-argument", "title e body são obrigatórios.");
  }
  const uid = targetUid || context.auth.uid;
  const claims = (await admin.auth().getUser(context.auth.uid)).customClaims || {};
  if (targetUid && targetUid !== context.auth.uid && claims.role !== "admin" && claims.role !== "superadmin") {
    throw new functions.https.HttpsError("permission-denied", "Sem permissão para notificar outros usuários.");
  }
  const { sendPush } = require("./services/push/pushService");
  const result = await sendPush(uid, { title, body }, { click_action: clickAction || "/" });
  logEvent("sendPushNotification", { uid, sent: result.sent });
  return result;
});

// ── WhatsApp Weekly Summary — toda segunda-feira às 9h ───────────────────────
exports.weeklySummaryWhatsApp = functions.pubsub
  .schedule("every monday 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    const { sendWeeklySummaryWhatsApp } = require("./services/whatsapp/whatsappNotifications");
    // Busca todos os usuários com whatsappPhone cadastrado e resumo semanal habilitado
    const snap = await admin.firestore()
      .collection("users")
      .where("whatsappPhone", "!=", "")
      .get();
    for (const doc of snap.docs) {
      const userData = doc.data();
      const phone = userData.whatsappPhone;
      const prefs = userData.notifPrefs || {};
      // Respeita preferência de desligar resumo semanal (padrão: habilitado)
      if (prefs.weeklySummary === false) continue;
      try {
        await sendWeeklySummaryWhatsApp(userData, phone);
        logEvent("weeklySummaryWhatsApp_sent", { uid: doc.id });
      } catch (e) {
        logError("weeklySummaryWhatsApp_loop", e);
      }
    }
    return null;
  });
