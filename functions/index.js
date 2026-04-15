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
const brapiService = require("./services/market/brapiService");
const fixedIncomeService = require("./services/market/fixedIncomeService");
const lomadeeCatalogService = require("./services/affiliate/lomadeeCatalogService");
const newsService = require("./services/news/newsService");
const stripeService = require("./services/billing/stripeService");
const whatsappService = require("./services/whatsapp/whatsappService");
const { generateAnalysis, generateProactiveInsight, generateAnalysisStream } = require("./services/llm/llmService");
const { buildConsultantPrompt, buildProactiveInsightPrompt } = require("./services/llm/sovereignSystemPrompt");
const { retrieveRelevantChunks } = require("./services/llm/brazilianFinanceKnowledge");
const { detectMarketIntent } = require("./services/llm/marketIntentService");
const {
  runAssistantAnalysis,
  runAssistantAnalysisStream,
} = require("./services/assistant/assistantOrchestrator");
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
const _brapiRateMap = new Map();
const BRAPI_RATE_LIMIT = 30; // máx requisições por minuto por uid
const BRAPI_RATE_WINDOW = 60_000;

function brapiRateCheck(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }
  const uid = context.auth.uid;
  const now = Date.now();
  const entry = _brapiRateMap.get(uid);

  if (entry && now - entry.start < BRAPI_RATE_WINDOW) {
    entry.count++;
    if (entry.count > BRAPI_RATE_LIMIT) {
      throw new functions.https.HttpsError("resource-exhausted", "Limite de requisições atingido. Tente novamente em 1 minuto.");
    }
  } else {
    // Limpa entrada expirada antes de criar nova (evita memory leak)
    if (entry && entry.cleanupTimer) clearTimeout(entry.cleanupTimer);
    const cleanupTimer = setTimeout(() => _brapiRateMap.delete(uid), BRAPI_RATE_WINDOW + 1000);
    _brapiRateMap.set(uid, { start: now, count: 1, cleanupTimer });
  }
}

exports.brapiQuote = functions.https.onCall(async (data, context) => {
  brapiRateCheck(context);
  return brapiService.quote(data, context);
});

exports.brapiMulti = functions.https.onCall(async (data, context) => {
  brapiRateCheck(context);
  return brapiService.multi(data, context);
});

exports.brapiSearch = functions.https.onCall(async (data, context) => {
  brapiRateCheck(context);
  return brapiService.search(data, context);
});

exports.brapiCrypto = functions.https.onCall(async (data, context) => {
  brapiRateCheck(context);
  return brapiService.crypto(data, context);
});

exports.brapiInflation = functions.https.onCall(async (data, context) => {
  brapiRateCheck(context);
  return brapiService.inflation(data, context);
});

