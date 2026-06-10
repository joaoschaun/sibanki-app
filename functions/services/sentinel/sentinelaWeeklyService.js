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
const { sendPush } = require("../push/pushService");

// ─── Helpers de matemática financeira ───────────────────────────────────────

const CDI_MONTHLY = 0.0107; // ~12.8% a.a. — atualizar conforme COPOM

/**
 * SEW-2 (auditoria 26/04/2026, PENDÊNCIA documentada): esta função é uma
 * versão duplicada e simplificada de `calculateDaysOfFreedom` em
 * `src/utils/sovereigntyEngine.ts`. Fórmulas divergem — usuário pode receber
 * Ld diferente no dashboard vs WhatsApp semanal. Fix correto: portar a engine
 * para um helper compartilhado functions/utils/. Pendente para próxima sessão.
 *
 * SEW-1 (auditoria 26/04/2026): filtro `e.type !== "transferencia"` era
 * DEAD CODE — `e.type === "despesa"` já exclui esse caso. O bug real é que
 * lançamentos de despesa com `e.isTransfer === true` (TransferForm grava
 * type=despesa + isTransfer=true) inflavam o burn rate. Agora filtramos
 * corretamente por `isTransfer !== true`.
 */
function calcDaysOfFreedom(
  entries = [],
  accountBalances = {},
  investments = [],
  accountMeta = {},
  cadastroCompleto = null,
  investmentYieldMonthly = 0.01
) {
  // 1. Liquidez em contas (respeita incluirNaSoma)
  const accountLiquidity = Object.entries(accountBalances).reduce((sum, [name, bal]) => {
    if (accountMeta[name]?.incluirNaSoma === false) return sum;
    return sum + (Number(bal) || 0);
  }, 0);

  // 2. Investimentos líquidos (D+0 a D+30)
  const liquidTypeKeys = [
    "tesouro selic",
    "cdb liquidez diária",
    "cdb liquidez diaria",
    "fundo di",
    "fundos di",
    "poupança",
    "poupanca",
  ];
  const liquidInvestments = investments
    .filter((inv) => {
      const tipo = (inv.tipo || "").toLowerCase();
      return liquidTypeKeys.some((t) => tipo.includes(t));
    })
    .reduce((sum, inv) => sum + (Number(inv.currentValue ?? inv.valorAtual ?? inv.atual ?? inv.valor ?? 0)), 0);

  const realLiquidity = accountLiquidity + liquidInvestments;

  // Lógica de fallback para liquidez estimada
  let totalLiquido = realLiquidity;
  let isLiquidityEstimated = false;

  const reservaEstimadaVal = Number(cadastroCompleto?.reservaEstimada) || 0;
  const criptoEstimadaVal = Number(cadastroCompleto?.criptoEstimada) || 0;

  if (realLiquidity <= 0 && (reservaEstimadaVal > 0 || criptoEstimadaVal > 0)) {
    totalLiquido = reservaEstimadaVal + criptoEstimadaVal;
    isLiquidityEstimated = true;
  }

  // 3. Burn rate: média dos últimos 3 meses de despesas (excluindo transferências)
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const thresholdDate = threeMonthsAgo.toISOString().slice(0, 10);

  const relevantExpenses = entries.filter(
    (e) =>
      e.type === "despesa" &&
      e.isTransfer !== true &&
      e.status !== "pendente" &&
      e.status !== "agendado" &&
      (e.date || "") >= thresholdDate
  );

  const totalExpenses3m = relevantExpenses.reduce((sum, e) => sum + (Number(e.value) || 0), 0);
  const distinctMonths = new Set(relevantExpenses.map((e) => (e.date || "").slice(0, 7))).size || 1;
  const effectiveMonths = Math.min(distinctMonths, 3);
  const avgMonthlyExpenseReal = totalExpenses3m / effectiveMonths;

  let avgMonthlyExpense = avgMonthlyExpenseReal;
  let isExpensesEstimated = false;

  const gastosEstimadosVal = Number(cadastroCompleto?.gastosEstimados) || 0;
  if (avgMonthlyExpenseReal <= 0 && gastosEstimadosVal > 0) {
    avgMonthlyExpense = gastosEstimadosVal;
    isExpensesEstimated = true;
  }

  // 4. Renda passiva mensal:
  const yieldFromLiquid = (isLiquidityEstimated ? 0 : liquidInvestments) * investmentYieldMonthly;
  const declaredProventos = investments.reduce((s, inv) => {
    const p = Number(inv.proventosMensais) || 0;
    return p > 0 ? s + p : s;
  }, 0);

  const totalPassiveIncome = yieldFromLiquid + declaredProventos;

  let dailyBurn;
  if (avgMonthlyExpense === 0 && totalPassiveIncome === 0) {
    dailyBurn = 0;
  } else {
    const netMonthlyCost = Math.max(0, avgMonthlyExpense - totalPassiveIncome);
    dailyBurn = netMonthlyCost / 30;
  }

  const days = dailyBurn > 0 ? Math.round(totalLiquido / dailyBurn) : 99999;
  return { days, totalLiquido, dailyBurn, coverageMonths: days / 30 };
}

