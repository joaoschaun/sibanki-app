const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const fetch = require("node-fetch");
const { fetchJson, fetchText } = require("./httpClient");
const { logEvent, logError } = require("./logger");
const {
  BRAPI_TOKEN,
  BRAPI_BASE,
  GNEWS_KEY,
  NEWSDATA_KEY,
  STRIPE_WEBHOOK_SECRET,
  getStripe,
  RESEND_API_KEY,
  RESEND_FROM,
  GEMINI_KEY,
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN
} = require("./config");
const brapiService = require("./services/market/brapiService");
const newsService = require("./services/news/newsService");
const stripeService = require("./services/billing/stripeService");
const whatsappService = require("./services/whatsapp/whatsappService");
const { generateAnalysis, generateProactiveInsight } = require("./services/llm/llmService");

// Load .env for local development (mantido por compatibilidade)
try { require("dotenv").config(); } catch(e) {}

// Initialize admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// =============================================
// STRIPE: delega para serviço de billing
// =============================================
exports.createCheckout = functions.https.onCall(async (data, context) => {
  return stripeService.createCheckout(data, context);
});

exports.createPortal = functions.https.onCall(async (data, context) => {
  return stripeService.createPortal(data, context);
});

exports.getUserPlan = functions.https.onCall(async (data, context) => {
  return stripeService.getUserPlan(data, context);
});

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  return stripeService.handleStripeWebhook(req, res);
});

// =============================================
// BRAPI: delega para serviço de mercado
// =============================================
exports.brapiQuote = functions.https.onCall(async (data, context) => {
  return brapiService.quote(data, context);
});

exports.brapiMulti = functions.https.onCall(async (data, context) => {
  return brapiService.multi(data, context);
});

exports.brapiSearch = functions.https.onCall(async (data, context) => {
  return brapiService.search(data, context);
});

exports.brapiCrypto = functions.https.onCall(async (data, context) => {
  return brapiService.crypto(data, context);
});

exports.brapiInflation = functions.https.onCall(async (data, context) => {
  return brapiService.inflation(data, context);
});

// =============================================
// NEWS: RSS PARSER HELPER
// =============================================
function parseRSSItems(xml, source, category) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const getTag = (tag) => {
      const r = new RegExp("<" + tag + "[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\/" + tag + ">", "s");
      const m = block.match(r);
      return m ? m[1].trim() : "";
    };
    const title = getTag("title");
    if (!title || title === "[Removed]") continue;

    let image = "";
    const mediaMatch = block.match(/url="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    if (mediaMatch) image = mediaMatch[1];
    if (!image) {
      const imgMatch = block.match(/<img[^>]+src="(https?:\/\/[^"]+)"/i);
      if (imgMatch) image = imgMatch[1];
    }
    const enclosureMatch = block.match(/<enclosure[^>]+url="(https?:\/\/[^"]+)"/i);
    if (!image && enclosureMatch) image = enclosureMatch[1];

    items.push({
      title: title.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
      description: getTag("description").replace(/<[^>]+>/g, "").substring(0, 200),
      url: getTag("link"),
      image: image,
      source: source,
      category: category,
      publishedAt: getTag("pubDate") || new Date().toISOString()
    });
  }
  return items;
}

// =============================================
// NEWS: AGGREGATOR (4 sources + Brazilian RSS)
// =============================================
exports.getNews = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const category = req.query.category || "all";
      const forceRefresh = req.query.refresh === "true";
      const result = await newsService.getNews({ category, forceRefresh });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// =============================================
// NEWS: DAILY BRIEFING (Altas/Baixas + Índices)
// =============================================
exports.getDailyBriefing = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const forceRefresh = req.query.refresh === "true";
      const briefing = await newsService.getDailyBriefing({ forceRefresh });
      res.json(briefing);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// =============================================
// CONVITE FAMÍLIA: enviar e-mail com template profissional (Resend)
// =============================================
const APP_URL = process.env.APP_URL || "https://virtus-financeiro-cd7bd.web.app/app";
const { getFamilyInviteEmailHtml } = require("./templates/familyInviteEmail");
const { getVerifyEmailHtml } = require("./templates/verifyEmail");
const { getWeeklySummaryEmailHtml } = require("./templates/weeklySummaryEmail");
const { getConsorcioInviteEmailHtml } = require("./templates/consorcioInviteEmail");
const { getCrediAmigoInviteEmailHtml } = require("./templates/crediAmigoInviteEmail");

function getResendApiKey() {
  return process.env.RESEND_API_KEY ||
    (functions.config().resend && functions.config().resend.api_key) ||
    "";
}

function genCodigoConvite() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

exports.sendFamilyInviteEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar o convite.");
  }
  const { inviteId, toEmail, fromName } = data || {};
  if (!inviteId || !toEmail) {
    throw new functions.https.HttpsError("invalid-argument", "inviteId e toEmail são obrigatórios.");
  }
  const inviteSnap = await db.collection("invites").doc(inviteId).get();
  if (!inviteSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Convite não encontrado.");
  }
  const invite = inviteSnap.data();
  if (invite.from !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Este convite não é seu.");
  }
  if (invite.status !== "pending") {
    return { ok: false, message: "Convite já foi usado ou cancelado." };
  }

  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { ok: false, error: "EMAIL_NOT_CONFIGURED", message: "Envio por e-mail não configurado." };
  }

  const nomeConvidador = fromName || invite.fromName || "Seu parceiro(a)";
  const inviteLink = APP_URL + "#invite=" + inviteId;
  const codigoConvite = invite.codigoConvite || genCodigoConvite();

  if (!invite.codigoConvite) {
    await db.collection("invites").doc(inviteId).update({ codigoConvite });
  }

  const html = getFamilyInviteEmailHtml(nomeConvidador, inviteLink, codigoConvite);
  const subject = nomeConvidador + " te convidou para gerenciar as finanças juntos no Sibanki 💑";

  try {
    const { Resend } = require("resend");
    const resend = new Resend(apiKey);
    const { data: sendData, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [toEmail],
      subject,
      html
    });
    if (error) {
      logError("Resend error", { error });
      return { ok: false, message: error.message || "Falha ao enviar e-mail." };
    }
    return { ok: true, messageId: sendData?.id };
  } catch (e) {
    logError("sendFamilyInviteEmail", e);
    throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail. Tente novamente.");
  }
});