exports.fixedIncomeCatalogApi = functions.https.onCall(async (data, context) => {
  brapiRateCheck(context);
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
function computeWeeklySummary(entries, startDateStr, endDateStr) {
  const valid = (e) =>
    e &&
    e.date &&
    !e.isTransfer &&
    e.category !== "Transferencia" &&
    e.status !== "pendente" &&
    e.status !== "agendado" &&
    e.date >= startDateStr &&
    e.date <= endDateStr;
  const list = Array.isArray(entries) ? entries.filter(valid) : [];
  const receitaTotal = list.filter((e) => e.type === "receita").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const despesaTotal = list.filter((e) => e.type === "despesa").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const byCat = {};
  list.filter((e) => e.type === "despesa" && e.category).forEach((e) => {
    byCat[e.category] = (byCat[e.category] || 0) + (Number(e.value) || 0);
  });
  const topCategorias = Object.entries(byCat)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  return { receitaTotal, despesaTotal, topCategorias };
}

function formatDateBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

exports.weeklySummary = functions.pubsub
  .schedule("every monday 08:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    const apiKey = getResendApiKey();
    if (!apiKey) {
      logError("weeklySummary", new Error("RESEND_API_KEY not configured"));
      return null;
    }
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const toStr = (d) => d.toISOString().slice(0, 10);
    const startDateStr = toStr(start);
    const endDateStr = toStr(end);

    const snap = await db.collection("users").where("resumoSemanalEmail", "==", true).get();
    const { Resend } = require("resend");
    const resend = new Resend(apiKey);

    for (const doc of snap.docs) {
      const d = doc.data();
      let email = d.email;
      if (!email) {
        try {
          const userRecord = await admin.auth().getUser(doc.id);
          email = userRecord.email;
        } catch (e) {
          logError("weeklySummary getUser", { uid: doc.id, error: e.message });
          continue;
        }
      }
      if (!email) continue;

      const entries = d.entries || [];
      const { receitaTotal, despesaTotal, topCategorias } = computeWeeklySummary(entries, startDateStr, endDateStr);
      const nome = d.name || "Usuário";
      const html = getWeeklySummaryEmailHtml(
        nome,
        receitaTotal,
        despesaTotal,
        topCategorias,
        formatDateBR(startDateStr),
        formatDateBR(endDateStr),
        APP_URL
      );
      try {
        const { error } = await resend.emails.send({
          from: RESEND_FROM,
          to: [email],
          subject: "Seu resumo da semana — Sibanki",
          html
        });
        if (error) logError("weeklySummary Resend", { uid: doc.id, error });
      } catch (e) {
        logError("weeklySummary send", { uid: doc.id, error: e.message });
      }
    }
    return null;
  });

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

const RAG_KNOWLEDGE = {
  reserva: `Reserva de emergência: dinheiro guardado para imprevistos (desemprego, saúde, conserto). Primeira prioridade financeira. Mínimo 3 meses de gastos essenciais; ideal 6 meses de gastos totais; autônomo/instável até 12 meses. Deve ficar em aplicação de liquidez imediata (Tesouro Selic, CDB liquidez diária). Nunca usar para viagem, impulso ou investimento arriscado.`,
  imprevisto: `Imprevistos: gastos não planejados (conserto, saúde, multa). Estratégias: 1) Usar reserva de emergência se existir. 2) Cortar gastos não essenciais do mês. 3) Renegociar ou adiar contas não urgentes. 4) Evitar empréstimo com juros altos; se inevitável, comparar taxas e prazos. Sempre priorize o essencial (moradia, alimentação, saúde).`,
  divida: `Dívidas: priorize quitar as de juros mais altos primeiro (cartão, cheque especial). Negocie com o credor: parcelamento, desconto à vista, refinanciamento. Evite contrair novas dívidas para pagar antigas, exceto se a nova taxa for bem menor. Liste todas as dívidas (valor, taxa, parcela) para ter visão clara.`,
  seguro: `Seguros: protegem patrimônio e renda. Seguro de vida e residencial são os mais relevantes para famílias. Avalie custo-benefício; evite seguros desnecessários. Para veículo, compare coberturas e franquias.`,
  consorcio: `Consórcio: alternativa ao financiamento para compra de bem (carro, imóvel). Não tem juros explícitos, mas tem taxa de administração e depende de sorteio ou lance. Compare com financiamento; pode ser vantajoso para quem consegue dar lances e antecipar.`,
  emprestimo: `Empréstimos: compare sempre Custo Efetivo Total (CET) e prazo. Evite para consumo; prefira para investimento ou emergência real. Renegocie dívidas existentes antes de assumir novas.`,
  sistema: `Sibanki: app de controle financeiro pessoal. Funcionalidades principais: Lançamentos (receitas e despesas por data, categoria e conta); Contas bancárias (várias contas com saldo); Cartões de crédito (limite, fechamento, vencimento, compras); Metas financeiras (valor alvo e acompanhamento); Orçamento por categoria (limite mensal por categoria); Relatórios e dashboard. O usuário pode usar o botão de chat (FAB) para falar com o consultor e fazer lançamentos ou pedir ações por texto.`,
  comportamento: `Comportamento financeiro (psicologia econômica): Viés do presente — tendemos a valorizar mais o agora que o futuro; por isso poupar exige regras (automático, antes de gastar). Viés do custo afundado — não mantenha um gasto ou investimento ruim só porque já gastou; avalie daqui pra frente. Efeito manada — evite decisões por modismo (cripto, ações da vez); tenha critérios próprios. Compensação moral — gastar mais depois de "ter se controlado" anula o ganho; evite recompensas em consumo. Conta mental — dinheiro "separado" (mesada, bônus) é gasto com mais facilidade; trate toda renda como uma só. Recomendações: automatize poupança, defina limites por categoria, revise gastos com calma (não no calor do momento), celebre pequenas vitórias sem gastar.`,
  vieses: `Mais vieses comportamentais em dinheiro: Aversão à perda — perdemos mais satisfação ao perder R$ 100 do que ganhamos ao ganhar R$ 100; por isso muita gente evita vender investimento no prejuízo (mesmo quando faz sentido) ou assume riscos demais para "recuperar". Âncora — o primeiro número que vemos (preço à vista, parcela) influencia o que achamos "justo"; compare sempre com alternativas. Otimismo excessivo — subestimamos gastos e prazos; use margem de segurança no orçamento. Falácia do custo afundado — "já gastei tanto que tenho que continuar"; a decisão certa é pela frente, não pelo que já passou. Para decidir melhor: espere 24h em compras grandes, escreva prós e contras, consulte alguém de confiança.`,
  livros: `Princípios de educação financeira (inspirados em clássicos): (1) Pague a si primeiro — reserve parte da renda para reserva e metas antes de pagar contas. (2) Diferencie ativo e passivo — ativo gera receita ou valor; passivo gera despesa; priorize acumular ativos. (3) Conheça seus números — receita, despesa, patrimônio; só quem mede melhora. (4) Orçamento é liberdade — não é restrição, é saber onde o dinheiro vai para escolher com consciência. (5) Juros compostos a seu favor — poupar cedo e de forma consistente vale mais que valores altos tarde. (6) Emergência primeiro — reserva de 3–6 meses de gastos antes de investir em risco. (7) Evite dívida para consumo — use crédito com plano de pagamento; evite parcelar o que não é essencial. (8) Educação financeira contínua — leia, aprenda, ajuste; o contexto de cada um é único.`,
  investimentos: `Investimentos básicos (conceitos): CDI — taxa que reflete o custo do dinheiro entre bancos; renda fixa costuma ser referenciada a ele (ex.: 100% do CDI). Inflação — IPCA mede o aumento de preços; investimentos devem superar a inflação para não perder poder de compra. Diversificação — não coloque tudo em um ativo; distribua entre renda fixa, ações, fundos, para reduzir risco. Liquidez — facilidade de resgatar; reserva de emergência precisa de liquidez diária (Tesouro Selic, CDB diário). Risco e retorno — maior retorno esperado costuma vir com maior risco; alinhe investimentos ao seu prazo e perfil. Ordem prática: 1) Reserva de emergência (liquidez). 2) Quitar dívidas caras. 3) Metas de curto/médio prazo (renda fixa). 4) Longo prazo (diversificar conforme perfil).`
};
function getRagChunksForMessage(message) {
  const m = (message || "").toLowerCase();
  const out = [];
  if (/reserva|emergência|emergencia|guardar|poupança/.test(m)) out.push(RAG_KNOWLEDGE.reserva);
  if (/imprevisto|imprevistos|emergência|emergencia|conserto|inesperado/.test(m)) out.push(RAG_KNOWLEDGE.imprevisto);
  if (/dívida|divida|dívidas|dividas|emprestimo|empréstimo|cartão|cartao|juros/.test(m)) out.push(RAG_KNOWLEDGE.divida);
  if (/seguro|seguros/.test(m)) out.push(RAG_KNOWLEDGE.seguro);
  if (/consórcio|consorcio/.test(m)) out.push(RAG_KNOWLEDGE.consorcio);
  if (/emprestimo|empréstimo|financiamento|renegociar/.test(m)) out.push(RAG_KNOWLEDGE.emprestimo);
  if (/como (usar|funciona|adicionar|vejo|defino)|onde (fica|cadastr|vejo)|ajuda sobre o sistema|funcionalidade do app|sibanki/.test(m)) out.push(RAG_KNOWLEDGE.sistema);
  if (/comportamento|psicologia|viés|vies|habito|hábito|impulso|gastar|compra por|livro|educação financeira|pagar a si primeiro|ativo e passivo|juros compostos|princípio/.test(m)) out.push(RAG_KNOWLEDGE.comportamento);
  if (/aversão à perda|ancora|âncora|viés|vies|decisão|decisão errada|custo afundado|otimismo|perda|ganho/.test(m)) out.push(RAG_KNOWLEDGE.vieses);
  if (/comportamento|psicologia|livro|educação financeira|pagar a si primeiro|ativo e passivo|juros compostos|princípio|babilônia|rico|pobre|poupar|investir/.test(m)) out.push(RAG_KNOWLEDGE.livros);
  if (/investir|investimento|cdi|ipca|inflação|inflacao|diversificar|renda fixa|tesouro|reserva|aplicação|aplicar/.test(m)) out.push(RAG_KNOWLEDGE.investimentos);
  return out.length ? out.join("\n\n") : "";
}
const CONSULTOR_SYSTEM_INSTRUCTION = `Você é o Sibanki IA, consultor financeiro pessoal do app. Regras obrigatórias:

PAPEL: Especialista em finanças pessoais, investimentos, empréstimos, consórcios, seguros e comportamento financeiro. Seja empático, sem julgamento, e proativo.

AJUDA SOBRE O SISTEMA (Sibanki):
- Se o usuário perguntar como usar o app, onde fica algo ou como funciona uma função, explique de forma clara e objetiva.
- O app tem: lançamentos (receitas/despesas), contas bancárias, cartões de crédito, metas financeiras, orçamento por categoria, relatórios e dashboard. Pode sugerir usar o botão flutuante (FAB) para falar com você e fazer lançamentos ou alterações por voz/texto.
- Exemplos: "como adicionar uma conta?", "onde vejo minhas metas?", "como definir orçamento?" — responda indicando as abas/funcionalidades de forma amigável.

DÚVIDAS FINANCEIRAS E EDUCAÇÃO:
- Responda dúvidas sobre conceitos (juros, CDI, reserva de emergência, investimentos, dívidas, consórcio, seguro etc.) de forma didática e em português brasileiro.
- Use os dados do usuário (receita, despesa, metas, contas) quando fornecidos no contexto para personalizar a resposta.

EMPATIA E CENÁRIOS:
- Considere sempre o contexto da pessoa: quem está juntando reserva, quem está endividado, quem teve imprevisto.
- Se os dados indicam saldo negativo ou alto % de gasto, seja acolhedor e sugira passos concretos (não só "tenha reserva").
- Para imprevistos: sugira como encaixar no mês, priorizar gastos, usar reserva se houver, ou alternativas (linha de crédito só se fizer sentido).
- Para dívidas: priorize quitar juros altos, sugerir renegociação ou parcelamento quando relevante.
- Mencione reserva de emergência (ideal 3–6 meses de gastos) quando fizer sentido, mas adapte ao momento da pessoa.

COMUNICAÇÃO:
- Respostas em português brasileiro, práticas e acionáveis.
- Use emojis com moderação para tornar a leitura agradável.
- Seja específico com valores em R$ quando os dados do usuário permitirem.
- Não invente dados que não foram fornecidos no contexto.`;

const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";
const chatApiOptions = {
  timeoutSeconds: 300,
  memory: '512MB',
  ...(enforceAppCheck ? { enforceAppCheck: true } : {}),
};

/** Separa histórico (se houver) da última mensagem do usuário no streaming. */
function extractConsultantStreamParts(rawMessage) {
  const m = String(rawMessage || "");
  const marker = "[NOVA MENSAGEM DO USUÁRIO]";
  if (m.includes(marker)) {
    const idx = m.lastIndexOf(marker);
    let historySection = m.slice(0, idx).replace(/^\[HISTÓRICO RECENTE DA CONVERSA\]\s*/i, "").trim();
    const latestUser = m.slice(idx + marker.length).trim();
    const consolidated = historySection
      ? `${historySection}\n\n(Mensagem atual do usuário)\n${latestUser}`
      : latestUser;
    return { latestUser, consolidated };
  }
  return { latestUser: m.trim(), consolidated: m.trim() };
}

function classifyQuoteAsset(ticker = "", payload = null) {
  const tk = String(ticker || "").toUpperCase();
  const profile = payload?.results?.[0]?.summaryProfile || {};
  const longName = String(payload?.results?.[0]?.longName || "");
  const sector = String(profile?.sector || "").toLowerCase();
  if (tk.endsWith("11") && /fundo|imobili|fii|real estate/i.test(`${longName} ${sector}`)) return "fii";
  if (tk.endsWith("11")) return "etf";
  return "equity";
}

function buildRaioXDirective(intentData, assetClass = "equity") {
  if (intentData?.analysisMode !== "raio_x") return "";

  if (intentData.intent === "quote" && assetClass === "equity") {
    return `
[MODO RAIO-X AÇÕES — OBRIGATÓRIO]
Estruture em: 1) Veredito curto 2) Graham (P/L, P/VP, preço justo) 3) Bazin (DY/teto) 4) Lynch (PEG/ROE/dívida) 5) Buffett (moat/qualidade) 6) Checklist final com ✅/⚠️.
Se algum indicador faltar no payload, declare explicitamente "dado indisponível" sem inventar.
NÃO use critérios de cripto (trilema/tokenomics/on-chain), ETF (tracking error/top10) ou renda fixa (duration/FGC) neste modo.
`;
  }
  if (intentData.intent === "quote" && assetClass === "etf") {
    return `
[MODO RAIO-X ETF — OBRIGATÓRIO]
Estruture em: 1) Veredito curto 2) Custo (taxa/erro de tracking quando disponível) 3) Risco (volatilidade/beta/Sharpe quando disponível) 4) Composição (concentração/setores quando disponível) 5) Checklist final ✅/⚠️.
NÃO use Graham/Bazin/Lynch/Buffett neste modo.
`;
  }
  if (intentData.intent === "quote" && assetClass === "fii") {
    return `
[MODO RAIO-X FII — OBRIGATÓRIO]
Estruture em: 1) Veredito curto 2) Renda (DY/proventos) 3) Qualidade (vacância/gestão/alavancagem quando disponível) 4) Risco de concentração 5) Checklist final ✅/⚠️.
NÃO use Graham/Lynch/Buffett de ações tradicionais neste modo.
`;
  }
  if (intentData.intent === "crypto") {
    return `
[MODO RAIO-X CRIPTO — OBRIGATÓRIO]
Estruture em: 1) Veredito curto 2) Trilema (descentralização/segurança/escalabilidade) 3) Tokenomics (oferta, inflação/queima) 4) Adoção on-chain (volume/atividade quando disponível) 5) Checklist de risco ✅/⚠️.
PROIBIDO usar Graham, Bazin, Lynch, Buffett, P/L, P/VP ou preço justo de ações.
Se faltar dado on-chain no payload, diga explicitamente "dado on-chain indisponível no feed atual" e mantenha a análise no framework cripto.
`;
  }
  if (intentData.intent === "fixed_income" || intentData.intent === "inflation") {
    return `
[MODO RAIO-X RENDA FIXA — OBRIGATÓRIO]
Estruture em: 1) Veredito curto 2) Crédito (rating/garantia) 3) Ganho real (taxa nominal - inflação) 4) Liquidez e prazo (duration/carência) 5) Checklist final ✅/⚠️.
Se faltar taxa do ativo específico, explique quais dados faltam e simule cenário didático com faixas realistas do Brasil.
NÃO use Graham/Bazin/Lynch/Buffett nem critérios de trilema/tokenomics.
`;
  }
  return "";
}

function enforceMarketClassOutput(text, intentData, assetClass, payloadResponse) {
  const raw = String(text || "").trim();
  if (!raw) return raw;
  const intent = intentData?.intent;

  if (intent === "crypto") {
    const hasCryptoAnchors =
      /trilema|tokenomics|on-?chain|descentraliza|escalabil|seguran[çc]a/i.test(raw);
    const hasStockAnchors = /graham|bazin|lynch|buffett|p\/l|p\/vp|pre[çc]o justo/i.test(raw);
    if (hasCryptoAnchors && !hasStockAnchors) return raw;

    const coinData = payloadResponse?.payload?.coins?.[0] || payloadResponse?.payload?.results?.[0] || {};
    const coinName = coinData?.coin || coinData?.symbol || coinData?.name || "ativo cripto";
    const price = coinData?.regularMarketPrice || coinData?.price;
    const priceLabel = Number.isFinite(Number(price)) ? `Preço de referência: ${Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` : "Preço de referência indisponível no feed atual.";

    return [
      `Veredito: ⚠️ ${String(coinName).toUpperCase()} é cripto de alta volatilidade; trate como posição de risco.`,
      "",
      "Trilema (Descentralização · Segurança · Escalabilidade):",
      "- Segurança e descentralização variam por rede e ciclo; valide robustez operacional antes de alocar.",
      "- Escalabilidade depende de uso real e custos de transação no período.",
      "",
      "Tokenomics (Oferta · Emissão/Queima):",
      "- Analise inflação de oferta e pressão de venda estrutural.",
      "- Sem mecanismo claro de escassez, o risco de diluição aumenta.",
      "",
      "Adoção On-Chain (Uso real):",
      "- Verifique volume, atividade de rede e utilidade econômica além de narrativa.",
      `- ${priceLabel}`,
      "",
      "Checklist de risco:",
      "✅ Classe correta: cripto (sem critérios de ações/ETF/renda fixa)",
      "⚠️ Alta volatilidade e sensibilidade a ciclo de mercado",
      "⚠️ Invista apenas com tamanho pequeno e gestão de risco",
      "",
      "Ação recomendada: manter alocação tática, diversificada e limitada ao perfil de risco."
    ].join("\n");
  }

  if (intent === "quote" && assetClass === "etf") {
    const hasEtfAnchors = /tracking|taxa|sharpe|beta|concentra|composi|setor/i.test(raw);
    const hasCryptoOrStock = /tokenomics|on-?chain|trilema|graham|bazin|lynch|buffett/i.test(raw);
    if (hasEtfAnchors && !hasCryptoOrStock) return raw;
    return [
      "Veredito: análise em modo ETF.",
      "",
      "Custo:",
      "- Taxa de administração e tracking error são os principais filtros iniciais.",
      "",
      "Risco:",
      "- Avalie volatilidade, beta e Sharpe no horizonte da sua carteira.",
      "",
      "Composição:",
      "- Revise concentração (Top 10) e diversificação setorial.",
      "",
      "Checklist final:",
      "✅ Framework ETF aplicado",
      "⚠️ Sem mistura de critérios de ações ou cripto",
      "",
      "Ação recomendada: confirmar aderência ao benchmark e função do ETF na carteira."
    ].join("\n");
  }

  return raw;
}

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
        currency: r.currency,
        priceEarnings: r.priceEarnings,
        priceToBookRatio: r.priceToBookRatio,
        dividendYield: r.dividendYield,
        earningsPerShare: r.earningsPerShare,
        marketCap: r.marketCap,
        financialData: {
          returnOnEquity: fd.returnOnEquity,
          debtToEquity: fd.debtToEquity,
          currentRatio: fd.currentRatio,
          profitMargins: fd.profitMargins,
          operatingMargins: fd.operatingMargins,
          freeCashflow: fd.freeCashflow,
          revenueGrowth: fd.revenueGrowth,
          earningsGrowth: fd.earningsGrowth,
        },
        defaultKeyStatistics: {
          trailingPE: dks.trailingPE,
          forwardPE: dks.forwardPE,
          bookValue: dks.bookValue,
          priceToBook: dks.priceToBook,
          trailingEps: dks.trailingEps,
          yield: dks.yield,
        },
      };
    }
    if (intent === "crypto") {
      const first = payload?.coins?.[0] || payload?.results?.[0] || {};
      return {
        coin: first.coin || first.symbol || first.name,
        currency: first.currency,
        regularMarketPrice: first.regularMarketPrice || first.price,
        marketCap: first.marketCap,
        volume24h: first.regularMarketVolume || first.volume24h,
        changePercent24h: first.regularMarketChangePercent || first.changePercent24h,
      };
    }
    if (intent === "inflation" || intent === "fixed_income") {
      const arr = Array.isArray(payload?.inflation) ? payload.inflation.slice(0, 12) : payload?.results?.slice?.(0, 12);
      return { inflation: arr || payload };
    }
    return payload;
  } catch (_) {
    return payload;
  }
}

