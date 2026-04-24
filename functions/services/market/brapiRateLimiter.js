/**
 * brapiRateLimiter.js
 * Rate limiting em memória para chamadas BRAPI por UID.
 *
 * NOTA: este limitador perde estado em cold starts e não funciona com
 * múltiplas instâncias concorrentes. Para escala, migrar para
 * Firestore counter ou Redis (Cloud Memorystore). Veja ISSUES.md.
 */
const functions = require("firebase-functions");

const _brapiRateMap = new Map();
const BRAPI_RATE_LIMIT  = 30;       // máx requisições por minuto por uid
const BRAPI_RATE_WINDOW = 60_000;   // janela em ms

/**
 * Verifica rate limit do uid chamador.
 * Lança HttpsError("resource-exhausted") quando limite é atingido.
 * @param {import('firebase-functions').https.CallableContext} context
 */
function brapiRateCheck(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }
  const uid = context.auth.uid;
  const now = Date.now();
  const entry = _brapiRateMap.get(uid);

  if (entry && now - entry.start < BRAPI_RATE_WINDOW) {
    entry.count++;
    if (entry.count > BRAPI_RATE_LIMIT) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Limite de requisições atingido. Tente novamente em 1 minuto."
      );
    }
  } else {
    // Remove entrada expirada antes de criar nova (evita memory leak)
    if (entry?.cleanupTimer) clearTimeout(entry.cleanupTimer);
    const cleanupTimer = setTimeout(
      () => _brapiRateMap.delete(uid),
      BRAPI_RATE_WINDOW + 1000
    );
    _brapiRateMap.set(uid, { start: now, count: 1, cleanupTimer });
  }
}

module.exports = { brapiRateCheck };
