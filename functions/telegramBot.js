const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const {
  TELEGRAM_API,
  TELEGRAM_WEBHOOK_SECRET,
  GEMINI_KEY,
  NEWS_API_KEY,
  BRAPI_TOKEN
} = require("./config");
const { logEvent, logError } = require("./logger");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ============================================
// HELPER: Enviar mensagem Telegram
// ============================================
async function sendMessage(chatId, text, options) {
  options = options || {};
  var body = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML"
  };
  Object.keys(options).forEach(function(k){ body[k] = options[k]; });
  try {
    await fetch(TELEGRAM_API + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (err) {
    logError("telegram", "send_message_error", err, { chatId });
  }
}

// ============================================
// HELPER: Buscar usuario pelo chatId
// ============================================
async function getUserByChatId(chatId) {
  var snap = await db.collection("users")
    .where("telegramChatId", "==", chatId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  var doc = snap.docs[0];
  return { uid: doc.id, data: doc.data() };
}

// ============================================
// HELPER: Buscar usuario pelo codigo de vinculo (coleção telegramCodes, válido 10 min)
// ============================================
async function getUserByLinkCode(code) {
  if (!code || code.length < 4) return null;
  var codeDoc = await db.collection("telegramCodes").doc(code).get();
  if (!codeDoc.exists) return null;
  var data = codeDoc.data();
  var expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;
  if (expiresAt < Date.now()) return null;
  var uid = data.uid;
  if (!uid) return null;
  var userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return null;
  return { uid: userDoc.id, data: userDoc.data() };
}

// ============================================
// HELPER: Formatar moeda
// ============================================
function fmt(v) {
  return "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v) {
  return (v || 0).toFixed(2) + "%";
}

// ============================================
// HELPER: Validar ticker BR
// ============================================
function isValidTicker(ticker) {
  if (!ticker) return false;
  const t = String(ticker).toUpperCase().trim();
  return /^[A-Z0-9]{4,12}$/.test(t);
}

// ============================================
// /start — Vincular conta
// ============================================
async function handleStart(chatId, args, fromUser) {
  if (!args || !args.length) {
    return sendMessage(chatId,
      "\u{1F3E6} <b>Sibanki Bot</b> — Seu assistente financeiro!\n\n" +
      "Para vincular sua conta:\n" +
      "1\u20E3 Acesse o app Sibanki\n" +
      "2\u20E3 Va em Configuracoes → Telegram\n" +
      "3\u20E3 Copie o codigo de vinculo\n" +
      "4\u20E3 Envie: <code>/start SEU_CODIGO</code>\n\n" +
      "\u{1F4CB} <b>Comandos:</b>\n" +
      "/carteira — Resumo da carteira\n" +
      "/resumo — Resumo do mes\n" +
      "/saldo — Saldo das contas\n" +
      "/cotacao PETR4 — Cotacao\n" +
      "/noticias — Noticias\n" +
      "/desconectar — Remove vinculo\n\n" +
      "\u{1F4B0} <b>Lancar gastos em linguagem natural:</b>\n" +
      "Ex: <i>compras no mercado 350 reais</i>\n" +
      "Ex: <i>gastei 45 no almoco</i>\n" +
      "Ex: <i>uber 28</i>"
    );
  }

  var code = args[0].toUpperCase();
  var user = await getUserByLinkCode(code);

  if (!user) {
    return sendMessage(chatId, "\u274C Codigo invalido. Verifique no app e tente novamente.");
  }

  // TLG-4 (auditoria 26/04/2026): se este chatId j\u00E1 est\u00E1 vinculado a OUTRO uid,
  // bloquear o sequestro. Cen\u00E1rio: atacante consegue um linkCode leg\u00EDtimo e tenta
  // vincular ao seu pr\u00F3prio Telegram j\u00E1 em uso por outra conta.
  var existingByChat = await getUserByChatId(chatId);
  if (existingByChat && existingByChat.uid !== user.uid) {
    logEvent("telegram", "link_attempt_chatid_taken", { chatId, existingUid: existingByChat.uid, attemptUid: user.uid });
    return sendMessage(chatId,
      "\u26A0\uFE0F Este Telegram ja esta vinculado a outra conta. Use /desconectar nessa conta primeiro."
    );
  }

  // Vincular
  await db.collection("users").doc(user.uid).update({
    telegramChatId: chatId,
    telegramUsername: fromUser.username || "",
    telegramLinkedAt: new Date().toISOString()
  });

  // TLG-3 (auditoria 26/04/2026): deletar o linkCode ap\u00F3s uso. Antes, mesmo
  // c\u00F3digo vinculava m\u00FAltiplas vezes (n\u00E3o havia expira\u00E7\u00E3o consumida).
  try {
    await db.collection("telegramCodes").doc(code).delete();
  } catch (delErr) {
    // n\u00E3o-bloqueante; o code expira em 10min de qualquer modo
    logError("telegram", "link_code_delete_failed", delErr, { code });
  }

  var name = user.data.name || "investidor";
  return sendMessage(chatId,
    "\u2705 <b>Conta vinculada com sucesso!</b>\n\n" +
    "Ola, " + name + "! \u{1F44B}\n" +
    "Agora voce pode consultar suas financas direto pelo Telegram.\n\n" +
    "Experimente: /carteira ou /resumo"
  );
}

// ============================================
// /carteira — Resumo da carteira
// ============================================
async function handleCarteira(chatId) {
  var user = await getUserByChatId(chatId);
  if (!user) return sendMessage(chatId, "\u274C Conta nao vinculada. Use /start CODIGO");

  var investments = user.data.investments || [];
  if (!investments.length) {
    return sendMessage(chatId, "\u{1F4CA} Voce ainda nao tem investimentos registrados.");
  }

  var totalInvestido = 0, totalAtual = 0;
  var byType = {};

  investments.forEach(function(inv) {
    var valor = inv.valor || 0;
    var atual = inv.currentValue || inv.atual || valor;
    totalInvestido += valor;
    totalAtual += atual;
    var tipo = inv.tipo || "Outros";
    if (!byType[tipo]) byType[tipo] = { investido: 0, atual: 0, count: 0 };
    byType[tipo].investido += valor;
    byType[tipo].atual += atual;
    byType[tipo].count++;
  });

  var rentGeral = totalInvestido > 0 ? ((totalAtual - totalInvestido) / totalInvestido * 100) : 0;
  var emoji = rentGeral >= 0 ? "\u{1F4C8}" : "\u{1F4C9}";

  var msg = "\u{1F4BC} <b>Sua Carteira de Investimentos</b>\n\n";
  msg += "\u{1F4B0} Investido: <b>" + fmt(totalInvestido) + "</b>\n";
  msg += emoji + " Atual: <b>" + fmt(totalAtual) + "</b>\n";
  msg += "\u{1F4CA} Rentabilidade: <b>" + fmtPct(rentGeral) + "</b>\n";
  msg += "\u{1F4CB} Total de ativos: <b>" + investments.length + "</b>\n\n";
  msg += "<b>\u{1F4C2} Por Tipo:</b>\n";

  Object.keys(byType).sort(function(a, b) { return byType[b].atual - byType[a].atual; }).forEach(function(tipo) {
    var t = byType[tipo];
    var pct = totalAtual > 0 ? (t.atual / totalAtual * 100).toFixed(1) : 0;
    var rent = t.investido > 0 ? ((t.atual - t.investido) / t.investido * 100).toFixed(2) : 0;
    msg += "  \u2022 " + tipo + ": " + fmt(t.atual) + " (" + pct + "%) " + (rent >= 0 ? "\u2191" : "\u2193") + rent + "%\n";
  });

  msg += "\n\u{1F4A1} Use /analise para recomendacoes da IA";
  return sendMessage(chatId, msg);
}

// ============================================
// /cotacao — Cotacao em tempo real
// ============================================
async function handleCotacao(chatId, args) {
  if (!args || !args.length) {
    return sendMessage(chatId, "\u2753 Informe o ticker. Ex: <code>/cotacao PETR4</code>");
  }

  var ticker = args[0].toUpperCase().trim();
  if (!isValidTicker(ticker)) {
    return sendMessage(chatId, "\u274C Ticker invalido. Ex: <code>/cotacao PETR4</code>");
  }
  var url = "https://brapi.dev/api/quote/" + ticker + (BRAPI_TOKEN ? "?token=" + BRAPI_TOKEN : "");

  try {
    var resp = await fetch(url);
    var json = await resp.json();

    if (!json.results || !json.results.length) {
      return sendMessage(chatId, "\u274C Ticker <b>" + ticker + "</b> nao encontrado.");
    }

    var q = json.results[0];
    var change = q.regularMarketChangePercent || 0;
    var emoji = change >= 0 ? "\u{1F7E2}" : "\u{1F534}";
    var arrow = change >= 0 ? "\u2191" : "\u2193";

    var msg = emoji + " <b>" + q.symbol + "</b> — " + (q.shortName || q.longName || "") + "\n\n";
    msg += "\u{1F4B0} Preco: <b>" + fmt(q.regularMarketPrice) + "</b>\n";
    msg += arrow + " Variacao: <b>" + fmtPct(change) + "</b>\n";
    msg += "\u{1F4CA} Volume: " + (q.regularMarketVolume || 0).toLocaleString("pt-BR") + "\n";
    msg += "\u{1F4C8} Max dia: " + fmt(q.regularMarketDayHigh) + "\n";
    msg += "\u{1F4C9} Min dia: " + fmt(q.regularMarketDayLow) + "\n";
    msg += "\u{1F513} Abertura: " + fmt(q.regularMarketOpen) + "\n";
    msg += "\u{1F512} Fech. anterior: " + fmt(q.regularMarketPreviousClose) + "\n";

    if (q.fiftyTwoWeekHigh) msg += "\n\u{1F4C8} Max 52 sem: " + fmt(q.fiftyTwoWeekHigh) + "\n";
    if (q.fiftyTwoWeekLow) msg += "\u{1F4C9} Min 52 sem: " + fmt(q.fiftyTwoWeekLow) + "\n";

    return sendMessage(chatId, msg);
  } catch (err) {
    return sendMessage(chatId, "\u274C Erro ao buscar cotacao: " + err.message);
  }
}

// ============================================
// /rentabilidade — Por ativo
// ============================================
async function handleRentabilidade(chatId) {
  var user = await getUserByChatId(chatId);
  if (!user) return sendMessage(chatId, "\u274C Conta nao vinculada. Use /start CODIGO");

  var investments = user.data.investments || [];
  if (!investments.length) return sendMessage(chatId, "\u{1F4CA} Nenhum investimento registrado.");

  var msg = "\u{1F4CA} <b>Rentabilidade por Ativo</b>\n\n";

  var sorted = investments.slice().sort(function(a, b) {
    var rentA = a.valor > 0 ? ((a.currentValue || a.atual || a.valor) - a.valor) / a.valor * 100 : 0;
    var rentB = b.valor > 0 ? ((b.currentValue || b.atual || b.valor) - b.valor) / b.valor * 100 : 0;
    return rentB - rentA;
  });

  sorted.forEach(function(inv) {
    var atual = inv.currentValue || inv.atual || inv.valor;
    var rent = inv.valor > 0 ? ((atual - inv.valor) / inv.valor * 100) : 0;
    var emoji = rent >= 0 ? "\u{1F7E2}" : "\u{1F534}";
    var arrow = rent >= 0 ? "\u2191" : "\u2193";
    msg += emoji + " <b>" + (inv.nome || inv.name || "Ativo") + "</b>\n";
    msg += "   " + fmt(inv.valor) + " \u2192 " + fmt(atual) + " (" + arrow + fmtPct(rent) + ")\n\n";
  });

  return sendMessage(chatId, msg);
}

// ============================================
// /analise — IA Gemini analisa carteira
// ============================================
async function handleAnalise(chatId) {
  var user = await getUserByChatId(chatId);
  if (!user) return sendMessage(chatId, "\u274C Conta nao vinculada. Use /start CODIGO");

  var investments = user.data.investments || [];
  var entries = user.data.entries || [];

  if (!investments.length && !entries.length) {
    return sendMessage(chatId, "\u{1F4CA} Sem dados suficientes para analise.");
  }

  await sendMessage(chatId, "\u{1F916} Analisando seus dados com IA... Aguarde \u23F3");

  var totalInvestido = 0, totalAtual = 0;
  var byType = {};
  investments.forEach(function(inv) {
    totalInvestido += inv.valor || 0;
    totalAtual += (inv.currentValue || inv.atual || inv.valor || 0);
    var t = inv.tipo || "Outros";
    byType[t] = (byType[t] || 0) + (inv.currentValue || inv.atual || inv.valor || 0);
  });

  var now = new Date();
  var mesAtual = now.toISOString().slice(0, 7);
  var receitaMes = 0, despesaMes = 0;
  var gastosPorCat = {};
  entries.forEach(function(e) {
    if ((e.date || "").startsWith(mesAtual)) {
      var isRec = e.type === "receita" || e.type === "income";
      if (isRec) receitaMes += e.value || 0;
      else { despesaMes += e.value || 0; var c = e.category || e.cat || "Outros"; gastosPorCat[c] = (gastosPorCat[c] || 0) + (e.value || 0); }
    }
  });

  var prompt = "Voce e um consultor financeiro do Sibanki. Analise os dados do usuario e de recomendacoes praticas em portugues. Seja direto, use emojis e formate bem.\n\n" +
    "DADOS DO USUARIO:\n" +
    "- Investimentos: " + investments.length + " ativos\n" +
    "- Total investido: R$ " + totalInvestido.toFixed(2) + "\n" +
    "- Valor atual: R$ " + totalAtual.toFixed(2) + "\n" +
    "- Rentabilidade geral: " + (totalInvestido > 0 ? (((totalAtual - totalInvestido) / totalInvestido) * 100).toFixed(2) : 0) + "%\n" +
    "- Alocacao: " + JSON.stringify(byType) + "\n" +
    "- Receita do mes: R$ " + receitaMes.toFixed(2) + "\n" +
    "- Despesa do mes: R$ " + despesaMes.toFixed(2) + "\n" +
    "- Gastos por categoria: " + JSON.stringify(gastosPorCat) + "\n\n" +
    "De:\n1. Analise geral da saude financeira\n2. Analise da diversificacao da carteira\n3. 3 recomendacoes praticas\n4. 1 alerta se houver risco\nResponda em ate 300 palavras.";

  try {
    var geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_KEY;
    var resp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
      })
    });

    var json = await resp.json();
    var text = "";
    if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0]) {
      text = json.candidates[0].content.parts[0].text;
    }
    if (!text) text = "Nao foi possivel gerar analise.";

    var clean = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>").replace(/#{1,3}\s?/g, "");

    return sendMessage(chatId, "\u{1F916} <b>Analise IA — Sibanki</b>\n\n" + clean);
  } catch (err) {
    return sendMessage(chatId, "\u274C Erro na analise: " + err.message);
  }
}

