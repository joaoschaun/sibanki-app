/**
 * adminDataService.js — dados agregados para o painel admin (Admin SDK).
 *
 * Substitui as leituras client-side de `users` (bloqueadas pelas Firestore rules
 * — admin só lê o próprio doc) e os gráficos simulados (Math.random()).
 * Uma única callable alimenta Dashboard + Métricas + Usuários.
 *
 * Protegido pela Custom Claim `admin:true` (setada por validateAdminAccess).
 * Região: default (us-central1) — alinha com `firebase.functions()` no admin.
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

function assertAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
  }
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Acesso restrito a administradores.");
  }
}

const PLAN_PRICE = { pro: 29.9, familia: 39.9 };
const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d) { return d.toISOString().substring(0, 10); }

function toDate(v) {
  if (!v) return null;
  if (typeof v === "string") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v.toDate === "function") { try { return v.toDate(); } catch (_) { return null; } }
  if (v._seconds) return new Date(v._seconds * 1000);
  return null;
}

async function adminGetDataLogic(data, context) {
  assertAdmin(context);
  const db = admin.firestore();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * DAY_MS);

  // ── Usuários (Admin SDK ignora as rules) ───────────────────────────────────
  const usersSnap = await db.collection("users").get();
  let pro = 0, familia = 0, free = 0;
  let withEntries = 0, withGoals = 0, withInvestments = 0, withOpenFinance = 0;
  const regByDay = {};
  const users = [];
  usersSnap.forEach((doc) => {
    const u = doc.data() || {};
    const plan = u.plan === "pro" || u.plan === "familia" ? u.plan : "free";
    if (plan === "pro") pro++; else if (plan === "familia") familia++; else free++;

    const entriesCount = Array.isArray(u.entries) ? u.entries.length : 0;
    const hasGoals = Array.isArray(u.goals) && u.goals.length > 0;
    const hasInvestments = Array.isArray(u.investments) && u.investments.length > 0;
    const hasOpenFinance = !!u.hasOpenFinance ||
      !!(u.openFinanceStatus && u.openFinanceStatus !== "none");
    if (entriesCount > 0) withEntries++;
    if (hasGoals) withGoals++;
    if (hasInvestments) withInvestments++;
    if (hasOpenFinance) withOpenFinance++;

    const created = toDate(u.createdAt) || toDate(u.updated);
    if (created && created >= cutoff) {
      const k = dayKey(created);
      regByDay[k] = (regByDay[k] || 0) + 1;
    }

    const updatedDate = typeof u.updated === "string" ? u.updated
      : (toDate(u.updated) ? toDate(u.updated).toISOString() : null);
    users.push({
      id: doc.id,
      email: u.email || u.userEmail || "",
      name: u.name || u.displayName || "",
      plan,
      createdAt: created ? created.toISOString() : null,
      updated: updatedDate,
      entriesCount,
      hasGoals, hasInvestments, hasOpenFinance,
    });
  });
  const total = users.length;
  const mrr = +(pro * PLAN_PRICE.pro + familia * PLAN_PRICE.familia).toFixed(2);

  // ── platform_events (últimos 30d) — DAU real + uso por módulo ───────────────
  const dauSets = {};       // dia -> Set(uid)
  const moduleUsage = {};   // moduleKey -> count
  let eventsTotal = 0;
  try {
    const evSnap = await db.collection("platform_events")
      .where("ts", ">=", cutoff).limit(50000).get();
    evSnap.forEach((doc) => {
      const e = doc.data() || {};
      const ts = toDate(e.ts);
      if (!ts) return;
      eventsTotal++;
      const k = dayKey(ts);
      (dauSets[k] = dauSets[k] || new Set()).add(e.uid || "?");
      if (e.name === "module_viewed") {
        const mod = (e.payload && e.payload.module) || "?";
        moduleUsage[mod] = (moduleUsage[mod] || 0) + 1;
      }
    });
  } catch (err) {
    // coleção/índice ausente → segue sem métricas de evento (não quebra o painel)
  }

  // Série de 30 dias preenchida (zeros onde não há dado)
  const series = [];
  for (let i = 29; i >= 0; i--) {
    const k = dayKey(new Date(now.getTime() - i * DAY_MS));
    series.push({
      date: k,
      registrations: regByDay[k] || 0,
      dau: dauSets[k] ? dauSets[k].size : 0,
    });
  }
  const moduleUsageArr = Object.entries(moduleUsage)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  return {
    counts: { total, pro, familia, free },
    mrr,
    activation: { withEntries, withGoals, withInvestments, withOpenFinance },
    series,
    moduleUsage: moduleUsageArr,
    eventsTotal,
    users: users.slice(0, 2000),
    generatedAt: now.toISOString(),
  };
}

module.exports = {
  adminGetData: functions.https.onCall(adminGetDataLogic),
  adminGetDataLogic,
};
