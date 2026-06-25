/**
 * whatsappCommandHandler.js
 * Roteamento e handlers de comandos do WhatsApp Business bot.
 *
 * Processa mensagens texto de usuários vinculados e despacha para
 * o handler correto (saldo, resumo, metas, consórcio, crediamigo,
 * boletos, cpf, wizard de lançamento, consultor IA).
 *
 * Extraído de functions/index.js para facilitar testes unitários.
 */
const admin = require("firebase-admin");
const { logError } = require("../../logger");

const fmtBRL = (v) =>
  "R$ " + Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

// ── Handlers de comando ───────────────────────────────────────────────────────

async function handleVinculacao(db, code, from, reply) {
  const codeDoc = await db.collection("whatsappCodes").doc(code).get();
  if (!codeDoc.exists) return reply("❌ Código inválido ou expirado. Gere um novo no app: Configurações > WhatsApp.");
  const { uid, expiresAt } = codeDoc.data();
  if (new Date(expiresAt).getTime() <= Date.now()) {
    return reply("❌ Código inválido ou expirado. Gere um novo no app: Configurações > WhatsApp.");
  }
  await db.collection("users").doc(uid)
    .update({ whatsappPhone: from, updated: new Date().toISOString() });
  await db.collection("whatsappCodes").doc(code).delete();
  const userDoc = await db.collection("users").doc(uid).get();
  const nome = userDoc.data()?.name?.split(" ")[0] || "você";
  return reply(
    `✅ Olá *${nome}*! WhatsApp vinculado ao Sibanki com sucesso!\n\n` +
    `🤖 *O que posso fazer:*\n\n📝 *Lançar despesa/receita*\n_"Gastei 80 no mercado"_\n_"Recebi 2000 de salário"_\n\n` +
    `💬 *Consultor IA* — pergunte qualquer coisa sobre suas finanças\n_"Como estou esse mês?"_\n_"Onde estou gastando mais?"_\n\n` +
    `📊 Comandos: *saldo · resumo · metas · consorcio · crediamigo · ajuda*`
  );
}

function handleNaoVinculado(reply) {
  return reply(
    `👋 Olá! Para usar o Sibanki pelo WhatsApp:\n\n` +
    `1. Abra o app em *sibanki.com.br*\n2. Vá em ⚙️ Configurações > WhatsApp\n` +
    `3. Toque em *Gerar código*\n4. Envie o código de 6 dígitos aqui`
  );
}

function handleAjuda(nome, reply) {
  return reply(
    `👋 Oi *${nome}*! Sou o assistente do Sibanki.\n\n` +
    `📝 *Lançar gasto/receita:*\n"Gastei 80 no restaurante"\n"Recebi 1500 de freela"\n\n` +
    `💬 *Consultor IA:*\nPergunte qualquer coisa sobre suas finanças!\n\n` +
    `📊 *Comandos rápidos:*\n*saldo* — ver saldos das contas\n*resumo* — balanço do mês\n` +
    `*metas* — progresso das metas\n*consorcio* — grupos ativos\n*crediamigo* — empréstimos ativos\n\n` +
    `🔗 sibanki.com.br`
  );
}

function handleSaldo(userData, reply) {
  const contas   = userData.accounts || [];
  const balances = userData.accountBalances || {};
  if (!contas.length) return reply("Nenhuma conta cadastrada. Adicione no app Sibanki!");
  const total = contas.reduce((s, c) => s + (Number(balances[c]) || 0), 0);
  const linhas = contas.map((c) => `• ${c}: *${fmtBRL(balances[c] || 0)}*`).join("\n");
  return reply(`💰 *Seus saldos:*\n\n${linhas}\n\n📊 *Total: ${fmtBRL(total)}*`);
}

function handleResumo(userData, reply) {
  const entries    = Array.isArray(userData.entries) ? userData.entries : [];
  const mes        = new Date().toISOString().slice(0, 7);
  const mesEntries = entries.filter(
    (e) => e.date?.startsWith(mes) && !e.isTransfer && e.category !== "Transferencia"
  );
  const rec  = mesEntries.filter((e) => e.type === "receita").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const desp = mesEntries.filter((e) => e.type === "despesa").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const saldo    = rec - desp;
  const pct      = rec > 0 ? Math.round((desp / rec) * 100) : 0;
  const mesNome  = new Date().toLocaleString("pt-BR", { month: "long" });
  const emoji    = saldo >= 0 ? "✅" : "⚠️";
  const catMap   = {};
  mesEntries.filter((e) => e.type === "despesa").forEach((e) => {
    catMap[e.category] = (catMap[e.category] || 0) + Number(e.value);
  });
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([c, v]) => `  • ${c}: ${fmtBRL(v)}`).join("\n");
  return reply(
    `📊 *Resumo de ${mesNome}*\n\n` +
    `📈 Receitas: ${fmtBRL(rec)}\n📉 Despesas: ${fmtBRL(desp)}\n${emoji} Saldo: *${fmtBRL(saldo)}*\n` +
    `📈 Uso da renda: ${pct}%\n\n🏷 *Maiores gastos:*\n${topCats || "  Nenhum lançamento"}\n\n` +
    `📝 ${mesEntries.length} lançamentos no mês`
  );
}

