/**
 * weeklySummaryEmailService.js
 * Resumo semanal por e-mail — Resend.
 *
 * Fix (vs versão anterior):
 *   - Lê também `users/{uid}/entriesOverflow` (subcollection) para usuários
 *     com muitos lançamentos (evitava resumo zerado para heavy users).
 *   - APP_URL corrigido para a SPA React (sem /app).
 *   - Passa `unsubUrl` para o template (link de descadastro).
 *   - `new Resend()` instanciado uma vez fora do loop.
 */
const admin   = require("firebase-admin");
const { RESEND_FROM } = require("../../config");
const { getWeeklySummaryEmailHtml } = require("../../templates/weeklySummaryEmail");
const { buildUnsubUrl } = require("./unsubscribeService");
const { logEvent, logError } = require("../../logger");

const APP_URL = "https://virtus-financeiro-cd7bd.web.app";

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeWeeklySummary(entries, startDateStr, endDateStr) {
  const valid = (e) =>
    e && e.date && !e.isTransfer &&
    e.category !== "Transferencia" &&
    e.status !== "pendente" && e.status !== "agendado" &&
    e.date >= startDateStr && e.date <= endDateStr;

  const list = Array.isArray(entries) ? entries.filter(valid) : [];
  const receitaTotal  = list.filter(e => e.type === "receita").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const despesaTotal  = list.filter(e => e.type === "despesa").reduce((s, e) => s + (Number(e.value) || 0), 0);

  const byCat = {};
  list.filter(e => e.type === "despesa" && e.category).forEach(e => {
    byCat[e.category] = (byCat[e.category] || 0) + (Number(e.value) || 0);
  });
  const topCategorias = Object.entries(byCat)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return { receitaTotal, despesaTotal, topCategorias };
}

function formatDateBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function runWeeklySummaryEmail() {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) { logError("weeklySummaryEmail", new Error("RESEND_API_KEY not configured")); return null; }

  const db  = admin.firestore();
  const now = new Date();
  const end = new Date(now); end.setDate(end.getDate() - 1);
  const start = new Date(end); start.setDate(start.getDate() - 6);
  const toStr = (d) => d.toISOString().slice(0, 10);
  const startDateStr = toStr(start);
  const endDateStr   = toStr(end);

  const snap = await db.collection("users").where("resumoSemanalEmail", "==", true).get();

  const { Resend } = require("resend");
  const resend = new Resend(apiKey);

  for (const doc of snap.docs) {
    const d = doc.data();
    const uid = doc.id;

    let email = d.email;
    if (!email) {
      try { const ur = await admin.auth().getUser(uid); email = ur.email; }
      catch (e) { logError("weeklySummaryEmail getUser", { uid, error: e.message }); continue; }
    }
    if (!email) continue;

    // ── Merge entries (doc principal + entriesOverflow subcollection) ────────
    let allEntries = Array.isArray(d.entries) ? d.entries : [];
    try {
      const overflowSnap = await db
        .collection("users").doc(uid).collection("entriesOverflow")
        .where("date", ">=", startDateStr)
        .where("date", "<=", endDateStr)
        .get();
      const overflowEntries = overflowSnap.docs.map(od => od.data());
      allEntries = allEntries.concat(overflowEntries);
    } catch (e) {
      logError("weeklySummaryEmail overflow", { uid, error: e.message });
      // Segue com entries do doc principal
    }

    const { receitaTotal, despesaTotal, topCategorias } = computeWeeklySummary(allEntries, startDateStr, endDateStr);

    // URL de descadastro — token HMAC verificado pelo endpoint emailUnsubscribe
    const unsubUrl = buildUnsubUrl(uid, "weekly_summary");

    const html = getWeeklySummaryEmailHtml(
      d.name || "", receitaTotal, despesaTotal, topCategorias,
      formatDateBR(startDateStr), formatDateBR(endDateStr), APP_URL, unsubUrl
    );

    try {
      const { error } = await resend.emails.send({
        from: RESEND_FROM || "Sibanki <noreply@sibanki.com.br>",
        to: [email],
        subject: "Sua semana financeira — Sibanki",
        html,
      });
      if (error) logError("weeklySummaryEmail Resend", { uid, error });
      else logEvent("weeklySummaryEmail_sent", { uid });
    } catch (e) {
      logError("weeklySummaryEmail send", { uid, error: e.message });
    }
  }
  return null;
}

module.exports = { runWeeklySummaryEmail, computeWeeklySummary, formatDateBR };
