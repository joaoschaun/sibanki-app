/**
 * WhatsApp Business Cloud API - Sibanki v2
 * Bot completo: lançamentos, consultor IA, convites, saldo, metas, consórcio, credi amigo
 */
const fetch = require("node-fetch");
const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = require("../../config");
const { logError, logEvent } = require("../../logger");
const { extractEntry, generateAnalysis } = require("../llm/llmService");

const META_API = "https://graph.facebook.com/v18.0";
const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";

const DEFAULT_CATS = [
  "Moradia","Transporte","Alimentação","Saúde","Bem-estar","Educação",
  "Lazer","Cartões","Empréstimo","Assinaturas","Imprevisto","Salário",
  "Freela","Investimentos","Transferencia","Outros"
];

const fmtBRL = (v) => "R$ " + Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate = () => new Date().toISOString().slice(0,10);

// ── Env.ia por usuário (em memória — sessão dura 30 min) ──
const _iaConversas = {}; // uid -> { msgs: [], ts: number }

function _getIAConversa(uid) {
  const now = Date.now();
  if (!_iaConversas[uid] || now - _iaConversas[uid].ts > 30*60*1000) {
    _iaConversas[uid] = { msgs: [], ts: now };
  }
  _iaConversas[uid].ts = now;
  return _iaConversas[uid].msgs;
}

function _addIAConversa(uid, role, content) {
  const msgs = _getIAConversa(uid);
  msgs.push({ role, content });
  if (msgs.length > 10) msgs.splice(0, msgs.length - 10); // max 10 msgs
}

