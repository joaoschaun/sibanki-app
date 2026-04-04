/**
 * WhatsApp Business Cloud API - Sibanki v2
 * Bot completo: lançamentos, consultor IA, convites, saldo, metas, consórcio, credi amigo
 */
const fetch = require("node-fetch");
const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = require("../../config");
const { logError, logEvent } = require("../../logger");
const { extractEntry, generateAnalysis } = require("../llm/llmService");
const { startWizard, continueWizard, detectCategory, detectFormaPgto, detectType, DEFAULT_CATS } = require("../entryWizard");

const META_API = "https://graph.facebook.com/v18.0";
const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";

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

/**
 * Extrai partial entry de texto livre (sem defaults para campos faltantes).
 * Retorna null se não houver valor numérico reconhecível.
 */
async function parsePartialEntry(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  try {
    // Tentar via LLM primeiro (mais preciso)
    let entry = await extractEntry(trimmed, DEFAULT_CATS);
    if (entry && entry.value > 0) {
      // Manter apenas campos com confiança — não assumir defaults
      return {
        type: entry.type || detectType(trimmed),
        value: entry.value,
        desc: (entry.desc || trimmed).substring(0, 80),
        category: entry.category && entry.category !== "Outros" ? entry.category : detectCategory(entry.desc || trimmed),
        formaPgto: detectFormaPgto(trimmed) || null,
        account: null, // sempre perguntar se múltiplas contas
        date: entry.date || new Date().toISOString().slice(0, 10),
      };
    }
    // Fallback regex
    const value = parseValueRegex(trimmed);
    if (!value || value <= 0) return null;
    const type = detectType(trimmed);
    let desc = trimmed
      .replace(/\bR\$\s*[\d.,]+\s*(reais?)?/gi, "")
      .replace(/\b\d+[\.,]\d{2}\s*(reais?)?/gi, "")
      .replace(/\b(recebi|ganhei|gastei|paguei|comprei|foi|era)\b/gi, "")
      .trim();
    if (!desc) desc = type === "receita" ? "Receita" : "Despesa";
    return {
      type,
      value,
      desc: desc.substring(0, 80),
      category: detectCategory(desc),
      formaPgto: detectFormaPgto(trimmed) || null,
      account: null,
      date: new Date().toISOString().slice(0, 10),
    };
  } catch (e) {
    logError("parsePartialEntry", e);
    return null;
  }
}

// Manter compatibilidade com código existente
async function parseMessageToEntry(text) {
  const partial = await parsePartialEntry(text);
  if (!partial) return null;
  // Versão legacy: preencher defaults para não quebrar código que usa diretamente
  return {
    ...partial,
    category: partial.category || "Outros",
    account: partial.account || "Carteira física",
    formaPgto: partial.formaPgto || "",
  };
}

/**
 * Gerencia o fluxo multi-turn de lançamento via WhatsApp.
 * Lê e salva o estado do wizard em users/{uid}.waPendingWizard no Firestore.
 *
 * @returns {{ handled: true, reply: string } | { handled: false }}
 */
