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

// SEG-01 (auditoria 26/04/2026, decisão sênior): Acesso Admin migrado para
// banco de dados. E-mails permitidos ficam na coleção `admins/{email}`.
// Para conceder acesso inicial, insira um documento com a chave igual ao
// e-mail correspondente em letras minúsculas (ex: "joao@example.com").

/**
 * validateAdminAccessLogic
 * Valida se o e-mail do usuário autenticado está na coleção `admins`.
 * Se sim, seta a Custom Claim `admin: true` no Firebase Auth.
 */
async function validateAdminAccessLogic(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para continuar.");
  }

  const { uid, token } = context.auth;
  const email = (token?.email || "").toLowerCase();
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "Usuário sem e-mail cadastrado.");
  }

  const db = admin.firestore();
  const adminDoc = await db.collection("admins").doc(email).get();

  if (!adminDoc.exists) {
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
}

/**
 * revokeAdminAccessLogic
 * Remove a Custom Claim de admin de um usuário e o deleta da coleção `admins`.
 * Só pode ser chamada por outro admin autenticado.
 */
async function revokeAdminAccessLogic(data, context) {
  if (!context.auth || context.auth.token?.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem revogar acessos.");
  }

  const { targetUid, email } = data || {};
  const db = admin.firestore();
  let targetEmail = email ? String(email).trim().toLowerCase() : "";

  if (targetUid && typeof targetUid === "string") {
    try {
      const userRecord = await admin.auth().getUser(targetUid);
      targetEmail = (userRecord.email || "").toLowerCase();
      await admin.auth().setCustomUserClaims(targetUid, { admin: false });
    } catch (err) {
      console.warn("[adminAuth] Erro ao remover claims de targetUid:", err.message);
    }
  }

  if (!targetEmail) {
    throw new functions.https.HttpsError("invalid-argument", "targetUid ou e-mail é obrigatório.");
  }

  await db.collection("admins").doc(targetEmail).delete();

  if (!targetUid && targetEmail) {
    try {
      const userRecord = await admin.auth().getUserByEmail(targetEmail);
      await admin.auth().setCustomUserClaims(userRecord.uid, { admin: false });
    } catch (_) {
      // Usuário pode não existir no Firebase Auth ainda (convite pendente), tudo bem.
    }
  }

  return { revoked: true, email: targetEmail };
}

/**
 * grantAdminAccessLogic
 * Adiciona um e-mail à coleção `admins` e concede Custom Claim se o usuário já existir.
 * Só pode ser chamada por outro admin autenticado.
 */
async function grantAdminAccessLogic(data, context) {
  if (!context.auth || context.auth.token?.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem conceder acessos.");
  }

  const email = data && data.email ? String(data.email).trim().toLowerCase() : "";
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "email é obrigatório.");
  }

  const db = admin.firestore();
  await db.collection("admins").doc(email).set({
    addedBy: context.auth.uid,
    addedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
  } catch (_) {
    // Usuário pode não ter se cadastrado ainda, a claim será concedida no primeiro login/validateAdminAccess
  }

  return { success: true, email };
}

/**
 * listAdminsLogic
 * Retorna todos os e-mails cadastrados na coleção `admins`.
 * Só pode ser chamada por outro admin autenticado.
 */
async function listAdminsLogic(data, context) {
  if (!context.auth || context.auth.token?.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Acesso negado.");
  }

  const db = admin.firestore();
  const snap = await db.collection("admins").get();
  const adminsList = [];
  snap.forEach((doc) => {
    adminsList.push({
      email: doc.id,
      ...doc.data(),
    });
  });

  return { admins: adminsList };
}

module.exports = {
  validateAdminAccessLogic,
  revokeAdminAccessLogic,
  grantAdminAccessLogic,
  listAdminsLogic,
  validateAdminAccess: functions.https.onCall(validateAdminAccessLogic),
  revokeAdminAccess: functions.https.onCall(revokeAdminAccessLogic),
  grantAdminAccess: functions.https.onCall(grantAdminAccessLogic),
  listAdmins: functions.https.onCall(listAdminsLogic),
};
