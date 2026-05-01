/**
 * affiliateWebhookService.js
 * Processamento de webhooks de afiliados (Lomadee, Monetizze, genérico).
 *
 * Normaliza payloads de diferentes parceiros para um formato único,
 * valida autenticação por secret e credita SibCoins ao usuário correto.
 *
 * Extraído de functions/index.js — lógica de negócio centralizada aqui.
 */
const admin = require("firebase-admin");

const {
  LOMADEE_SOURCE_ID,
  LOMADEE_WEBHOOK_SECRET,
  MONETIZZE_WEBHOOK_SECRET,
  CASHBACK_CONVERSION_RATE,
  CASHBACK_RELEASE_DAYS,
} = require("../../config");

// ── Mapa de cashback por produto ──────────────────────────────────────────────
const SOL_CASHBACK = {
  emp_pessoal: 0.02,
  emp_fgts:    0.015,
  emp_veiculo: 0.025,
  seg_celular: 0.03,
  seg_vida:    0.03,
  cons_imovel: 0.01,
};

const SOL_NOMES = {
  emp_pessoal: "Empréstimo Pessoal (Juros Baixos)",
  emp_fgts:    "FGTS Antecipado (Juros Baixos)",
  emp_veiculo: "Crédito com Garantia de Veículo (Creditas)",
  seg_celular: "Seguro Celular (Simple2u)",
  seg_vida:    "Seguro de Vida (Simple2u)",
  cons_imovel: "Consórcio de Imóvel (Embracon)",
};

// ── Helpers internos ──────────────────────────────────────────────────────────