// ============================================
// /resumo — Resumo mensal
// ============================================
async function handleResumo(chatId) {
  var user = await getUserByChatId(chatId);
  if (!user) return sendMessage(chatId, "\u274C Conta nao vinculada. Use /start CODIGO");

  var entries = user.data.entries || [];
  var now = new Date();
  var mesAtual = now.toISOString().slice(0, 7);
  var meses = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  var receita = 0, despesa = 0;
  var cats = {};

  entries.forEach(function(e) {
    if ((e.date || "").startsWith(mesAtual)) {
      var isRec = e.type === "receita" || e.type === "income";
      if (isRec) receita += e.value || 0;
      else {
        despesa += e.value || 0;
        var c = e.category || e.cat || "Outros";
        cats[c] = (cats[c] || 0) + (e.value || 0);
      }
    }
  });

  var saldo = receita - despesa;
  var emoji = saldo >= 0 ? "\u2705" : "\u{1F534}";

  var msg = "\u{1F4C5} <b>Resumo de " + meses[now.getMonth()] + "/" + now.getFullYear() + "</b>\n\n";
  msg += "📈 Receitas: <b>" + fmt(receita) + "</b>\n";
  msg += "📉 Despesas: <b>" + fmt(despesa) + "</b>\n";
  msg += emoji + " Saldo: <b>" + fmt(saldo) + "</b>\n\n";

  if (Object.keys(cats).length) {
    msg += "<b>\u{1F4C2} Maiores gastos:</b>\n";
    Object.keys(cats).sort(function(a, b) { return cats[b] - cats[a]; }).slice(0, 5).forEach(function(c) {
      var pct = despesa > 0 ? (cats[c] / despesa * 100).toFixed(1) : 0;
      msg += "  \u2022 " + c + ": " + fmt(cats[c]) + " (" + pct + "%)\n";
    });
  }

  return sendMessage(chatId, msg);
}