function calcSpreadGap(investments = [], creditObligations = []) {
  const totalInvested = investments.reduce((s, i) => s + (Number(i.currentValue ?? i.valorAtual ?? i.atual ?? i.valor ?? 0)), 0);
  const weightedYield = totalInvested > 0
    ? investments.reduce((s, i) => {
        const rate = Number(i.taxaMensal ?? (i.taxaAnual ? (i.taxaAnual / 12 / 100) : CDI_MONTHLY));
        return s + rate * (Number(i.currentValue ?? i.valorAtual ?? i.atual ?? i.valor ?? 0));
      }, 0) / totalInvested
    : CDI_MONTHLY;

  const totalDebt = creditObligations.reduce((s, ob) => s + (Number(ob.amount ?? ob.saldoDevedor ?? ob.valor ?? 0)), 0);
  const weightedDebtRate = totalDebt > 0
    ? creditObligations.reduce((s, ob) => {
        const amt = Number(ob.amount ?? ob.saldoDevedor ?? ob.valor ?? 0);
        const rawPct = ob.interestRatePct ?? ob.interestPct ?? ob.interestRate ?? (ob.taxaMensal != null ? ob.taxaMensal * 100 : null);
        const rate = rawPct !== null ? Number(rawPct) / 100 : 0.02;
        return s + rate * amt;
      }, 0) / totalDebt
    : 0;

  const spreadGap = weightedYield - weightedDebtRate;
  const monthlyLeakage = spreadGap < 0 ? totalDebt * Math.abs(spreadGap) : 0;
  return { spreadGap, weightedYield, weightedDebtRate, monthlyLeakage, totalDebt, totalInvested };
}


// ─── Dicas de benefícios de cartão ──────────────────────────────────────────

function buildBenefitsTips(cards = [], entries = []) {
  const tips = [];
  const cutoff90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const last90 = entries.filter((e) => (e.date || "") >= cutoff90);

  const vipCards = cards.filter((c) => c.cardBenefits && c.cardBenefits.vipLounge);
  const hasTravel = last90.some((e) =>
    /passagem|hotel|aeroport|viagem|airbnb/i.test(String(e.desc || "")),
  );
  if (vipCards.length && hasTravel) {
    tips.push(
      `✈️ *Benefício disponível:* ${vipCards[0].name || "Cartão"} tem acesso a sala VIP — use no próximo embarque.`,
    );
  }

  const cashbackCards = cards
    .filter((c) => c.cardBenefits && Number(c.cardBenefits.cashbackPct) > 0)
    .sort(
      (a, b) =>
        (Number(b.cardBenefits && b.cardBenefits.cashbackPct) || 0) -
        (Number(a.cardBenefits && a.cardBenefits.cashbackPct) || 0),
    );
  if (cashbackCards.length && tips.length < 2) {
    const top = cashbackCards[0];
    tips.push(
      `💳 *Cashback disponível:* ${top.name || "Cartão"} tem ${top.cardBenefits.cashbackPct}% de cashback — prefira-o para compras recorrentes.`,
    );
  }

  const warrantyCards = cards.filter((c) => c.cardBenefits && c.cardBenefits.extendedWarranty);
  const hasElectronics = last90.some((e) =>
    /notebook|celular|tv |monitor|iphone|galaxy/i.test(String(e.desc || "")),
  );
  if (warrantyCards.length && hasElectronics && tips.length < 2) {
    tips.push(
      `🔧 *Garantia estendida:* ${warrantyCards[0].name || "Cartão"} cobre seu eletrônico recente — guarde a nota fiscal.`,
    );
  }

  return tips.slice(0, 2);
}

