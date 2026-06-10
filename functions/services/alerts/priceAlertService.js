/**
 * priceAlertService.js — Lógica centralizada de verificação de alertas de preço.
 *
 * Usado pelo job checkPriceAlerts (telegramBot.js) a cada 15 min (seg-sex, 10h-18h).
 *
 * ATUAL: apenas Telegram (telegramBot.js implementa diretamente).
 * MIGRAR PARA CÁ: quando for estender para push notifications e email.
 *
 * Estrutura do alerta (users/{uid}.priceAlerts[]):
 * {
 *   id:             string           // crypto.randomUUID() no cliente
 *   ticker:         string           // ex: "PETR4"
 *   nome:           string?          // ex: "Petrobras PN"
 *   condition:      '>' | '<'        // sobe acima / cai abaixo
 *   price:          number           // preço-alvo em BRL
 *   repeat:         boolean?         // true = não remove após disparar
 *   channels:       string[]?        // ['telegram', 'push', 'email']
 *   createdAt:      string           // ISO
 *   lastTriggeredAt: string?         // ISO — preenchido ao disparar
 *   triggerCount:   number?          // quantas vezes disparou
 * }
 *
 * TODO: Quando estender para push:
 *   1. Importar pushService.js
 *   2. Em checkAlert(), chamar sendPush(uid, fcmToken, { title, body })
 *      quando channels inclui 'push'
 *   3. Buscar fcmToken em users/{uid}.fcmToken
 */

'use strict';

const admin = require('firebase-admin');
const logger = require('../../logger.js');

// ─────────────────────────────────────────────────────────────────────────────
// Verificação de um único alerta contra o preço atual
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se um alerta deve disparar com base no preço atual.
 *
 * @param {object} alert - PriceAlert do Firestore
 * @param {number} currentPrice - Preço atual do ticker
 * @returns {boolean} true se deve disparar
 */
function shouldTrigger(alert, currentPrice) {
  if (!alert || typeof currentPrice !== 'number') return false;

  if (alert.condition === '>') {
    return currentPrice > alert.price;
  }
  if (alert.condition === '<') {
    return currentPrice < alert.price;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Atualização de alerta após disparo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Atualiza o array priceAlerts do usuário após disparar um alerta.
 * - Se repeat=false (default), remove o alerta.
 * - Se repeat=true, atualiza lastTriggeredAt e triggerCount.
 *
 * @param {string} uid
 * @param {string} alertId
 * @param {boolean} repeat
 */
async function markAlertTriggered(uid, alertId, repeat = false) {
  const db   = admin.firestore();
  const ref  = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return;

  const current = snap.data().priceAlerts ?? [];

  let updated;
  if (repeat) {
    const now = new Date().toISOString();
    updated = current.map((a) =>
      a.id === alertId
        ? { ...a, lastTriggeredAt: now, triggerCount: (a.triggerCount ?? 0) + 1 }
        : a,
    );
  } else {
    updated = current.filter((a) => a.id !== alertId);
  }

  await ref.update({ priceAlerts: updated });
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatar mensagem de alerta
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formata uma mensagem de alerta para envio.
 *
 * @param {object} alert
 * @param {number} currentPrice
 * @returns {{ title: string, body: string }}
 */
function formatAlertMessage(alert, currentPrice) {
  const ticker   = alert.ticker;
  const nome     = alert.nome ? ` (${alert.nome})` : '';
  const dir      = alert.condition === '>' ? '📈 subiu acima' : '📉 caiu abaixo';
  const priceStr = `R$ ${currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const targetStr = `R$ ${alert.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return {
    title: `Alerta ${ticker}: ${dir} de ${targetStr}`,
    body:  `${ticker}${nome} está em ${priceStr} — ${dir} do seu alerta de ${targetStr}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TODO: sendPushAlert — implementar quando push estiver wired no backend
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envia push notification para um alerta.
 *
 * STUB — implementar quando:
 *   1. checkPriceAlerts for migrado para usar este serviço
 *   2. pushService.sendPush() estiver disponível
 *
 * @param {string} uid
 * @param {object} alert
 * @param {number} currentPrice
 */
async function sendPushAlert(uid, alert, currentPrice) {
  // TODO: Implementar quando migrar checkPriceAlerts
  //
  // const pushService = require('../push/pushService.js');
  // const db = admin.firestore();
  // const userDoc = await db.collection('users').doc(uid).get();
  // const fcmToken = userDoc.data()?.fcmToken;
  //
  // if (!fcmToken) {
  //   logger.warn('[priceAlertService] sendPushAlert: sem fcmToken para uid', uid);
  //   return;
  // }
  //
  // const { title, body } = formatAlertMessage(alert, currentPrice);
  // await pushService.sendPush(uid, fcmToken, {
  //   title,
  //   body,
  //   data: { type: 'PRICE_ALERT', ticker: alert.ticker, alertId: alert.id },
  // });

  logger.info('[priceAlertService] sendPushAlert (STUB) — não implementado ainda', { uid, alertId: alert.id });
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  shouldTrigger,
  markAlertTriggered,
  formatAlertMessage,
  sendPushAlert,
};
