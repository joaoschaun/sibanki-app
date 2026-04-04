/**
 * Sentinela Semanal — Arquiteto Soberano Proativo
 *
 * Roda toda segunda-feira às 08h00 BRT via Firebase Scheduled Function.
 * Para cada usuário com WhatsApp cadastrado:
 *   1. Carrega dados financeiros do Firestore
 *   2. Calcula Dias de Liberdade + Spread Gap
 *   3. Identifica a oportunidade de otimização mais urgente
 *   4. Envia alerta personalizado via WhatsApp
 */

const { logEvent, logError } = require("../../logger");

// ─── Helpers de matemática financeira ───────────────────────────────────────

const CDI_MONTHLY = 0.0107; // ~12.8% a.a. — atualizar conforme COPOM

function calcDaysOfFreedom(entries = [], accountBalances = {}, investments = []) {
  // Liquidez total: saldo em contas + investimentos líquidos
  const saldoContas = Object.values(accountBalances).reduce((s, v) => s + (Number(v) || 0), 0);
  const liquidezInv = investments
    .filter((inv) => inv.liquido !== false)
    .reduce((s, inv) => s + (Number(inv.currentValue ?? inv.valorAtual ?? 0)), 0);
  const totalLiquido = saldoContas + liquidezInv;

  // Queima diária: média dos últimos 3 meses de despesas / 90 dias
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 7);
  const despesas = entries
    .filter((e) => e.type === "despesa" && (e.date || "") >= cutoff && e.type !== "transferencia")
    .reduce((s, e) => s + (Number(e.value) || 0), 0);
  const dailyBurn = despesas > 0 ? despesas / 90 : 1;

  const days = Math.round(totalLiquido / dailyBurn);
  return { days, totalLiquido, dailyBurn, coverageMonths: days / 30 };
}

function calcSpreadGap(investments = [], creditObligations = []) {
  const totalInvested = investments.reduce((s, i) => s + (Number(i.currentValue ?? i.valorAtual ?? 0)), 0);
  const weightedYield = totalInvested > 0
    ? investments.reduce((s, i) => {
        const rate = Number(i.taxaMensal ?? i.taxaAnual ? (i.taxaAnual / 12 / 100) : CDI_MONTHLY);
        return s + rate * (Number(i.currentValue ?? i.valorAtual ?? 0));
      }, 0) / totalInvested
    : CDI_MONTHLY;

  const totalDebt = creditObligations.reduce((s, ob) => s + (Number(ob.saldoDevedor ?? ob.valor ?? 0)), 0);
  const weightedDebtRate = totalDebt > 0
    ? creditObligations.reduce((s, ob) => {
        const rate = Number(ob.taxaMensal ?? 0.02);
        return s + rate * (Number(ob.saldoDevedor ?? ob.valor ?? 0));
      }, 0) / totalDebt
    : 0;

  const spreadGap = weightedYield - weightedDebtRate;
  const monthlyLeakage = spreadGap < 0 ? totalDebt * Math.abs(spreadGap) : 0;
  return { spreadGap, weightedYield, weightedDebtRate, monthlyLeakage, totalDebt, totalInvested };
}


// ─── Construtor de mensagem semanal ─────────────────────────────────────────

function buildWeeklyMessage(userName, freedom, spread, budgetAlerts = []) {
  const nome = userName ? userName.split(" ")[0] : "Investidor";
  const lines = [];

  // Saudação
  lines.push(`🛡 *Relatório Semanal — Arquiteto Soberano*`);
  lines.push(`Bom dia, *${nome}*. Aqui está sua análise de segunda-feira.`);
  lines.push(``);

  // Dias de Liberdade
  const ldEmoji =
    freedom.days >= 365 ? "🟢" :
    freedom.days >= 180 ? "🔵" :
    freedom.days >= 90  ? "🟡" : "🔴";
  lines.push(`${ldEmoji} *Dias de Liberdade: ${freedom.days} dias* (${freedom.coverageMonths.toFixed(1)} meses)`);
  lines.push(`Queima diária: R$ ${freedom.dailyBurn.toFixed(0)} | Liquidez: R$ ${freedom.totalLiquido.toFixed(0)}`);
  lines.push(``);

  // Spread Gap
  const sgEmoji = spread.spreadGap >= 0 ? "📈" : "⚠️";
  const sgValor = (spread.spreadGap * 100).toFixed(2);
  lines.push(`${sgEmoji} *Spread Gap: ${spread.spreadGap >= 0 ? "+" : ""}${sgValor}%/mês*`);
  if (spread.spreadGap < 0) {
    lines.push(`Vazamento estimado: R$ ${spread.monthlyLeakage.toFixed(0)}/mês — sua dívida custa mais do que seus investimentos rendem.`);
  } else {
    lines.push(`Seus investimentos rendem mais do que o custo da dívida. Continue assim.`);
  }
  lines.push(``);

  // Alertas de orçamento
  if (budgetAlerts.length > 0) {
    lines.push(`📊 *Categorias acima do orçamento:*`);
    for (const a of budgetAlerts.slice(0, 3)) {
      lines.push(`• ${a.cat}: ${a.pct}% acima (R$ ${a.gasto.toFixed(0)} / R$ ${a.limite.toFixed(0)})`);
    }
    lines.push(``);
  }

  // Recomendação principal
  lines.push(`💡 *Ação prioritária desta semana:*`);
  if (spread.spreadGap < -0.005 && spread.totalDebt > 0) {
    const meses = Math.ceil(spread.totalDebt / (freedom.dailyBurn * 30 * 0.2));
    lines.push(`Priorize amortização da dívida mais cara. Em ${meses} meses com 20% da renda você neutraliza o dreno.`);
  } else if (freedom.days < 30) {
    lines.push(`Reserva de emergência crítica — ${freedom.days} dias não é suficiente. Meta: 90 dias. Reduza despesas variáveis esta semana.`);
  } else if (freedom.days < 90) {
    lines.push(`Construa sua reserva. Meta: 90 dias de liberdade. Você está a ${90 - freedom.days} dias de atingir resiliência.`);
  } else if (budgetAlerts.length > 0) {
    lines.push(`Revise os gastos nas categorias acima do orçamento. Cada R$ controlado agora é liberdade futura.`);
  } else {
    lines.push(`Situação sob controle. Revise suas metas de investimento e veja se há oportunidade de aumentar o aporte mensal.`);
  }
  lines.push(``);
  lines.push(`_O Arquiteto está com você. Decisões frias, liberdade real._`);
  lines.push(`_Sibanki — sibanki.com.br/app_`);

  return lines.join("\n");
}