// =============================================
// VERIFICAÇÃO DE E-MAIL (Resend) - mesmo fluxo do módulo família
// =============================================
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para reenviar o e-mail.");
  }
  let email = context.auth.token.email;
  if (!email) {
    const userRecord = await admin.auth().getUser(context.auth.uid);
    email = userRecord.email;
  }
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "E-mail não encontrado.");
  }
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "Envio por e-mail não configurado.");
  }
  try {
    const continueUrl = (data && data.continueUrl) || APP_URL;
    const link = await admin.auth().generateEmailVerificationLink(email, { url: continueUrl });
    const html = getVerifyEmailHtml(link);
    const { Resend } = require("resend");
    const resend = new Resend(apiKey);
    const { data: sendData, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [email],
      subject: "Confirme seu e-mail - Sibanki",
      html
    });
    if (error) {
      logError("Resend verification error", { error });
      throw new functions.https.HttpsError("internal", error.message || "Falha ao enviar e-mail.");
    }
    return { ok: true, messageId: sendData?.id };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("sendVerificationEmail", e);
    throw new functions.https.HttpsError("internal", "Erro ao enviar e-mail. Tente novamente.");
  }
});

// =============================================
// RESUMO SEMANAL POR E-MAIL (agendado: segunda 8h BRT)
// =============================================
function computeWeeklySummary(entries, startDateStr, endDateStr) {
  const valid = (e) =>
    e &&
    e.date &&
    !e.isTransfer &&
    e.category !== "Transferencia" &&
    e.status !== "pendente" &&
    e.status !== "agendado" &&
    e.date >= startDateStr &&
    e.date <= endDateStr;
  const list = Array.isArray(entries) ? entries.filter(valid) : [];
  const receitaTotal = list.filter((e) => e.type === "receita").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const despesaTotal = list.filter((e) => e.type === "despesa").reduce((s, e) => s + (Number(e.value) || 0), 0);
  const byCat = {};
  list.filter((e) => e.type === "despesa" && e.category).forEach((e) => {
    byCat[e.category] = (byCat[e.category] || 0) + (Number(e.value) || 0);
  });
  const topCategorias = Object.entries(byCat)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  return { receitaTotal, despesaTotal, topCategorias };
}

function formatDateBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

exports.weeklySummary = functions.pubsub
  .schedule("every monday 08:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    const apiKey = getResendApiKey();
    if (!apiKey) {
      logError("weeklySummary", new Error("RESEND_API_KEY not configured"));
      return null;
    }
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const toStr = (d) => d.toISOString().slice(0, 10);
    const startDateStr = toStr(start);
    const endDateStr = toStr(end);

    const snap = await db.collection("users").where("resumoSemanalEmail", "==", true).get();
    const { Resend } = require("resend");
    const resend = new Resend(apiKey);

    for (const doc of snap.docs) {
      const d = doc.data();
      let email = d.email;
      if (!email) {
        try {
          const userRecord = await admin.auth().getUser(doc.id);
          email = userRecord.email;
        } catch (e) {
          logError("weeklySummary getUser", { uid: doc.id, error: e.message });
          continue;
        }
      }
      if (!email) continue;

      const entries = d.entries || [];
      const { receitaTotal, despesaTotal, topCategorias } = computeWeeklySummary(entries, startDateStr, endDateStr);
      const nome = d.name || "Usuário";
      const html = getWeeklySummaryEmailHtml(
        nome,
        receitaTotal,
        despesaTotal,
        topCategorias,
        formatDateBR(startDateStr),
        formatDateBR(endDateStr),
        APP_URL
      );
      try {
        const { error } = await resend.emails.send({
          from: RESEND_FROM,
          to: [email],
          subject: "Seu resumo da semana — Sibanki",
          html
        });
        if (error) logError("weeklySummary Resend", { uid: doc.id, error });
      } catch (e) {
        logError("weeklySummary send", { uid: doc.id, error: e.message });
      }
    }
    return null;
  });

