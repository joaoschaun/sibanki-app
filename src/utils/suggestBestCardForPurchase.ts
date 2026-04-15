import type { Card } from '../types/userData';

export interface CardPurchaseSuggestion {
  cardId: number;
  cardName: string;
  /** Critério principal (ex.: cashback, viagem, compra online) */
  criteriaLabel: string;
  /** Uma linha explicando a escolha */
  reason: string;
}

const MSG_TRIGGER =
  /compr|pag(ar)?|cart(ão|ao)|cr[eé]dito|passar|cash\s*back|cashback|viagem|restaur|ifood|rappi|uber\s*eats|e-?commerce|mercado\s*livre|amazon|internacion|aeroport|hotel|passagem|avi(ã|a)o|lounge|sala\s*vip|seguro|eletr(ô|o)nic|notebook|celular|parcel|onde\s+usar|melhor\s+cart/i;

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type SpendIntent = 'travel' | 'online' | 'dining' | 'electronics' | 'general';

function detectIntents(msg: string): SpendIntent[] {
  const n = norm(msg);
  const out: SpendIntent[] = [];
  if (
    /viagem|aeroport|hotel|internac|passagem|aviao|avia|mala|exterior/.test(n) ||
    /sala vip|lounge|dragon|loungekey/.test(n)
  ) {
    out.push('travel');
  }
  if (/amazon|mercado livre|shopee|magalu|americanas|submarino|ecommerce|compra online|site|pix na loja/.test(n)) {
    out.push('online');
  }
  if (/restaur|ifood|rappi|uber eats|delivery|almo[cç]o|jantar|lanche|bar|pizz/.test(n)) {
    out.push('dining');
  }
  if (/celular|notebook|eletronic|tv |monitor|iphone|galaxy|tablet/.test(n)) {
    out.push('electronics');
  }
  if (out.length === 0) out.push('general');
  return out;
}

function scoreCard(card: Card, intents: SpendIntent[]): { score: number; criteria: string; reason: string } {
  const b = card.cardBenefits;
  const cb = typeof b?.cashbackPct === 'number' && Number.isFinite(b.cashbackPct) ? b.cashbackPct : 0;

  let score = cb * 8;
  const toggles = [b?.vipLounge, b?.travelInsurance, b?.purchaseProtection, b?.extendedWarranty, b?.concierge].filter(
    Boolean
  ).length;
  score += toggles * 2;
  let criteria = cb > 0 ? 'Cashback' : 'Benefícios';
  let reason = '';

  const pick = (add: number, c: string, r: string) => {
    score += add;
    criteria = c;
    reason = r;
  };

  if (intents.includes('travel')) {
    if (b?.travelInsurance) pick(32, 'Viagem', 'Seguro viagem cadastrado — útil para deslocamentos e imprevistos.');
    if (b?.vipLounge) {
      score += 28;
      if (!reason) criteria = 'Sala VIP';
      if (!reason) reason = 'Acesso a sala VIP cadastrado — combina com aeroporto e conexões.';
    }
    if (b?.concierge) {
      score += 12;
      if (!reason) reason = 'Concierge pode ajudar em reservas e suporte em viagem.';
    }
  }

  if (intents.includes('online') && b?.purchaseProtection) {
    pick(24, 'Compra online', 'Proteção de compra ajuda em disputas e defeitos em compras pela internet.');
  }

  if (intents.includes('electronics')) {
    if (b?.extendedWarranty) pick(28, 'Eletrônicos', 'Garantia estendida é prioridade para equipamentos caros.');
    else if (b?.purchaseProtection) pick(18, 'Eletrônicos', 'Proteção de compra cobre bem itens de valor.');
  }

  if (intents.includes('dining')) {
    score += cb * 4;
    if (cb > 0 && !reason) {
      criteria = 'Cashback';
      reason = 'Para refeições e delivery, o cashback cadastrado costuma compensar no dia a dia.';
    } else if (b?.pointsProgram && !reason) {
      criteria = 'Pontos';
      reason = `Programa de pontos (${b.pointsProgram}) pode acumular em gastos recorrentes.`;
    }
  }

  if (intents.every((i) => i === 'general')) {
    if (cb > 0) {
      criteria = 'Cashback';
      reason = `Entre os cartões com benefício cadastrado, este tem o maior cashback (${cb.toFixed(2)}%).`;
    } else if (b?.pointsProgram) {
      criteria = 'Pontos';
      reason = `Programa ${b.pointsProgram} cadastrado — compare com outros cartões se tiver dúvida.`;
    }
  }

  if (!reason) {
    if (cb > 0) reason = `Cashback de ${cb.toFixed(2)}% informado no cadastro de benefícios.`;
    else if (b?.vipLounge) reason = 'Benefício de sala VIP cadastrado.';
    else if (b?.travelInsurance) reason = 'Seguro viagem cadastrado.';
    else if (b?.purchaseProtection) reason = 'Proteção de compra cadastrada.';
    else reason = 'Cartão com benefícios cadastrados no Sibanki.';
  }

  return { score, criteria, reason };
}

/**
 * Sugere qual cartão usar para a mensagem do usuário, com base em benefícios cadastrados e palavras-chave do texto.
 * Retorna null se não houver cartões, nenhum gatilho na mensagem ou nenhum cartão com benefício útil.
 */
export function suggestBestCardForPurchase(userMessage: string, cards: Card[]): CardPurchaseSuggestion | null {
  const trimmed = (userMessage || '').trim();
  if (!trimmed || !cards.length) return null;
  if (!MSG_TRIGGER.test(trimmed)) return null;

  const withBenefits = cards.filter((c) => c.cardBenefits && Object.keys(c.cardBenefits).length > 0);
  if (!withBenefits.length) return null;

  const intents = detectIntents(trimmed);

  let best: Card | null = null;
  let bestScore = -Infinity;
  let bestCriteria = '';
  let bestReason = '';

  for (const card of withBenefits) {
    const { score, criteria, reason } = scoreCard(card, intents);
    if (score > bestScore) {
      bestScore = score;
      best = card;
      bestCriteria = criteria;
      bestReason = reason;
    }
  }

  if (!best || bestScore < 4) return null;

  return {
    cardId: best.id,
    cardName: best.name || 'Cartão',
    criteriaLabel: bestCriteria,
    reason: bestReason,
  };
}
