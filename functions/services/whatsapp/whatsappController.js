const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { logEvent, logError } = require("../../logger");
const { WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = require("../../config");
const whatsappSvc = require("./whatsappService");
const { routeWhatsAppMessage } = require("./whatsappCommandHandler");

const db = admin.firestore();
const fmtBRL = (v) => "R$ " + Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});

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
    await routeWhatsAppMessage({ db, from, text, whatsappSvc, phoneNumberId });
  } catch (e) {
    logError("whatsappWebhook", e);
    try {
      await whatsappSvc.sendWhatsAppText(phoneNumberId, from, "Ocorreu um erro. Tente de novo em instantes. 🙏");
    } catch (_) {}
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

exports.weeklySummaryWhatsApp = functions.pubsub
  .schedule("every monday 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    const { sendWeeklySummaryWhatsApp } = require("./whatsappNotifications");
    const snap = await admin.firestore()
      .collection("users")
      .where("whatsappPhone", "!=", "")
      .get();
    for (const doc of snap.docs) {
      const userData = doc.data();
      const phone = userData.whatsappPhone;
      const prefs = userData.notifPrefs || {};
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