// =============================================
// CHAT IA (Gemini) - usado pelo FAB e módulo IA do app
// =============================================
const RAG_KNOWLEDGE = {
  reserva: `Reserva de emergência: dinheiro guardado para imprevistos (desemprego, saúde, conserto). Primeira prioridade financeira. Mínimo 3 meses de gastos essenciais; ideal 6 meses de gastos totais; autônomo/instável até 12 meses. Deve ficar em aplicação de liquidez imediata (Tesouro Selic, CDB liquidez diária). Nunca usar para viagem, impulso ou investimento arriscado.`,
  imprevisto: `Imprevistos: gastos não planejados (conserto, saúde, multa). Estratégias: 1) Usar reserva de emergência se existir. 2) Cortar gastos não essenciais do mês. 3) Renegociar ou adiar contas não urgentes. 4) Evitar empréstimo com juros altos; se inevitável, comparar taxas e prazos. Sempre priorize o essencial (moradia, alimentação, saúde).`,
  divida: `Dívidas: priorize quitar as de juros mais altos primeiro (cartão, cheque especial). Negocie com o credor: parcelamento, desconto à vista, refinanciamento. Evite contrair novas dívidas para pagar antigas, exceto se a nova taxa for bem menor. Liste todas as dívidas (valor, taxa, parcela) para ter visão clara.`,
  seguro: `Seguros: protegem patrimônio e renda. Seguro de vida e residencial são os mais relevantes para famílias. Avalie custo-benefício; evite seguros desnecessários. Para veículo, compare coberturas e franquias.`,
  consorcio: `Consórcio: alternativa ao financiamento para compra de bem (carro, imóvel). Não tem juros explícitos, mas tem taxa de administração e depende de sorteio ou lance. Compare com financiamento; pode ser vantajoso para quem consegue dar lances e antecipar.`,
  emprestimo: `Empréstimos: compare sempre Custo Efetivo Total (CET) e prazo. Evite para consumo; prefira para investimento ou emergência real. Renegocie dívidas existentes antes de assumir novas.`,
  sistema: `Sibanki: app de controle financeiro pessoal. Funcionalidades principais: Lançamentos (receitas e despesas por data, categoria e conta); Contas bancárias (várias contas com saldo); Cartões de crédito (limite, fechamento, vencimento, compras); Metas financeiras (valor alvo e acompanhamento); Orçamento por categoria (limite mensal por categoria); Relatórios e dashboard. O usuário pode usar o botão de chat (FAB) para falar com o consultor e fazer lançamentos ou pedir ações por texto.`,
  comportamento: `Comportamento financeiro (psicologia econômica): Viés do presente — tendemos a valorizar mais o agora que o futuro; por isso poupar exige regras (automático, antes de gastar). Viés do custo afundado — não mantenha um gasto ou investimento ruim só porque já gastou; avalie daqui pra frente. Efeito manada — evite decisões por modismo (cripto, ações da vez); tenha critérios próprios. Compensação moral — gastar mais depois de "ter se controlado" anula o ganho; evite recompensas em consumo. Conta mental — dinheiro "separado" (mesada, bônus) é gasto com mais facilidade; trate toda renda como uma só. Recomendações: automatize poupança, defina limites por categoria, revise gastos com calma (não no calor do momento), celebre pequenas vitórias sem gastar.`,
  vieses: `Mais vieses comportamentais em dinheiro: Aversão à perda — perdemos mais satisfação ao perder R$ 100 do que ganhamos ao ganhar R$ 100; por isso muita gente evita vender investimento no prejuízo (mesmo quando faz sentido) ou assume riscos demais para "recuperar". Âncora — o primeiro número que vemos (preço à vista, parcela) influencia o que achamos "justo"; compare sempre com alternativas. Otimismo excessivo — subestimamos gastos e prazos; use margem de segurança no orçamento. Falácia do custo afundado — "já gastei tanto que tenho que continuar"; a decisão certa é pela frente, não pelo que já passou. Para decidir melhor: espere 24h em compras grandes, escreva prós e contras, consulte alguém de confiança.`,
  livros: `Princípios de educação financeira (inspirados em clássicos): (1) Pague a si primeiro — reserve parte da renda para reserva e metas antes de pagar contas. (2) Diferencie ativo e passivo — ativo gera receita ou valor; passivo gera despesa; priorize acumular ativos. (3) Conheça seus números — receita, despesa, patrimônio; só quem mede melhora. (4) Orçamento é liberdade — não é restrição, é saber onde o dinheiro vai para escolher com consciência. (5) Juros compostos a seu favor — poupar cedo e de forma consistente vale mais que valores altos tarde. (6) Emergência primeiro — reserva de 3–6 meses de gastos antes de investir em risco. (7) Evite dívida para consumo — use crédito com plano de pagamento; evite parcelar o que não é essencial. (8) Educação financeira contínua — leia, aprenda, ajuste; o contexto de cada um é único.`,
  investimentos: `Investimentos básicos (conceitos): CDI — taxa que reflete o custo do dinheiro entre bancos; renda fixa costuma ser referenciada a ele (ex.: 100% do CDI). Inflação — IPCA mede o aumento de preços; investimentos devem superar a inflação para não perder poder de compra. Diversificação — não coloque tudo em um ativo; distribua entre renda fixa, ações, fundos, para reduzir risco. Liquidez — facilidade de resgatar; reserva de emergência precisa de liquidez diária (Tesouro Selic, CDB diário). Risco e retorno — maior retorno esperado costuma vir com maior risco; alinhe investimentos ao seu prazo e perfil. Ordem prática: 1) Reserva de emergência (liquidez). 2) Quitar dívidas caras. 3) Metas de curto/médio prazo (renda fixa). 4) Longo prazo (diversificar conforme perfil).`
};
function getRagChunksForMessage(message) {
  const m = (message || "").toLowerCase();
  const out = [];
  if (/reserva|emergência|emergencia|guardar|poupança/.test(m)) out.push(RAG_KNOWLEDGE.reserva);
  if (/imprevisto|imprevistos|emergência|emergencia|conserto|inesperado/.test(m)) out.push(RAG_KNOWLEDGE.imprevisto);
  if (/dívida|divida|dívidas|dividas|emprestimo|empréstimo|cartão|cartao|juros/.test(m)) out.push(RAG_KNOWLEDGE.divida);
  if (/seguro|seguros/.test(m)) out.push(RAG_KNOWLEDGE.seguro);
  if (/consórcio|consorcio/.test(m)) out.push(RAG_KNOWLEDGE.consorcio);
  if (/emprestimo|empréstimo|financiamento|renegociar/.test(m)) out.push(RAG_KNOWLEDGE.emprestimo);
  if (/como (usar|funciona|adicionar|vejo|defino)|onde (fica|cadastr|vejo)|ajuda sobre o sistema|funcionalidade do app|sibanki/.test(m)) out.push(RAG_KNOWLEDGE.sistema);
  if (/comportamento|psicologia|viés|vies|habito|hábito|impulso|gastar|compra por|livro|educação financeira|pagar a si primeiro|ativo e passivo|juros compostos|princípio/.test(m)) out.push(RAG_KNOWLEDGE.comportamento);
  if (/aversão à perda|ancora|âncora|viés|vies|decisão|decisão errada|custo afundado|otimismo|perda|ganho/.test(m)) out.push(RAG_KNOWLEDGE.vieses);
  if (/comportamento|psicologia|livro|educação financeira|pagar a si primeiro|ativo e passivo|juros compostos|princípio|babilônia|rico|pobre|poupar|investir/.test(m)) out.push(RAG_KNOWLEDGE.livros);
  if (/investir|investimento|cdi|ipca|inflação|inflacao|diversificar|renda fixa|tesouro|reserva|aplicação|aplicar/.test(m)) out.push(RAG_KNOWLEDGE.investimentos);
  return out.length ? out.join("\n\n") : "";
}
const CONSULTOR_SYSTEM_INSTRUCTION = `Você é o Sibanki IA, consultor financeiro pessoal do app. Regras obrigatórias:

PAPEL: Especialista em finanças pessoais, investimentos, empréstimos, consórcios, seguros e comportamento financeiro. Seja empático, sem julgamento, e proativo.

AJUDA SOBRE O SISTEMA (Sibanki):
- Se o usuário perguntar como usar o app, onde fica algo ou como funciona uma função, explique de forma clara e objetiva.
- O app tem: lançamentos (receitas/despesas), contas bancárias, cartões de crédito, metas financeiras, orçamento por categoria, relatórios e dashboard. Pode sugerir usar o botão flutuante (FAB) para falar com você e fazer lançamentos ou alterações por voz/texto.
- Exemplos: "como adicionar uma conta?", "onde vejo minhas metas?", "como definir orçamento?" — responda indicando as abas/funcionalidades de forma amigável.

DÚVIDAS FINANCEIRAS E EDUCAÇÃO:
- Responda dúvidas sobre conceitos (juros, CDI, reserva de emergência, investimentos, dívidas, consórcio, seguro etc.) de forma didática e em português brasileiro.
- Use os dados do usuário (receita, despesa, metas, contas) quando fornecidos no contexto para personalizar a resposta.

EMPATIA E CENÁRIOS:
- Considere sempre o contexto da pessoa: quem está juntando reserva, quem está endividado, quem teve imprevisto.
- Se os dados indicam saldo negativo ou alto % de gasto, seja acolhedor e sugira passos concretos (não só "tenha reserva").
- Para imprevistos: sugira como encaixar no mês, priorizar gastos, usar reserva se houver, ou alternativas (linha de crédito só se fizer sentido).
- Para dívidas: priorize quitar juros altos, sugerir renegociação ou parcelamento quando relevante.
- Mencione reserva de emergência (ideal 3–6 meses de gastos) quando fizer sentido, mas adapte ao momento da pessoa.

COMUNICAÇÃO:
- Respostas em português brasileiro, práticas e acionáveis.
- Use emojis com moderação para tornar a leitura agradável.
- Seja específico com valores em R$ quando os dados do usuário permitirem.
- Não invente dados que não foram fornecidos no contexto.`;

