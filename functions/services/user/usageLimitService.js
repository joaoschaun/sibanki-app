/**
 * usageLimitService — limite de uso de IA por plano.
 *
 * Ação #2 da Análise 360 (docs/ANALISE-360-SISTEMA-2026-06-10.md):
 * o plano gratuito tem custo variável real (LLM) sem receita. Este serviço
 * impõe um teto mensal de mensagens de IA para usuários free, server-side
 * (o gating de UI sozinho é contornável).
 *
 * Modelo de dados: users/{uid}/usage/ai
 *   { monthKey: "2026-06", count: 12, updatedAt: <ISO> }
 * Subcoleção dedicada para NÃO reescrever o documento principal (1 MB) a cada
 * mensagem. Escrita exclusiva via Admin SDK; cliente só lê (firestore.rules).
 *
 * ENV:
 *   FREE_AI_MESSAGES_PER_MONTH — teto do plano gratuito (default 40)
 *   Planos pro/familia: ilimitado.
 */

const admin = require("firebase-admin");
const functions = require("firebase-functions");
const { logWarn } = require("../../logger");

const DEFAULT_FREE_LIMIT = 40;

function freeMonthlyLimit() {
  const raw = Number(process.env.FREE_AI_MESSAGES_PER_MONTH);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_FREE_LIMIT;
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

/**
 * Resolve o plano efetivo do usuário a partir do documento users/{uid}.
 * Confia SOMENTE em `plan` (gravado pelo webhook Stripe via Admin SDK).
 * O legado `settings.planType` é editável pelo cliente e NÃO é aceito aqui —
 * seria bypass trivial do limite.
 */
function resolvePlan(userData) {
  const plan = userData && userData.plan;
  if (plan === "pro" || plan === "familia") return plan;
  return "gratuito";
}

/**
 * Verifica e incrementa o contador mensal de mensagens de IA.
 *
 * - pro/familia → sempre permite (não incrementa contador).
 * - gratuito    → transação em users/{uid}/usage/ai; estoura
 *                 HttpsError('resource-exhausted') ao exceder o teto.
 *
 * Fail-OPEN em erro de infraestrutura (indisponibilidade do Firestore não
 * deve derrubar o chat de quem paga o teto de boa fé) — mas o erro é logado.
 *
 * @param {string} uid
 * @returns {Promise<{plan: string, remaining: number|null}>}
 *          remaining=null para planos ilimitados.
 */
async function checkAndIncrementAiUsage(uid) {
  const db = admin.firestore();
  const limit = freeMonthlyLimit();
  const monthKey = currentMonthKey();

  try {
    const userSnap = await db.doc(`users/${uid}`).get();
    const plan = resolvePlan(userSnap.exists ? userSnap.data() : null);

    if (plan === "pro" || plan === "familia") {
      return { plan, remaining: null };
    }

    const usageRef = db.doc(`users/${uid}/usage/ai`);
    const remaining = await db.runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const data = snap.exists ? snap.data() : {};
      const count = data.monthKey === monthKey ? Number(data.count) || 0 : 0;

      if (count >= limit) return -1;

      tx.set(usageRef, {
        monthKey,
        count: count + 1,
        limit,
        updatedAt: new Date().toISOString(),
      });
      return limit - (count + 1);
    });

    if (remaining < 0) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Você atingiu o limite de ${limit} mensagens de IA do plano gratuito neste mês. ` +
        "Assine o Sibanki Pro para conversas ilimitadas com o consultor.",
      );
    }
    return { plan: "gratuito", remaining };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    // Fail-open: problema de infra não bloqueia o usuário, mas fica registrado.
    logWarn("usageLimitService", "checkAndIncrementAiUsage fail-open", { uid, error: e.message });
    return { plan: "gratuito", remaining: null };
  }
}

module.exports = { checkAndIncrementAiUsage, resolvePlan, freeMonthlyLimit };