function normalizeTickerInput(raw) {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

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
    const candidate =
      item?.stock ||
      item?.symbol ||
      item?.ticker ||
      item?.code ||
      item?.asset ||
      item?.name;
    const tk = normalizeTickerInput(candidate);
    if (/^[A-Z0-9]{4,12}$/.test(tk)) out.push(tk);
  }
  return Array.from(new Set(out));
}

async function resolveTickerWithFallback(rawTicker) {
  const clean = normalizeTickerInput(rawTicker);
  if (!clean) return "";
  try {
    await brapiService.quote({ ticker: clean });
    return clean;
  } catch (e) {
    // tenta sugestão via busca quando ticker tiver possível typo
    try {
      const search = await brapiService.search({ query: clean });
      const tickers = extractSearchTickers(search);
      if (tickers.includes(clean)) return clean;
      const starts = tickers.find((t) => t.startsWith(clean.slice(0, 4)));
      if (starts) return starts;
      const contains = tickers.find((t) => t.includes(clean.slice(0, 4)));
      if (contains) return contains;
      const first = tickers[0];
      return first || clean;
    } catch (_) {
      return clean;
    }
  }
}

exports.chatApi = functions.runWith(chatApiOptions).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para usar a IA.");
  }
  const message = (data && data.message) ? String(data.message).trim() : "";
  if (!message) {
    throw new functions.https.HttpsError("invalid-argument", "Mensagem vazia.");
  }
  const contextStr = (data && data.context) ? String(data.context).trim() : "";
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
  const reply = (txt) => whatsappSvc.sendWhatsAppText(phoneNumberId, from, txt);
  const tl = text.toLowerCase();

  try {
    // ── 1. Vinculação por código 6 dígitos ──
    if (/^\d{6}$/.test(text)) {
      const codeDoc = await db.collection("whatsappCodes").doc(text).get();
      if (codeDoc.exists) {
        const { uid, expiresAt } = codeDoc.data();
        if (new Date(expiresAt).getTime() > Date.now()) {
          await db.collection("users").doc(uid).update({ whatsappPhone: from, updated: new Date().toISOString() });
          await db.collection("whatsappCodes").doc(text).delete();
          const userDoc = await db.collection("users").doc(uid).get();
          const nome = userDoc.data()?.name?.split(" ")[0] || "você";
          await reply(`✅ Olá *${nome}*! WhatsApp vinculado ao Sibanki com sucesso!\n\n🤖 *O que posso fazer:*\n\n📝 *Lançar despesa/receita*\n_"Gastei 80 no mercado"_\n_"Recebi 2000 de salário"_\n\n💬 *Consultor IA* — pergunte qualquer coisa sobre suas finanças\n_"Como estou esse mês?"_\n_"Onde estou gastando mais?"_\n\n📊 Comandos: *saldo · resumo · metas · consorcio · crediamigo · ajuda*`);
          return;
        }
      }
      return reply("❌ Código inválido ou expirado. Gere um novo no app: Configurações > WhatsApp.");
    }

    // ── 2. Usuário vinculado? ──
    const userSnap = await db.collection("users").where("whatsappPhone", "==", from).limit(1).get();
    if (userSnap.empty) {
      return reply(`👋 Olá! Para usar o Sibanki pelo WhatsApp:\n\n1. Abra o app em *sibanki.com.br*\n2. Vá em ⚙️ Configurações > WhatsApp\n3. Toque em *Gerar código*\n4. Envie o código de 6 dígitos aqui`);
    }
    const uid = userSnap.docs[0].id;
    const userData = userSnap.docs[0].data();
    const nome = (userData.name || "").split(" ")[0] || "você";

    // ── 3. Comando: ajuda/menu ──
    if (/^(oi|olá|ola|menu|ajuda|help|start)$/.test(tl)) {
      return reply(`👋 Oi *${nome}*! Sou o assistente do Sibanki.\n\n📝 *Lançar gasto/receita:*\n"Gastei 80 no restaurante"\n"Recebi 1500 de freela"\n\n💬 *Consultor IA:*\nPergunte qualquer coisa sobre suas finanças!\n\n📊 *Comandos rápidos:*\n*saldo* — ver saldos das contas\n*resumo* — balanço do mês\n*metas* — progresso das metas\n*consorcio* — grupos ativos\n*crediamigo* — empréstimos ativos\n\n🔗 sibanki.com.br`);
    }

    // ── 4. Comando: saldo ──
    if (/^(saldo|saldos|contas)$/.test(tl)) {
      const d = userData;
      const contas = d.accounts || [];
      const balances = d.accountBalances || {};
      if (!contas.length) return reply("Nenhuma conta cadastrada. Adicione no app Sibanki!");
      const total = contas.reduce((s, c) => s + (Number(balances[c]) || 0), 0);
      const linhas = contas.map(c => `• ${c}: *${fmtBRL(balances[c] || 0)}*`).join("\n");
      return reply(`💰 *Seus saldos, ${nome}:*\n\n${linhas}\n\n📊 *Total: ${fmtBRL(total)}*`);
    }

    // ── 5. Comando: resumo ──
    if (/^(resumo|balanço|balanco|mes|mês)$/.test(tl)) {
      const entries = Array.isArray(userData.entries) ? userData.entries : [];
      const mes = new Date().toISOString().slice(0, 7);
      const mesEntries = entries.filter(e => e.date?.startsWith(mes) && !e.isTransfer && e.category !== "Transferencia");
      const rec = mesEntries.filter(e => e.type === "receita").reduce((s, e) => s + (Number(e.value)||0), 0);
      const desp = mesEntries.filter(e => e.type === "despesa").reduce((s, e) => s + (Number(e.value)||0), 0);
      const saldo = rec - desp;
      const pct = rec > 0 ? Math.round(desp/rec*100) : 0;
      const mesNome = new Date().toLocaleString("pt-BR", { month: "long" });
      const emoji = saldo >= 0 ? "✅" : "⚠️";
      // Top 3 categorias
      const catMap = {};
      mesEntries.filter(e => e.type === "despesa").forEach(e => { catMap[e.category] = (catMap[e.category]||0) + Number(e.value); });
      const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([c,v])=>`  • ${c}: ${fmtBRL(v)}`).join("\n");
      return reply(`📊 *Resumo de ${mesNome}*\n\n💚 Receitas: ${fmtBRL(rec)}\n🔴 Despesas: ${fmtBRL(desp)}\n${emoji} Saldo: *${fmtBRL(saldo)}*\n📈 Uso da renda: ${pct}%\n\n🏷 *Maiores gastos:*\n${topCats||"  Nenhum lançamento"}\n\n📝 ${mesEntries.length} lançamentos no mês`);
    }

    // ── 6. Comando: metas ──
    if (/^(metas?|objetivos?)$/.test(tl)) {
      const goals = Array.isArray(userData.goals) ? userData.goals : [];
      if (!goals.length) return reply("Nenhuma meta cadastrada. Crie metas no app Sibanki! 🎯");
      const linhas = goals.slice(0,5).map(g => {
        const atual = Number(g.atual||g.current||g.saved||0);
        const alvo = Number(g.alvo||g.target||1);
        const pct = Math.min(100, Math.round(atual/alvo*100));
        const bar = "▓".repeat(Math.floor(pct/10)) + "░".repeat(10-Math.floor(pct/10));
        return `🎯 *${g.nome||g.name}*\n${bar} ${pct}%\n_${fmtBRL(atual)} de ${fmtBRL(alvo)}_`;
      }).join("\n\n");
      return reply(`🎯 *Suas Metas*\n\n${linhas}`);
    }

    // ── 7. Comando: consórcio ──
    if (/^(cons[oó]rcio|caixa)$/.test(tl)) {
      const grupos = await db.collection("users").doc(uid).collection("consorcio_grupos").where("status","==","ativo").limit(5).get();
      if (grupos.empty) return reply("Você não tem grupos de Consórcio Amigos ativos.\n\nCrie um no app: Menu > Social > Consórcio Amigos 🤝");
      const linhas = grupos.docs.map(d => {
        const g = d.data();
        const bolo = (g.valorParcela||0)*(g.numParticipantes||0);
        const parts = Array.isArray(g.participantes)?g.participantes:[];
        const pagaram = parts.filter(p=>p.statusMes==="pago").length;
        return `🤝 *${g.nome}*\nBolo: ${fmtBRL(bolo)} | Pagaram: ${pagaram}/${parts.length} | Dia ${g.diaVencimento}`;
      }).join("\n\n");
      return reply(`🤝 *Consórcio Amigos*\n\n${linhas}\n\nGerencie no app: sibanki.com.br`);
    }

    // ── 8. Comando: credi amigo ──
    if (/^(credi\s?amigo|empréstimos?|emprestimos?)$/.test(tl)) {
      const emps = await db.collection("users").doc(uid).collection("crediamigo").where("status","==","ativo").limit(5).get();
      if (emps.empty) return reply("Você não tem empréstimos ativos no Credi Amigo.\n\nRegistre no app: Menu > Social > Credi Amigo 💸");
      const linhas = emps.docs.map(d => {
        const e = d.data();
        const rest = (e.valorTotal||0)-(e.valorPago||0);
        const ico = e.tipo==="emprestei"?"📤":"📥";
        return `${ico} *${e.amigo}* — ${fmtBRL(rest)} restante\n_${e.numParcelas}x de ${fmtBRL(e.valorParcela)}_`;
      }).join("\n\n");
      return reply(`💸 *Credi Amigo*\n\n${linhas}\n\nGerencie no app: sibanki.com.br`);
    }

    // ── 9. Comando: boletos (DDA) ──
    // Acao 11 (29/03/2026): exibe boletos DDA pendentes do usuario.
    // Fase 1: dados Firestore (ddaBoletos subcollection) com fallback demo.
    if (/^(boletos?|dda|vencimentos?)$/.test(tl)) {
      const boletosSnap = await db.collection("users").doc(uid)
        .collection("ddaBoletos")
        .where("status", "==", "pendente")
        .orderBy("vencimento", "asc")
        .limit(5)
        .get().catch(() => null);

      if (boletosSnap && !boletosSnap.empty) {
        const linhas = boletosSnap.docs.map((d) => {
          const b = d.data();
          const venc = b.vencimento ? new Date(b.vencimento).toLocaleDateString("pt-BR") : "—";
          return `📄 *${b.beneficiario}* — ${fmtBRL(b.valor)}\nVence: ${venc}`;
        }).join("\n\n");
        return reply(`📄 *Seus boletos pendentes:*\n\n${linhas}\n\nVeja todos no app: sibanki.com.br`);
      } else {
        // Demo quando DDA ainda não está integrado via Pluggy
        return reply(`📄 *Boletos DDA*\n\nNenhum boleto DDA sincronizado ainda.\n\nConecte seu banco via Open Finance no app para ver todos os boletos automaticamente:\nsibanki.com.br > Contas > Conectar banco 🏦`);
      }
    }

    // ── 10. Comando: score CPF ──
    // Acao 11 (29/03/2026): exibe score e alertas do CPF do usuario.
    // Fase 1: dados Firestore (cpfMonitoring) com fallback orientativo.
    if (/^(cpf|score|score[\s-]?cpf|credito)$/.test(tl)) {
      const cpf = userData.cpfMonitoring;
      if (cpf && cpf.score) {
        const band = cpf.score < 400 ? "Muito Baixo ⚠️"
          : cpf.score < 600 ? "Regular 🟡"
          : cpf.score < 750 ? "Bom 🟢"
          : "Excelente 🌟";
        const negs = cpf.negativacoesCount || 0;
        const alerts = Array.isArray(cpf.alertas) ? cpf.alertas.filter(a => !a.lido).length : 0;
        return reply(`🛡️ *Meu CPF — ${nome}*\n\nScore: *${cpf.score}* — ${band}\nNegativações: ${negs === 0 ? "✅ Nenhuma" : `⚠️ ${negs} ativas`}\nAlertas não lidos: ${alerts}\n\nDetalhes completos no app:\nsibanki.com.br > Meu CPF`);
      } else {
        return reply(`🛡️ *Monitoramento de CPF*\n\nSeu CPF ainda não está conectado a um bureau de crédito.\n\nAcesse o app para ativar:\nsibanki.com.br > Meu CPF > Conectar bureau\n\nMonitoramos: Serasa, Boa Vista e SPC Brasil 🔍`);
      }
    }

    // ── 11. Wizard de lançamento guiado (multi-turn) ──
    // Primeiro tenta o wizard (checa estado pendente OU inicia novo se houver valor)
    const wizardResult = await whatsappSvc.handleWizardMessage(db, uid, userData, text);
    if (wizardResult.handled) {
      return reply(wizardResult.reply);
    }

    // ── 12. Consultor IA — tudo que não foi reconhecido ──
    const entries = Array.isArray(userData.entries) ? userData.entries : [];
    const mes = new Date().toISOString().slice(0, 7);
    const mesEntries = entries.filter(e => e.date?.startsWith(mes) && !e.isTransfer);
    const rec = mesEntries.filter(e => e.type==="receita").reduce((s,e)=>s+Number(e.value||0),0);
    const desp = mesEntries.filter(e => e.type==="despesa").reduce((s,e)=>s+Number(e.value||0),0);
    const catMap = {};
    mesEntries.filter(e=>e.type==="despesa").forEach(e=>{catMap[e.category]=(catMap[e.category]||0)+Number(e.value);});
    const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c,v])=>`${c}: ${fmtBRL(v)}`).join(", ");
    const contexto = `Nome: ${userData.name||"Usuário"}. Mês atual: receitas ${fmtBRL(rec)}, despesas ${fmtBRL(desp)}, saldo ${fmtBRL(rec-desp)}. Top categorias: ${topCats||"sem dados"}. Metas: ${(userData.goals||[]).length} cadastradas.`;

    const resposta = await whatsappSvc.consultorIA(uid, text, contexto);
    return reply(resposta);

  } catch (e) {
    logError("whatsappWebhook", e);
    try { await reply("Ocorreu um erro. Tente de novo em instantes. 🙏"); } catch (_) {}
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
// =============================================

// Config padrão (sobreposta pela config/filiado do Firestore)
const FILIADO_REWARDS = {
  ativacao:    100,
  openBanking: 200,
  assinou:     500,
};

const FILIADO_MULT = {
  iniciante:  1.0,  // 0-4 ativos
  parceiro:   1.25, // 5-14 ativos
  embaixador: 1.5,  // 15-49 ativos
  elite:      2.0,  // 50+ ativos
};

function getNivelFil(ativos) {
  if (ativos >= 50) return 'elite';
  if (ativos >= 15) return 'embaixador';
  if (ativos >= 5)  return 'parceiro';
  return 'iniciante';
}

async function emitirSibCoin(db, filiadoUid, valor, desc, ref) {
  const filSnap = await db.collection('users').doc(filiadoUid).collection('filiado').doc('dados').get();
  const ativos = filSnap.exists ? (filSnap.data().totalAtivos || 0) : 0;
  const mult = FILIADO_MULT[getNivelFil(ativos)] || 1;
  const valorFinal = Math.round(valor * mult);
  const batch = db.batch();

  // Log da transação
  const txRef = db.collection('users').doc(filiadoUid)
                  .collection('sibcoin').doc();
  batch.set(txRef, {
    tipo:  'emissao',
    valor: valorFinal,
    desc,
    ref:   ref || null,
    ts:    admin.firestore.FieldValue.serverTimestamp(),
  });

  // Atualiza saldo do filiado
  const filRef = db.collection('users').doc(filiadoUid)
                   .collection('filiado').doc('dados');
  batch.set(filRef, {
    totalSibCoins: admin.firestore.FieldValue.increment(valorFinal),
  }, { merge: true });

  await batch.commit();
  return valorFinal;
}

/**
 * Roda diariamente — verifica indicados pendentes e credita SibCoins
 * quando critérios de ativação são atendidos.
 */
exports.processarFiliadosDiario = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();

    // Carregar config customizada (se existir)
    try {
      const cfgSnap = await db.collection('config').doc('filiado').get();
      if (cfgSnap.exists) {
        const cfg = cfgSnap.data();
        if (cfg.recompensas) Object.assign(FILIADO_REWARDS, cfg.recompensas);
      }
    } catch (e) { /* usa padrão */ }

    // Buscar todos os usuários com indicados pendentes
    // Estratégia: query por subcoleção via collectionGroup
    const indicadosSnap = await db.collectionGroup('indicados')
      .where('status', '==', 'pendente')
      .limit(200)
      .get();

    if (indicadosSnap.empty) {
      console.log('Filiado: nenhum indicado pendente.');
      return null;
    }

    const promises = indicadosSnap.docs.map(async (doc) => {
      const indicado = doc.data();
      const filiadoUid = doc.ref.parent.parent.id; // users/{filiadoUid}/indicados/{id}
      const indicadoUid = indicado.uid;
      if (!indicadoUid || !filiadoUid) return;

      try {
        // Buscar dados do indicado
        const indSnap = await db.collection('users').doc(indicadoUid).get();
        if (!indSnap.exists) return;
        const indData = indSnap.data();

        const criadoEm = indicado.criadoEm ? indicado.criadoEm.toDate() : new Date();
        const diasDesde = (Date.now() - criadoEm.getTime()) / (1000 * 60 * 60 * 24);
        const lancamentos = (indData.entries || []).length;
        const eventos = indicado.eventos || {};

        const updates = { eventos: { ...eventos } };
        const atualizacoesFil = {};
        let mudou = false;

        // Critério 1: ativação (30 dias + 5 lançamentos)
        if (!eventos.ativacao && diasDesde >= 30 && lancamentos >= 5) {
          updates.eventos.ativacao = true;
          updates.status = 'ativo';
          const sc = await emitirSibCoin(db, filiadoUid, FILIADO_REWARDS.ativacao,
            `Indicado ${indicado.nome || indicado.email} ativou o app`, doc.id);
          updates.sibCoinsGerados = admin.firestore.FieldValue.increment(sc);
          atualizacoesFil.totalAtivos = admin.firestore.FieldValue.increment(1);
          atualizacoesFil.pendentes   = admin.firestore.FieldValue.increment(-1);
          mudou = true;
          console.log(`Filiado ${filiadoUid}: ativação de ${indicadoUid} — +${sc} SC`);
        }

        // Critério 2: Open Banking conectado
        if (!eventos.openBanking && indData.openBankingAtivo === true) {
          updates.eventos.openBanking = true;
          const sc = await emitirSibCoin(db, filiadoUid, FILIADO_REWARDS.openBanking,
            `Indicado ${indicado.nome || indicado.email} conectou Open Finance`, doc.id);
          updates.sibCoinsGerados = admin.firestore.FieldValue.increment(sc);
          mudou = true;
          console.log(`Filiado ${filiadoUid}: Open Banking de ${indicadoUid} — +${sc} SC`);
        }

        // Critério 3: assinou Pro
        if (!eventos.assinou && (indData.plan === 'pro' || indData.plan === 'familia')) {
          updates.eventos.assinou = true;
          const sc = await emitirSibCoin(db, filiadoUid, FILIADO_REWARDS.assinou,
            `Indicado ${indicado.nome || indicado.email} assinou o plano Pro`, doc.id);
          updates.sibCoinsGerados = admin.firestore.FieldValue.increment(sc);
          mudou = true;
          console.log(`Filiado ${filiadoUid}: Pro de ${indicadoUid} — +${sc} SC`);
        }

        if (mudou) {
          // Atualizar doc do indicado
          await doc.ref.set(updates, { merge: true });

          // Atualizar totais do filiado
          if (Object.keys(atualizacoesFil).length > 0) {
            await db.collection('users').doc(filiadoUid)
              .collection('filiado').doc('dados')
              .set(atualizacoesFil, { merge: true });
          }

          // Atualizar nível do filiado
          const filSnap = await db.collection('users').doc(filiadoUid)
            .collection('filiado').doc('dados').get();
          if (filSnap.exists) {
            const ativos = filSnap.data().totalAtivos || 0;
            const nivel  = getNivelFil(ativos);
            await filSnap.ref.set({ nivel }, { merge: true });
          }
        }
      } catch (err) {
        console.error(`Filiado erro em indicado ${doc.id}:`, err.message);
      }
    });

    await Promise.allSettled(promises);
    console.log(`Filiado: processados ${indicadosSnap.docs.length} indicados pendentes.`);
    return null;
  });

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
// =============================================