const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";
const chatApiOptions = enforceAppCheck ? { enforceAppCheck: true } : {};

exports.chatApi = functions.runWith(chatApiOptions).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para usar a IA.");
  }
  const message = (data && data.message) ? String(data.message).trim() : "";
  if (!message) {
    throw new functions.https.HttpsError("invalid-argument", "Mensagem vazia.");
  }
  // GEMINI_KEY ainda pode ser usada mas o llmService tem fallback automático para Groq/OpenAI/Claude
  const contextStr = (data && data.context) ? String(data.context).trim() : "";
  const isLegacyFullPrompt = /DADOS (DO USUARIO|DA FAMÍLIA|DO USUÁRIO)/i.test(message);
  let userContent = (contextStr && !isLegacyFullPrompt)
    ? `DADOS DO USUÁRIO (use para personalizar a resposta):\n${contextStr}\n\nPERGUNTA DO USUÁRIO:\n${message}`
    : message;
  const ragChunks = getRagChunksForMessage(message);
  if (ragChunks) {
    userContent = `REFERÊNCIA (use para fundamentar sua resposta, em português):\n${ragChunks}\n\n---\n\n${userContent}`;
  }
  // Chama o llmService com fallback automático: Gemini → Groq → OpenAI → Claude
  try {
    const result = await generateAnalysis(contextStr, userContent);
    if (!result || !result.text) {
      throw new functions.https.HttpsError("resource-exhausted", "Todos os provedores de IA atingiram o limite. Tente em alguns minutos.");
    }
    logEvent("chatApi", { provider: result.provider, uid: context.auth.uid });
    return { reply: result.text };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("chatApi", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao processar. Tente novamente.");
  }
});

/** Insight proativo (consultor invisível): recebe snapshot em markdown, retorna JSON do insight ou { status: "OK" }. */
exports.proactiveInsightApi = functions.runWith(chatApiOptions).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para usar a IA.");
  }
  const snapshot = (data && data.snapshot) ? String(data.snapshot).trim() : "";
  if (!snapshot) {
    throw new functions.https.HttpsError("invalid-argument", "Snapshot vazio.");
  }
  try {
    const result = await generateProactiveInsight(snapshot);
    logEvent("proactiveInsightApi", { hasInsight: !result.status, uid: context.auth.uid });
    return result;
  } catch (e) {
    logError("proactiveInsightApi", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao gerar insight. Tente novamente.");
  }
});

