/**
 * chatRateLimiter.js
 *
 * SEG-12 (auditoria 26/04/2026, decisão sênior): rate limit + quota diária por
 * uid para os callables de IA (chatApi, chatStreamApi, proactiveInsightApi).
 *
 * Antes não havia rate limit; um usuário autenticado podia drenar Gemini/Groq/Claude
 * em loop. Caps de input (SEG-11) reduzem o blast radius mas não impedem a tatica
 * "1000 requests pequenos".
 *
 * Estratégia:
 *  - Quota diária absoluta por uid, com tier baseado no plano (`users.{uid}.plan`).
 *    - free      : 200 turnos/dia
 *    - pro       : 2000 turnos/dia
 *    - familia   : 2000 turnos/dia (acordo familiar = 1 cota compartilhada por usuário)
 *    - enterprise: 20_000 turnos/dia
 *  - Burst: máx 30 turnos/min por uid (independente do plano), para evitar abuse.
 *  - Armazenamento: Firestore `users/{uid}/quotas/chat-{YYYY-MM-DD}`. Doc por
 *    dia mantém apenas o necessário e tem custo trivial. TTL pode ser configurado
 *    em policy do Firestore (não automático).
 *  - Bypass: `process.env.DISABLE_CHAT_RATE_LIMIT=1` desliga em DEV.
 *
 * Limitação conhecida (não-bloqueante): Firestore query-then-write não é atômico
 * em concorrência alta. Para fairness "perfeita" precisaria de Realtime DB counter
 * ou Memorystore. Para o volume atual (1k-10k usuários), Firestore basta.
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const QUOTA_BY_PLAN = {
  free: 200,
  gratuito: 200,
  pro: 2000,
  familia: 2000,
  enterprise: 20000,
};
const BURST_PER_MINUTE = 30;
const DEFAULT_PLAN = "free";

function getDailyQuotaForPlan(plan) {
  return QUOTA_BY_PLAN[String(plan || "").toLowerCase()] ?? QUOTA_BY_PLAN[DEFAULT_PLAN];
}

function isoDateUtc(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function nowMs() {
  return Date.now();
}

/**
 * Verifica se o uid tem quota disponível e contabiliza o uso.
 *
 * @param {object} args
 * @param {string} args.uid — UID do usuário autenticado
 * @param {string} [args.plan] — plano lido de users/{uid}.plan (opcional)
 * @param {string} [args.kind] — identificador do callable ("chat" | "stream" | "insight")
 * @returns {Promise<{ ok: true } | { ok: false, reason: string, quotaResetAt?: string }>}
 *
 * Levanta erro se Firestore falhar — caller decide se "fail-open" ou "fail-closed".
 */
async function consumeChatQuota({ uid, plan = DEFAULT_PLAN, kind = "chat" } = {}) {
  if (!uid) return { ok: false, reason: "no-uid" };

  // Bypass em DEV (testes locais).
  if (process.env.DISABLE_CHAT_RATE_LIMIT === "1") {
    return { ok: true };
  }

  const db = admin.firestore();
  const today = isoDateUtc();
  const ref = db.doc(`users/${uid}/quotas/chat-${today}`);
  const dailyLimit = getDailyQuotaForPlan(plan);
  const tsNow = nowMs();
  const oneMinuteAgo = tsNow - 60_000;

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? snap.data() || {} : {};
    const usedToday = Number(cur.count) || 0;
    const lastTs = Array.isArray(cur.lastTs) ? cur.lastTs.filter((t) => t > oneMinuteAgo) : [];

    if (usedToday >= dailyLimit) {
      return {
        ok: false,
        reason: "daily-quota-exceeded",
        usedToday,
        dailyLimit,
        plan,
        // Reset em UTC 00:00 do próximo dia
        quotaResetAt: new Date(new Date(`${today}T00:00:00Z`).getTime() + 86_400_000).toISOString(),
      };
    }
    if (lastTs.length >= BURST_PER_MINUTE) {
      return {
        ok: false,
        reason: "burst-limit-exceeded",
        burstLimit: BURST_PER_MINUTE,
        retryAfterSeconds: 60,
      };
    }

    tx.set(ref, {
      count: usedToday + 1,
      plan,
      lastKind: kind,
      lastTs: [...lastTs, tsNow].slice(-BURST_PER_MINUTE),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true, usedToday: usedToday + 1, dailyLimit, plan };
  });
}

/**
 * Helper para callables: lê o plano do user doc e chama consumeChatQuota.
 * Lança HttpsError quando bloqueia.
 */
async function enforceChatQuota({ functions, uid, kind }) {
  if (!uid) return;
  let plan = DEFAULT_PLAN;
  try {
    const db = admin.firestore();
    const userSnap = await db.collection("users").doc(uid).get();
    if (userSnap.exists) {
      plan = String(userSnap.data()?.plan || DEFAULT_PLAN);
    }
  } catch (_) { /* se falhar, seguimos com plano default — fail-closed seria pior UX */ }

  let result;
  try {
    result = await consumeChatQuota({ uid, plan, kind });
  } catch (err) {
    // Firestore down? Não bloqueia o usuário (fail-open intencional aqui).
    console.warn("[chatRateLimiter] erro ao consultar quota — liberando:", err.message);
    return;
  }

  if (result.ok) return;

  if (result.reason === "daily-quota-exceeded") {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Você atingiu a quota diária do plano ${result.plan} (${result.usedToday}/${result.dailyLimit}). ` +
      `Reseta em ${result.quotaResetAt}.`
    );
  }
  if (result.reason === "burst-limit-exceeded") {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Muitas requisições por minuto. Aguarde ${result.retryAfterSeconds || 60}s.`
    );
  }
  throw new functions.https.HttpsError(
    "resource-exhausted",
    "Limite de uso da IA atingido."
  );
}

module.exports = {
  consumeChatQuota,
  enforceChatQuota,
  QUOTA_BY_PLAN,
  BURST_PER_MINUTE,
  getDailyQuotaForPlan,
};