/**
 * Taxa de cashback por produto (em % do valor contratado).
 * 1 SibCoin = R$ 0,10 → cashback de 2% em R$5.000 = R$100 = 1.000 SC
 */
const SOL_CASHBACK = {
  emp_pessoal:  0.02,
  emp_fgts:     0.015,
  emp_veiculo:  0.025,
  seg_celular:  0.03,
  seg_vida:     0.03,
  cons_imovel:  0.01,
};

const SOL_NOMES = {
  emp_pessoal:  'Empréstimo Pessoal (Juros Baixos)',
  emp_fgts:     'FGTS Antecipado (Juros Baixos)',
  emp_veiculo:  'Crédito com Garantia de Veículo (Creditas)',
  seg_celular:  'Seguro Celular (Simple2u)',
  seg_vida:     'Seguro de Vida (Simple2u)',
  cons_imovel:  'Consórcio de Imóvel (Embracon)',
};

const AFFILIATE_PRODUCT_MAP = {
  lomadee: parseJsonEnv("LOMADEE_PRODUCT_MAP"),
  monetizze: parseJsonEnv("MONETIZZE_PRODUCT_MAP"),
};

function parseJsonEnv(key) {
  try {
    const raw = process.env[key];
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_e) {
    return {};
  }
}

function toFiniteNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseReference(raw) {
  if (!raw || typeof raw !== "string") return {};
  const out = {};
  const parts = raw.split("|");
  for (const p of parts) {
    const [k, ...rest] = p.split(":");
    if (!k || rest.length === 0) continue;
    out[k.trim().toLowerCase()] = rest.join(":").trim();
  }
  return out;
}

function normalizeAffiliateStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "pending";
  if (["approved", "aprovado", "confirmado", "completed", "paid", "2", "3"].includes(s)) {
    return "approved";
  }
  if (["canceled", "cancelado", "refunded", "reprovado", "chargeback", "0", "4", "5"].includes(s)) {
    return "canceled";
  }
  return "pending";
}

function inferPartnerFromRequest(req, payload) {
  const fromHeader = String(req.headers["x-affiliate-partner"] || "").toLowerCase();
  const fromBody = String(payload?.parceiro || payload?.partner || "").toLowerCase();
  const fromPath = String(req.path || "").toLowerCase();
  if (fromHeader.includes("lomadee") || fromBody.includes("lomadee") || fromPath.includes("lomadee")) return "lomadee";
  if (fromHeader.includes("monetizze") || fromBody.includes("monetizze") || fromPath.includes("monetizze")) return "monetizze";
  return "generic";
}

function resolveProdutoId(partner, payload, refMeta) {
  const direct = payload?.produtoId || payload?.productId || payload?.produto_id;
  if (direct && SOL_CASHBACK[String(direct)]) return String(direct);

  const aliasKey = String(
    payload?.offer_id ||
    payload?.campaign_id ||
    payload?.campaign ||
    payload?.product_code ||
    payload?.prod ||
    refMeta?.produto ||
    ""
  );
  if (!aliasKey) return null;
  const map = AFFILIATE_PRODUCT_MAP[partner] || {};
  const resolved = map[aliasKey] || map[aliasKey.toLowerCase()];
  return resolved && SOL_CASHBACK[resolved] ? resolved : null;
}