async function handleWizardMessage(db, uid, userData, text) {
  const wizardState = userData.waPendingWizard || null;
  const userAccounts = Array.isArray(userData.accounts) && userData.accounts.length > 0
    ? userData.accounts
    : ["Carteira física"];
  const userCats = Array.isArray(userData.categories) && userData.categories.length > 0
    ? userData.categories
    : DEFAULT_CATS;

  // ── Se há wizard em andamento, continuar ─────────────────────────────────
  if (wizardState && wizardState.step) {
    const result = continueWizard(wizardState, text);

    if (result.cancelled) {
      await db.collection("users").doc(uid).update({ waPendingWizard: null });
      return { handled: true, reply: "❌ Lançamento cancelado. Tudo bem, pode enviar um novo quando quiser!" };
    }

    if (result.done) {
      // Salvar lançamento e limpar wizard
      const newEntry = await addEntryToUser(db, uid, result.entry);
      await db.collection("users").doc(uid).update({ waPendingWizard: null });
      const ico = result.entry.type === "receita" ? "📈 +" : "📉 -";
      const fmtBRL = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      logEvent("waWizardComplete", { uid });
      return {
        handled: true,
        reply: `✅ *Lançado com sucesso!*\n\n${ico} ${fmtBRL(result.entry.value)}\n📂 ${result.entry.category}\n💳 ${result.entry.formaPgto || "—"}\n🏦 ${result.entry.account}\n\nEnvie *resumo* para ver o balanço do mês. 💡`
      };
    }

    // Próxima pergunta
    await db.collection("users").doc(uid).update({ waPendingWizard: result });
    return { handled: true, reply: result.question };
  }

  // ── Tentar iniciar novo wizard ────────────────────────────────────────────
  const partial = await parsePartialEntry(text);
  if (!partial || !partial.value || partial.value <= 0) {
    return { handled: false }; // não é um lançamento, deixar ir para consultor IA
  }

  const wizardResult = startWizard(partial, userAccounts, userCats);

  if (wizardResult.done) {
    // Todos os campos preenchidos → ir direto para confirmação
    await db.collection("users").doc(uid).update({ waPendingWizard: wizardResult });
    return { handled: true, reply: wizardResult.question };
  }

  // Salvar estado e enviar primeira pergunta
  await db.collection("users").doc(uid).update({ waPendingWizard: wizardResult });
  return { handled: true, reply: wizardResult.question };
}

async function addEntryToUser(db, uid, entry) {
  const userRef = db.collection("users").doc(uid);
  const doc = await userRef.get();
  if (!doc.exists) return false;
  const data = doc.data();
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const newEntry = {
    id: Date.now(),
    date: entry.date || new Date().toISOString().slice(0, 10),
    type: entry.type,
    desc: entry.desc || entry.category,
    category: entry.category,
    value: entry.value,
    account: entry.account || "Carteira física",
    status: "pago",
    formaPgto: entry.formaPgto || "",
  };
  entries.push(newEntry);
  await userRef.update({ entries, updated: new Date().toISOString() });
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
  if (!token || !pid) {
    logError(
      "wa send",
      "missing token/phone_number_id",
      new Error("WHATSAPP_TOKEN e/ou WHATSAPP_PHONE_NUMBER_ID não configurados"),
      { pid }
    );
    return false;
  }

  // Meta Cloud API espera um número em formato E.164 sem o '+', ex.: 5511999999999
  // O legacy remove não-dígitos, mas pode chegar só com DDD+numero (10/11 dígitos).
  // Para o Sibanki (Brasil), prefixamos 55 quando aplicável.
  const rawDigits = String(to || "").replace(/\D/g, "");
  let digits = rawDigits;
  if (digits && (digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    digits = "55" + digits;
  }
  if (!digits || digits.length < 10) {
    logError(
      "wa send",
      "invalid recipient phone",
      new Error("Telefone inválido para enviar WhatsApp"),
      { toRaw: to, digits }
    );
    return false;
  }
  try {
    const res = await fetch(`${META_API}/${pid}/messages`, {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      body:JSON.stringify({
        messaging_product:"whatsapp",
        recipient_type:"individual",
        to: digits,
        type:"text",
        text:{body:text,preview_url:false}
      })
    });
    const json=await res.json();
    if(json.error){
      logError(
        "wa send error",
        "graph api",
        new Error(json.error.message || "Erro ao enviar mensagem (WhatsApp)"),
        { pid, to: digits, error: json.error }
      );
      return false;
    }
    return true;
  } catch(e){
    logError("wa send","fetch exception", e, { pid, to: digits });
    return false;
  }
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
  parseMessageToEntry, parsePartialEntry, addEntryToUser,
  handleWizardMessage,
  sendWhatsAppText, consultorIA,
  sendWhatsAppInviteFamilia, sendWhatsAppInviteConsorcio, sendWhatsAppInviteCrediAmigo,
  notifyConsorcioVencimento, notifyConsorcioInadimplente, notifyConsorcioSorteio,
  notifyCrediAmigoVencimento,
  DEFAULT_CATS
};