// =============================================
// WHATSAPP BUSINESS (Cloud API) - MVP lançamento por mensagem
// =============================================
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send("Forbidden");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  res.status(200).send("OK");
  const body = req.body;
  const entry = body.entry && body.entry[0];
  const changes = entry && entry.changes && entry.changes[0];
  const value = changes && changes.value;
  const messages = value && value.messages;
  if (!messages || !messages[0]) return;
  const msg = messages[0];
  const from = msg.from;
  const phone = String(from);
  const text = (msg.text && msg.text.body) ? String(msg.text.body).trim() : "";
  if (!text) return;
  const phoneNumberId = value.metadata && value.metadata.phone_number_id ? value.metadata.phone_number_id : WHATSAPP_PHONE_NUMBER_ID;
  const reply = (txt) => whatsappService.sendWhatsAppText(phoneNumberId, phone, txt);

  try {
    const codeMatch = text.match(/^\d{6}$/);
    if (codeMatch) {
      const code = codeMatch[0];
      const codeDoc = await db.collection("whatsappCodes").doc(code).get();
      if (codeDoc.exists) {
        const { uid, expiresAt } = codeDoc.data();
        if (expiresAt && new Date(expiresAt).getTime() > Date.now()) {
          await db.collection("users").doc(uid).update({
            whatsappPhone: phone,
            updated: new Date().toISOString()
          });
          await db.collection("whatsappCodes").doc(code).delete();
          await reply("✅ WhatsApp vinculado ao Sibanki! Agora você pode enviar lançamentos aqui. Ex: \"Gastei 120 no mercado\" ou \"Recebi 500 freela\".");
          return;
        }
      }
    }

    const userSnap = await db.collection("users").where("whatsappPhone", "==", phone).limit(1).get();
    let uid = null;
    if (!userSnap.empty) uid = userSnap.docs[0].id;
    if (!uid) {
      await reply("📱 Vincule seu WhatsApp no app Sibanki: Configurações > WhatsApp > Gerar código e envie o código de 6 dígitos aqui.");
      return;
    }

    const parsed = await whatsappService.parseMessageToEntry(text);
    if (!parsed) {
      await reply("Não consegui entender. Envie algo como: \"Gastei 120 no mercado\" ou \"Recebi 500 de freela\".");
      return;
    }
    await whatsappService.addEntryToUser(db, uid, parsed);
    const tipo = parsed.type === "receita" ? "+" : "-";
    const valor = "R$ " + parsed.value.toFixed(2).replace(".", ",");
    await reply(`✅ Lancei: ${tipo} ${valor} em ${parsed.desc} (${parsed.category}).`);
  } catch (e) {
    logError("whatsappWebhook", e);
    try { await reply("Ocorreu um erro. Tente de novo em instantes."); } catch (_) {}
  }
});

// =============================================
// BRIEFING IA — insight personalizado pós-login
// =============================================
exports.briefingIa = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  }
  const { rec, desp, saldo, pctGasto, patrimonio, metaNome, catEstourada, qtdEntradas } = data || {};
  const prompt = `Você é um consultor financeiro pessoal direto e empático. Analise os dados financeiros deste mês e escreva UM único insight personalizado de no máximo 2 frases curtas. Seja específico com os números. Use linguagem natural, sem markdown, sem títulos.

Dados do mês atual:
- Receitas: R$ ${(rec||0).toFixed(2)}
- Despesas: R$ ${(desp||0).toFixed(2)}
- Saldo: R$ ${(saldo||0).toFixed(2)} (${saldo<0?'NEGATIVO':'positivo'})
- % da receita gasta: ${pctGasto||0}%
- Patrimônio total: R$ ${(patrimonio||0).toFixed(2)}
- Lançamentos registrados: ${qtdEntradas||0}
${metaNome ? `- Meta quase concluída: "${metaNome}"` : ''}
${catEstourada ? `- Orçamento estourado: ${catEstourada}` : ''}

Escreva o insight agora (máx 2 frases, português brasileiro, tom amigável e direto):`;

  try {
    const result = await generateAnalysis("", prompt);
    if (!result || !result.text) throw new Error("sem resposta");
    return { insight: result.text.trim() };
  } catch(e) {
    let fallback = "";
    if (saldo < 0) {
      fallback = `Suas despesas superaram as receitas em R$ ${Math.abs(saldo||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} este mês. Vale revisar os lançamentos e cortar o que for possível.`;
    } else if (pctGasto > 85) {
      fallback = `Você já usou ${pctGasto}% da receita do mês — atenção para não estourar o orçamento nos próximos dias.`;
    } else if (pctGasto > 0) {
      fallback = `Bom controle! Você usou ${pctGasto}% da receita e ainda tem fôlego até o fim do mês.`;
    } else {
      fallback = `Registre suas receitas e despesas para receber um briefing personalizado.`;
    }
    return { insight: fallback };
  }
});

exports.generateWhatsAppCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para vincular o WhatsApp.");
  }
  const uid = context.auth.uid;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.collection("whatsappCodes").doc(code).set({
    uid,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  });
  return { code, expiresIn: 600 };
});

// =============================================
// TELEGRAM BOT
// =============================================
const telegramBot = require("./telegramBot");
exports.telegramWebhook = telegramBot.telegramWebhook;
exports.checkPriceAlerts = telegramBot.checkPriceAlerts;
exports.dailyNews = telegramBot.dailyNews;
exports.weeklyReport = telegramBot.weeklyReport;

// =============================================
// PROGRAMA FILIADO — validação diária de ativação
// =============================================

// Config padrão (sobreposta pela config/filiado do Firestore)
const FILIADO_REWARDS = {
  ativacao:    100,
  openBanking: 200,
  assinou:     500,
};

const FILIADO_MULT = {
  iniciante:  1.0,  // 0-4 ativos
  parceiro:   1.25, // 5-14 ativos
  embaixador: 1.5,  // 15-49 ativos
  elite:      2.0,  // 50+ ativos
};

function getNivelFil(ativos) {
  if (ativos >= 50) return 'elite';
  if (ativos >= 15) return 'embaixador';
  if (ativos >= 5)  return 'parceiro';
  return 'iniciante';
}