function extractWebhookPayload(req) {
  return { ...(req.query || {}), ...(req.body || {}) };
}

function validateAffiliateSecret(partner, req) {
  const genericExpected = process.env.WEBHOOK_PARCEIRO_SECRET || "";
  const partnerExpected = partner === "lomadee" ? LOMADEE_WEBHOOK_SECRET
    : partner === "monetizze" ? MONETIZZE_WEBHOOK_SECRET
    : "";
  const provided = String(
    req.headers["x-sibanki-secret"] ||
    req.headers["x-webhook-secret"] ||
    req.headers["x-affiliate-secret"] ||
    req.query?.secret ||
    req.body?.secret ||
    ""
  );
  const expected = partnerExpected || genericExpected;
  if (!expected) return { ok: true, mode: "disabled" };
  return { ok: provided === expected, mode: partnerExpected ? "partner" : "generic" };
}

function normalizeAffiliateEvent(req) {
  const payload = extractWebhookPayload(req);
  const partner = inferPartnerFromRequest(req, payload);
  const refMeta = parseReference(String(payload?.reference || payload?.ref || payload?.sub_id || ""));
  const uid = String(
    payload?.uid ||
    payload?.userId ||
    payload?.sub_id ||
    payload?.subid ||
    payload?.s1 ||
    refMeta?.uid ||
    ""
  );
  const produtoId = resolveProdutoId(partner, payload, refMeta);
  const valorContratado = toFiniteNumber(
    payload?.valorContratado ??
    payload?.sale_amount ??
    payload?.order_amount ??
    payload?.valor ??
    payload?.amount ??
    payload?.value ??   // Lomadee: {{value}} = valor total da compra
    payload?.preco ??
    0
  );
  // commission = comissão que nos cabe (pode ser menor que o valor total)
  const commissionValue = toFiniteNumber(
    payload?.commission ??  // Lomadee: {{commission}}
    payload?.comissao ??
    null
  );
  const externalId = String(
    payload?.contratoId ||
    payload?.transaction_id ||  // Lomadee: {{transaction_id}}
    payload?.transaction ||
    payload?.order_id ||
    payload?.order ||            // Lomadee: {{order}} = número do pedido
    payload?.click_id ||
    payload?.venda ||
    ""
  );
  // mdasc = identificador de clique Lomadee para atribuição a usuário
  const mdasc = String(payload?.mdasc || "");
  const organizationId = String(payload?.organization_id || ""); // Lomadee: {{organization_id}} = ID da marca
  const status = normalizeAffiliateStatus(
    payload?.status ||
    payload?.sale_status ||
    payload?.transaction_status ||
    payload?.event ||
    payload?.evento
  );
  return {
    partner,
    payload,
    uid,
    produtoId,
    valorContratado,
    commissionValue,
    mdasc,
    organizationId,
    externalId: externalId || `${partner}:${mdasc || uid}:${Date.now()}`,
    status,
    rawStatus: String(payload?.status || payload?.sale_status || payload?.event || payload?.transaction_status || ""),
    refMeta,
  };
}