// ============================================
// /saldo — Saldo das contas
// ============================================
async function handleSaldo(chatId) {
  var user = await getUserByChatId(chatId);
  if (!user) return sendMessage(chatId, "\u274C Conta nao vinculada. Use /start CODIGO");

  var balances = user.data.accountBalances || {};
  var accounts = user.data.accounts || [];

  if (!accounts.length && !Object.keys(balances).length) {
    return sendMessage(chatId, "\u{1F3E6} Nenhuma conta cadastrada.");
  }

  var msg = "\u{1F3E6} <b>Saldo das Contas</b>\n\n";
  var total = 0;

  accounts.forEach(function(acc) {
    var bal = balances[acc] || 0;
    total += bal;
    msg += "  \u2022 " + acc + ": <b>" + fmt(bal) + "</b>\n";
  });

  msg += "\n\u{1F4B0} <b>Total: " + fmt(total) + "</b>";
  return sendMessage(chatId, msg);
}

// ============================================
// /noticias — Noticias financeiras
// ============================================
async function handleNoticias(chatId) {
  try {
    if (!NEWS_API_KEY) {
      return sendMessage(chatId, "\u274C Noticias indisponiveis no momento. Configure a chave NEWS_API_KEY no servidor.");
    }
    var url = "https://newsapi.org/v2/top-headlines?country=br&category=business&pageSize=5&apiKey=" + NEWS_API_KEY;
    var resp = await fetch(url);
    var json = await resp.json();

    if (!json.articles || !json.articles.length) {
      return sendMessage(chatId, "\u{1F4F0} Nenhuma noticia encontrada no momento.");
    }

    var msg = "\u{1F4F0} <b>Noticias Financeiras</b>\n\n";

    json.articles.forEach(function(a, i) {
      var source = (a.source && a.source.name) ? a.source.name : "";
      msg += "<b>" + (i + 1) + ". " + (a.title || "") + "</b>\n";
      if (a.description) msg += a.description.slice(0, 120) + "...\n";
      msg += "\u{1F4CC} " + source + ' | <a href="' + a.url + '">Ler mais</a>\n\n';
    });

    msg += "\u{1F504} Atualizado agora | Use /noticias para atualizar";
    return sendMessage(chatId, msg, { disable_web_page_preview: true });
  } catch (err) {
    return sendMessage(chatId, "\u274C Erro ao buscar noticias: " + err.message);
  }
}

