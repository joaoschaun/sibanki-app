const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { logEvent, logError } = require("../../logger");
const recorrentesService = require("./recorrentesService");

exports.aplicarRecorrentesDoMes = functions.pubsub
  .schedule("0 6 1 * *")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    const db = admin.firestore();
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
    const db = admin.firestore();
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
