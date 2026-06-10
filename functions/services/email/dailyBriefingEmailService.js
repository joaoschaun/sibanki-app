/**
 * dailyBriefingEmailService.js
 * Briefing financeiro diário — só envia quando há algo relevante.
 *
 * Gatilhos (se pelo menos 1 ativo, o e-mail é enviado):
 *   1. Fatura de cartão vencendo em 0-3 dias
 *   2. Meta ≥ 80% de conclusão (quase batendo)
 *   3. Categoria de orçamento ≥ 70% gasta (aviso antecipado)
 *   4. Recorrente do mês não aplicado ainda (detectado via comparação)
 *
 * Ld calculado sempre (patrimônio / burn rate 30 dias).
 * Insight determinístico — sem LLM para não aumentar custo/latência em batch.
 * Deduplicação: só envia 1× por dia (flag `_briefingSentAt`).
 * Fim de semana: respeitado por padrão (skip sab/dom) salvo `briefingWeekends: true`.
 */

const admin = require("firebase-admin");
const { RESEND_FROM } = require("../../config");
const { getDailyBriefingEmailHtml } = require("../../templates/dailyBriefingEmail");
const { buildUnsubUrl } = require("./unsubscribeService");
const { logEvent, logError } = require("../../logger");

const APP_URL = "https://virtus-financeiro-cd7bd.web.app";

// ── Helpers de datas ──────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Rótulo "SEG 09/06" para o briefing */
function buildDateLabel() {
  const now = new Date();
  const days = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${days[now.getDay()]} ${d}/${m}`;
}

/** Mês corrente: { start: "YYYY-MM-01", end: "YYYY-MM-DD" } */
function currentMonthRange() {
  const now  = new Date();
  const year = now.getFullYear();
  const mon  = String(now.getMonth() + 1).padStart(2, "0");
  const last = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    start: `${year}-${mon}-01`,
    end  : `${year}-${mon}-${String(last).padStart(2, "0")}`,
  };
}

// ── Cálculo de Ld (Dias de Liberdade) ────────────────────────────────────────

/**
 * Calcula Ld a partir dos dados do usuário.
 * Ld = Patrimônio Líquido / Burn Rate Diário (30 dias)
 */
function calcLd(data) {
  try {
    const balances   = data.accountBalances || {};
    const investments = Array.isArray(data.investments) ? data.investments : [];
    const entries    = Array.isArray(data.entries) ? data.entries : [];

    const totalSaldos   = Object.values(balances).reduce((s, v) => s + (Number(v) || 0), 0);
    const totalInvest   = investments.reduce((s, i) => s + (Number(i.currentValue) || Number(i.initialValue) || 0), 0);
    const patrimonio    = totalSaldos + totalInvest;

    // Burn rate: média diária de despesas dos últimos 30 dias
    const cutoff = addDays(todayStr(), -30);
    const despesas30 = entries.filter(e =>
      e && e.type === "despesa" && e.date >= cutoff &&
      !e.isTransfer && e.category !== "Transferencia" &&
      e.status !== "pendente" && e.status !== "agendado"
    );
    const totalDespesas30 = despesas30.reduce((s, e) => s + (Number(e.value) || 0), 0);
    const burnRate = totalDespesas30 / 30;

    if (burnRate <= 0) return null;
    return patrimonio / burnRate;
  } catch (_) {
    return null;
  }
}

// ── Gatilho 1: faturas vencendo ───────────────────────────────────────────────

function checkBillsVencendo(data, today, maxDays = 3) {
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const alerts = [];

  for (const card of cards) {
    if (!card || !card.dueDate || card.status === "cancelado") continue;
    const due = String(card.dueDate).slice(0, 10);
    if (due < today) continue; // já venceu, não alertamos mais
    const daysLeft = Math.round((new Date(due + "T12:00:00Z") - new Date(today + "T12:00:00Z")) / 86400000);
    if (daysLeft <= maxDays) {
      const valor = card.currentBill || card.limit || 0;
      const label = daysLeft === 0 ? "vence hoje"
                  : daysLeft === 1 ? "vence amanhã"
                  : `vence em ${daysLeft} dias`;
      alerts.push({
        icon: "⚠",
        text: `Fatura ${card.name || "Cartão"} — ${label}`,
        value: valor > 0 ? `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined,
        color: daysLeft === 0 ? "#ef4444" : daysLeft === 1 ? "#f97316" : "#f59e0b",
        _sort: daysLeft,
      });
    }
  }

  return alerts.sort((a, b) => a._sort - b._sort);
}

// ── Gatilho 2: metas quase batendo (≥ 80%) ───────────────────────────────────

function checkGoalsNearCompletion(data, minPct = 80) {
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const result = [];

  for (const g of goals) {
    if (!g || !g.target || g.status === "concluida" || g.status === "cancelada") continue;
    const pct = ((Number(g.current) || 0) / Number(g.target)) * 100;
    if (pct >= minPct && pct < 100) {
      const remaining = Number(g.target) - (Number(g.current) || 0);
      result.push({ name: g.name || "Meta", pct, remaining: remaining > 0 ? remaining : 0 });
    }
  }

  return result
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2); // máx 2 metas
}