async function emitirSibCoin(db, filiadoUid, valor, desc, ref) {
  const mult = FILIADO_MULT[getNivelFil(0)]; // atualizado no batch
  const valorFinal = Math.round(valor * mult);
  const batch = db.batch();

  // Log da transação
  const txRef = db.collection('users').doc(filiadoUid)
                  .collection('sibcoin').doc();
  batch.set(txRef, {
    tipo:  'emissao',
    valor: valorFinal,
    desc,
    ref:   ref || null,
    ts:    admin.firestore.FieldValue.serverTimestamp(),
  });

  // Atualiza saldo do filiado
  const filRef = db.collection('users').doc(filiadoUid)
                   .collection('filiado').doc('dados');
  batch.set(filRef, {
    totalSibCoins: admin.firestore.FieldValue.increment(valorFinal),
  }, { merge: true });

  await batch.commit();
  return valorFinal;
}

/**
 * Roda diariamente — verifica indicados pendentes e credita SibCoins
 * quando critérios de ativação são atendidos.
 */
exports.processarFiliadosDiario = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();

    // Carregar config customizada (se existir)
    try {
      const cfgSnap = await db.collection('config').doc('filiado').get();
      if (cfgSnap.exists) {
        const cfg = cfgSnap.data();
        if (cfg.recompensas) Object.assign(FILIADO_REWARDS, cfg.recompensas);
      }
    } catch (e) { /* usa padrão */ }

    // Buscar todos os usuários com indicados pendentes
    // Estratégia: query por subcoleção via collectionGroup
    const indicadosSnap = await db.collectionGroup('indicados')
      .where('status', '==', 'pendente')
      .limit(200)
      .get();

    if (indicadosSnap.empty) {
      console.log('Filiado: nenhum indicado pendente.');
      return null;
    }

    const promises = indicadosSnap.docs.map(async (doc) => {
      const indicado = doc.data();
      const filiadoUid = doc.ref.parent.parent.id; // users/{filiadoUid}/indicados/{id}
      const indicadoUid = indicado.uid;
      if (!indicadoUid || !filiadoUid) return;

      try {
        // Buscar dados do indicado
        const indSnap = await db.collection('users').doc(indicadoUid).get();
        if (!indSnap.exists) return;
        const indData = indSnap.data();

        const criadoEm = indicado.criadoEm ? indicado.criadoEm.toDate() : new Date();
        const diasDesde = (Date.now() - criadoEm.getTime()) / (1000 * 60 * 60 * 24);
        const lancamentos = (indData.entries || []).length;
        const eventos = indicado.eventos || {};

        const updates = { eventos: { ...eventos } };
        const atualizacoesFil = {};
        let mudou = false;

        // Critério 1: ativação (30 dias + 5 lançamentos)
        if (!eventos.ativacao && diasDesde >= 30 && lancamentos >= 5) {
          updates.eventos.ativacao = true;
          updates.status = 'ativo';
          const sc = await emitirSibCoin(db, filiadoUid, FILIADO_REWARDS.ativacao,
            `Indicado ${indicado.nome || indicado.email} ativou o app`, doc.id);
          updates.sibCoinsGerados = admin.firestore.FieldValue.increment(sc);
          atualizacoesFil.totalAtivos = admin.firestore.FieldValue.increment(1);
          atualizacoesFil.pendentes   = admin.firestore.FieldValue.increment(-1);
          mudou = true;
          console.log(`Filiado ${filiadoUid}: ativação de ${indicadoUid} — +${sc} SC`);
        }

        // Critério 2: Open Banking conectado
        if (!eventos.openBanking && indData.openBankingAtivo === true) {
          updates.eventos.openBanking = true;
          const sc = await emitirSibCoin(db, filiadoUid, FILIADO_REWARDS.openBanking,
            `Indicado ${indicado.nome || indicado.email} conectou Open Finance`, doc.id);
          updates.sibCoinsGerados = admin.firestore.FieldValue.increment(sc);
          mudou = true;
          console.log(`Filiado ${filiadoUid}: Open Banking de ${indicadoUid} — +${sc} SC`);
        }

        // Critério 3: assinou Pro
        if (!eventos.assinou && (indData.plan === 'pro' || indData.plan === 'familia')) {
          updates.eventos.assinou = true;
          const sc = await emitirSibCoin(db, filiadoUid, FILIADO_REWARDS.assinou,
            `Indicado ${indicado.nome || indicado.email} assinou o plano Pro`, doc.id);
          updates.sibCoinsGerados = admin.firestore.FieldValue.increment(sc);
          mudou = true;
          console.log(`Filiado ${filiadoUid}: Pro de ${indicadoUid} — +${sc} SC`);
        }

        if (mudou) {
          // Atualizar doc do indicado
          await doc.ref.set(updates, { merge: true });

          // Atualizar totais do filiado
          if (Object.keys(atualizacoesFil).length > 0) {
            await db.collection('users').doc(filiadoUid)
              .collection('filiado').doc('dados')
              .set(atualizacoesFil, { merge: true });
          }

          // Atualizar nível do filiado
          const filSnap = await db.collection('users').doc(filiadoUid)
            .collection('filiado').doc('dados').get();
          if (filSnap.exists) {
            const ativos = filSnap.data().totalAtivos || 0;
            const nivel  = getNivelFil(ativos);
            await filSnap.ref.set({ nivel }, { merge: true });
          }
        }
      } catch (err) {
        console.error(`Filiado erro em indicado ${doc.id}:`, err.message);
      }
    });

    await Promise.allSettled(promises);
    console.log(`Filiado: processados ${indicadosSnap.docs.length} indicados pendentes.`);
    return null;
  });

/**
 * Callable: registrar Open Banking ativo (chamado pelo app quando usuário conecta)
 */
