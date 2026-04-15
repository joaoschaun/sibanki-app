/**
 * cardSuggestionService.js
 * Avalia os cartões do usuário e indica a opção com maior soberania
 * com base no cenário geolocalizado e no ciclo atual da fatura.
 */

function determineIntents(scenario) {
  const out = [];
  if (["electronics_store", "jewelry_store"].includes(scenario)) out.push("electronics");
  if (["shopping_mall", "clothing_store", "furniture_store"].includes(scenario)) out.push("retail");
  if (["supermarket", "food_venue"].includes(scenario)) out.push("dining");
  if (out.length === 0) out.push("general");
  return out;
}

function getDaysUntilClose(closeDay) {
  if (!closeDay) return 0;
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let targetMonth = currentMonth;
  let targetYear = currentYear;
  if (currentDay > closeDay) {
    if (currentMonth === 11) {
      targetMonth = 0;
      targetYear += 1;
    } else {
      targetMonth += 1;
    }
  }

  const targetDate = new Date(targetYear, targetMonth, closeDay);
  return Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
}

function scoreCard(card, intents) {
  const b = card.cardBenefits || {};
  const cb = typeof b.cashbackPct === "number" ? b.cashbackPct : 0;

  let score = cb * 8;
  const toggles = [b.vipLounge, b.travelInsurance, b.purchaseProtection, b.extendedWarranty, b.concierge].filter(Boolean).length;
  score += toggles * 2;

  let criteria = cb > 0 ? "Cashback" : "Benefícios";
  let reason = "";

  const pick = (add, c, r) => {
    score += add;
    criteria = c;
    reason = r;
  };

  if (intents.includes("retail") || intents.includes("electronics")) {
    if (b.purchaseProtection) pick(24, "Compra Protegida", "Proteção de preço/compra ativa — vital para o varejo.");
    if (intents.includes("electronics") && b.extendedWarranty) {
      pick(28, "Eletrônicos", "Garantia estendida aumenta a soberania em equipamentos caros.");
    }
  }

  if (intents.includes("dining")) {
    score += cb * 4;
    if (cb > 0 && !reason) {
      criteria = "Cashback";
      reason = "Para alimentação e mercado, o cashback acumulado costuma compensar no dia a dia.";
    } else if (b.pointsProgram && !reason) {
      criteria = "Pontos";
      reason = `Programa de pontos (${b.pointsProgram}) pode acumular em gastos recorrentes.`;
    }
  }

  if ((intents.every((i) => i === "general") || !reason)) {
    if (cb > 0) reason = `Cashback de ${cb.toFixed(2)}% informado no cadastro.`;
    else if (b.pointsProgram) reason = `Programa ${b.pointsProgram} ativo.`;
  }

  const daysToClose = getDaysUntilClose(card.closeDay || card.dueDay);
  if (daysToClose > 0) score += daysToClose * 0.5;

  return { score, criteria, reason, daysToClose };
}

/**
 * @param {Array} cards
 * @param {string} scenario
 * @returns {{name: string, criteria: string, reason: string, daysToClose: number}|null}
 */
function suggestBestCardForLocation(cards, scenario) {
  if (!cards || cards.length === 0 || !scenario) return null;

  const intents = determineIntents(scenario);
  let best = null;
  let bestScore = -Infinity;
  let bestCriteria = "";
  let bestReason = "";
  let bestDays = 0;

  for (const card of cards) {
    const status = scoreCard(card, intents);
    if (status.score > bestScore) {
      bestScore = status.score;
      best = card;
      bestCriteria = status.criteria;
      bestReason = status.reason;
      bestDays = status.daysToClose;
    }
  }

  if (!best || bestScore < 4) return null;

  return {
    name: best.name || "Seu Cartão",
    criteria: bestCriteria,
    reason: bestReason || "Melhor prazo/benefício comparativo.",
    daysToClose: bestDays,
  };
}

module.exports = { suggestBestCardForLocation };
