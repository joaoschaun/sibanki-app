/**
 * WhatsApp Notifications - Sibanki
 * Notificações proativas: vencimentos, inadimplências, sorteios, lembretes
 */
const { sendWhatsAppText, sendWhatsAppTemplate } = require("./whatsappService");
const { logEvent, logError } = require("../../logger");

const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";

/**
 * Envia lembrete de vencimento de parcela do Consórcio
 */
async function notifyConsorcioVencimento(db, grupoId, adminUid, membros, diaVencimento, nomeGrupo, valorParcela) {
  const pendentes = membros.filter(m => m.statusMes !== "pago" && m.statusMes !== "atrasado" && m.whatsappPhone);
  for (const m of pendentes) {
    if (!m.whatsappPhone) continue;
    const msg = `📅 *Lembrete - ${nomeGrupo}*\n\nOlá ${m.nome}! Sua parcela de *R$ ${Number(valorParcela).toLocaleString("pt-BR", {minimumFractionDigits:2})}* vence dia *${diaVencimento}*.\n\nAcesse o grupo no Sibanki para confirmar o pagamento:\n${APP_URL}`;
    try {
      await sendWhatsAppText(null, m.whatsappPhone, msg);
      logEvent("notifyConsorcioVencimento", { grupoId, member: m.nome });
    } catch (e) {
      logError("notifyConsorcioVencimento", e);
    }
  }
}

/**
 * Notifica inadimplência no Consórcio (para o admin)
 */
async function notifyConsorcioInadimplente(db, adminPhone, adminNome, nomeGrupo, nomeMembro) {
  if (!adminPhone) return;
  const msg = `⚠️ *${nomeGrupo} - Inadimplência*\n\n${nomeMembro} não pagou a parcela deste mês e foi *bloqueado do sorteio*.\n\nAcesse o Sibanki para gerenciar o grupo:\n${APP_URL}`;
  try {
    await sendWhatsAppText(null, adminPhone, msg);
    logEvent("notifyConsorcioInadimplente", { nomeGrupo, nomeMembro });
  } catch (e) {
    logError("notifyConsorcioInadimplente", e);
  }
}

/**
 * Notifica resultado do sorteio para todos os membros
 */
async function notifyConsorcioSorteio(membros, nomeGrupo, vencedorNome, valorBolo, seed) {
  for (const m of membros) {
    if (!m.whatsappPhone) continue;
    const isVencedor = m.nome === vencedorNome;
    const msg = isVencedor
      ? `🎉 *Parabéns ${m.nome}!*\n\nVocê foi contemplado no *${nomeGrupo}*!\n\n💰 Valor: *R$ ${Number(valorBolo).toLocaleString("pt-BR", {minimumFractionDigits:2})}*\n\n🔐 Seed auditável: \`${seed}\`\n\nAcesse o Sibanki para verificar:\n${APP_URL}`
      : `🎲 *Sorteio ${nomeGrupo}*\n\nO contemplado deste mês foi *${vencedorNome}*.\n\n🔐 Seed: \`${seed}\`\n\nAcompanhe pelo Sibanki:\n${APP_URL}`;
    try {
      await sendWhatsAppText(null, m.whatsappPhone, msg);
    } catch (e) {
      logError("notifyConsorcioSorteio", e);
    }
  }
}

/**
 * Notifica vencimento de parcela do Credi Amigo
 */
async function notifyCrediAmigoVencimento(phone, nome, nomeCredor, valorParcela, parcelaNum, totalParcelas) {
  if (!phone) return;
  const msg = `💳 *Lembrete de Pagamento - Credi Amigo*\n\nOlá ${nome}! Sua parcela *${parcelaNum}/${totalParcelas}* de *R$ ${Number(valorParcela).toLocaleString("pt-BR", {minimumFractionDigits:2})}* para ${nomeCredor} vence em breve.\n\nAcesse o Sibanki para mais detalhes:\n${APP_URL}`;
  try {
    await sendWhatsAppText(null, phone, msg);
    logEvent("notifyCrediAmigoVencimento", { phone, parcelaNum });
  } catch (e) {
    logError("notifyCrediAmigoVencimento", e);
  }
}

/**
 * Notifica pagamento recebido (para o credor)
 */
async function notifyCrediAmigoRecebido(phone, nomeCredor, nomeDev, valorPago, parcelaNum) {
  if (!phone) return;
  const msg = `✅ *Pagamento Recebido - Credi Amigo*\n\n${nomeDev} registrou o pagamento da parcela *${parcelaNum}* de *R$ ${Number(valorPago).toLocaleString("pt-BR", {minimumFractionDigits:2})}*.\n\nAcompanhe tudo no Sibanki:\n${APP_URL}`;
  try {
    await sendWhatsAppText(null, phone, msg);
    logEvent("notifyCrediAmigoRecebido", { phone, parcelaNum });
  } catch (e) {
    logError("notifyCrediAmigoRecebido", e);
  }
}

module.exports = {
  notifyConsorcioVencimento,
  notifyConsorcioInadimplente,
  notifyConsorcioSorteio,
  notifyCrediAmigoVencimento,
  notifyCrediAmigoRecebido,
};
