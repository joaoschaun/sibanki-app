/**
 * brapiRateLimiter.js
 * Rate limiting distribuído para chamadas BRAPI — Firestore sliding window.
 *
 * Estratégia: documento rate_limits/{uid} com campo `windowStart` (timestamp)
 * e `count` (incremento atômico). Funciona com múltiplas instâncias e
 * sobrevive a cold starts. Custo: 1-2 leituras + 1 escrita por requisição BRAPI.
 *
 * Fallback: se Firestore falhar, cai no limitador em memória (graceful degradation).
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const BRAPI_RATE_LIMIT  = 30;
const BRAPI_RATE_WINDOW = 60_000; // 1 minuto em ms

// ── Fallback em memória (usado se Firestore estiver indisponível) ─────────────
const _fallbackMap = new Map();

function _memoryCheck(uid) {
  const now = Date.now();
  const entry = _fallbackMap.get(uid);
  if (entry && now - entry.start < BRAPI_RATE_WINDOW) {
    entry.count++;
    return entry.count > BRAPI_RATE_LIMIT;
  }
  if (entry?.cleanupTimer) clearTimeout(entry.cleanupTimer);
  const cleanupTimer = setTimeout(() => _fallbackMap.delete(uid), BRAPI_RATE_WINDOW + 1000);
  _fallbackMap.set(uid, { start: now, count: 1, cleanupTimer });
  return false;
}

// ── Rate check distribuído (Firestore) ────────────────────────────────────────

/**
 * Verifica rate limit usando Firestore como backend distribuído.
 * Lança HttpsError("resource-exhausted") quando limite é atingido.
 *
 * @param {import('firebase-functions').https.CallableContext} context
 */
async function brapiRateCheck(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }

  const uid = context.auth.uid;
  const now = Date.now();
  const db  = admin.firestore();
  const ref = db.collection("rate_limits").doc(`brapi_${uid}`);

  try {
    const exceeded = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        // Primeira requisição: cria janela
        tx.set(ref, {
          windowStart: now,
          count: 1,
          ttl: new Date(now + BRAPI_RATE_WINDOW * 2), // para TTL via Firestore TTL policy
        });
        return false;
      }

      const data = snap.data();
      const windowStart = typeof data.windowStart === "number"
        ? data.windowStart
        : data.windowStart?.toMillis?.() ?? now;

      if (now - windowStart >= BRAPI_RATE_WINDOW) {
        // Janela expirada: reinicia
        tx.set(ref, {
          windowStart: now,
          count: 1,
          ttl: new Date(now + BRAPI_RATE_WINDOW * 2),
        });
        return false;
      }

      // Dentro da janela
      const newCount = (data.count || 0) + 1;
      if (newCount > BRAPI_RATE_LIMIT) return true; // limite atingido — não incrementa

      tx.update(ref, { count: newCount });
      return false;
    });

    if (exceeded) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Limite de requisições atingido. Tente novamente em 1 minuto."
      );
    }
  } catch (e) {
    // Re-lança erros de rate limit
    if (e instanceof functions.https.HttpsError) throw e;

    // Firestore indisponível → cai no fallback em memória (graceful degradation)
    console.warn("[brapiRateLimiter] Firestore indisponível, usando fallback em memória:", e.message);
    if (_memoryCheck(uid)) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Limite de requisições atingido. Tente novamente em 1 minuto."
      );
    }
  }
}

module.exports = { brapiRateCheck };