function handleMetas(userData, reply) {
  const goals = Array.isArray(userData.goals) ? userData.goals : [];
  if (!goals.length) return reply("Nenhuma meta cadastrada. Crie metas no app Sibanki! 🎯");
  const linhas = goals.slice(0, 5).map((g) => {
    const atual = Number(g.atual || g.current || g.saved || 0);
    const alvo  = Number(g.alvo || g.target || 1);
    const pct   = Math.min(100, Math.round((atual / alvo) * 100));
    const bar   = "▓".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));
    return `🎯 *${g.nome || g.name}*\n${bar} ${pct}%\n_${fmtBRL(atual)} de ${fmtBRL(alvo)}_`;
  }).join("\n\n");
  return reply(`🎯 *Suas Metas*\n\n${linhas}`);
}

async function handleConsorcio(db, uid, reply) {
  const grupos = await db.collection("users").doc(uid)
    .collection("consorcio_grupos")
    .where("status", "==", "ativo")
    .limit(5).get();
  if (grupos.empty) {
    return reply("Você não tem grupos de Consórcio Amigos ativos.\n\nCrie um no app: Menu > Social > Consórcio Amigos 🤝");
  }
  const linhas = grupos.docs.map((d) => {
    const g     = d.data();
    const bolo  = (g.valorParcela || 0) * (g.numParticipantes || 0);
    const parts = Array.isArray(g.participantes) ? g.participantes : [];
    const pagaram = parts.filter((p) => p.statusMes === "pago").length;
    return `🤝 *${g.nome}*\nBolo: ${fmtBRL(bolo)} | Pagaram: ${pagaram}/${parts.length} | Dia ${g.diaVencimento}`;
  }).join("\n\n");
  return reply(`🤝 *Consórcio Amigos*\n\n${linhas}\n\nGerencie no app: sibanki.com.br`);
}

async function handleCrediAmigo(db, uid, reply) {
  const emps = await db.collection("users").doc(uid)
    .collection("crediamigo")
    .where("status", "==", "ativo")
    .limit(5).get();
  if (emps.empty) {
    return reply("Você não tem empréstimos ativos no Credi Amigo.\n\nRegistre no app: Menu > Social > Credi Amigo 💸");
  }
  const linhas = emps.docs.map((d) => {
    const e    = d.data();
    const rest = (e.valorTotal || 0) - (e.valorPago || 0);
    const ico  = e.tipo === "emprestei" ? "📤" : "📥";
    return `${ico} *${e.amigo}* — ${fmtBRL(rest)} restante\n_${e.numParcelas}x de ${fmtBRL(e.valorParcela)}_`;
  }).join("\n\n");
  return reply(`💸 *Credi Amigo*\n\n${linhas}\n\nGerencie no app: sibanki.com.br`);
}

async function handleBoletos(db, uid, reply) {
  const boletosSnap = await db.collection("users").doc(uid)
    .collection("ddaBoletos")
    .where("status", "==", "pendente")
    .orderBy("vencimento", "asc")
    .limit(5).get().catch(() => null);

  if (boletosSnap && !boletosSnap.empty) {
    const linhas = boletosSnap.docs.map((d) => {
      const b    = d.data();
      const venc = b.vencimento ? new Date(b.vencimento).toLocaleDateString("pt-BR") : "—";
      return `📄 *${b.beneficiario}* — ${fmtBRL(b.valor)}\nVence: ${venc}`;
    }).join("\n\n");
    return reply(`📄 *Seus boletos pendentes:*\n\n${linhas}\n\nVeja todos no app: sibanki.com.br`);
  }
  return reply(
    `📄 *Boletos DDA*\n\nNenhum boleto DDA sincronizado ainda.\n\n` +
    `Conecte seu banco via Open Finance no app para ver todos os boletos automaticamente:\n` +
    `sibanki.com.br > Contas > Conectar banco 🏦`
  );
}

