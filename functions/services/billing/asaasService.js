/**
 * asaasService — billing por assinatura via Asaas (substituto do Stripe no BR).
 *
 * Contexto (10/06/2026): a ativação da conta Stripe travou no representante
 * legal BR. O Asaas aceita conta PF/MEI, cobre Pix + cartão + boleto
 * recorrente e mantém o MESMO contrato do Stripe no nosso sistema:
 * o webhook é o ÚNICO escritor de `users/{uid}.plan`.
 *
 * Segurança (espelha as lições SEG-Stripe-1):
 *  - Catálogo de planos/valores é SERVER-SIDE — o cliente manda só
 *    { plan, billing }, nunca valor.
 *  - Webhook valida `asaas-access-token` na primeira linha (fail-CLOSED).
 *  - Idempotência por evento em `asaas_webhook_events/{eventId}`.
 *
 * ENV:
 *  - ASAAS_API_KEY        (obrigatória; sandbox ou produção)
 *  - ASAAS_ENV            'sandbox' (default) | 'production'
 *  - ASAAS_BASE_URL       override opcional da base da API
 *  - ASAAS_WEBHOOK_TOKEN  token combinado no painel Asaas (obrigatório em prod)
 */

const admin = require("firebase-admin");
const functions = require("firebase-functions");
const { logEvent, logError, logWarn } = require("../../logger");

const db = admin.firestore();

// ── Catálogo canônico (valores em BRL) ──────────────────────────────────────
const PLAN_CATALOG = {
  "pro:monthly":     { value: 19.90,  cycle: "MONTHLY", plan: "pro",     label: "Sibanki Pro — mensal" },
  "pro:yearly":      { value: 178.80, cycle: "YEARLY",  plan: "pro",     label: "Sibanki Pro — anual" },
  "familia:monthly": { value: 29.90,  cycle: "MONTHLY", plan: "familia", label: "Sibanki Família — mensal" },
  "familia:yearly":  { value: 274.80, cycle: "YEARLY",  plan: "familia", label: "Sibanki Família — anual" },
};

