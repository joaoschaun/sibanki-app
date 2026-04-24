/**
 * weeklySummaryEmailService.js
 * Envio do resumo semanal financeiro por e-mail via Resend.
 *
 * Extraído de functions/index.js — separação entre lógica de negócio e exports.
 */
const admin   = require("firebase-admin");
const { RESEND_FROM } = require("../../config");
const { getWeeklySummaryEmailHtml } = require("../../templates/weeklySummaryEmail");
const { logEvent, logError } = require("../../logger");

const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";

/**
 * Computa receitas, despesas e top categorias dentro de um intervalo de datas.
 * @param {Array} entries
 * @param {string} startDateStr YYYY-MM-DD
 * @param {string} endDateStr   YYYY-MM-DD
 */
function computeWeeklySummary(entries, startDateStr, endDateStr) {
  const valid = (e) =>
    e && e.date && !e.isTransfer &&
    e.category !== "Transferencia" &&
    e.status !== "pendente" && e.status !== "agendado" &&
    e.date >= startDateStr && e.date <= endDateStr;

  const list = Array.isArray(entries) ? entries.filter(valid) : [];
  const receitaTotal = list.filter((e) => e.type === "receita")
    .reduce((s, e) => s + (Number(e.value) || 0), 0);
  const despesaTotal = list.filter((e) => e.type === "despesa")
    .reduce((s, e) => s + (Number(e.value) || 0), 0);
  const byCat = {};
  list.filter((e) => e.type === "despesa" && e.category).forEach((e) => {
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

/**
 * Envia resumo semanal por e-mail a todos os usuários com resumoSemanalEmail=true.
 */
async function runWeeklySummaryEmail() {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) {
    logError("weeklySummaryEmail", new Error("RESEND_API_KEY not configured"));
    return null;
  }
  const db  = admin.firestore();
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const toStr = (d) => d.toISOString().slice(0, 10);
  const startDateStr = toStr(start);
  const endDateStr   = toStr(end);

  const snap = await db.collection("users")
    .where("resumoSemanalEmail", "==", true).get();
  const { Resend } = require("resend");
  const resend = new Resend(apiKey);

  for (const doc of snap.docs) {
    const d = doc.data();
    let email = d.email;
    if (!email) {
      try {
        const ur = await admin.auth().getUser(doc.id);
        email = ur.email;
      } catch (e) {
        logError("weeklySummaryEmail getUser", { uid: doc.id, error: e.message });
        continue;
      }
    }
    if (!email) continue;
    const { receitaTotal, despesaTotal, topCategorias } = computeWeeklySummary(
      d.entries || [], startDateStr, endDateStr
    );
    const html = getWeeklySummaryEmailHtml(
      d.name || "Usuário", receitaTotal, despesaTotal, topCategorias,
      formatDateBR(startDateStr), formatDateBR(endDateStr), APP_URL
    );
    try {
      const { error } = await resend.emails.send({
        from: RESEND_FROM, to: [email],
        subject: "Seu resumo da semana — Sibanki", html,
      });
      if (error) logError("weeklySummaryEmail Resend", { uid: doc.id, error });
      else logEvent("weeklySummaryEmail_sent", { uid: doc.id });
    } catch (e) {
      logError("weeklySummaryEmail send", { uid: doc.id, error: e.message });
    }
  }
  return null;
}

module.exports = { runWeeklySummaryEmail, computeWeeklySummary, formatDateBR };
