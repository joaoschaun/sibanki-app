const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { logEvent, logError } = require("../../logger");
const { runSentinelaGeo } = require("./sentinelaGeoService");
const { runSentinelaWeekly } = require("./sentinelaWeeklyService");

const db = admin.firestore();

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
      const whatsappSvc = require("../whatsapp/whatsappService");
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

exports.sentinelaWeekly = functions.pubsub
  .schedule("every monday 11:00")
  .timeZone("UTC")
  .onRun(async () => {
    const whatsappSvc = require("../whatsapp/whatsappService");
    try {
      const result = await runSentinelaWeekly(db, whatsappSvc.sendWhatsAppText);
      logEvent("sentinelaWeekly_scheduled", result);
    } catch (e) {
      logError("sentinelaWeekly_scheduled", e);
    }
    return null;
  });