exports.registrarOpenBanking = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login necessário');
  const uid = context.auth.uid;
  const db = admin.firestore();

  // Marcar usuário como tendo Open Banking ativo
  await db.collection('users').doc(uid).set(
    { openBankingAtivo: true, openBankingAtivoEm: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  // O cron diário processará o crédito. Retorna OK.
  return { success: true };
});

// =============================================
// SOLUÇÕES FINANCEIRAS — Cashback SibCoin por parceiros
// =============================================

/**
 * Taxa de cashback por produto (em % do valor contratado).
 * 1 SibCoin = R$ 0,10 → cashback de 2% em R$5.000 = R$100 = 1.000 SC
 */
const SOL_CASHBACK = {
  emp_pessoal:  0.02,
  emp_fgts:     0.015,
  emp_veiculo:  0.025,
  seg_celular:  0.03,
  seg_vida:     0.03,
  cons_imovel:  0.01,
};

const SOL_NOMES = {
  emp_pessoal:  'Empréstimo Pessoal (Juros Baixos)',
  emp_fgts:     'FGTS Antecipado (Juros Baixos)',
  emp_veiculo:  'Crédito com Garantia de Veículo (Creditas)',
  seg_celular:  'Seguro Celular (Simple2u)',
  seg_vida:     'Seguro de Vida (Simple2u)',
  cons_imovel:  'Consórcio de Imóvel (Embracon)',
};

/**
 * Callable interno: creditar cashback SibCoin após confirmação de contratação.
 * Chamado pela Cloud Function de webhook ou manualmente pelo admin.
 * Parâmetros: { uid, produtoId, valorContratado, contratoId }
 */