// ── Extração de lançamento financeiro ──
function parseValueRegex(text) {
  const m = (text||"").replace(/\s+/g," ").match(/(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(/\./g,"").replace(",","."));
  return isNaN(v) ? null : Math.round(v*100)/100;
}

function inferTypeRegex(text) {
  const t=(text||"").toLowerCase();
  if(/\b(recebi|ganhei|salário|salario|entrada|venda|freela|pagamento recebido|depósito|deposito|pix recebido)\b/.test(t)) return "receita";
  return "despesa";
}

function mapDescToCategory(desc) {
  const d=(desc||"").toLowerCase();
  if(/mercado|supermercado|alimentação|comida|restaurante|lanche|ifood|delivery/.test(d)) return "Alimentação";
  if(/uber|taxi|combustível|gasolina|ônibus|transporte|estacionamento|metro/.test(d)) return "Transporte";
  if(/luz|energia|água|agua|aluguel|condomínio|internet|net|vivo|claro|oi/.test(d)) return "Moradia";
  if(/farmácia|remédio|médico|consulta|plano|saúde|drogaria/.test(d)) return "Saúde";
  if(/salário|salario|freela|freela|venda|entrada/.test(d)) return "Salário";
  if(/cartão|fatura|parcela/.test(d)) return "Cartões";
  if(/academia|gym|corrida|esporte/.test(d)) return "Bem-estar";
  if(/netflix|spotify|amazon|assinatura/.test(d)) return "Assinaturas";
  return "Outros";
}

async function parseMessageToEntry(text) {
  const trimmed=(text||"").trim();
  if(!trimmed) return null;
  try {
    let entry = await extractEntry(trimmed, DEFAULT_CATS);
    if(!entry) {
      // fallback regex
      const value=parseValueRegex(trimmed);
      if(!value||value<=0) return null;
      const type=inferTypeRegex(trimmed);
      let desc=trimmed.replace(/\bR\$\s*[\d.,]+\s*(reais?)?/gi,"").replace(/\b\d+[\.,]\d{2}\s*(reais?)?/gi,"").replace(/\b(recebi|ganhei|gastei|paguei|comprei)\b/gi,"").trim();
      if(!desc) desc=type==="receita"?"Receita":"Despesa";
      entry={type,value,desc:desc.substring(0,80),category:mapDescToCategory(desc)};
    }
    if(!entry.date) entry.date=fmtDate();
    if(!entry.account) entry.account="Carteira física";
    return entry;
  } catch(e) { logError("parseMessageToEntry",e); return null; }
}

async function addEntryToUser(db, uid, entry) {
  const userRef=db.collection("users").doc(uid);
  const doc=await userRef.get();
  if(!doc.exists) return false;
  const data=doc.data();
  const entries=Array.isArray(data.entries)?data.entries:[];
  const newEntry={id:Date.now(),date:entry.date,type:entry.type,desc:entry.desc||entry.category,category:entry.category,value:entry.value,account:entry.account,status:"pago",formaPgto:""};
  entries.push(newEntry);
  await userRef.update({entries,updated:new Date().toISOString()});
  return newEntry;
}

// ── Consultor IA financeiro ──
const IA_SYSTEM = `Você é o Consultor IA do Sibanki, assistente financeiro pessoal via WhatsApp.
Regras:
- Respostas CURTAS (máx 3 parágrafos) e práticas — WhatsApp não é lugar para textão
- Use *negrito* para destacar valores e termos importantes
- Emojis moderados (1-2 por mensagem)
- Sem markdown com # — só *negrito* e _itálico_
- Se o usuário disser valores ou categorias, use para personalizar
- Para lançar gastos, diga: "Para lançar, envie: gastei X em Y"
- Para ver saldo: diga "envie *saldo*"`;

async function consultorIA(uid, pergunta, contextoFinanceiro) {
  _addIAConversa(uid, "user", pergunta);
  const msgs = _getIAConversa(uid);

  // Montar prompt com contexto financeiro se houver
  const contextoStr = contextoFinanceiro ? `\nContexto financeiro do usuário:\n${contextoFinanceiro}` : "";
  const systemFull = IA_SYSTEM + contextoStr;

  try {
    // Usar generateAnalysis do llmService (tem fallback automático)
    const fullPrompt = msgs.map(m => `${m.role==="user"?"Usuário":"Consultor"}: ${m.content}`).join("\n") + "\nConsultor:";
    const result = await generateAnalysis(systemFull, fullPrompt);
    const resposta = (result && result.text) ? result.text.trim() : "Desculpe, não consegui processar agora. Tente de novo em instantes.";
    _addIAConversa(uid, "assistant", resposta);
    return resposta;
  } catch(e) {
    logError("consultorIA",e);
    return "Erro ao consultar a IA. Tente de novo em instantes.";
  }
}

// ── Envio de mensagens WhatsApp ──
async function sendWhatsAppText(phoneNumberId, to, text) {
  const token = WHATSAPP_TOKEN;
  const pid = phoneNumberId || WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !pid) { logError("wa send","missing token/phoneId"); return false; }
  try {
    const res = await fetch(`${META_API}/${pid}/messages`, {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:String(to).replace(/\D/g,""),type:"text",text:{body:text,preview_url:false}})
    });
    const json=await res.json();
    if(json.error){logError("wa send error",json.error);return false;}
    return true;
  } catch(e){logError("wa send",e);return false;}
}

// ── Mensagens de convite via WhatsApp ──

/** Convite para o grupo Família */
async function sendWhatsAppInviteFamilia(toPhone, nomeConvidador, linkConvite) {
  const msg = `👨‍👩‍👧 *Convite Sibanki — Modo Família*\n\n${nomeConvidador} quer gerenciar as finanças junto com você no *Sibanki*! 💰\n\nCom o Modo Família vocês podem:\n✅ Ver saldos e gastos em conjunto\n✅ Definir metas familiares\n✅ Consultor IA financeiro compartilhado\n\n👇 Clique para aceitar o convite:\n${linkConvite}\n\n_Sibanki — Controle Financeiro Inteligente com IA_`;
  return sendWhatsAppText(null, toPhone, msg);
}

/** Convite para Consórcio Amigos */
async function sendWhatsAppInviteConsorcio(toPhone, nomeAdmin, nomeGrupo, valorParcela, boloMensal, prazo, linkConvite) {
  const msg = `🤝 *Você foi convidado para um Consórcio!*\n\n${nomeAdmin} criou o grupo *"${nomeGrupo}"* no Sibanki.\n\n💰 Contribuição: *${fmtBRL(valorParcela)}/mês*\n🎯 Bolo mensal: *${fmtBRL(boloMensal)}*\n📅 Duração: *${prazo} meses*\n\nComo funciona:\n• Todo mês todos contribuem\n• Sorteio transparente e auditável\n• Em ${prazo} meses todo mundo recebe!\n\n👇 Ver detalhes e participar:\n${linkConvite}\n\n_Sibanki — Consórcio Amigos, sem banco e sem juros_`;
  return sendWhatsAppText(null, toPhone, msg);
}