// ─── Construtor de mensagem semanal ─────────────────────────────────────────

function buildWeeklyMessage(userName, freedom, spread, budgetAlerts = [], benefitTips = []) {
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

  if (benefitTips.length > 0) {
    for (const tip of benefitTips) {
      lines.push(tip);
    }
    lines.push(``);
  }

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
  const accountMeta = data.accountMeta || {};
  const investments = Array.isArray(data.investments) ? data.investments : [];
  const cadastroCompleto = data.cadastroCompleto || null;
  const creditObligations = Array.isArray(data.creditObligations) ? data.creditObligations : [];
  const budgets = data.budgets || {};

  const freedom = calcDaysOfFreedom(entries, accountBalances, investments, accountMeta, cadastroCompleto);
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

  const benefitTips = buildBenefitsTips(data.cards || [], allEntries);
  const message = buildWeeklyMessage(userName, freedom, spread, budgetAlerts, benefitTips);
  await sendFn(phone, message);

  // SEW-5 (auditoria 26/04/2026): removido `phone.slice(-4)` do log — ainda é PII parcial
  // (LGPD recomenda evitar). Mantemos só uid + métricas anônimas.
  logEvent("sentinelaWeekly_user", { uid, days: freedom.days, spreadGap: spread.spreadGap, hasPhone: true });
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
  // ── Grupo 1: usuários com WhatsApp ────────────────────────────────────────
  // SEW-3 (auditoria 26/04/2026): `where("whatsappPhone", "!=", "")` ignora
  // docs onde o campo é null/undefined (não-existente). Trocamos por
  // `where("whatsappPhone", ">", "")` (string comparada > "" pega não-vazia)
  // E filtramos defensivamente após o get para descartar undefined/null.
  const whatsappSnap = await db.collection("users")
    .where("whatsappPhone", ">", "")
    .get();
  const whatsappUids = whatsappSnap.docs
    .filter((d) => {
      const v = d.data()?.whatsappPhone;
      return typeof v === "string" && v.trim().length >= 8; // mínimo plausível
    })
    .map((d) => d.id);

  // ── Grupo 2: usuários com push habilitado (sem WhatsApp — evita duplicidade)
  const pushSnap = await db.collection("users")
    .where("notificacoesPush", "==", true)
    .get();
  // Remove quem já está no grupo WhatsApp para não duplicar
  const whatsappSet = new Set(whatsappUids);
  const pushOnlyUids = pushSnap.docs
    .map((d) => d.id)
    .filter((uid) => !whatsappSet.has(uid));

  const totalUsers = whatsappUids.length + pushOnlyUids.length;
  logEvent("sentinelaWeekly_start", { whatsapp: whatsappUids.length, pushOnly: pushOnlyUids.length, total: totalUsers });

  let sent = 0, errors = 0;

  // Processa grupo WhatsApp em batches de 10
  for (let i = 0; i < whatsappUids.length; i += 10) {
    const batch = whatsappUids.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map((uid) =>
        processSentinelaUser(db, uid, (phone, msg) => sendWhatsAppText(null, phone, msg))
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.sent) sent++;
      if (r.status === "rejected") { errors++; logError("sentinelaWeekly_whatsapp", r.reason); }
    }
    if (i + 10 < whatsappUids.length) await new Promise((res) => setTimeout(res, 1000));
  }

  // Processa grupo push-only em batches de 10
  for (let i = 0; i < pushOnlyUids.length; i += 10) {
    const batch = pushOnlyUids.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map((uid) => processSentinelaUserPush(db, uid))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.sent) sent++;
      if (r.status === "rejected") { errors++; logError("sentinelaWeekly_push", r.reason); }
    }
    if (i + 10 < pushOnlyUids.length) await new Promise((res) => setTimeout(res, 1000));
  }

  logEvent("sentinelaWeekly_done", { total: totalUsers, sent, errors });
  return { processed: totalUsers, sent, errors };
}