// ============================================
// /alerta — Configurar alerta de preco
// ============================================
async function handleAlerta(chatId, args) {
  var user = await getUserByChatId(chatId);
  if (!user) return sendMessage(chatId, "\u274C Conta nao vinculada. Use /start CODIGO");

  if (!args || args.length < 1) {
    return sendMessage(chatId,
      "\u2753 <b>Como usar alertas:</b>\n\n" +
      "<code>/alerta PETR4 > 40</code> — Alerta quando subir acima de R$40\n" +
      "<code>/alerta VALE3 < 60</code> — Alerta quando cair abaixo de R$60\n" +
      "<code>/alerta listar</code> — Ver alertas ativos\n" +
      "<code>/alerta limpar</code> — Remover todos"
    );
  }

  if (args[0].toLowerCase() === "listar") {
    var alerts = user.data.priceAlerts || [];
    if (!alerts.length) return sendMessage(chatId, "\u{1F514} Nenhum alerta configurado.");
    var msg = "\u{1F514} <b>Seus Alertas</b>\n\n";
    alerts.forEach(function(a, i) {
      msg += (i + 1) + ". <b>" + a.ticker + "</b> " + a.condition + " " + fmt(a.price) + "\n";
    });
    return sendMessage(chatId, msg);
  }

  if (args[0].toLowerCase() === "limpar") {
    await db.collection("users").doc(user.uid).update({ priceAlerts: [] });
    return sendMessage(chatId, "\u2705 Todos os alertas removidos.");
  }

  if (args.length < 3) {
    return sendMessage(chatId, "\u274C Formato invalido. Ex: <code>/alerta PETR4 > 40</code>");
  }

  var ticker = args[0].toUpperCase().trim();
  var condition = args[1];
  var price = parseFloat(args[2].replace(",", "."));

  if (!isValidTicker(ticker)) {
    return sendMessage(chatId, "\u274C Ticker invalido. Ex: <code>/alerta PETR4 > 40</code>");
  }
  if (condition !== "<" && condition !== ">") {
    return sendMessage(chatId, "\u274C Use apenas > ou <. Ex: <code>/alerta PETR4 > 40</code>");
  }
  if (!isFinite(price) || price <= 0) {
    return sendMessage(chatId, "\u274C Preco invalido. Informe um numero maior que zero. Ex: <code>/alerta PETR4 > 40</code>");
  }
  if (price > 1000000) {
    return sendMessage(chatId, "\u274C Preco muito alto. Informe um valor realista (ate 1.000.000).");
  }

  var alerts = user.data.priceAlerts || [];
  alerts.push({ ticker: ticker, condition: condition, price: price, created: new Date().toISOString() });

  await db.collection("users").doc(user.uid).update({ priceAlerts: alerts });

  return sendMessage(chatId,
    "\u2705 Alerta configurado!\n\n\u{1F514} <b>" + ticker + "</b> " + condition + " " + fmt(price) +
    "\nVoce sera notificado quando o preco " + (condition === ">" ? "subir acima" : "cair abaixo") + " de " + fmt(price) + "."
  );
}