// ── Gatilho 3: orçamento próximo do limite (≥ 70%) ───────────────────────────

function checkBudgetsAtRisk(data, entries, threshold = 0.7) {
  const budgets = Array.isArray(data.budgets) ? data.budgets : [];
  if (!budgets.length) return [];

  const { start, end } = currentMonthRange();
  const totals = {};
  for (const e of entries) {
    if (!e || e.type !== "despesa" || !e.date || !e.category) continue;
    if (e.isTransfer || e.category === "Transferencia") continue;
    if (e.status === "pendente" || e.status === "agendado") continue;
    if (e.date < start || e.date > end) continue;
    totals[e.category] = (totals[e.category] || 0) + (Number(e.value) || 0);
  }

  const risk = [];
  for (const b of budgets) {
    if (!b.category || !b.limit || Number(b.limit) <= 0) continue;
    const spent = totals[b.category] || 0;
    const pct   = (spent / Number(b.limit)) * 100;
    if (pct >= threshold * 100 && pct < 100) {
      risk.push({
        icon: "→",
        text: `Orçamento ${b.category} em ${Math.round(pct)}%`,
        value: `R$ ${(Number(b.limit) - spent).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} restam`,
        color: "#f59e0b",
      });
    }
  }

  return risk.slice(0, 2);
}

// ── Gatilho 4: recorrentes não aplicados este mês ────────────────────────────

