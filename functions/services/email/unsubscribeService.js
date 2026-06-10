/**
 * unsubscribeService.js
 * Descadastro de e-mails por token HMAC — sem autenticação necessária.
 *
 * Token = HMAC-SHA256(uid + "|" + type, UNSUB_SECRET)[:32] em base64url
 * Não precisa de DB — verificação é puramente criptográfica.
 *
 * Tipos suportados:
 *   weekly_summary   → sets resumoSemanalEmail = false
 *   budget_alerts    → sets budgetAlerts = false (dentro de settings)
 *   daily_briefing   → sets briefingDiarioEmail = false
 *   all              → sets todos + emailMarketing = false
 */

const crypto = require("crypto");
const admin  = require("firebase-admin");
const { logEvent, logError } = require("../../logger");

const APP_URL = "https://virtus-financeiro-cd7bd.web.app";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSecret() {
  return process.env.UNSUB_SECRET || process.env.RESEND_API_KEY || "sibanki-unsub-fallback";
}

/**
 * Gera token de descadastro para um uid + tipo.
 * @param {string} uid
 * @param {string} type  "weekly_summary" | "budget_alerts" | "daily_briefing" | "all"
 * @returns {string}  token base64url (48 chars)
 */
function generateUnsubToken(uid, type = "weekly_summary") {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${uid}|${type}`)
    .digest("base64url")
    .slice(0, 48);
}

/**
 * Gera URL completa de descadastro.
 */
function buildUnsubUrl(uid, type = "weekly_summary") {
  const token = generateUnsubToken(uid, type);
  return `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/emailUnsubscribe?uid=${encodeURIComponent(uid)}&type=${encodeURIComponent(type)}&token=${encodeURIComponent(token)}`;
}

/**
 * Verifica token e aplica descadastro no Firestore.
 * @param {string} uid
 * @param {string} type
 * @param {string} token
 * @returns {{ ok: boolean, message: string }}
 */
async function handleUnsubscribe(uid, type, token) {
  // 1. Verificar token
  const expected = generateUnsubToken(uid, type);
  const valid = crypto.timingSafeEqual(
    Buffer.from(token.slice(0, 48)),
    Buffer.from(expected)
  );
  if (!valid) {
    return { ok: false, message: "Token inválido ou expirado." };
  }

  // 2. Aplicar descadastro no Firestore
  const db = admin.firestore();
  const ref = db.collection("users").doc(uid);

  try {
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, message: "Usuário não encontrado." };

    const updates = {};
    if (type === "weekly_summary" || type === "all") {
      updates.resumoSemanalEmail = false;
    }
    if (type === "budget_alerts" || type === "all") {
      updates["settings.budgetAlerts"] = false;
    }
    if (type === "daily_briefing" || type === "all") {
      updates.briefingDiarioEmail = false;
    }
    if (type === "all") {
      updates.emailMarketing = false;
    }

    await ref.update(updates);
    logEvent("emailUnsubscribe", { uid, type });
    return { ok: true, message: "Descadastro realizado com sucesso." };
  } catch (e) {
    logError("handleUnsubscribe", { uid, type, error: e.message });
    return { ok: false, message: "Erro ao processar descadastro." };
  }
}

/**
 * Gera HTML da página de confirmação de descadastro.
 */
function unsubPageHtml(ok, type) {
  const labels = {
    weekly_summary: "resumo semanal",
    budget_alerts:  "alertas de orçamento",
    daily_briefing: "briefing diário",
    all:            "todos os e-mails de marketing",
  };
  const label = labels[type] || "e-mails";

  const msg = ok
    ? `Você foi removido dos <strong>${label}</strong> com sucesso.`
    : "Não foi possível processar o descadastro. O link pode estar expirado.";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${ok ? "Descadastro confirmado" : "Erro"} — Sibanki</title>
  <style>
    body { margin:0; padding:0; background:#0a0a0a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#111; border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:40px 48px; max-width:480px; text-align:center; }
    .icon { font-size:40px; margin:0 0 16px; }
    h1 { color:#f0f0f0; font-size:20px; font-weight:700; margin:0 0 12px; }
    p { color:#a0a0a0; font-size:14px; line-height:1.7; margin:0 0 24px; }
    a { display:inline-block; background:#fff; color:#0a0a0a; text-decoration:none; font-size:13px; font-weight:700; padding:12px 28px; border-radius:8px; }
    .brand { margin-top:28px; color:#404040; font-size:11px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${ok ? "✓" : "✕"}</div>
    <h1>${ok ? "Descadastro confirmado" : "Link inválido"}</h1>
    <p>${msg}${ok ? "<br><br>Você pode reativar a qualquer momento nas Configurações do app." : ""}</p>
    <a href="${APP_URL}">Abrir o Sibanki</a>
    <p class="brand">Sibanki — Financial OS Brasileiro</p>
  </div>
</body>
</html>`;
}

module.exports = { generateUnsubToken, buildUnsubUrl, handleUnsubscribe, unsubPageHtml };
