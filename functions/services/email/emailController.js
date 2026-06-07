const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logError, logEvent } = require("../../logger");
const { RESEND_FROM } = require("../../config");
const { getFamilyInviteEmailHtml } = require("../../templates/familyInviteEmail");
const { getVerifyEmailHtml } = require("../../templates/verifyEmail");
const whatsappService = require("../whatsapp/whatsappService");

const APP_URL = process.env.APP_URL || "https://virtus-financeiro-cd7bd.web.app/app";

function genCodigoConvite() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

exports.sendFamilyInviteEmail = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();
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

  const apiKey = process.env.RESEND_API_KEY || "";
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
        await whatsappService.sendWhatsAppInviteFamilia(inviteePhone, nomeConvidador, inviteLink);
        logEvent("sendFamilyInviteWA", { to: inviteePhone });
      }
    } catch (_) {}
    return { ok: true, messageId: sendData?.id };
  } catch (e) {
    logError("sendFamilyInviteEmail", e);
    throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail. Tente novamente.");
  }
});

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
  const apiKey = process.env.RESEND_API_KEY || "";
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

exports.sendConsorcioInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar convites.");
  }
  const { getConsorcioInviteEmailHtml } = require("../../templates/consorcioInviteEmail");
  const { emails, participantes, nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, grupoId } = data || {};
  const listaParticipantes = participantes || (emails ? emails.map(e => ({ email: e, nome: "", whatsapp: "" })) : []);
  if (!listaParticipantes.length || !nomeGrupo) {
    throw new functions.https.HttpsError("invalid-argument", "participantes e nomeGrupo são obrigatórios.");
  }
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };

  const db = admin.firestore();
  const { Resend } = require("resend");
  const resend = new Resend(apiKey);

  const results = [];
  for (const part of listaParticipantes) {
    const email = typeof part === "string" ? part : (part.email || "");
    const nomeConvite = typeof part === "string" ? "" : (part.nome || "");
    if (!email || email.indexOf("@") < 0) continue;
    
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
    const html = getConsorcioInviteEmailHtml(nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, link);
    try {
      const assunto = nomeConvite
        ? `${nomeConvite}, ${nomeAdmin} te convidou para um consórcio no Sibanki 🤝`
        : `${nomeAdmin} te convidou para um consórcio no Sibanki 🤝`;
      const { error } = await resend.emails.send({
        from: RESEND_FROM || "Sibanki <noreply@sibanki.com.br>",
        to: [email],
        subject: assunto,
        html,
      });
      results.push({ email, ok: !error, error: error?.message });
      logEvent("sendConsorcioInvite", { to: email, grupoId });
      
      try {
        const uSnap = await db.collection("users").where("email","==",email).limit(1).get();
        const waPhone = uSnap.empty ? null : uSnap.docs[0].data().whatsappPhone;
        if (waPhone) await whatsappService.sendWhatsAppInviteConsorcio(waPhone, nomeAdmin, nomeGrupo, valorParcela, boloMensal, prazo, link);
      } catch (_) {}
    } catch (e) {
      results.push({ email, ok: false, error: e.message });
      logError("sendConsorcioInvite", e);
    }
  }
  return { ok: true, results };
});

exports.sendCrediAmigoInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar convites.");
  }
  const { getCrediAmigoInviteEmailHtml } = require("../../templates/crediAmigoInviteEmail");
  const { emailAmigo, nomeCredor, nomeDev, valor, parcelas, valorParcela, emprestimoId, tipoCredor } = data || {};
  if (!emailAmigo || emailAmigo.indexOf("@") < 0) {
    throw new functions.https.HttpsError("invalid-argument", "emailAmigo inválido.");
  }
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };

  const db = admin.firestore();

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
      from: RESEND_FROM || "Sibanki <noreply@sibanki.com.br>",
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
