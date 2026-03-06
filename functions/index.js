const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const fetch = require("node-fetch");
const { fetchJson, fetchText } = require("./httpClient");
const { logEvent, logError } = require("./logger");
const {
  BRAPI_TOKEN,
  BRAPI_BASE,
  GNEWS_KEY,
  NEWSDATA_KEY,
  STRIPE_WEBHOOK_SECRET,
  getStripe,
  RESEND_API_KEY,
  RESEND_FROM
} = require("./config");
const brapiService = require("./services/market/brapiService");
const newsService = require("./services/news/newsService");
const stripeService = require("./services/billing/stripeService");

// Load .env for local development (mantido por compatibilidade)
try { require("dotenv").config(); } catch(e) {}

// Initialize admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

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
// BRAPI: delega para serviço de mercado
// =============================================
exports.brapiQuote = functions.https.onCall(async (data, context) => {
  return brapiService.quote(data, context);
});

exports.brapiMulti = functions.https.onCall(async (data, context) => {
  return brapiService.multi(data, context);
});

exports.brapiSearch = functions.https.onCall(async (data, context) => {
  return brapiService.search(data, context);
});

exports.brapiCrypto = functions.https.onCall(async (data, context) => {
  return brapiService.crypto(data, context);
});

exports.brapiInflation = functions.https.onCall(async (data, context) => {
  return brapiService.inflation(data, context);
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

function getResendApiKey() {
  return process.env.RESEND_API_KEY ||
    (functions.config().resend && functions.config().resend.api_key) ||
    "";
}

function genCodigoConvite() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

exports.sendFamilyInviteEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar o convite.");
  }
  const { inviteId, toEmail, fromName } = data || {};
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
  const inviteLink = APP_URL + "#invite=" + inviteId;
  const codigoConvite = invite.codigoConvite || genCodigoConvite();

  if (!invite.codigoConvite) {
    await db.collection("invites").doc(inviteId).update({ codigoConvite });
  }

  const html = getFamilyInviteEmailHtml(nomeConvidador, inviteLink, codigoConvite);
  const subject = nomeConvidador + " te convidou para gerenciar as finanças juntos no Sibanki 💑";

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
    return { ok: true, messageId: sendData?.id };
  } catch (e) {
    logError("sendFamilyInviteEmail", e);
    throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail. Tente novamente.");
  }
});

// =============================================
// TELEGRAM BOT
// =============================================
const telegramBot = require("./telegramBot");
exports.telegramWebhook = telegramBot.telegramWebhook;
exports.checkPriceAlerts = telegramBot.checkPriceAlerts;
exports.dailyNews = telegramBot.dailyNews;
exports.weeklyReport = telegramBot.weeklyReport;
