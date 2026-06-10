/**
 * emailController.js
 * Funções callable de e-mail — única fonte de verdade (index.js importa daqui).
 * Provider: Resend  |  Templates: functions/templates/
 *
 * Funções exportadas:
 *   sendFamilyInviteEmail   — convite modo família/casal
 *   sendVerificationEmail   — reenvio de verificação de conta
 *   sendConsorcioInvite     — convite consórcio amigos
 *   sendCrediAmigoInvite    — convite credi amigo
 *   sendWelcomeEmail        — boas-vindas pós-cadastro (chamada internamente)
 *
 * Rate-limit simples (Firestore):
 *   emailRateLimit(uid, action, max, windowMs) → lança HttpsError se excedido
 */

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const { logError, logEvent } = require("../../logger");
const { RESEND_FROM }        = require("../../config");

const whatsappService = require("../whatsapp/whatsappService");

const { getFamilyInviteEmailHtml }   = require("../../templates/familyInviteEmail");
const { getVerifyEmailHtml }         = require("../../templates/verifyEmail");
const { getConsorcioInviteEmailHtml} = require("../../templates/consorcioInviteEmail");
const { getCrediAmigoInviteEmailHtml}= require("../../templates/crediAmigoInviteEmail");
const { getWelcomeEmailHtml }        = require("../../templates/welcomeEmail");

const APP_URL = "https://virtus-financeiro-cd7bd.web.app";

// ── Resend factory (lazy) ─────────────────────────────────────────────────────
function getResend() {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) return null;
  const { Resend } = require("resend");
  return new Resend(apiKey);
}

function from() {
  return RESEND_FROM || "Sibanki <noreply@sibanki.com.br>";
}

// ── Rate-limit por uid + action ───────────────────────────────────────────────
async function emailRateLimit(uid, action, max = 5, windowMs = 60 * 60 * 1000) {
  const db   = admin.firestore();
  const key  = `emailRateLimit_${action}_${uid}`;
  const ref  = db.collection("_ratelimits").doc(key);
  const now  = Date.now();
  const snap = await ref.get();

  if (snap.exists) {
    const { count, windowStart } = snap.data();
    if (now - windowStart < windowMs) {
      if (count >= max) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          `Limite de ${max} envios por hora atingido. Tente novamente mais tarde.`
        );
      }
      await ref.update({ count: admin.firestore.FieldValue.increment(1) });
      return;
    }
  }
  await ref.set({ count: 1, windowStart: now });
}

// ── Helpers internos ──────────────────────────────────────────────────────────
function genCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── sendWelcomeEmail (não-callable — chamada por onUserCreated) ───────────────
async function sendWelcomeEmail(uid, email, name) {
  const resend = getResend();
  if (!resend) return;
  try {
    const html = getWelcomeEmailHtml(name, APP_URL);
    const { error } = await resend.emails.send({
      from: from(),
      to: [email],
      subject: "Bem-vindo ao Sibanki — seu Financial OS está pronto",
      html,
    });
    if (error) logError("sendWelcomeEmail Resend", { uid, error });
    else logEvent("sendWelcomeEmail_sent", { uid });
  } catch (e) {
    logError("sendWelcomeEmail", { uid, error: e.message });
  }
}

// ── sendFamilyInviteEmail ─────────────────────────────────────────────────────
exports.sendFamilyInviteEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar o convite.");

  const db = admin.firestore();
  const { inviteId, toEmail, fromName, toNome } = data || {};
  if (!inviteId || !toEmail) throw new functions.https.HttpsError("invalid-argument", "inviteId e toEmail são obrigatórios.");

  await emailRateLimit(context.auth.uid, "familyInvite", 10, 60 * 60 * 1000);

  const inviteSnap = await db.collection("invites").doc(inviteId).get();
  if (!inviteSnap.exists) throw new functions.https.HttpsError("not-found", "Convite não encontrado.");
  const invite = inviteSnap.data();
  if (invite.from !== context.auth.uid) throw new functions.https.HttpsError("permission-denied", "Este convite não é seu.");
  if (invite.status !== "pending") return { ok: false, message: "Convite já foi usado ou cancelado." };

  const resend = getResend();
  if (!resend) return { ok: false, error: "EMAIL_NOT_CONFIGURED", message: "Envio por e-mail não configurado." };

  const nomeConvidador = fromName  || invite.fromName || "Seu parceiro(a)";
  const nomeConvidado  = toNome    || invite.toNome   || "";
  const inviteLink     = `${APP_URL}#invite=${inviteId}`;
  const codigoConvite  = invite.codigoConvite || genCodigo();
  if (!invite.codigoConvite) await db.collection("invites").doc(inviteId).update({ codigoConvite });

  const html    = getFamilyInviteEmailHtml(nomeConvidador, inviteLink, codigoConvite, nomeConvidado);
  const subject = `${nomeConvidador}${nomeConvidado ? `, ${nomeConvidado},` : ""} te convidou para gerenciar as finanças juntos no Sibanki`;

  try {
    const { data: sendData, error } = await resend.emails.send({ from: from(), to: [toEmail], subject, html });
    if (error) { logError("sendFamilyInviteEmail Resend", { error }); return { ok: false, message: error.message }; }

    // Disparo WhatsApp em paralelo se o convidado tiver telefone
    try {
      const uSnap = await db.collection("users").where("email", "==", toEmail).limit(1).get();
      const phone = uSnap.empty ? null : uSnap.docs[0].data().whatsappPhone;
      if (phone) {
        await whatsappService.sendWhatsAppInviteFamilia(phone, nomeConvidador, inviteLink);
        logEvent("sendFamilyInviteWA", { to: phone });
      }
    } catch (_) {}

    return { ok: true, messageId: sendData?.id };
  } catch (e) {
    logError("sendFamilyInviteEmail", e);
    throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail. Tente novamente.");
  }
});