exports.creditarCashbackSibCoin = functions.https.onCall(async (data, context) => {
  // Só pode ser chamado autenticado OU por admin (uid passado explicitamente)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login necessário');
  }

  const { produtoId, valorContratado, contratoId } = data;
  const uid = context.auth.uid;
  const db = admin.firestore();

  if (!produtoId || !SOL_CASHBACK[produtoId]) {
    throw new functions.https.HttpsError('invalid-argument', 'Produto inválido');
  }
  if (!valorContratado || isNaN(valorContratado) || valorContratado <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valor inválido');
  }

  // Verificar se este contratoId já foi processado (idempotência)
  if (contratoId) {
    const existing = await db.collection('users').doc(uid)
      .collection('sibcoin').where('contratoId', '==', contratoId).limit(1).get();
    if (!existing.empty) {
      return { success: true, sibCoins: 0, msg: 'Cashback já creditado para este contrato' };
    }
  }

  // Calcular SibCoins: 1 SC = R$0,10
  const cashbackReais = valorContratado * SOL_CASHBACK[produtoId];
  const sibCoins = Math.round(cashbackReais / 0.10);

  if (sibCoins <= 0) {
    return { success: false, msg: 'Valor muito baixo para gerar cashback' };
  }

  const batch = db.batch();

  // 1. Registrar transação SibCoin
  const txRef = db.collection('users').doc(uid).collection('sibcoin').doc();
  batch.set(txRef, {
    tipo:         'emissao',
    origem:       'parceiro',
    produtoId,
    produto:      SOL_NOMES[produtoId] || produtoId,
    valor:        sibCoins,
    valorReais:   valorContratado,
    cashbackPct:  SOL_CASHBACK[produtoId],
    cashbackReais,
    contratoId:   contratoId || null,
    desc:         `Cashback por contratar ${SOL_NOMES[produtoId]}`,
    ts:           admin.firestore.FieldValue.serverTimestamp(),
  });

  // 2. Atualizar saldo no documento filiado
  const filRef = db.collection('users').doc(uid).collection('filiado').doc('dados');
  batch.set(filRef, {
    totalSibCoins: admin.firestore.FieldValue.increment(sibCoins),
    totalCashbackSC: admin.firestore.FieldValue.increment(sibCoins),
  }, { merge: true });

  // 3. Log global de cashbacks (para analytics admin)
  const logRef = db.collection('cashback_log').doc();
  batch.set(logRef, {
    uid, produtoId, valorContratado, sibCoins, cashbackReais,
    contratoId: contratoId || null,
    ts: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  console.log(`Cashback: uid=${uid} produto=${produtoId} valor=R$${valorContratado} → +${sibCoins} SC`);
  return { success: true, sibCoins, cashbackReais };
});

/**
 * Webhook HTTP: parceiros notificam contratações confirmadas.
 * URL: https://REGION-PROJECT.cloudfunctions.net/webhookParceiro
 * Header: X-Sibanki-Secret: <WEBHOOK_SECRET do .env>
 * Body JSON: { uid, produtoId, valorContratado, contratoId, parceiro }
 */
exports.webhookParceiro = functions.https.onRequest(async (req, res) => {
  // Validar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validar secret do parceiro
  const secret = req.headers['x-sibanki-secret'];
  const expectedSecret = process.env.WEBHOOK_PARCEIRO_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    console.warn('webhookParceiro: secret inválido');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { uid, produtoId, valorContratado, contratoId, parceiro } = req.body;

  if (!uid || !produtoId || !valorContratado) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: uid, produtoId, valorContratado' });
  }

  const db = admin.firestore();

  try {
    // Verificar se usuário existe
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Idempotência: verificar contrato já processado
    if (contratoId) {
      const existing = await db.collection('users').doc(uid)
        .collection('sibcoin').where('contratoId', '==', String(contratoId)).limit(1).get();
      if (!existing.empty) {
        return res.status(200).json({ success: true, msg: 'Já processado', sibCoins: 0 });
      }
    }

    // Calcular cashback
    const taxaCashback = SOL_CASHBACK[produtoId] || 0;
    if (taxaCashback <= 0) {
      return res.status(400).json({ error: `Produto '${produtoId}' sem cashback configurado` });
    }

    const cashbackReais = Number(valorContratado) * taxaCashback;
    const sibCoins = Math.round(cashbackReais / 0.10);

    const batch = db.batch();

    // Transação SibCoin
    const txRef = db.collection('users').doc(uid).collection('sibcoin').doc();
    batch.set(txRef, {
      tipo: 'emissao', origem: 'parceiro',
      produtoId, produto: SOL_NOMES[produtoId] || produtoId,
      valor: sibCoins, valorReais: Number(valorContratado),
      cashbackPct: taxaCashback, cashbackReais,
      contratoId: contratoId ? String(contratoId) : null,
      parceiro: parceiro || null,
      desc: `Cashback por contratar ${SOL_NOMES[produtoId]}`,
      ts: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Saldo filiado
    const filRef = db.collection('users').doc(uid).collection('filiado').doc('dados');
    batch.set(filRef, {
      totalSibCoins:    admin.firestore.FieldValue.increment(sibCoins),
      totalCashbackSC:  admin.firestore.FieldValue.increment(sibCoins),
    }, { merge: true });

    // Log global
    const logRef = db.collection('cashback_log').doc();
    batch.set(logRef, {
      uid, produtoId, parceiro: parceiro || null,
      valorContratado: Number(valorContratado),
      sibCoins, cashbackReais, contratoId: contratoId || null,
      ts: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log(`webhookParceiro: uid=${uid} ${produtoId} R$${valorContratado} → +${sibCoins} SC`);
    return res.status(200).json({ success: true, sibCoins, cashbackReais });

  } catch (err) {
    console.error('webhookParceiro erro:', err.message);
    return res.status(500).json({ error: 'Erro interno', details: err.message });
  }
});

/**
 * Callable: registrar clique em produto parceiro (analytics).
 * Parâmetros: { produtoId, produto, parceiro, categoria }
 */
exports.registrarCliqueSolucao = functions.https.onCall(async (data, context) => {
  if (!context.auth) return { success: false };
  const uid = context.auth.uid;
  const db = admin.firestore();
  await db.collection('sol_cliques_global').add({
    uid, ...data,
    ts: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {});
  return { success: true };
});

// =============================================
// CONVITE CONSÓRCIO AMIGOS — e-mail para participantes
// =============================================
exports.sendConsorcioInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar convites.");
  }
  const { emails, nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, grupoId } = data || {};
  if (!emails || !emails.length || !nomeGrupo) {
    throw new functions.https.HttpsError("invalid-argument", "emails e nomeGrupo são obrigatórios.");
  }
  const apiKey = process.env.RESEND_API_KEY || (functions.config().resend && functions.config().resend.api_key) || "";
  if (!apiKey) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };

  const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";
  const { Resend } = require("resend");
  const resend = new Resend(apiKey);
  const db = admin.firestore();

  const results = [];
  for (const email of emails) {
    if (!email || email.indexOf("@") < 0) continue;
    // Criar registro de convite no Firestore
    const inviteRef = await db.collection("consorcio_invites").add({
      grupoId: grupoId || null,
      nomeGrupo,
      nomeAdmin,
      toEmail: email,
      fromUid: context.auth.uid,
      status: "pending",
      ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    const link = `${APP_URL}/#consorcio_invite=${inviteRef.id}`;
    const html = getConsorcioInviteEmailHtml(nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, link);
    try {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "Sibanki <noreply@sibanki.com.br>",
        to: [email],
        subject: `${nomeAdmin} te convidou para um consórcio no Sibanki 🤝`,
        html,
      });
      results.push({ email, ok: !error, error: error?.message });
      logEvent("sendConsorcioInvite", { to: email, grupoId });
    } catch (e) {
      results.push({ email, ok: false, error: e.message });
      logError("sendConsorcioInvite", e);
    }
  }
  return { ok: true, results };
});

// =============================================
// CONVITE CREDI AMIGO — e-mail para o amigo do acordo
// =============================================
exports.sendCrediAmigoInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para enviar convites.");
  }
  const { emailAmigo, nomeCredor, nomeDev, valor, parcelas, valorParcela, emprestimoId, tipoCredor } = data || {};
  if (!emailAmigo || emailAmigo.indexOf("@") < 0) {
    throw new functions.https.HttpsError("invalid-argument", "emailAmigo inválido.");
  }
  const apiKey = process.env.RESEND_API_KEY || (functions.config().resend && functions.config().resend.api_key) || "";
  if (!apiKey) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };

  const APP_URL = process.env.APP_URL || "https://sibanki.com.br/app";
  const db = admin.firestore();

  // Criar registro do convite
  const inviteRef = await db.collection("crediamigo_invites").add({
    emprestimoId: emprestimoId || null,
    nomeCredor,
    nomeDev,
    emailAmigo,
    fromUid: context.auth.uid,
    valor,
    status: "pending",
    ts: admin.firestore.FieldValue.serverTimestamp(),
  });
  const link = `${APP_URL}/#credi_invite=${inviteRef.id}`;
  const html = getCrediAmigoInviteEmailHtml(nomeCredor, nomeDev, valor, parcelas, valorParcela, link, !!tipoCredor);

  try {
    const { Resend } = require("resend");
    const resend = new Resend(apiKey);
    const assunto = tipoCredor
      ? `${nomeCredor} registrou um empréstimo para você no Sibanki 💸`
      : `${nomeCredor} registrou que você tem R$ ${Number(valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} a receber`;
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "Sibanki <noreply@sibanki.com.br>",
      to: [emailAmigo],
      subject: assunto,
      html,
    });
    if (error) { logError("sendCrediAmigoInvite", { error }); return { ok: false, error: error.message }; }
    logEvent("sendCrediAmigoInvite", { to: emailAmigo, emprestimoId });
    return { ok: true, inviteId: inviteRef.id };
  } catch (e) {
    logError("sendCrediAmigoInvite", e);
    throw new functions.https.HttpsError("internal", e.message);
  }
});