function checkRecorrentesAplicados(data, entries) {
  const recorrents = Array.isArray(data.recurrents) ? data.recurrents : [];
  if (!recorrents.length) return [];

  const { start, end } = currentMonthRange();
  const now = new Date();
  const diaHoje = now.getDate();

  // Monta set de {desc-lowerCase + value} dos lançamentos do mês
  const lanesSet = new Set();
  for (const e of entries) {
    if (!e || !e.date || e.date < start || e.date > end) continue;
    const key = `${(e.desc || "").toLowerCase().trim()}|${Number(e.value) || 0}`;
    lanesSet.add(key);
  }

  const pendentes = [];
  for (const r of recorrents) {
    if (!r || r.status === "pausado" || r.status === "cancelado") continue;
    const diaVenc = Number(r.day || r.dueDay) || 0;
    if (!diaVenc || diaVenc > diaHoje) continue; // ainda não venceu

    const key = `${(r.desc || r.name || "").toLowerCase().trim()}|${Number(r.value) || 0}`;
    if (!lanesSet.has(key)) {
      pendentes.push({
        icon: "↺",
        text: `Recorrente: ${r.desc || r.name || "Lançamento"} (dia ${diaVenc})`,
        value: r.value ? `R$ ${Number(r.value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined,
        color: "#a0a0a0",
      });
    }
  }

  return pendentes.slice(0, 2);
}

// ── Insight determinístico ────────────────────────────────────────────────────

/**
 * Gera uma frase de insight rápido sem chamar LLM.
 * Hierarquia: categoria com maior variação > meta mais avançada > Ld neutro.
 */
function generateInsight(data, entries) {
  try {
    const { start: mStart } = currentMonthRange();
    const prevStart = addDays(mStart, -30);
    const prevEnd   = addDays(mStart, -1);

    const byCategory = (list, s, e) => {
      const t = {};
      for (const entry of list) {
        if (!entry || entry.type !== "despesa" || !entry.date || !entry.category) continue;
        if (entry.date < s || entry.date > e) continue;
        if (entry.isTransfer || entry.category === "Transferencia") continue;
        t[entry.category] = (t[entry.category] || 0) + (Number(entry.value) || 0);
      }
      return t;
    };

    const thisMonth = byCategory(entries, mStart, todayStr());
    const lastMonth = byCategory(entries, prevStart, prevEnd);

    let biggestDelta = null;
    for (const cat of Object.keys(thisMonth)) {
      const now = thisMonth[cat] || 0;
      const before = lastMonth[cat] || 0;
      if (before < 50 || now < 50) continue; // ignora categorias insignificantes
      const delta = ((now - before) / before) * 100;
      if (!biggestDelta || Math.abs(delta) > Math.abs(biggestDelta.delta)) {
        biggestDelta = { cat, delta, now, before };
      }
    }

    if (biggestDelta && Math.abs(biggestDelta.delta) >= 15) {
      const dir = biggestDelta.delta > 0 ? "subiu" : "caiu";
      const pct = Math.abs(Math.round(biggestDelta.delta));
      const fmt = (v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      return `Seus gastos em ${biggestDelta.cat} ${dir} ${pct}% este mês comparado ao mês anterior (${fmt(biggestDelta.now)} vs ${fmt(biggestDelta.before)}).`;
    }

    // Fallback: meta mais próxima de 100%
    const goals = Array.isArray(data.goals) ? data.goals : [];
    const topGoal = goals
      .filter(g => g && g.target && g.status !== "concluida" && (Number(g.current) || 0) > 0)
      .map(g => ({ ...g, pct: ((Number(g.current) || 0) / Number(g.target)) * 100 }))
      .sort((a, b) => b.pct - a.pct)[0];

    if (topGoal && topGoal.pct >= 50) {
      return `Você está em ${Math.round(topGoal.pct)}% da meta "${topGoal.name}". Continue assim!`;
    }

    return null;
  } catch (_) {
    return null;
  }
}

// ── Runner principal ──────────────────────────────────────────────────────────

async function runDailyBriefingEmail() {
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) {
    logError("dailyBriefingEmail", new Error("RESEND_API_KEY not configured"));
    return null;
  }

  const db    = admin.firestore();
  const today = todayStr();
  const dow   = new Date().getDay(); // 0=Dom, 6=Sáb

  // Busca usuários com opt-in
  const snap = await db.collection("users")
    .where("briefingDiarioEmail", "==", true)
    .get();

  const { Resend } = require("resend");
  const resend = new Resend(apiKey);

  for (const doc of snap.docs) {
    const d   = doc.data();
    const uid = doc.id;

    try {
      // Respeitar fim de semana (default: skip) salvo override do usuário
      const allowWeekend = d.briefingWeekends === true;
      if (!allowWeekend && (dow === 0 || dow === 6)) continue;

      // Deduplicação diária
      if (d._briefingSentAt === today) continue;

      // Resolver e-mail
      let email = d.email;
      if (!email) {
        try { const ur = await admin.auth().getUser(uid); email = ur.email; }
        catch (e) { logError("dailyBriefing getUser", { uid, error: e.message }); continue; }
      }
      if (!email) continue;

      // Merge entries (doc + overflow do mês)
      let allEntries = Array.isArray(d.entries) ? d.entries : [];
      try {
        const { start, end } = currentMonthRange();
        const ovSnap = await db
          .collection("users").doc(uid).collection("entriesOverflow")
          .where("date", ">=", addDays(start, -31)) // pegar mês anterior p/ insight
          .where("date", "<=", end)
          .get();
        allEntries = allEntries.concat(ovSnap.docs.map(od => od.data()));
      } catch (_) {}

      // Calcular Ld
      const ldValue = calcLd({ ...d, entries: allEntries });
      if (ldValue === null || isNaN(ldValue)) continue; // sem dados suficientes

      // Detectar tendência de Ld (vs último armazenado)
      const lastLd   = Number(d._lastKnownLd) || ldValue;
      const ldDelta  = ldValue - lastLd;
      const ldTrend  = Math.abs(ldDelta) < 1 ? "stable" : ldDelta > 0 ? "up" : "down";

      // Coletar gatilhos
      const billAlerts    = checkBillsVencendo(d, today);
      const budgetAlerts  = checkBudgetsAtRisk(d, allEntries);
      const recAlerts     = checkRecorrentesAplicados(d, allEntries);
      const goalsNear     = checkGoalsNearCompletion(d);

      // Montar lista unificada de alertas (máx 3 itens no bloco "Hoje")
      const allAlerts = [...billAlerts, ...budgetAlerts, ...recAlerts].slice(0, 3);

      // Decidir se vale enviar (precisa de pelo menos 1 gatilho)
      const hasContent = allAlerts.length > 0 || goalsNear.length > 0;
      if (!hasContent) {
        // Atualiza o Ld armazenado mesmo sem enviar
        await doc.ref.update({ _lastKnownLd: Math.round(ldValue) });
        continue;
      }

      // Gerar insight
      const insight = generateInsight(d, allEntries);

      // Construir e-mail
      const unsubUrl = buildUnsubUrl(uid, "daily_briefing");
      const html = getDailyBriefingEmailHtml({
        nome       : d.name || "",
        dataLabel  : buildDateLabel(),
        ld         : ldValue,
        ldTrend,
        ldDelta,
        alerts     : allAlerts,
        goals      : goalsNear,
        insight    : insight || "",
        appUrl     : APP_URL,
        unsubUrl,
      });

      const subject = buildSubject(allAlerts, ldValue);

      const { error } = await resend.emails.send({
        from: RESEND_FROM || "Sibanki <noreply@sibanki.com.br>",
        to  : [email],
        subject,
        html,
      });

      if (error) {
        logError("dailyBriefingEmail Resend", { uid, error });
      } else {
        await doc.ref.update({
          _briefingSentAt: today,
          _lastKnownLd   : Math.round(ldValue),
        });
        logEvent("dailyBriefing_sent", { uid, alerts: allAlerts.length, ld: Math.round(ldValue) });
      }
    } catch (e) {
      logError("dailyBriefingEmail user", { uid, error: e.message });
    }
  }

  return null;
}

/** Assunto dinâmico baseado no alerta mais urgente */
function buildSubject(alerts, ld) {
  const billAlert = alerts.find(a => a.icon === "⚠");
  if (billAlert) {
    return `${billAlert.text} — Sibanki`;
  }
  const ldRound = Math.round(ld);
  const tier = ldRound >= 180 ? "Soberano" : ldRound >= 90 ? "Resiliente" : ldRound >= 30 ? "Em construção" : "Frágil";
  return `Briefing do dia · ${ldRound}d de liberdade (${tier}) — Sibanki`;
}

module.exports = { runDailyBriefingEmail };
