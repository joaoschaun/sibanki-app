/**
 * budgetAlertEmailService.js
 * Envia alertas de orçamento por e-mail para usuários com budgetAlerts = true.
 *
 * Lógica:
 *   - Roda diariamente (chamado pelo dailyBudgetEmailAlerts pubsub)
 *   - Para cada usuário com settings.budgetAlerts = true (ou budgetAlerts = true na raiz)
 *   - Calcula gastos do mês corrente por categoria
 *   - Encontra categorias ≥ 80% do limite definido em budgets[]
 *   - Envia e-mail apenas se houver ao menos 1 categoria em alerta
 *   - Deduplicação: só envia 1x por dia por usuário (flag em Firestore)
 */

const admin  = require("firebase-admin");
const { RESEND_FROM } = require("../../config");
const { getBudgetAlertEmailHtml } = require("../../templates/budgetAlertEmail");
const { buildUnsubUrl } = require("./unsubscribeService");
const { logEvent, logError } = require("../../logger");

const APP_URL = "https://virtus-financeiro-cd7bd.web.app";

// ── Helpers ───────────────────────────────────────────────────────────────────
function currentMonthRange() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const start = `${year}-${month}-01`;
  const last  = new Date(year, now.getMonth() + 1, 0).getDate();
  const end   = `${year}-${month}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Computa gastos do mês por categoria a partir dos entries.
 * Inclui entries do doc principal + overflow já filtrados.
 */
function computeCategoryTotals(entries, start, end) {
  const totals = {};
  for (const e of entries) {
    if (!e || e.type !== "despesa" || !e.date || !e.category) continue;
    if (e.isTransfer || e.category === "Transferencia") continue;
    if (e.status === "pendente" || e.status === "agendado") continue;
    if (e.date < start || e.date > end) continue;
    totals[e.category] = (totals[e.category] || 0) + (Number(e.value) || 0);
  }
  return totals;
}

/**
 * Cruza gastos com budgets[] e retorna categorias acima de 80%.
 */
function findOverBudget(totals, budgets, threshold = 0.8) {
  const result = [];
  for (const b of (budgets || [])) {
    if (!b.category || !b.limit || Number(b.limit) <= 0) continue;
    const spent = totals[b.category] || 0;
    const pct   = (spent / Number(b.limit)) * 100;
    if (pct >= threshold * 100) {
      result.push({ category: b.category, spent, limit: Number(b.limit), pct });
    }
  }
  return result.sort((a, b) => b.pct - a.pct);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function runBudgetAlertEmail() {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) { logError("budgetAlertEmail", new Error("RESEND_API_KEY not configured")); return null; }

  const db    = admin.firestore();
  const today = todayStr();
  const { start, end } = currentMonthRange();

  // Busca usuários com budgetAlerts ativo (raiz ou settings)
  // Firestore não suporta OR em where, então buscamos por budgetAlerts na raiz
  // e também cobrimos settings.budgetAlerts via filtro em memória
  const snap = await db.collection("users").get();

  const { Resend } = require("resend");
  const resend = new Resend(apiKey);

  for (const doc of snap.docs) {
    const d   = doc.data();
    const uid = doc.id;

    // Verificar se alertas estão ativos
    const alertsEnabled = d.budgetAlerts === true ||
                          (d.settings && d.settings.budgetAlerts === true);
    if (!alertsEnabled) continue;

    // Deduplicação: skip se já enviou hoje
    if (d._budgetAlertSentAt === today) continue;

    // Precisamos de orçamentos definidos
    const budgets = Array.isArray(d.budgets) ? d.budgets : [];
    if (!budgets.length) continue;

    // Resolver e-mail
    let email = d.email;
    if (!email) {
      try { const ur = await admin.auth().getUser(uid); email = ur.email; }
      catch (e) { logError("budgetAlertEmail getUser", { uid, error: e.message }); continue; }
    }
    if (!email) continue;

    // Merge entries principais + overflow do mês
    let allEntries = Array.isArray(d.entries) ? d.entries : [];
    try {
      const ovSnap = await db
        .collection("users").doc(uid).collection("entriesOverflow")
        .where("date", ">=", start)
        .where("date", "<=", end)
        .get();
      allEntries = allEntries.concat(ovSnap.docs.map(od => od.data()));
    } catch (_) {}

    const totals    = computeCategoryTotals(allEntries, start, end);
    const overItems = findOverBudget(totals, budgets, 0.8);
    if (!overItems.length) continue;

    // Gerar e-mail
    const unsubUrl = buildUnsubUrl(uid, "budget_alerts");
    const html = getBudgetAlertEmailHtml(d.name || "", overItems, APP_URL, unsubUrl);

    const blownCount = overItems.filter(c => c.pct >= 100).length;
    const subject = blownCount > 0
      ? `⚠️ ${blownCount} categoria${blownCount > 1 ? "s" : ""} com orçamento estourado — Sibanki`
      : "Atenção: você está próximo do limite em algumas categorias — Sibanki";

    try {
      const { error } = await resend.emails.send({
        from: RESEND_FROM || "Sibanki <noreply@sibanki.com.br>",
        to: [email],
        subject,
        html,
      });
      if (error) {
        logError("budgetAlertEmail Resend", { uid, error });
      } else {
        // Marca envio do dia (evita duplicatas)
        await doc.ref.update({ _budgetAlertSentAt: today });
        logEvent("budgetAlertEmail_sent", { uid, categories: overItems.length });
      }
    } catch (e) {
      logError("budgetAlertEmail send", { uid, error: e.message });
    }
  }

  return null;
}

module.exports = { runBudgetAlertEmail, computeCategoryTotals, findOverBudget };