// ─── Pipeline principal ──────────────────────────────────────────────────────

/**
 * Processa um único usuário: lê o documento flat, calcula métricas, envia WhatsApp.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uid
 * @param {Function} sendFn — (phone, message) => Promise<void>
 */
async function processSentinelaUser(db, uid, sendFn) {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return { uid, skipped: true, reason: "no_doc" };

  const data = userDoc.data() || {};
  const phone = data.whatsappPhone;
  if (!phone) return { uid, skipped: true, reason: "no_phone" };

  const userName = data.name || data.displayName || "";

  const cutoff90d = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const allEntries = Array.isArray(data.entries) ? data.entries : [];
  const entries = allEntries.filter((e) => (e.date || "") >= cutoff90d);
  const accountBalances = data.accountBalances || {};
  const investments = Array.isArray(data.investments) ? data.investments : [];
  const creditObligations = Array.isArray(data.creditObligations) ? data.creditObligations : [];
  const budgets = data.budgets || {};

  const freedom = calcDaysOfFreedom(entries, accountBalances, investments);
  const spread = calcSpreadGap(investments, creditObligations);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const catTotals = {};
  for (const e of entries) {
    if (e.type === "despesa" && (e.date || "").startsWith(currentMonth)) {
      const cat = e.category || "Outros";
      catTotals[cat] = (catTotals[cat] || 0) + (Number(e.value) || 0);
    }
  }
  const budgetAlerts = [];
  for (const [cat, gasto] of Object.entries(catTotals)) {
    const limite = Number(budgets[cat] || 0);
    if (limite > 0 && gasto > limite) {
      budgetAlerts.push({ cat, gasto, limite, pct: Math.round(((gasto - limite) / limite) * 100) });
    }
  }
  budgetAlerts.sort((a, b) => b.pct - a.pct);

  const message = buildWeeklyMessage(userName, freedom, spread, budgetAlerts);
  await sendFn(phone, message);

  logEvent("sentinelaWeekly_user", { uid, days: freedom.days, spreadGap: spread.spreadGap, phone: phone.slice(-4) });
  return { uid, sent: true, days: freedom.days, spreadGap: spread.spreadGap };
}


/**
 * Ponto de entrada chamado pelo Firebase Scheduled Function.
 * Itera todos os usuários com whatsappPhone preenchido e processa cada um.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {Function} sendWhatsAppText — (phone: string, message: string) => Promise<void>
 * @returns {{ processed: number, sent: number, errors: number }}
 */
async function runSentinelaWeekly(db, sendWhatsAppText) {
  const usersSnap = await db.collection("users")
    .where("whatsappPhone", "!=", "")
    .get();

  const uids = usersSnap.docs.map((d) => d.id);

  logEvent("sentinelaWeekly_start", { totalUsers: uids.length });

  let sent = 0, errors = 0;

  for (let i = 0; i < uids.length; i += 10) {
    const batch = uids.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map((uid) =>
        processSentinelaUser(db, uid, (phone, msg) => sendWhatsAppText(null, phone, msg))
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.sent) sent++;
      if (r.status === "rejected") {
        errors++;
        logError("sentinelaWeekly_user", r.reason);
      }
    }
    if (i + 10 < uids.length) await new Promise((res) => setTimeout(res, 1000));
  }

  logEvent("sentinelaWeekly_done", { total: uids.length, sent, errors });
  return { processed: uids.length, sent, errors };
}

module.exports = { runSentinelaWeekly, buildWeeklyMessage, calcDaysOfFreedom, calcSpreadGap };
