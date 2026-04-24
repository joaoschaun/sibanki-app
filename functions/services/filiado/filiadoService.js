/**
 * filiadoService.js
 * Motor do programa de afiliados (Filiado):
 *   - Níveis e multiplicadores de SibCoin
 *   - Emissão de SibCoins para filiadoUid
 *   - Cron de ativação diária de indicados
 *
 * Extraído de functions/index.js — lógica de negócio centralizada aqui.
 */
const admin = require("firebase-admin");
const { logEvent, logError } = require("../../logger");

// ── Config de recompensas (sobreposta pela config/filiado no Firestore) ───────
const FILIADO_REWARDS = {
  ativacao:    100,
  openBanking: 200,
  assinou:     500,
};

const FILIADO_MULT = {
  iniciante:   1.0,   // 0–4 ativos
  parceiro:    1.25,  // 5–14 ativos
  embaixador:  1.5,   // 15–49 ativos
  elite:       2.0,   // 50+ ativos
};

function getNivelFil(ativos) {
  if (ativos >= 50) return "elite";
  if (ativos >= 15) return "embaixador";
  if (ativos >= 5)  return "parceiro";
  return "iniciante";
}

/**
 * Emite SibCoins para um filiado, aplicando multiplicador de nível.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} filiadoUid
 * @param {number} valor — valor base antes do multiplicador
 * @param {string} desc  — descrição da transação
 * @param {string} ref   — referência do indicado/evento
 * @returns {Promise<number>} valor final creditado
 */
async function emitirSibCoin(db, filiadoUid, valor, desc, ref) {
  const filSnap = await db.collection("users").doc(filiadoUid)
    .collection("filiado").doc("dados").get();
  const ativos     = filSnap.exists ? (filSnap.data().totalAtivos || 0) : 0;
  const mult       = FILIADO_MULT[getNivelFil(ativos)] || 1;
  const valorFinal = Math.round(valor * mult);

  const batch  = db.batch();
  const txRef  = db.collection("users").doc(filiadoUid).collection("sibcoin").doc();
  batch.set(txRef, {
    tipo: "emissao", valor: valorFinal, desc, ref: ref || null,
    ts: admin.firestore.FieldValue.serverTimestamp(),
  });
  const filRef = db.collection("users").doc(filiadoUid).collection("filiado").doc("dados");
  batch.set(filRef, {
    totalSibCoins: admin.firestore.FieldValue.increment(valorFinal),
  }, { merge: true });
  await batch.commit();
  return valorFinal;
}

/**
 * Cron handler: verifica indicados pendentes e credita SibCoins
 * quando critérios de ativação são atendidos.
 * Deve ser chamado pela Cloud Function pubsub diária.
 */
async function processarFiliadosDiario() {
  const db = admin.firestore();

  // Carregar config customizada (se existir)
  try {
    const cfgSnap = await db.collection("config").doc("filiado").get();
    if (cfgSnap.exists) {
      const cfg = cfgSnap.data();
      if (cfg.recompensas) Object.assign(FILIADO_REWARDS, cfg.recompensas);
    }
  } catch { /* usa padrão */ }

  const indicadosSnap = await db.collectionGroup("indicados")
    .where("status", "==", "pendente")
    .limit(200)
    .get();

  if (indicadosSnap.empty) {
    console.log("Filiado: nenhum indicado pendente.");
    return null;
  }

  const promises = indicadosSnap.docs.map(async (doc) => {
    const indicado    = doc.data();
    const filiadoUid  = doc.ref.parent.parent.id;
    const indicadoUid = indicado.uid;
    if (!indicadoUid || !filiadoUid) return;

    try {
      const indSnap = await db.collection("users").doc(indicadoUid).get();
      if (!indSnap.exists) return;
      const indData = indSnap.data();

      const criadoEm  = indicado.criadoEm ? indicado.criadoEm.toDate() : new Date();
      const diasDesde = (Date.now() - criadoEm.getTime()) / (1000 * 60 * 60 * 24);
      const lancamentos = (indData.entries || []).length;
      const eventos   = indicado.eventos || {};

      const updates          = { eventos: { ...eventos } };
      const atualizacoesFil  = {};
      let mudou = false;

      // Critério 1: ativação (30 dias + 5 lançamentos)
      if (!eventos.ativacao && diasDesde >= 30 && lancamentos >= 5) {
        updates.eventos.ativacao = true;
        updates.status = "ativo";
        const sc = await emitirSibCoin(db, filiadoUid, FILIADO_REWARDS.ativacao,
          `Indicado ${indicado.nome || indicado.email} ativou o app`, doc.id);
        updates.sibCoinsGerados = admin.firestore.FieldValue.increment(sc);
        atualizacoesFil.totalAtivos = admin.firestore.FieldValue.increment(1);
        atualizacoesFil.pendentes   = admin.firestore.FieldValue.increment(-1);
        mudou = true;
        logEvent("filiado_ativacao", { filiadoUid, indicadoUid, sc });
      }

      // Critério 2: Open Banking conectado
      if (!eventos.openBanking && indData.openBankingAtivo === true) {
        updates.eventos.openBanking = true;
        const sc = await emitirSibCoin(db, filiadoUid, FILIADO_REWARDS.openBanking,
          `Indicado ${indicado.nome || indicado.email} conectou Open Finance`, doc.id);
        updates.sibCoinsGerados = admin.firestore.FieldValue.increment(sc);
        mudou = true;
        logEvent("filiado_openBanking", { filiadoUid, indicadoUid, sc });
      }

      // Critério 3: assinou Pro
      if (!eventos.assinou && (indData.plan === "pro" || indData.plan === "familia")) {
        updates.eventos.assinou = true;
        const sc = await emitirSibCoin(db, filiadoUid, FILIADO_REWARDS.assinou,
          `Indicado ${indicado.nome || indicado.email} assinou o plano Pro`, doc.id);
        updates.sibCoinsGerados = admin.firestore.FieldValue.increment(sc);
        mudou = true;
        logEvent("filiado_assinou", { filiadoUid, indicadoUid, sc });
      }

      if (mudou) {
        await doc.ref.set(updates, { merge: true });
        if (Object.keys(atualizacoesFil).length > 0) {
          await db.collection("users").doc(filiadoUid)
            .collection("filiado").doc("dados")
            .set(atualizacoesFil, { merge: true });
        }
        // Atualiza nível do filiado
        const filSnap = await db.collection("users").doc(filiadoUid)
          .collection("filiado").doc("dados").get();
        if (filSnap.exists) {
          const nivel = getNivelFil(filSnap.data().totalAtivos || 0);
          await filSnap.ref.set({ nivel }, { merge: true });
        }
      }
    } catch (err) {
      logError("filiadoService indicado", { id: doc.id, error: err.message });
    }
  });

  await Promise.allSettled(promises);
  console.log(`Filiado: processados ${indicadosSnap.docs.length} indicados pendentes.`);
  return null;
}

module.exports = {
  emitirSibCoin,
  processarFiliadosDiario,
  getNivelFil,
  FILIADO_REWARDS,
  FILIADO_MULT,
};