// ============================================
// /lancar — Lancar receita/despesa
// ============================================
async function handleLancar(chatId, args) {
  var user = await getUserByChatId(chatId);
  if (!user) return sendMessage(chatId, "\u274C Conta nao vinculada. Use /start CODIGO");

  if (!args || args.length < 2) {
    return sendMessage(chatId,
      "\u2753 <b>Como lancar:</b>\n\n" +
      "<code>/lancar despesa 150 Almoco</code>\n" +
      "<code>/lancar receita 5000 Salario</code>\n\n" +
      "Formato: /lancar [receita|despesa] [valor] [descricao]"
    );
  }

  var rawType = (args[0] || "").toLowerCase();
  if (rawType !== "receita" && rawType !== "despesa") {
    return sendMessage(chatId,
      "\u274C Tipo invalido. Use <code>receita</code> ou <code>despesa</code>.\n" +
      "Ex: <code>/lancar despesa 150 Almoco</code>"
    );
  }

  var type = rawType === "receita" ? "receita" : "despesa";
  var value = parseFloat(String(args[1]).replace(",", "."));
  var desc = args.slice(2).join(" ") || (type === "receita" ? "Receita" : "Despesa");

  if (!isFinite(value) || value <= 0) {
    return sendMessage(chatId, "\u274C Valor invalido. Informe um numero maior que zero. Ex: <code>/lancar despesa 150 Almoco</code>");
  }
  if (value > 100000000) {
    return sendMessage(chatId, "\u274C Valor muito alto. Informe um valor realista (ate 100.000.000).");
  }

  var entries = user.data.entries || [];
  var entry = {
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    type: type,
    value: Math.round(value * 100) / 100,
    desc: desc,
    category: type === "receita" ? "Salário" : "Outros",
    source: "telegram"
  };

  entries.push(entry);
  await db.collection("users").doc(user.uid).update({ entries: entries });

  var emoji = type === "receita" ? "📈" : "📉";
  var label = type === "receita" ? "Receita" : "Despesa";

  return sendMessage(chatId,
    emoji + " <b>" + label + " registrada!</b>\n\n" +
    "\u{1F4DD} " + desc + "\n" +
    "\u{1F4B0} " + fmt(value) + "\n" +
    "\u{1F4C5} " + entry.date + "\n\n" +
    "\u2705 Sincronizado com o app!"
  );
}

// ============================================
// /desconectar
// ============================================
async function handleDesconectar(chatId) {
  var user = await getUserByChatId(chatId);
  if (!user) return sendMessage(chatId, "\u274C Nenhuma conta vinculada.");

  await db.collection("users").doc(user.uid).update({
    telegramChatId: admin.firestore.FieldValue.delete(),
    telegramUsername: admin.firestore.FieldValue.delete(),
    telegramLinkCode: admin.firestore.FieldValue.delete()
  });

  return sendMessage(chatId, "\u2705 Conta desvinculada com sucesso. Use /start CODIGO para vincular novamente.");
}