function parseJsonEnv(key) {
  try {
    const raw = process.env[key];
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const AFFILIATE_PRODUCT_MAP = {
  lomadee:   parseJsonEnv("LOMADEE_PRODUCT_MAP"),
  monetizze: parseJsonEnv("MONETIZZE_PRODUCT_MAP"),
};

function toFiniteNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseReference(raw) {
  if (!raw || typeof raw !== "string") return {};
  const out = {};
  for (const p of raw.split("|")) {
    const [k, ...rest] = p.split(":");
    if (!k || rest.length === 0) continue;
    out[k.trim().toLowerCase()] = rest.join(":").trim();
  }
  return out;
}

function normalizeAffiliateStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "pending";
  if (["approved","aprovado","confirmado","completed","paid","2","3"].includes(s)) return "approved";
  if (["canceled","cancelado","refunded","reprovado","chargeback","0","4","5"].includes(s)) return "canceled";
  return "pending";
}

function inferPartnerFromRequest(req, payload) {
  const h = String(req.headers["x-affiliate-partner"] || "").toLowerCase();
  const b = String(payload?.parceiro || payload?.partner || "").toLowerCase();
  const p = String(req.path || "").toLowerCase();
  if (h.includes("lomadee") || b.includes("lomadee") || p.includes("lomadee")) return "lomadee";
  if (h.includes("monetizze") || b.includes("monetizze") || p.includes("monetizze")) return "monetizze";
  return "generic";
}

function resolveProdutoId(partner, payload, refMeta) {
  const direct = payload?.produtoId || payload?.productId || payload?.produto_id;
  if (direct && SOL_CASHBACK[String(direct)]) return String(direct);
  const aliasKey = String(
    payload?.offer_id || payload?.campaign_id || payload?.campaign ||
    payload?.product_code || payload?.prod || refMeta?.produto || ""
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
  const partnerExpected =
    partner === "lomadee" ? LOMADEE_WEBHOOK_SECRET
    : partner === "monetizze" ? MONETIZZE_WEBHOOK_SECRET
    : "";
  const provided = String(
    req.headers["x-sibanki-secret"] || req.headers["x-webhook-secret"] ||
    req.headers["x-affiliate-secret"] || req.query?.secret || req.body?.secret || ""
  );
  const expected = partnerExpected || genericExpected;

  // SEG-02 (auditoria 26/04/2026): fail-CLOSED.
  // Antes era `if (!expected) return { ok: true, mode: "disabled" }` — fail-OPEN.
  // Webhook que credita SibCoin (= dinheiro) NÃO pode aceitar requests sem secret
  // configurado: qualquer atacante que conhecesse a URL forjava conversões.
  // Em DEV (NODE_ENV=development OU SIBANKI_ALLOW_UNSAFE_WEBHOOK=1), mantemos o
  // comportamento aberto para facilitar testes locais.
  if (!expected) {
    const devMode = process.env.NODE_ENV === "development" ||
                    process.env.SIBANKI_ALLOW_UNSAFE_WEBHOOK === "1";
    if (devMode) return { ok: true, mode: "dev-no-secret" };
    return { ok: false, mode: "missing-secret" };
  }

  return { ok: provided === expected, mode: partnerExpected ? "partner" : "generic" };
}

/**
 * Normaliza um request de webhook de afiliado para o formato interno.
 */
function normalizeAffiliateEvent(req, forcedPartner) {
  const payload   = extractWebhookPayload(req);
  const partner   = forcedPartner || inferPartnerFromRequest(req, payload);
  const refMeta   = parseReference(String(payload?.reference || payload?.ref || payload?.sub_id || ""));
  const uid       = String(payload?.uid || payload?.userId || payload?.sub_id ||
                           payload?.subid || payload?.s1 || refMeta?.uid || "");
  const produtoId = resolveProdutoId(partner, payload, refMeta);
  const valorContratado = toFiniteNumber(
    payload?.valorContratado ?? payload?.sale_amount ?? payload?.order_amount ??
    payload?.valor ?? payload?.amount ?? payload?.value ?? payload?.preco ?? 0
  );
  const commissionValue = toFiniteNumber(payload?.commission ?? payload?.comissao ?? null);
  const externalId = String(
    payload?.contratoId || payload?.transaction_id || payload?.transaction ||
    payload?.order_id  || payload?.order || payload?.click_id || payload?.venda || ""
  );
  const mdasc          = String(payload?.mdasc || "");
  const organizationId = String(payload?.organization_id || "");
  const status         = normalizeAffiliateStatus(
    payload?.status || payload?.sale_status || payload?.transaction_status ||
    payload?.event  || payload?.evento
  );
  return {
    partner, payload, uid, produtoId,
    valorContratado, commissionValue, mdasc, organizationId,
    externalId: externalId || `${partner}:${mdasc || uid}:${Date.now()}`,
    status,
    rawStatus: String(payload?.status || payload?.sale_status || payload?.event ||
                      payload?.transaction_status || ""),
    refMeta,
  };
}

function calculateSibcoinFromReais(reais) {
  return Math.round(Number(reais || 0) * Math.max(0, CASHBACK_CONVERSION_RATE || 10));
}

// ── Handler principal ─────────────────────────────────────────────────────────

/**
 * Processa webhook de afiliado (Lomadee, Monetizze, genérico).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string|undefined} forcedPartner — sobrescreve a inferência automática
 */
async function handleAffiliateWebhook(req, res, forcedPartner) {
  if (req.method === "GET") return res.status(200).send("OK");
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const db    = admin.firestore();
  const event = normalizeAffiliateEvent(req, forcedPartner);

  // Validação de secret (SEG-02 — fail-closed em prod)
  const secretCheck = validateAffiliateSecret(event.partner, req);
  if (!secretCheck.ok) {
    if (secretCheck.mode === "missing-secret") {
      console.error(
        `[SEG-02] webhookParceiro REJEITADO: env secret não configurado para "${event.partner}". ` +
        "Configure LOMADEE_WEBHOOK_SECRET / MONETIZZE_WEBHOOK_SECRET / WEBHOOK_PARCEIRO_SECRET via " +
        "`firebase functions:secrets:set NOME` antes de aceitar webhooks em produção."
      );
      return res.status(503).json({ error: "Webhook secret not configured" });
    }
    console.warn(`webhookParceiro: secret inválido (${event.partner})`);
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Tentar resolver uid via mdasc (atribuição Lomadee)
  if (!event.uid && event.mdasc) {
    try {
      const clickSnap = await db.collection("lomadee_clicks")
        .where("mdasc", "==", event.mdasc)
        .orderBy("ts", "desc")
        .limit(1)
        .get();
      if (!clickSnap.empty) event.uid = clickSnap.docs[0].data().uid || "";
    } catch { /* atribuição opcional */ }
  }

  // valorContratado é obrigatório
  if (!event.valorContratado) {
    return res.status(400).json({
      error: "Parâmetro obrigatório ausente: valorContratado (ou value)",
      required: ["valorContratado"],
    });
  }

  // Sem uid: salva sem atribuição para revisão manual
  if (!event.uid) {
    try {
      await db.collection("lomadee_conversions_unattributed").add({
        partner:          event.partner,
        mdasc:            event.mdasc || null,
        organizationId:   event.organizationId || null,
        externalId:       event.externalId,
        valorContratado:  event.valorContratado,
        commissionValue:  event.commissionValue || null,
        status:           event.status,
        rawStatus:        event.rawStatus,
        payload:          event.payload,
        receivedAt:       admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch { /* best effort */ }
    return res.status(200).json({
      success: true, status: event.status, credited: false,
      note: "Conversão salva sem atribuição de usuário. mdasc não encontrado em lomadee_clicks.",
    });
  }

  try {
    const userSnap = await db.collection("users").doc(event.uid).get();
    if (!userSnap.exists) return res.status(404).json({ error: "Usuário não encontrado" });

    const txDocId = `${event.partner}:${String(event.externalId).slice(0, 180)}`;
    const txRef   = db.collection("affiliate_transactions").doc(txDocId);
    const txSnap  = await txRef.get();
    const previous = txSnap.exists ? (txSnap.data() || {}) : null;

    const produtoId       = event.produtoId || previous?.produtoId || null;
    const taxaCashback    = produtoId ? (SOL_CASHBACK[produtoId] || 0) : 0;
    const cashbackReais   = Number((event.valorContratado * taxaCashback).toFixed(2));
    const sibCoins        = calculateSibcoinFromReais(cashbackReais);
    const releaseAt       = new Date(
      Date.now() + Math.max(0, CASHBACK_RELEASE_DAYS) * 86_400_000
    ).toISOString();

    await txRef.set({
      uid: event.uid, partner: event.partner, externalId: event.externalId,
      status: event.status, rawStatus: event.rawStatus, produtoId,
      valorContratado: event.valorContratado, taxaCashback, cashbackReais,
      sibCoins, releaseDays: CASHBACK_RELEASE_DAYS, releaseAt,
      sourceId: event.payload?.sourceId || event.payload?.source_id || LOMADEE_SOURCE_ID || null,
      credited: previous?.credited === true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: previous?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      payload: event.payload,
    }, { merge: true });

    const alreadyCredited = previous?.credited === true;
    if (event.status === "approved" && !alreadyCredited && produtoId && taxaCashback > 0 && sibCoins > 0) {
      const batch  = db.batch();
      const sibRef = db.collection("users").doc(event.uid).collection("sibcoin").doc();
      batch.set(sibRef, {
        tipo: "emissao", origem: "parceiro", parceiro: event.partner, produtoId,
        produto: SOL_NOMES[produtoId] || produtoId, valor: sibCoins,
        valorReais: event.valorContratado, cashbackPct: taxaCashback, cashbackReais,
        contratoId: event.externalId, desc: `Cashback por contratação via ${event.partner}`,
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });
      const filRef = db.collection("users").doc(event.uid).collection("filiado").doc("dados");
      batch.set(filRef, {
        totalSibCoins: admin.firestore.FieldValue.increment(sibCoins),
        totalCashbackSC: admin.firestore.FieldValue.increment(sibCoins),
      }, { merge: true });
      const logRef = db.collection("cashback_log").doc();
      batch.set(logRef, {
        uid: event.uid, produtoId, parceiro: event.partner,
        valorContratado: event.valorContratado, sibCoins, cashbackReais,
        contratoId: event.externalId, source: "affiliate_webhook",
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(txRef, {
        credited: true, creditedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      await batch.commit();
      console.log(`webhookParceiro(${event.partner}): uid=${event.uid} -> +${sibCoins} SC`);
      return res.status(200).json({ success: true, status: event.status, credited: true, sibCoins, cashbackReais });
    }

    return res.status(200).json({
      success: true, status: event.status, credited: alreadyCredited,
      sibCoins, cashbackReais, produtoId,
      note: produtoId ? "stored" : "produtoId não mapeado (aguardando map/env)",
    });
  } catch (err) {
    console.error("webhookParceiro erro:", err.message);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}

module.exports = {
  handleAffiliateWebhook,
  normalizeAffiliateEvent,
  SOL_CASHBACK,
  SOL_NOMES,
  calculateSibcoinFromReais,
};
