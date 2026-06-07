/**
 * adminAuth.js
 * Validação server-side de acesso ao painel admin.
 *
 * Fluxo:
 *  1. Usuário faz login no admin panel
 *  2. Cliente chama `validateAdminAccess` via httpsCallable
 *  3. Cloud Function verifica e-mail na lista server-side
 *  4. Se autorizado, seta Custom Claim { admin: true } no token Firebase
 *  5. Cliente força refresh do ID token e verifica a claim
 *  6. Somente então exibe o admin panel
 *
 * Benefício: mesmo que alguém manipule o JS do cliente, a claim
 * só existe se o servidor a concedeu — não pode ser forjada.
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// SEG-01 (auditoria 26/04/2026, decisão sênior): ADMIN_EMAILS deixou de ser
// hardcoded. Agora vem de `process.env.ADMIN_EMAILS` (lista CSV) e cai num
// fallback mínimo apenas para destravar o owner em ambientes sem env setada.
//
// Roadmap pós-fase-1+2 (próxima sessão):
//  1. Migrar a lista para uma coleção Firestore `admins/{email}` com regra
//     `allow read, write: if false` (apenas Cloud Functions com Admin SDK leem).
//  2. Adicionar UI no painel admin para gerenciar a lista (com revokeAdminAccess).
//  3. Remover totalmente o fallback hardcoded — gerenciamento 100% via UI.
//
// Para configurar em produção:
//   firebase functions:secrets:set ADMIN_EMAILS
//   (informe valor no formato: "email1@x.com,email2@x.com")
function loadAdminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const ADMIN_EMAILS = loadAdminEmails();

/**
 * validateAdminAccess
 * Valida se o usuário autenticado tem permissão de admin.
 * Se sim, seta a Custom Claim `admin: true` no Firebase Auth.
 */
exports.validateAdminAccess = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para continuar.");
  }

  const { uid, token } = context.auth;
  const email = (token?.email || "").toLowerCase();

  if (!ADMIN_EMAILS.includes(email)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Acesso negado. Este e-mail não tem permissão de administrador."
    );
  }

  // Se já tem a claim, não precisa re-setar
  if (token?.admin === true) {
    return { admin: true, alreadyGranted: true };
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
  } catch (err) {
    console.error("[adminAuth] Erro ao setar custom claim:", err);
    throw new functions.https.HttpsError("internal", "Erro ao conceder acesso. Tente novamente.");
  }

  return { admin: true, alreadyGranted: false };
});

/**
 * revokeAdminAccess
 * Remove a Custom Claim de admin de um usuário.
 * Só pode ser chamada por outro admin autenticado.
 */
exports.revokeAdminAccess = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token?.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem revogar acessos.");
  }

  const { targetUid } = data || {};
  if (!targetUid || typeof targetUid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "targetUid é obrigatório.");
  }

  await admin.auth().setCustomUserClaims(targetUid, { admin: false });
  return { revoked: true, targetUid };
});