// ============================================
// Fallback: extrair valor e descrição por regex (ex: "350 reais", "compras 100")
// ============================================
function parseLancamentoRegex(text) {
  var t = text.trim().toLowerCase();
  var value = null;
  var desc = "";
  var isReceita = /recebi|receita|salário|salario|entrou|pagamento|ganhei/.test(t);
  var numMatch = t.match(/\d+[\s,.]?\d*/);
  if (numMatch) {
    value = parseFloat(numMatch[0].replace(",", "."));
    if (value > 0 && value < 100000000) {
      var rest = t.replace(numMatch[0], "").replace(/\s*(reais?|r\s*\$|r\$)\s*/gi, " ").trim();
      rest = rest.replace(/^(gastei|paguei|comprei|despesa|dei)\s+/i, "").replace(/\s+(no|na|no|da|do|em)$/i, "").trim();
      desc = rest.length > 2 ? rest : (isReceita ? "Receita" : "Despesa");
      if (desc.length > 80) desc = desc.slice(0, 77) + "...";
      return { type: isReceita ? "receita" : "despesa", value: value, desc: desc || (isReceita ? "Receita" : "Despesa"), category: isReceita ? "Salário" : "Outros" };
    }
  }
  return null;
}

// ============================================
// Linguagem natural → extrair lançamento (Gemini ou regex) e registrar
// ============================================
async function tryLancamentoNatural(chatId, text, user) {
  if (!user) return false;
  var trimmed = text.trim();
  if (trimmed.length < 4) return false;

  var userCats = user.data.categories || ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Vestuário", "Assinatura", "Viagem", "Pet", "Outros"];
  var catList = userCats.slice(0, 15).join(", ");

  function saveAndReply(entry, type, value, desc, category) {
    var entries = (user.data.entries || []).slice();
    var newEntry = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      type: type,
      value: Math.round(value * 100) / 100,
      desc: desc,
      category: category || "Outros",
      source: "telegram"
    };
    entries.push(newEntry);
    return db.collection("users").doc(user.uid).update({ entries: entries }).then(function() {
      var emoji = type === "receita" ? "📈" : "📉";
      var label = type === "receita" ? "Receita" : "Despesa";
      return sendMessage(chatId,
        emoji + " <b>" + label + " registrada!</b>\n\n" +
        "\u{1F4DD} " + desc + "\n" +
        "\u{1F4B0} " + fmt(value) + "\n" +
        "\u{1F4C2} " + (category || "Outros") + "\n" +
        "\u{1F4C5} " + newEntry.date + "\n\n" +
        "\u2705 Sincronizado com o app!"
      );
    });
  }

  var regexResult = parseLancamentoRegex(trimmed);
  if (regexResult) {
    try {
      await saveAndReply(null, regexResult.type, regexResult.value, regexResult.desc, regexResult.category);
      return true;
    } catch (e) { return false; }
  }

  if (!GEMINI_KEY) return false;

  var prompt =
    "Responda APENAS com um JSON neste formato, sem nada alem do JSON:\n" +
    "{\"action\":\"lancar\" ou \"pergunta\",\"type\":\"receita\" ou \"despesa\" ou null,\"value\":numero ou null,\"description\":\"texto curto\",\"category\":\"texto\"}\n\n" +
    "Se a mensagem for um gasto ou receita com valor, use action=lancar, type=receita ou despesa, value=numero, description=resumo, category=uma de: " + catList + ".\n" +
    "Exemplos: 'compras no mercado 350 reais' -> {\"action\":\"lancar\",\"type\":\"despesa\",\"value\":350,\"description\":\"Compras no mercado\",\"category\":\"Alimentação\"}. " +
    "'uber 28' -> {\"action\":\"lancar\",\"type\":\"despesa\",\"value\":28,\"description\":\"Uber\",\"category\":\"Transporte\"}. " +
    "Se nao for transacao com valor, use action=pergunta.\n\nMensagem: " + trimmed;

  try {
    var model = "gemini-1.5-flash";
    var geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + GEMINI_KEY;
    var resp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.1 }
      })
    });
    var json = await resp.json();
    var rawText = "";
    if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0]) {
      rawText = json.candidates[0].content.parts[0].text;
    }
    if (!rawText) return false;

    rawText = rawText.replace(/```json?\s*|\s*```/g, "").trim();
    var start = rawText.indexOf("{");
    var end = rawText.lastIndexOf("}");
    if (start >= 0 && end > start) rawText = rawText.slice(start, end + 1);
    var parsed = JSON.parse(rawText);
    if (parsed.action !== "lancar" || (parsed.type !== "receita" && parsed.type !== "despesa")) return false;
    var value = parseFloat(parsed.value);
    if (!isFinite(value) || value <= 0 || value > 100000000) return false;

    var desc = (parsed.description || "").trim() || (parsed.type === "receita" ? "Receita" : "Despesa");
    var category = (parsed.category || "").trim() || "Outros";
    await saveAndReply(null, parsed.type, value, desc, category);
    return true;
  } catch (err) {
    return false;
  }
}

// ============================================
// Mensagem livre → IA responde
// ============================================
async function handlePerguntaIA(chatId, pergunta) {
  var user = await getUserByChatId(chatId);
  var context = user ?
    "Usuario tem " + (user.data.investments || []).length + " investimentos e " + (user.data.entries || []).length + " lancamentos." :
    "Usuario nao vinculado.";

  await sendMessage(chatId, "\u{1F916} Pensando...");

  try {
    var prompt = "Voce e o assistente financeiro do Sibanki, um app de financas pessoais brasileiro. Responda de forma util, pratica e amigavel em portugues. Use emojis. " + context + "\n\nPergunta: " + pergunta + "\n\nResponda em ate 200 palavras.";

    var geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_KEY;
    var resp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.7 }
      })
    });

    var json = await resp.json();
    var answer = "";
    if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0]) {
      answer = json.candidates[0].content.parts[0].text;
    }
    if (!answer) answer = "Nao entendi. Tente reformular.";
    var clean = answer.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>").replace(/#{1,3}\s?/g, "");

    return sendMessage(chatId, "\u{1F916} " + clean);
  } catch (err) {
    return sendMessage(chatId, "\u274C Erro ao processar sua pergunta.");
  }
}