/** Convite Credi Amigo */
async function sendWhatsAppInviteCrediAmigo(toPhone, nomeCredor, nomeDev, valor, parcelas, valorParcela, tipoCredor, linkConvite) {
  const badge = tipoCredor ? `💸 *${nomeCredor} registrou um empréstimo para você*` : `💰 *${nomeCredor} registrou que você tem a receber*`;
  const detalhe = tipoCredor
    ? `Você deve *${fmtBRL(valor)}* para ${nomeCredor}${parcelas>1 ? ` em ${parcelas}x de ${fmtBRL(valorParcela)}` : ""}`
    : `${nomeCredor} registrou que você tem *${fmtBRL(valor)} a receber*${parcelas>1 ? ` em ${parcelas}x de ${fmtBRL(valorParcela)}` : ""}`;
  const msg = `${badge}\n\n${detalhe}\n\nAcompanhe o acordo, confirme pagamentos e receba lembretes no *Sibanki Credi Amigo* — de graça!\n\n👇 Ver meu acordo:\n${linkConvite}\n\n_Sibanki — Empréstimos entre amigos com transparência_`;
  return sendWhatsAppText(null, toPhone, msg);
}

/** Lembrete de vencimento (consórcio) */
async function notifyConsorcioVencimento(phone, nomeGrupo, valorParcela, diaVencimento, nomeMembro) {
  const msg = `📅 *Lembrete — ${nomeGrupo}*\n\nOlá ${nomeMembro}! Sua parcela de *${fmtBRL(valorParcela)}* vence dia *${diaVencimento}*.\n\nConfirme o pagamento no app:\n${APP_URL}`;
  return sendWhatsAppText(null, phone, msg);
}

/** Notificação de inadimplência (para admin) */
async function notifyConsorcioInadimplente(adminPhone, nomeGrupo, nomeMembro) {
  const msg = `⚠️ *${nomeGrupo} — Inadimplência*\n\n*${nomeMembro}* não pagou a parcela deste mês e foi bloqueado do sorteio.\n\nGerencie o grupo:\n${APP_URL}`;
  return sendWhatsAppText(null, adminPhone, msg);
}

/** Notificação de resultado do sorteio */
async function notifyConsorcioSorteio(phone, nomeGrupo, vencedorNome, valorBolo, seed, isVencedor) {
  const msg = isVencedor
    ? `🎉 *Parabéns ${vencedorNome}!*\n\nVocê foi contemplado no *${nomeGrupo}*!\n💰 Valor: *${fmtBRL(valorBolo)}*\n🔐 Seed auditável: \`${seed}\`\n\n${APP_URL}`
    : `🎲 *Sorteio ${nomeGrupo}*\n\nContemplado deste mês: *${vencedorNome}*\n🔐 Seed: \`${seed}\`\n\n${APP_URL}`;
  return sendWhatsAppText(null, phone, msg);
}

/** Lembrete de parcela Credi Amigo */
async function notifyCrediAmigoVencimento(phone, nome, nomeCredor, valorParcela, parcelaNum, totalParcelas) {
  const msg = `💳 *Lembrete — Credi Amigo*\n\nOlá ${nome}! Parcela *${parcelaNum}/${totalParcelas}* de *${fmtBRL(valorParcela)}* para ${nomeCredor} vence em breve.\n\n${APP_URL}`;
  return sendWhatsAppText(null, phone, msg);
}

module.exports = {
  parseMessageToEntry, addEntryToUser,
  sendWhatsAppText, consultorIA,
  sendWhatsAppInviteFamilia, sendWhatsAppInviteConsorcio, sendWhatsAppInviteCrediAmigo,
  notifyConsorcioVencimento, notifyConsorcioInadimplente, notifyConsorcioSorteio,
  notifyCrediAmigoVencimento,
  DEFAULT_CATS
};
