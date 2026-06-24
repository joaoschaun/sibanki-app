const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { logEvent, logError } = require("../../logger");
const { runDailyPushAlerts, sendPush } = require("./pushService");

exports.dailyPushAlerts = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    try {
      await runDailyPushAlerts();
    } catch (e) {
      logError("dailyPushAlerts", e);
    }
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
  try {
    const result = await sendPush(uid, { title, body }, { click_action: clickAction || "/" });
    logEvent("sendPushNotification", { uid, sent: result.sent });
    return result;
  } catch (e) {
    logError("sendPushNotification", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao enviar notificação push.");
  }
});