// ============================================
// WEBHOOK PRINCIPAL
// ============================================
exports.telegramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // TLG-1 (auditoria 26/04/2026, decisão sênior): valida secret_token do Telegram.
    // Antes era fail-OPEN — qualquer um que conhecesse a URL podia forjar mensagens.
    // Em DEV (NODE_ENV=development OU SIBANKI_ALLOW_UNSAFE_WEBHOOK=1), permite.
    if (TELEGRAM_WEBHOOK_SECRET) {
      const provided = req.headers["x-telegram-bot-api-secret-token"] || "";
      if (provided !== TELEGRAM_WEBHOOK_SECRET) {
        logError("telegram", "webhook_unauthorized", new Error("Invalid secret token"), { ip: req.ip });
        res.status(401).send("Unauthorized");
        return;
      }
    } else {
      const devMode = process.env.NODE_ENV === "development" ||
                      process.env.SIBANKI_ALLOW_UNSAFE_WEBHOOK === "1";
      if (!devMode) {
        logError(
          "telegram",
          "webhook_no_secret",
          new Error("TELEGRAM_WEBHOOK_SECRET not configured"),
          {},
        );
        res.status(503).send("Webhook secret not configured");
        return;
      }
    }

    var body = req.body;
    var message = body.message;
    if (!message || !message.text) { res.sendStatus(200); return; }

    var chatId = message.chat.id;
    var text = message.text.trim();
    var parts = text.split(/\s+/);
    var command = parts[0].toLowerCase().replace(/@\w+/, "");
    var args = parts.slice(1);

    logEvent("telegram", "incoming_message", {
      chatId,
      command,
      hasArgs: args.length > 0
    });

    var isCommand = command.startsWith("/");
    if (isCommand) {
      switch (command) {
        case "/start": await handleStart(chatId, args, message.from); break;
        case "/carteira": await handleCarteira(chatId); break;
        case "/cotacao": await handleCotacao(chatId, args); break;
        case "/rentabilidade": await handleRentabilidade(chatId); break;
        case "/analise": await handleAnalise(chatId); break;
        case "/resumo": await handleResumo(chatId); break;
        case "/saldo": await handleSaldo(chatId); break;
        case "/noticias": await handleNoticias(chatId); break;
        case "/alerta": await handleAlerta(chatId, args); break;
        case "/lancar": await handleLancar(chatId, args); break;
        case "/desconectar": await handleDesconectar(chatId); break;
        default:
          if (text.length > 3) await handlePerguntaIA(chatId, text);
          else await sendMessage(chatId, "\u2753 Comando nao reconhecido. Use /start para ver todos os comandos.");
      }
    } else {
      if (text.length < 6) {
        await sendMessage(chatId, "\u2753 Digite algo como: <i>compras no mercado 350 reais</i> para lancar um gasto, ou /start para comandos.");
        return;
      }
      var user = await getUserByChatId(chatId);
      var handled = user ? await tryLancamentoNatural(chatId, text, user) : false;
      if (!handled) await handlePerguntaIA(chatId, text);
    }

    res.sendStatus(200);
  } catch (err) {
    logError("telegram", "webhook_error", err, {});
    res.sendStatus(200);
  }
});

// ============================================
// SCHEDULED: Verificar alertas de preco (cada 15 min)
// ============================================
exports.checkPriceAlerts = functions.pubsub
  .schedule("every 15 minutes")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    var now = new Date();
    var hour = now.getHours();
    var day = now.getDay();
    if (day === 0 || day === 6 || hour < 10 || hour > 18) return null;

    // TLG-6 (auditoria 26/04/2026): `where(..., "!=", "")` ignora docs sem o campo.
    // Trocado para `where(..., ">", "")` + filtro defensivo pós-get.
    var _snap = await db.collection("users").where("telegramChatId", ">", "").get();
    var snap = { docs: _snap.docs.filter(function(d) {
      var v = d.data() && d.data().telegramChatId;
      return v && (typeof v === "number" || (typeof v === "string" && v.trim().length > 0));
    }) };

    for (var i = 0; i < snap.docs.length; i++) {
      var doc = snap.docs[i];
      var userData = doc.data();
      var alerts = userData.priceAlerts || [];
      if (!alerts.length || !userData.telegramChatId) continue;

      var tickers = [];
      alerts.forEach(function(a) { if (tickers.indexOf(a.ticker) < 0) tickers.push(a.ticker); });
      if (!tickers.length) continue;

      try {
        var url = "https://brapi.dev/api/quote/" + tickers.join(",") + (BRAPI_TOKEN ? "?token=" + BRAPI_TOKEN : "");
        var resp = await fetch(url);
        var json = await resp.json();
        var results = json.results || [];

        var triggeredAlerts = [];
        var remainingAlerts = [];

        alerts.forEach(function(alert) {
          var quote = results.find(function(r) { return r.symbol === alert.ticker; });
          if (!quote) { remainingAlerts.push(alert); return; }

          var price = quote.regularMarketPrice;
          var triggered = (alert.condition === ">" && price > alert.price) ||
                         (alert.condition === "<" && price < alert.price);

          if (triggered) {
            triggeredAlerts.push({ ticker: alert.ticker, condition: alert.condition, price: alert.price, currentPrice: price });
          } else {
            remainingAlerts.push(alert);
          }
        });

        for (var j = 0; j < triggeredAlerts.length; j++) {
          var a = triggeredAlerts[j];
          var emoji = a.condition === ">" ? "\u{1F680}" : "\u26A0\uFE0F";
          await sendMessage(userData.telegramChatId,
            emoji + " <b>ALERTA DE PRECO!</b>\n\n" +
            "<b>" + a.ticker + "</b> atingiu " + fmt(a.currentPrice) + "\n" +
            "Seu alerta: " + a.condition + " " + fmt(a.price) + "\n\n" +
            "Use /cotacao " + a.ticker + " para mais detalhes."
          );
        }

        if (triggeredAlerts.length) {
          await db.collection("users").doc(doc.id).update({ priceAlerts: remainingAlerts });
        }
      } catch (err) {
        console.error("Alert check error for " + doc.id + ":", err);
      }
    }
    return null;
  });