// ── sendVerificationEmail ─────────────────────────────────────────────────────
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Faça login.");

  await emailRateLimit(context.auth.uid, "verify", 3, 60 * 60 * 1000);

  let email = context.auth.token.email;
  if (!email) {
    const ur = await admin.auth().getUser(context.auth.uid);
    email = ur.email;
  }
  if (!email) throw new functions.https.HttpsError("invalid-argument", "E-mail não encontrado.");

  const resend = getResend();
  if (!resend) throw new functions.https.HttpsError("failed-precondition", "Envio por e-mail não configurado.");

  try {
    const continueUrl = (data && data.continueUrl) || APP_URL;
    const link = await admin.auth().generateEmailVerificationLink(email, { url: continueUrl });
    const html = getVerifyEmailHtml(link);
    const { error } = await resend.emails.send({ from: from(), to: [email], subject: "Confirme seu e-mail — Sibanki", html });
    if (error) { logError("sendVerificationEmail Resend", { error }); throw new functions.https.HttpsError("internal", error.message); }
    return { ok: true };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("sendVerificationEmail", e);
    throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail.");
  }
});

// ── sendConsorcioInvite ───────────────────────────────────────────────────────
exports.sendConsorcioInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Faça login.");

  await emailRateLimit(context.auth.uid, "consorcioInvite", 20, 60 * 60 * 1000);

  const resend = getResend();
  if (!resend) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };

  const db = admin.firestore();
  const { emails, participantes, nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, grupoId } = data || {};
  const lista = participantes || (emails ? emails.map(e => ({ email: e, nome: "", whatsapp: "" })) : []);
  if (!lista.length || !nomeGrupo) throw new functions.https.HttpsError("invalid-argument", "participantes e nomeGrupo são obrigatórios.");

  const results = [];
  for (const part of lista) {
    const email     = typeof part === "string" ? part : (part.email || "");
    const nomePart  = typeof part === "string" ? "" : (part.nome  || "");
    if (!email || !email.includes("@")) continue;

    const inviteRef = await db.collection("consorcio_invites").add({
      grupoId: grupoId || null, nomeGrupo, nomeAdmin, toEmail: email, toNome: nomePart,
      fromUid: context.auth.uid, status: "pending", ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    const link = `${APP_URL}/#consorcio_invite=${inviteRef.id}`;
    const html = getConsorcioInviteEmailHtml(nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, link);
    const subject = nomePart
      ? `${nomePart}, ${nomeAdmin} te convidou para um consórcio no Sibanki`
      : `${nomeAdmin} te convidou para um consórcio no Sibanki`;

    try {
      const { error } = await resend.emails.send({ from: from(), to: [email], subject, html });
      results.push({ email, ok: !error, error: error?.message });
      logEvent("sendConsorcioInvite", { to: email, grupoId });

      try {
        const uSnap = await db.collection("users").where("email", "==", email).limit(1).get();
        const phone = uSnap.empty ? null : uSnap.docs[0].data().whatsappPhone;
        if (phone) await whatsappService.sendWhatsAppInviteConsorcio(phone, nomeAdmin, nomeGrupo, valorParcela, boloMensal, prazo, link);
      } catch (_) {}
    } catch (e) {
      results.push({ email, ok: false, error: e.message });
      logError("sendConsorcioInvite", e);
    }
  }
  return { ok: true, results };
});

// ── sendCrediAmigoInvite ──────────────────────────────────────────────────────
exports.sendCrediAmigoInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Faça login.");

  await emailRateLimit(context.auth.uid, "crediAmigoInvite", 10, 60 * 60 * 1000);

  const resend = getResend();
  if (!resend) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };

  const db = admin.firestore();
  const { emailAmigo, nomeCredor, nomeDev, valor, parcelas, valorParcela, emprestimoId, tipoCredor } = data || {};
  if (!emailAmigo || !emailAmigo.includes("@")) throw new functions.https.HttpsError("invalid-argument", "emailAmigo inválido.");

  const inviteRef = await db.collection("crediamigo_invites").add({
    emprestimoId: emprestimoId || null, nomeCredor, nomeDev, emailAmigo,
    fromUid: context.auth.uid, valor, status: "pending", ts: admin.firestore.FieldValue.serverTimestamp(),
  });
  const link = `${APP_URL}/#credi_invite=${inviteRef.id}`;
  const html = getCrediAmigoInviteEmailHtml(nomeCredor, nomeDev, valor, parcelas, valorParcela, link, !!tipoCredor);
  const subject = tipoCredor
    ? `${nomeCredor} registrou um empréstimo para você no Sibanki`
    : `${nomeCredor} registrou que você tem R$ ${Number(valor||0).toLocaleString("pt-BR",{minimumFractionDigits:2})} a receber`;

  try {
    const { error } = await resend.emails.send({ from: from(), to: [emailAmigo], subject, html });
    if (error) { logError("sendCrediAmigoInvite Resend", { error }); return { ok: false, error: error.message }; }
    logEvent("sendCrediAmigoInvite", { to: emailAmigo, emprestimoId });
    return { ok: true, inviteId: inviteRef.id };
  } catch (e) {
    logError("sendCrediAmigoInvite", e);
    throw new functions.https.HttpsError("internal", e.message);
  }
});

exports.sendWelcomeEmail = sendWelcomeEmail;
