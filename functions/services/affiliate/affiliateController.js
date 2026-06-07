const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logEvent, logError } = require("../../logger");
const { LOMADEE_APP_TOKEN } = require("../../config");
const { handleAffiliateWebhook, SOL_CASHBACK, SOL_NOMES } = require("./affiliateWebhookService");
const lomadeeCatalogService = require("./lomadeeCatalogService");
const { processarFiliadosDiario } = require("../filiado/filiadoService");

const db = admin.firestore();

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

exports.webhookParceiro = functions.https.onRequest(async (req, res) => {
  return handleAffiliateWebhook(req, res);
});

exports.webhookLomadee = functions.https.onRequest(async (req, res) => {
  return handleAffiliateWebhook(req, res, "lomadee");
});

exports.webhookMonetizze = functions.https.onRequest(async (req, res) => {
  return handleAffiliateWebhook(req, res, "monetizze");
});

exports.registrarCliqueSolucao = functions.https.onCall(async (data, context) => {
  if (!context.auth) return { success: false };
  const uid = context.auth.uid;
  const batch = db.batch();

  // Log global de cliques
  const globalRef = db.collection('sol_cliques_global').doc();
  batch.set(globalRef, {
    uid, ...data,
    ts: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Se veio mdasc (deeplink Lomadee), salva o mapeamento mdasc→uid
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

exports.creditarCashbackSibCoin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login necessário');
  }

  const claims = (await admin.auth().getUser(context.auth.uid)).customClaims || {};
  if (claims.role !== 'admin' && claims.role !== 'superadmin') {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem creditar cashback.');
  }

  const { uid: targetUid, produtoId, valorContratado, contratoId } = data || {};

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

exports.processarFiliadosDiario = functions.pubsub
  .schedule("every 24 hours")
  .onRun(() => processarFiliadosDiario());