function baseUrl() {
  if (process.env.ASAAS_BASE_URL) return process.env.ASAAS_BASE_URL.replace(/\/$/, "");
  return process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

async function asaasFetch(path, options = {}) {
  const key = process.env.ASAAS_API_KEY;
  if (!key) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Pagamentos ainda não configurados (ASAAS_API_KEY ausente).",
    );
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: key,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body && body.errors && body.errors[0] && body.errors[0].description
      ? body.errors[0].description
      : `Asaas HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body;
}

function isoDatePlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Garante um customer Asaas para o uid (cacheado em users/{uid}.asaasCustomerId). */
async function ensureCustomer(uid, email) {
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  const data = snap.exists ? snap.data() : {};

  if (data.asaasCustomerId) return data.asaasCustomerId;

  const cpfRaw = data.cadastroCompleto && data.cadastroCompleto.cpf
    ? String(data.cadastroCompleto.cpf).replace(/\D/g, "")
    : "";
  if (cpfRaw.length !== 11) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Complete seu cadastro (CPF) em Perfil antes de assinar.",
    );
  }

  const name = (data.cadastroCompleto && data.cadastroCompleto.nome) || data.name || email || "Cliente Sibanki";

  const customer = await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name,
      email: email || undefined,
      cpfCnpj: cpfRaw,
      externalReference: uid,
      notificationDisabled: false,
    }),
  });

  await userRef.set({ asaasCustomerId: customer.id }, { merge: true });
  return customer.id;
}

/**
 * Callable: cria assinatura Asaas e devolve a URL da primeira fatura
 * (invoiceUrl — página hospedada do Asaas com Pix copia-e-cola, cartão e boleto).
 * Input: { plan: 'pro'|'familia', billing: 'monthly'|'yearly' }
 */
async function createAsaasCheckout(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
  }
  const uid = context.auth.uid;
  const key = `${data && data.plan}:${data && data.billing}`;
  const item = PLAN_CATALOG[key];
  if (!item) {
    throw new functions.https.HttpsError("invalid-argument", "Plano inválido.");
  }

  try {
    const customerId = await ensureCustomer(uid, context.auth.token.email || "");

    // Reaproveita assinatura ativa se já existir (evita duplicar cobrança)
    const userSnap = await db.doc(`users/${uid}`).get();
    const existing = userSnap.exists ? userSnap.data().asaasSubscriptionId : null;
    if (existing) {
      try {
        const sub = await asaasFetch(`/subscriptions/${existing}`);
        if (sub && sub.status === "ACTIVE") {
          throw new functions.https.HttpsError(
            "already-exists",
            "Você já tem uma assinatura ativa. Cancele-a antes de trocar de plano.",
          );
        }
      } catch (e) {
        if (e instanceof functions.https.HttpsError) throw e;
        // 404/erro de consulta → segue e cria nova
      }
    }

    const subscription = await asaasFetch("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED", // cliente escolhe Pix / cartão / boleto na fatura
        value: item.value,
        nextDueDate: isoDatePlusDays(2),
        cycle: item.cycle,
        description: item.label,
        externalReference: JSON.stringify({ uid, plan: item.plan }),
      }),
    });

    // Primeira cobrança da assinatura → invoiceUrl para redirecionar o usuário
    const payments = await asaasFetch(`/subscriptions/${subscription.id}/payments?limit=1`);
    const first = payments && payments.data && payments.data[0];

    await db.doc(`users/${uid}`).set({
      asaasSubscriptionId: subscription.id,
      asaasPendingPlan: item.plan,
    }, { merge: true });

    logEvent("billing", "asaas_subscription_created", {
      uid, subscriptionId: subscription.id, plan: item.plan, cycle: item.cycle,
    });

    return {
      subscriptionId: subscription.id,
      url: (first && (first.invoiceUrl || first.bankSlipUrl)) || null,
    };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("billing", "asaas_checkout_error", e, { uid });
    throw new functions.https.HttpsError("internal", e.message || "Erro ao criar assinatura.");
  }
}

/** Callable: cancela a assinatura ativa do usuário (downgrade imediato). */
async function cancelAsaasSubscription(_data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
  }
  const uid = context.auth.uid;
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  const subId = snap.exists ? snap.data().asaasSubscriptionId : null;
  if (!subId) {
    throw new functions.https.HttpsError("not-found", "Nenhuma assinatura ativa encontrada.");
  }
  try {
    await asaasFetch(`/subscriptions/${subId}`, { method: "DELETE" });
    await userRef.set({
      plan: "gratuito",
      asaasSubscriptionId: admin.firestore.FieldValue.delete(),
      asaasPendingPlan: admin.firestore.FieldValue.delete(),
      planUpdatedAt: new Date().toISOString(),
    }, { merge: true });
    logEvent("billing", "asaas_subscription_cancelled", { uid, subscriptionId: subId });
    return { ok: true };
  } catch (e) {
    logError("billing", "asaas_cancel_error", e, { uid, subscriptionId: subId });
    throw new functions.https.HttpsError("internal", e.message || "Erro ao cancelar assinatura.");
  }
}

/** Resolve o uid dono de um payment do webhook. */
function uidFromPayment(payment) {
  // externalReference da assinatura é propagado para os payments
  const ref = payment.externalReference || "";
  try {
    const parsed = JSON.parse(ref);
    if (parsed && parsed.uid) return { uid: parsed.uid, plan: parsed.plan || null };
  } catch { /* não é JSON */ }
  return { uid: null, plan: null };
}

/**
 * Webhook Asaas (onRequest). Eventos de COBRANÇA (o Asaas não emite webhook de
 * assinatura — o ciclo é gerido pelos payments):
 *  - PAYMENT_CONFIRMED / PAYMENT_RECEIVED → ativa o plano
 *  - PAYMENT_REFUNDED / PAYMENT_CHARGEBACK_REQUESTED → volta para gratuito
 *  - PAYMENT_OVERDUE → registra (downgrade fica para rotina futura com carência)
 */
async function handleAsaasWebhook(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // Fail-CLOSED: sem token configurado, rejeita tudo (AGENTS.md §3.3)
  const expected = process.env.ASAAS_WEBHOOK_TOKEN || "";
  const got = req.headers["asaas-access-token"] || "";
  if (!expected || got !== expected) {
    logWarn("billing", "asaas_webhook_unauthorized", { hasToken: Boolean(expected) });
    return res.status(401).json({ error: "unauthorized" });
  }

  const event = req.body || {};
  const eventId = event.id || `${event.event}_${event.payment && event.payment.id}`;
  const payment = event.payment;
  if (!event.event || !payment) return res.status(400).json({ error: "payload inválido" });

  // Idempotência
  const evRef = db.doc(`asaas_webhook_events/${String(eventId).replace(/[^\w-]/g, "_")}`);
  try {
    await evRef.create({
      event: event.event,
      paymentId: payment.id || null,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    return res.status(200).json({ ok: true, duplicate: true }); // já processado
  }

  const { uid, plan } = uidFromPayment(payment);
  if (!uid) {
    logWarn("billing", "asaas_webhook_no_uid", { event: event.event, paymentId: payment.id });
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    const userRef = db.doc(`users/${uid}`);
    if (event.event === "PAYMENT_CONFIRMED" || event.event === "PAYMENT_RECEIVED") {
      const snap = await userRef.get();
      const pending = snap.exists ? snap.data().asaasPendingPlan : null;
      const effective = plan || pending || "pro";
      await userRef.set({
        plan: effective,
        planProvider: "asaas",
        planUpdatedAt: new Date().toISOString(),
      }, { merge: true });
      logEvent("billing", "asaas_plan_activated", { uid, plan: effective, event: event.event });
    } else if (event.event === "PAYMENT_REFUNDED" || event.event === "PAYMENT_CHARGEBACK_REQUESTED") {
      await userRef.set({
        plan: "gratuito",
        planUpdatedAt: new Date().toISOString(),
      }, { merge: true });
      logEvent("billing", "asaas_plan_revoked", { uid, event: event.event });
    } else if (event.event === "PAYMENT_OVERDUE") {
      logWarn("billing", "asaas_payment_overdue", { uid, paymentId: payment.id });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    logError("billing", "asaas_webhook_error", e, { uid, event: event.event });
    // 500 → Asaas reenvia (a idempotência segura o replay)
    await evRef.delete().catch(() => {});
    return res.status(500).json({ error: "internal" });
  }
}

module.exports = {
  createAsaasCheckout,
  cancelAsaasSubscription,
  handleAsaasWebhook,
  PLAN_CATALOG,
};
