const admin = require("firebase-admin");
const { logEvent, logError, logWarn, timer } = require("../../logger");

const db = admin.firestore();

async function getUserTokens(uid) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return [];
  const data = snap.data();
  if (!data.notificacoesPush) return [];
  return Array.isArray(data.fcmTokens) ? data.fcmTokens.filter(Boolean) : [];
}

async function sendPush(uid, notification, data = {}) {
  const tokens = await getUserTokens(uid);
  if (tokens.length === 0) return { sent: 0, uid };

  const messaging = admin.messaging();
  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: { ...data, click_action: data.click_action || "/" },
    webpush: {
      fcmOptions: { link: data.click_action || "/" },
      notification: {
        icon: "/icon-192.svg",
        badge: "/icon-192.svg",
      },
    },
  };

  let sent = 0;
  const invalidTokens = [];

  for (const token of tokens) {
    try {
      await messaging.send({ ...message, token });
      sent++;
    } catch (err) {
      if (
        err.code === "messaging/registration-token-not-registered" ||
        err.code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(token);
      } else {
        logError("pushService", "send", err, { uid, token: token.slice(0, 10) });
      }
    }
  }

  if (invalidTokens.length > 0) {
    try {
      await db.collection("users").doc(uid).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
      });
      logWarn("pushService", "removedInvalidTokens", { uid, count: invalidTokens.length });
    } catch (e) {
      logError("pushService", "cleanupTokens", e, { uid });
    }
  }

  return { sent, uid, invalidRemoved: invalidTokens.length };
}

async function checkBudgetAlerts(uid, userData) {
  const entries = userData.entries || [];
  const budgets = userData.budgets || {};
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const catSpent = {};
  for (const e of entries) {
    if (e.type !== "despesa" || !(e.date || "").startsWith(currentMonth)) continue;
    const cat = e.category || "Outros";
    catSpent[cat] = (catSpent[cat] || 0) + (Number(e.value) || 0);
  }

  const alerts = [];
  for (const [cat, limit] of Object.entries(budgets)) {
    const numLimit = Number(limit);
    if (!numLimit || numLimit <= 0) continue;
    const spent = catSpent[cat] || 0;
    const pct = Math.round((spent / numLimit) * 100);

    if (pct >= 100) {
      alerts.push({ cat, pct, type: "exceeded" });
    } else if (pct >= 80) {
      alerts.push({ cat, pct, type: "warning" });
    }
  }

  return alerts;
}

async function checkDueCards(uid, userData) {
  const cards = userData.cards || [];
  const now = new Date();
  const alerts = [];

  for (const card of cards) {
    if (!card.dueDay) continue;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), card.dueDay);
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      alerts.push({
        cardName: card.name || card.bandeira || "Cartão",
        dueDay: card.dueDay,
        diffDays,
      });
    }
  }

  return alerts;
}

async function runDailyPushAlerts() {
  const t = timer("dailyPush", "run");
  try {
    const snap = await db
      .collection("users")
      .where("notificacoesPush", "==", true)
      .get();

    let totalSent = 0;
    let usersProcessed = 0;

    for (const doc of snap.docs) {
      const uid = doc.id;
      const data = doc.data();
      usersProcessed++;

      const budgetAlerts = await checkBudgetAlerts(uid, data);
      for (const alert of budgetAlerts) {
        const title = alert.type === "exceeded"
          ? `${alert.cat}: orçamento estourado!`
          : `${alert.cat}: ${alert.pct}% do orçamento`;
        const body = alert.type === "exceeded"
          ? `Você ultrapassou o limite em ${alert.cat}. Revise seus gastos.`
          : `Atenção: você já usou ${alert.pct}% do orçamento de ${alert.cat}.`;
        const result = await sendPush(uid, { title, body }, { click_action: "/orcamento" });
        totalSent += result.sent;
      }

      const cardAlerts = await checkDueCards(uid, data);
      for (const alert of cardAlerts) {
        const title = alert.diffDays === 0
          ? `Fatura vence hoje: ${alert.cardName}`
          : `Fatura em ${alert.diffDays} dia(s): ${alert.cardName}`;
        const body = `A fatura do ${alert.cardName} vence dia ${alert.dueDay}. Evite juros!`;
        const result = await sendPush(uid, { title, body }, { click_action: "/cartoes" });
        totalSent += result.sent;
      }
    }

    t.end({ usersProcessed, totalSent });
    return { usersProcessed, totalSent };
  } catch (err) {
    t.fail(err);
    throw err;
  }
}

module.exports = {
  sendPush,
  getUserTokens,
  checkBudgetAlerts,
  checkDueCards,
  runDailyPushAlerts,
};