function handleCpf(userData, reply) {
  const cpf = userData.cpfMonitoring;
  if (cpf && cpf.score) {
    const band = cpf.score < 400 ? "Muito Baixo ⚠️"
      : cpf.score < 600 ? "Regular 🟡"
      : cpf.score < 750 ? "Bom 🟢"
      : "Excelente 🌟";
    const negs   = cpf.negativacoesCount || 0;
    const alerts = Array.isArray(cpf.alertas) ? cpf.alertas.filter((a) => !a.lido).length : 0;
    return reply(
      `🛡️ *Meu CPF*\n\nScore: *${cpf.score}* — ${band}\n` +
      `Negativações: ${negs === 0 ? "✅ Nenhuma" : `⚠️ ${negs} ativas`}\n` +
      `Alertas não lidos: ${alerts}\n\nDetalhes completos no app:\nsibanki.com.br > Meu CPF`
    );
  }
  return reply(
    `🛡️ *Monitoramento de CPF*\n\nSeu CPF ainda não está conectado a um bureau de crédito.\n\n` +
    `Acesse o app para ativar:\nsibanki.com.br > Meu CPF > Conectar bureau\n\nMonitoramos: Serasa, Boa Vista e SPC Brasil 🔍`
  );
}

// ── Router principal ──────────────────────────────────────────────────────────

/**
 * Roteia uma mensagem de WhatsApp para o handler correto.
 * @param {object} opts
 * @param {FirebaseFirestore.Firestore} opts.db
 * @param {string} opts.from — número do remetente
 * @param {string} opts.text — texto da mensagem
 * @param {object} opts.whatsappSvc — serviço de envio WA
 * @param {string} opts.phoneNumberId
 * @returns {Promise<void>}
 */
async function routeWhatsAppMessage({ db, from, text, whatsappSvc, phoneNumberId }) {
  const reply = (txt) => whatsappSvc.sendWhatsAppText(phoneNumberId, from, txt);
  const tl    = text.toLowerCase();

  // ── 1. Vinculação por código 6 dígitos ──
  if (/^\d{6}$/.test(text)) {
    return handleVinculacao(db, text, from, reply);
  }

  // ── 2. Usuário vinculado? ──
  const userSnap = await db.collection("users")
    .where("whatsappPhone", "==", from).limit(1).get();
  if (userSnap.empty) return handleNaoVinculado(reply);

  const uid      = userSnap.docs[0].id;
  const userData = userSnap.docs[0].data();
  const nome     = (userData.name || "").split(" ")[0] || "você";

  // ── 3. Comandos rápidos ──
  if (/^(oi|olá|ola|menu|ajuda|help|start)$/.test(tl)) return handleAjuda(nome, reply);
  if (/^(saldo|saldos|contas)$/.test(tl))               return handleSaldo(userData, reply);
  if (/^(resumo|balanço|balanco|mes|mês)$/.test(tl))    return handleResumo(userData, reply);
  if (/^(metas?|objetivos?)$/.test(tl))                 return handleMetas(userData, reply);
  if (/^(cons[oó]rcio|caixa)$/.test(tl))               return handleConsorcio(db, uid, reply);
  if (/^(credi\s?amigo|empréstimos?|emprestimos?)$/.test(tl)) return handleCrediAmigo(db, uid, reply);
  if (/^(boletos?|dda|vencimentos?)$/.test(tl))         return handleBoletos(db, uid, reply);
  if (/^(cpf|score|score[\s-]?cpf|credito)$/.test(tl)) return handleCpf(userData, reply);

  // ── 4. Wizard de lançamento guiado ──
  const wizardResult = await whatsappSvc.handleWizardMessage(db, uid, userData, text);
  if (wizardResult.handled) return reply(wizardResult.reply);

  // ── 5. Consultor IA — fallback para tudo não reconhecido ──
  const entries    = Array.isArray(userData.entries) ? userData.entries : [];
  const mes        = new Date().toISOString().slice(0, 7);
  const mesEntries = entries.filter((e) => e.date?.startsWith(mes) && !e.isTransfer);
  const rec        = mesEntries.filter((e) => e.type === "receita").reduce((s, e) => s + Number(e.value || 0), 0);
  const desp       = mesEntries.filter((e) => e.type === "despesa").reduce((s, e) => s + Number(e.value || 0), 0);
  const catMap     = {};
  mesEntries.filter((e) => e.type === "despesa").forEach((e) => {
    catMap[e.category] = (catMap[e.category] || 0) + Number(e.value);
  });
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([c, v]) => `${c}: ${fmtBRL(v)}`).join(", ");
  const contexto = (
    `Nome: ${userData.name || "Usuário"}. Mês atual: receitas ${fmtBRL(rec)}, despesas ${fmtBRL(desp)}, ` +
    `saldo ${fmtBRL(rec - desp)}. Top categorias: ${topCats || "sem dados"}. ` +
    `Metas: ${(userData.goals || []).length} cadastradas.`
  );
  const resposta = await whatsappSvc.consultorIA(uid, text, contexto);
  return reply(resposta);
}

module.exports = { routeWhatsAppMessage };