// ============================================
// SCHEDULED: Noticias diarias (9h)
// ============================================
exports.dailyNews = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    try {
      var url = "https://newsapi.org/v2/top-headlines?country=br&category=business&pageSize=3&apiKey=" + NEWS_API_KEY;
      var resp = await fetch(url);
      var json = await resp.json();

      if (!json.articles || !json.articles.length) return null;

      var msg = "\u2600\uFE0F <b>Bom dia! Noticias de hoje:</b>\n\n";
      json.articles.forEach(function(a, i) {
        msg += "<b>" + (i + 1) + ".</b> " + a.title + "\n";
        msg += '\u{1F4CC} <a href="' + a.url + '">Ler</a>\n\n';
      });
      msg += "Tenha um otimo dia! \u{1F4C8}";

      // TLG-6 (auditoria 26/04/2026): `where(..., "!=", "")` ignora docs sem o campo.
    // Trocado para `where(..., ">", "")` + filtro defensivo pós-get.
    var _snap = await db.collection("users").where("telegramChatId", ">", "").get();
    var snap = { docs: _snap.docs.filter(function(d) {
      var v = d.data() && d.data().telegramChatId;
      return v && (typeof v === "number" || (typeof v === "string" && v.trim().length > 0));
    }) };

      for (var i = 0; i < snap.docs.length; i++) {
        var chatId = snap.docs[i].data().telegramChatId;
        var prefs = snap.docs[i].data().telegramPrefs || {};
        if (chatId && prefs.news !== false) {
          await sendMessage(chatId, msg, { disable_web_page_preview: true });
        }
      }
    } catch (err) {
      console.error("Daily news error:", err);
    }
    return null;
  });

// ============================================
// SCHEDULED: Resumo semanal (segunda 8h)
// ============================================
exports.weeklyReport = functions.pubsub
  .schedule("every monday 08:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    // TLG-6 (auditoria 26/04/2026): `where(..., "!=", "")` ignora docs sem o campo.
    // Trocado para `where(..., ">", "")` + filtro defensivo pós-get.
    var _snap = await db.collection("users").where("telegramChatId", ">", "").get();
    var snap = { docs: _snap.docs.filter(function(d) {
      var v = d.data() && d.data().telegramChatId;
      return v && (typeof v === "number" || (typeof v === "string" && v.trim().length > 0));
    }) };

    for (var i = 0; i < snap.docs.length; i++) {
      var userData = snap.docs[i].data();
      if (!userData.telegramChatId) continue;
      var prefs = userData.telegramPrefs || {};
      if (prefs.weekly === false) continue;

      var entries = userData.entries || [];
      var investments = userData.investments || [];

      var now = new Date();
      var weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      var recSem = 0, desSem = 0;
      entries.forEach(function(e) {
        if ((e.date || "") >= weekAgo) {
          if (e.type === "receita" || e.type === "income") recSem += e.value || 0;
          else desSem += e.value || 0;
        }
      });

      var totalInv = 0;
      investments.forEach(function(inv) { totalInv += (inv.currentValue || inv.atual || inv.valor || 0); });

      var msg = "\u{1F4CA} <b>Resumo Semanal — Sibanki</b>\n\n";
      msg += "📈 Receitas: " + fmt(recSem) + "\n";
      msg += "📉 Despesas: " + fmt(desSem) + "\n";
      msg += (recSem - desSem >= 0 ? "\u2705" : "\u{1F534}") + " Saldo: " + fmt(recSem - desSem) + "\n";
      if (totalInv > 0) msg += "\u{1F4BC} Carteira: " + fmt(totalInv) + "\n";
      msg += "\nBoa semana! \u{1F680}";

      await sendMessage(userData.telegramChatId, msg);
    }
    return null;
  });