// ─── Push notification version do digest ─────────────────────────────────────

/**
 * Gera título e corpo curtos para push notification semanal.
 */
function buildWeeklyPushNotification(userName, freedom, spread, budgetAlerts = []) {
  const nome = userName ? userName.split(" ")[0] : "Investidor";
  const ldEmoji = freedom.days >= 365 ? "🟢" : freedom.days >= 180 ? "🔵" : freedom.days >= 90 ? "🟡" : "🔴";
  const title = `${ldEmoji} Sentinela Semanal — ${freedom.days} dias de liberdade`;

  let body = "";
  if (spread.spreadGap < -0.005 && spread.totalDebt > 0) {
    body = `Suas dívidas custam mais que seus investimentos rendem. Veja o plano de ação.`;
  } else if (freedom.days < 30) {
    body = `Reserva crítica. Meta: 90 dias. Abra o app para ver sua ação prioritária.`;
  } else if (budgetAlerts.length > 0) {
    const top = budgetAlerts[0];
    body = `${top.cat} está ${top.pct}% acima do orçamento esta semana.`;
  } else if (spread.spreadGap >= 0) {
    body = `Spread positivo! Continue investindo. Abra o app para ver seu resumo.`;
  } else {
    body = `Bom dia, ${nome}. Seu resumo financeiro semanal está pronto.`;
  }
  return { title, body };
}

/**
 * Processa usuário com push habilitado mas SEM WhatsApp.
 * Garante que não duplica para quem já recebe pelo WhatsApp.
 */
async function processSentinelaUserPush(db, uid) {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return { uid, skipped: true, reason: "no_doc" };
  const data = userDoc.data() || {};

  if (!data.notificacoesPush) return { uid, skipped: true, reason: "push_disabled" };
  const fcmTokens = Array.isArray(data.fcmTokens) ? data.fcmTokens.filter(Boolean) : [];
  if (fcmTokens.length === 0) return { uid, skipped: true, reason: "no_tokens" };
  if (data.whatsappPhone) return { uid, skipped: true, reason: "has_whatsapp" }; // evita duplicidade

  const cutoff90d = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const allEntries = Array.isArray(data.entries) ? data.entries : [];
  const entries = allEntries.filter((e) => (e.date || "") >= cutoff90d);

  const freedom = calcDaysOfFreedom(
    entries,
    data.accountBalances || {},
    Array.isArray(data.investments) ? data.investments : [],
    data.accountMeta || {},
    data.cadastroCompleto || null
  );
  const spread  = calcSpreadGap(Array.isArray(data.investments) ? data.investments : [], Array.isArray(data.creditObligations) ? data.creditObligations : []);

  // Alertas de orçamento
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
    const limite = Number((data.budgets || {})[cat] || 0);
    if (limite > 0 && gasto > limite) {
      budgetAlerts.push({ cat, gasto, limite, pct: Math.round(((gasto - limite) / limite) * 100) });
    }
  }
  budgetAlerts.sort((a, b) => b.pct - a.pct);

  const { title, body } = buildWeeklyPushNotification(data.name || data.displayName || "", freedom, spread, budgetAlerts);

  // Rota de destino contextualizada
  let clickAction = "/dashboard";
  if (spread.spreadGap < -0.005) clickAction = "/credito/visao-geral";
  else if (freedom.days < 90)    clickAction = "/consultor-ia";
  else if (budgetAlerts.length)  clickAction = "/orcamento";

  const result = await sendPush(uid, { title, body }, { click_action: clickAction });
  logEvent("sentinelaWeekly_push_user", { uid, days: freedom.days, sent: result.sent });
  return { uid, sent: result.sent > 0, days: freedom.days };
}

module.exports = {
  runSentinelaWeekly,
  buildWeeklyMessage,
  buildWeeklyPushNotification,
  processSentinelaUserPush,
  buildBenefitsTips,
  calcDaysOfFreedom,
  calcSpreadGap,
};