function calculateSibcoinFromReais(reais) {
  // Ex.: CASHBACK_CONVERSION_RATE=10 => R$1 vira 10 moedas
  return Math.round(Number(reais || 0) * Math.max(0, CASHBACK_CONVERSION_RATE || 10));
}

/**
 * Callable interno: creditar cashback SibCoin após confirmação de contratação.
 * Chamado pela Cloud Function de webhook ou manualmente pelo admin.
 * Parâmetros: { uid, produtoId, valorContratado, contratoId }
 */
exports.creditarCashbackSibCoin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login necessário');
  }

  const claims = (await admin.auth().getUser(context.auth.uid)).customClaims || {};
  if (claims.role !== 'admin' && claims.role !== 'superadmin') {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem creditar cashback.');
  }

  const { produtoId, valorContratado, contratoId } = data;
  const uid = context.auth.uid;
  const db = admin.firestore();

  if (!produtoId || !SOL_CASHBACK[produtoId]) {
    throw new functions.https.HttpsError('invalid-argument', 'Produto inválido');
  }
  if (!valorContratado || isNaN(valorContratado) || valorContratado <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valor inválido');
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

  // 3. Log global de cashbacks (para analytics admin)
  const logRef = db.collection('cashback_log').doc();
  batch.set(logRef, {
    uid, produtoId, valorContratado, sibCoins, cashbackReais,
    contratoId: contratoId || null,
    ts: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  console.log(`Cashback: uid=${uid} produto=${produtoId} valor=R$${valorContratado} → +${sibCoins} SC`);
  return { success: true, sibCoins, cashbackReais };
});

/**
 * Webhook HTTP: parceiros notificam contratações confirmadas.
 * URL: https://REGION-PROJECT.cloudfunctions.net/webhookParceiro
 * Header: X-Sibanki-Secret: <WEBHOOK_SECRET do .env>
 * Body JSON: { uid, produtoId, valorContratado, contratoId, parceiro }
 */
async function handleAffiliateWebhook(req, res, forcedPartner = null) {
  // Lomadee envia GET com query params; outros parceiros enviam POST JSON.
  // Aceitamos ambos — extractWebhookPayload já faz o merge de req.query + req.body.
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const event = normalizeAffiliateEvent(req);
  if (forcedPartner) event.partner = forcedPartner;

  const secretValidation = validateAffiliateSecret(event.partner, req);
  if (!secretValidation.ok) {
    console.warn(`webhookParceiro: secret inválido (${event.partner})`);
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Se não veio uid direto, tenta resolver via mdasc (Lomadee click attribution)
  if (!event.uid && event.mdasc) {
    try {
      const clickSnap = await db.collection("lomadee_clicks")
        .where("mdasc", "==", event.mdasc)
        .orderBy("ts", "desc")
        .limit(1)
        .get();
      if (!clickSnap.empty) {
        event.uid = clickSnap.docs[0].data().uid || "";
      }
    } catch { /* atribuição opcional — não bloqueia o webhook */ }
  }

  // Sem uid e sem valorContratado: rejeitar
  if (!event.valorContratado) {
    return res.status(400).json({
      error: "Parâmetro obrigatório ausente: valorContratado (ou value)",
      required: ["valorContratado"],
    });
  }

  // Se não tem uid: salva a conversão sem atribuição para revisão manual
  if (!event.uid) {
    try {
      await db.collection("lomadee_conversions_unattributed").add({
        partner: event.partner,
        mdasc: event.mdasc || null,
        organizationId: event.organizationId || null,
        externalId: event.externalId,
        valorContratado: event.valorContratado,
        commissionValue: event.commissionValue || null,
        status: event.status,
        rawStatus: event.rawStatus,
        payload: event.payload,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch { /* best effort */ }
    return res.status(200).json({
      success: true,
      status: event.status,
      credited: false,
      note: "Conversão salva sem atribuição de usuário. mdasc não encontrado em lomadee_clicks.",
    });
  }

  try {
    const userSnap = await db.collection("users").doc(event.uid).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const txDocId = `${event.partner}:${String(event.externalId).slice(0, 180)}`;
    const txRef = db.collection("affiliate_transactions").doc(txDocId);
    const txSnap = await txRef.get();
    const previous = txSnap.exists ? (txSnap.data() || {}) : null;

    const produtoId = event.produtoId || previous?.produtoId || null;
    const taxaCashback = produtoId ? (SOL_CASHBACK[produtoId] || 0) : 0;
    const cashbackReais = Number((event.valorContratado * taxaCashback).toFixed(2));
    const sibCoins = calculateSibcoinFromReais(cashbackReais);
    const releaseAt = new Date(Date.now() + (Math.max(0, CASHBACK_RELEASE_DAYS) * 86_400_000)).toISOString();

    await txRef.set({
      uid: event.uid,
      partner: event.partner,
      externalId: event.externalId,
      status: event.status,
      rawStatus: event.rawStatus,
      produtoId,
      valorContratado: event.valorContratado,
      taxaCashback,
      cashbackReais,
      sibCoins,
      releaseDays: CASHBACK_RELEASE_DAYS,
      releaseAt,
      sourceId: event.payload?.sourceId || event.payload?.source_id || LOMADEE_SOURCE_ID || null,
      credited: previous?.credited === true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: previous?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      payload: event.payload,
    }, { merge: true });

    // Aprovação => crédito imediato se ainda não creditado e produto mapeado
    const alreadyCredited = previous?.credited === true;
    if (event.status === "approved" && !alreadyCredited && produtoId && taxaCashback > 0 && sibCoins > 0) {
      const batch = db.batch();
      const sibRef = db.collection("users").doc(event.uid).collection("sibcoin").doc();
      batch.set(sibRef, {
        tipo: "emissao",
        origem: "parceiro",
        parceiro: event.partner,
        produtoId,
        produto: SOL_NOMES[produtoId] || produtoId,
        valor: sibCoins,
        valorReais: event.valorContratado,
        cashbackPct: taxaCashback,
        cashbackReais,
        contratoId: event.externalId,
        desc: `Cashback por contratação via ${event.partner}`,
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });

      const filRef = db.collection("users").doc(event.uid).collection("filiado").doc("dados");
      batch.set(filRef, {
        totalSibCoins: admin.firestore.FieldValue.increment(sibCoins),
        totalCashbackSC: admin.firestore.FieldValue.increment(sibCoins),
      }, { merge: true });

      const logRef = db.collection("cashback_log").doc();
      batch.set(logRef, {
        uid: event.uid,
        produtoId,
        parceiro: event.partner,
        valorContratado: event.valorContratado,
        sibCoins,
        cashbackReais,
        contratoId: event.externalId,
        source: "affiliate_webhook",
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.set(txRef, {
        credited: true,
        creditedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await batch.commit();
      console.log(`webhookParceiro(${event.partner}): uid=${event.uid} contrato=${event.externalId} -> +${sibCoins} SC`);
      return res.status(200).json({ success: true, status: event.status, credited: true, sibCoins, cashbackReais });
    }

    return res.status(200).json({
      success: true,
      status: event.status,
      credited: alreadyCredited,
      sibCoins,
      cashbackReais,
      produtoId,
      note: produtoId ? "stored" : "produtoId não mapeado (aguardando map/env)",
    });
  } catch (err) {
    console.error("webhookParceiro erro:", err.message);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}

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
