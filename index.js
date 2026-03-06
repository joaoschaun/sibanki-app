const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const fetch = require("node-fetch");

// Load .env for local development
try { require("dotenv").config(); } catch(e) {}

// Initialize admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// =============================================
// ENV VARIABLES
// =============================================
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || "";
const BRAPI_BASE = "https://brapi.dev/api";
const GNEWS_KEY = process.env.GNEWS_KEY || "";
const NEWSDATA_KEY = process.env.NEWSDATA_KEY || "";
const NEWSAPI_KEY = process.env.NEWSAPI_KEY || "";

// Lazy Stripe initialization
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    const secret = process.env.STRIPE_SECRET || "";
    if (!secret) {
      throw new Error("STRIPE_SECRET not configured");
    }
    _stripe = require("stripe")(secret);
  }
  return _stripe;
}

// =============================================
// STRIPE: CREATE CHECKOUT SESSION
// =============================================
exports.createCheckout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }

  const stripe = getStripe();
  const uid = context.auth.uid;
  const email = context.auth.token.email || "";
  const { priceId, plan, billing } = data;

  if (!priceId) {
    throw new functions.https.HttpsError("invalid-argument", "priceId é obrigatório");
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    let customerId = userDoc.exists ? userDoc.data().stripeCustomerId : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: { firebaseUID: uid }
      });
      customerId = customer.id;
      await db.collection("users").doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 30,
        metadata: { firebaseUID: uid, plan: plan || "pro" }
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.sibanki.com.br/app/?checkout=success",
      cancel_url: "https://www.sibanki.com.br/app/?checkout=cancel",
      metadata: { firebaseUID: uid, plan: plan || "pro", billing: billing || "monthly" }
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// =============================================
// STRIPE: CUSTOMER PORTAL
// =============================================
exports.createPortal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }

  const stripe = getStripe();
  const uid = context.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();
  const customerId = userDoc.exists ? userDoc.data().stripeCustomerId : null;

  if (!customerId) {
    throw new functions.https.HttpsError("not-found", "Nenhuma assinatura encontrada");
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://www.sibanki.com.br/app/"
    });
    return { url: session.url };
  } catch (error) {
    console.error("Portal error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// =============================================
// STRIPE: GET USER PLAN
// =============================================
exports.getUserPlan = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }

  const uid = context.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    return { plan: "free", status: "active", trialEnd: null };
  }

  const userData = userDoc.data();
  return {
    plan: userData.plan || "free",
    status: userData.subscriptionStatus || "active",
    trialEnd: userData.trialEnd || null,
    subscriptionId: userData.subscriptionId || null,
    currentPeriodEnd: userData.currentPeriodEnd || null,
    cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false
  };
});

// =============================================
// STRIPE: WEBHOOK
// =============================================
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const stripe = getStripe();
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
  let event;

  try {
    if (STRIPE_WEBHOOK_SECRET) {
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send("Webhook Error: " + err.message);
  }

  console.log("Stripe event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const uid = session.metadata.firebaseUID;
        const plan = session.metadata.plan || "pro";

        if (uid && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);

          await db.collection("users").doc(uid).set({
            plan: plan,
            subscriptionId: session.subscription,
            subscriptionStatus: subscription.status,
            stripeCustomerId: session.customer,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          console.log("User " + uid + " upgraded to " + plan);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const uid = subscription.metadata.firebaseUID;

        if (uid) {
          const priceId = subscription.items.data[0]?.price?.id || "";
          let plan = "pro";
          if (priceId.includes("familia") || priceId.includes("family")) plan = "familia";

          const isActive = subscription.status === "active" || subscription.status === "trialing";

          await db.collection("users").doc(uid).set({
            plan: isActive ? plan : "free",
            subscriptionStatus: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const uid = subscription.metadata.firebaseUID;

        if (uid) {
          await db.collection("users").doc(uid).set({
            plan: "free",
            subscriptionStatus: "canceled",
            cancelAtPeriodEnd: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const uid = sub.metadata.firebaseUID;
          if (uid) {
            await db.collection("users").doc(uid).set({
              subscriptionStatus: "active",
              lastPayment: new Date().toISOString(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const uid = sub.metadata.firebaseUID;
          if (uid) {
            await db.collection("users").doc(uid).set({
              subscriptionStatus: "past_due",
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          }
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// BRAPI: COTAÇÃO DE 1 ATIVO
// =============================================
exports.brapiQuote = functions.https.onCall(async (data, context) => {
  const ticker = (data.ticker || "").toUpperCase().trim();
  if (!ticker || !/^[A-Z0-9]{4,8}$/.test(ticker)) {
    throw new functions.https.HttpsError("invalid-argument", "Ticker inválido");
  }

  try {
    const modules = data.modules || "defaultKeyStatistics,financialData,balanceSheetHistory,incomeStatementHistory";
    const range = data.range || "1mo";
    const interval = data.interval || "1d";
    const dividends = data.dividends ? "&dividends=true" : "";

    const url = `${BRAPI_BASE}/quote/${ticker}?token=${BRAPI_TOKEN}&fundamental=true&modules=${modules}&range=${range}&interval=${interval}${dividends}`;

    const response = await fetch(url, {timeout: 15000});
    if (!response.ok) throw new Error(`BRAPI HTTP ${response.status}`);

    const json = await response.json();
    return json;
  } catch (error) {
    console.error(`brapiQuote error [${ticker}]:`, error.message);
    throw new functions.https.HttpsError("internal", "Erro ao buscar dados: " + error.message);
  }
});

// =============================================
// BRAPI: MÚLTIPLOS ATIVOS
// =============================================
exports.brapiMulti = functions.https.onCall(async (data, context) => {
  const tickers = data.tickers || [];
  if (!Array.isArray(tickers) || tickers.length === 0 || tickers.length > 20) {
    throw new functions.https.HttpsError("invalid-argument", "Envie entre 1 e 20 tickers");
  }

  const cleanTickers = tickers
    .map(t => (t || "").toUpperCase().trim())
    .filter(t => /^[A-Z0-9]{4,8}$/.test(t));

  if (cleanTickers.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Nenhum ticker válido");
  }

  try {
    const tickerStr = cleanTickers.join(",");
    const modules = data.modules || "defaultKeyStatistics,financialData";
    const dividends = data.dividends ? "&dividends=true" : "";

    const url = `${BRAPI_BASE}/quote/${tickerStr}?token=${BRAPI_TOKEN}&fundamental=true&modules=${modules}${dividends}`;

    const response = await fetch(url, {timeout: 20000});
    if (!response.ok) throw new Error(`BRAPI HTTP ${response.status}`);

    const json = await response.json();
    return json;
  } catch (error) {
    console.error("brapiMulti error:", error.message);
    throw new functions.https.HttpsError("internal", "Erro ao buscar dados: " + error.message);
  }
});

// =============================================
// BRAPI: BUSCAR ATIVOS
// =============================================
exports.brapiSearch = functions.https.onCall(async (data, context) => {
  const query = (data.query || "").trim();
  if (!query || query.length < 2) {
    throw new functions.https.HttpsError("invalid-argument", "Busca deve ter pelo menos 2 caracteres");
  }

  try {
    const url = `${BRAPI_BASE}/available?token=${BRAPI_TOKEN}&search=${encodeURIComponent(query)}`;

    const response = await fetch(url, {timeout: 10000});
    if (!response.ok) throw new Error(`BRAPI HTTP ${response.status}`);

    const json = await response.json();
    return json;
  } catch (error) {
    console.error("brapiSearch error:", error.message);
    throw new functions.https.HttpsError("internal", "Erro ao buscar: " + error.message);
  }
});

// =============================================
// BRAPI: CRIPTO
// =============================================
exports.brapiCrypto = functions.https.onCall(async (data, context) => {
  const coin = (data.coin || "BTC").toUpperCase().trim();
  const currency = (data.currency || "BRL").toUpperCase().trim();

  try {
    const url = `${BRAPI_BASE}/v2/crypto?coin=${coin}&currency=${currency}&token=${BRAPI_TOKEN}`;

    const response = await fetch(url, {timeout: 10000});
    if (!response.ok) throw new Error(`BRAPI HTTP ${response.status}`);

    const json = await response.json();
    return json;
  } catch (error) {
    console.error("brapiCrypto error:", error.message);
    throw new functions.https.HttpsError("internal", "Erro ao buscar crypto: " + error.message);
  }
});

// =============================================
// BRAPI: INFLAÇÃO
// =============================================
exports.brapiInflation = functions.https.onCall(async (data, context) => {
  try {
    const country = data.country || "brazil";
    const historical = data.historical ? "&historical=true" : "";
    const start = data.start ? `&start=${data.start}` : "";
    const end = data.end ? `&end=${data.end}` : "";

    const url = `${BRAPI_BASE}/v2/inflation?country=${country}&token=${BRAPI_TOKEN}${historical}${start}${end}`;

    const response = await fetch(url, {timeout: 10000});
    if (!response.ok) throw new Error(`BRAPI HTTP ${response.status}`);

    const json = await response.json();
    return json;
  } catch (error) {
    console.error("brapiInflation error:", error.message);
    throw new functions.https.HttpsError("internal", "Erro: " + error.message);
  }
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

      // Check Firestore cache (30 min)
      const cacheRef = db.collection("cache").doc("news_" + category);
      if (!forceRefresh) {
        const cached = await cacheRef.get();
        if (cached.exists) {
          const data = cached.data();
          const age = Date.now() - (data.updatedAt?.toDate?.()?.getTime() || 0);
          if (age < 1800000) {
            return res.json({ articles: data.articles, cached: true, updatedAt: data.updatedAt });
          }
        }
      }

      const allArticles = [];
      const fetchPromises = [];

      // SOURCE 1: GOOGLE NEWS BR (RSS) - Free, unlimited
      const googleNewsFeeds = {
        mercado: "https://news.google.com/rss/search?q=bolsa+a%C3%A7%C3%B5es+ibovespa+mercado+financeiro&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        economia: "https://news.google.com/rss/search?q=economia+brasil+pib+infla%C3%A7%C3%A3o+selic&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        cripto: "https://news.google.com/rss/search?q=bitcoin+criptomoeda+ethereum+crypto+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        fiis: "https://news.google.com/rss/search?q=fundos+imobili%C3%A1rios+FII+dividendos&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        investimentos: "https://news.google.com/rss/search?q=investimentos+renda+fixa+tesouro+direto&hl=pt-BR&gl=BR&ceid=BR:pt-419"
      };

      const gFeeds = category === "all" ? Object.entries(googleNewsFeeds) :
        googleNewsFeeds[category] ? [[category, googleNewsFeeds[category]]] : [];

      gFeeds.forEach(([cat, url]) => {
        fetchPromises.push(
          fetch(url, { timeout: 8000 })
            .then(r => r.text())
            .then(xml => {
              const items = parseRSSItems(xml, "Google News", cat);
              allArticles.push(...items.slice(0, 8));
            })
            .catch(e => console.log("Google News error:", e.message))
        );
      });

      // SOURCE 2: INVESTING.COM BR (RSS) - Free
      const investingFeeds = {
        mercado: "https://br.investing.com/rss/news_301.rss",
        economia: "https://br.investing.com/rss/news_14.rss",
        cripto: "https://br.investing.com/rss/news_302.rss"
      };

      const iFeeds = category === "all" ? Object.entries(investingFeeds) :
        investingFeeds[category] ? [[category, investingFeeds[category]]] : [];

      iFeeds.forEach(([cat, url]) => {
        fetchPromises.push(
          fetch(url, {
            timeout: 8000,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; SibankiBot/1.0)" }
          })
            .then(r => r.text())
            .then(xml => {
              const items = parseRSSItems(xml, "Investing.com", cat);
              allArticles.push(...items.slice(0, 6));
            })
            .catch(e => console.log("Investing error:", e.message))
        );
      });

      // SOURCE 3: GNEWS API - images guaranteed
      const gnewsTopics = {
        mercado: "mercado financeiro bolsa ibovespa",
        economia: "economia brasil selic inflação",
        cripto: "bitcoin criptomoeda ethereum",
        fiis: "fundos imobiliários FII dividendos",
        investimentos: "investimentos renda fixa tesouro"
      };
      const gTopic = category === "all" ? "finanças economia mercado brasil" : (gnewsTopics[category] || "finanças");
      fetchPromises.push(
        fetch("https://gnews.io/api/v4/search?q=" + encodeURIComponent(gTopic) + "&lang=pt&country=br&max=10&apikey=" + GNEWS_KEY, { timeout: 8000 })
          .then(r => r.json())
          .then(data => {
            if (data.articles) {
              data.articles.forEach(a => {
                allArticles.push({
                  title: a.title,
                  description: (a.description || "").substring(0, 200),
                  url: a.url,
                  image: a.image || "",
                  source: a.source?.name || "GNews",
                  category: category === "all" ? "economia" : category,
                  publishedAt: a.publishedAt
                });
              });
            }
          })
          .catch(e => console.log("GNews error:", e.message))
      );

      // SOURCE 4: NEWSDATA.IO - images + video
      const ndCategories = {
        mercado: "business",
        economia: "politics",
        cripto: "technology",
        investimentos: "business"
      };
      const ndCat = category === "all" ? "business,politics" : (ndCategories[category] || "business");
      fetchPromises.push(
        fetch("https://newsdata.io/api/1/latest?apikey=" + NEWSDATA_KEY + "&country=br&language=pt&category=" + ndCat + "&size=10", { timeout: 8000 })
          .then(r => r.json())
          .then(data => {
            if (data.results) {
              data.results.forEach(a => {
                allArticles.push({
                  title: a.title,
                  description: (a.description || "").substring(0, 200),
                  url: a.link,
                  image: a.image_url || "",
                  video: a.video_url || "",
                  source: a.source_name || a.source_id || "NewsData",
                  category: category === "all" ? "economia" : category,
                  publishedAt: a.pubDate || new Date().toISOString()
                });
              });
            }
          })
          .catch(e => console.log("NewsData error:", e.message))
      );

      await Promise.all(fetchPromises);

      // Deduplicate
      const seen = {};
      const unique = allArticles.filter(a => {
        if (!a.title) return false;
        const key = a.title.toLowerCase().substring(0, 50);
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });

      // Sort: images first, then by date
      unique.sort((a, b) => {
        const aImg = a.image ? 1 : 0;
        const bImg = b.image ? 1 : 0;
        if (aImg !== bImg) return bImg - aImg;
        return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
      });

      const final = unique.slice(0, 50);

      await cacheRef.set({
        articles: final,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        count: final.length
      });

      res.json({ articles: final, cached: false, count: final.length });
    } catch (error) {
      console.error("getNews error:", error);
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
      const cacheRef = db.collection("cache").doc("daily_briefing");
      const forceRefresh = req.query.refresh === "true";
      if (!forceRefresh) {
        const cached = await cacheRef.get();
        if (cached.exists) {
          const data = cached.data();
          const age = Date.now() - (data.updatedAt?.toDate?.()?.getTime() || 0);
          if (age < 3600000) {
            return res.json(data);
          }
        }
      }

      const briefing = {
        date: new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        updatedAt: new Date().toISOString(),
        market: {},
        topGainers: [],
        topLosers: [],
        indices: [],
        crypto: null,
        news: []
      };

      const mainTickers = "PETR4,VALE3,ITUB4,BBDC4,ABEV3,WEGE3,RENT3,BPAC11,MGLU3,BBAS3,LREN3,SUZB3,GGBR4,CSNA3,CVCB3,AZUL4,TOTS3,RADL3,HAPV3,B3SA3,RAIL3,JBSS3,VIVT3,EMBR3,CPLE6";

      const [quotesRes, indicesRes, cryptoRes, newsRes] = await Promise.all([
        fetch(BRAPI_BASE + "/quote/" + mainTickers + "?token=" + BRAPI_TOKEN, { timeout: 15000 }).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(BRAPI_BASE + "/quote/^BVSP,^DJI,^GSPC,^IXIC?token=" + BRAPI_TOKEN, { timeout: 15000 }).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(BRAPI_BASE + "/v2/crypto?coin=BTC&currency=BRL&token=" + BRAPI_TOKEN, { timeout: 10000 }).then(r => r.json()).catch(() => ({ coins: [] })),
        fetch("https://gnews.io/api/v4/search?q=mercado+financeiro+ibovespa+selic&lang=pt&country=br&max=5&apikey=" + GNEWS_KEY, { timeout: 8000 }).then(r => r.json()).catch(() => ({ articles: [] }))
      ]);

      // Indices
      if (indicesRes.results) {
        briefing.indices = indicesRes.results.map(r => ({
          symbol: r.symbol,
          name: r.shortName || r.longName || r.symbol,
          price: r.regularMarketPrice,
          change: r.regularMarketChangePercent,
          previousClose: r.regularMarketPreviousClose
        }));
      }

      // Stocks gainers/losers
      if (quotesRes.results) {
        const stocks = quotesRes.results
          .filter(r => r.regularMarketChangePercent !== undefined)
          .map(r => ({
            symbol: r.symbol,
            name: r.shortName || r.longName || r.symbol,
            price: r.regularMarketPrice,
            change: r.regularMarketChangePercent,
            volume: r.regularMarketVolume,
            logo: r.logourl || ""
          }));

        stocks.sort((a, b) => b.change - a.change);
        briefing.topGainers = stocks.filter(s => s.change > 0).slice(0, 5);
        briefing.topLosers = stocks.filter(s => s.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);
      }

      // Crypto
      if (cryptoRes.coins && cryptoRes.coins.length) {
        const btc = cryptoRes.coins[0];
        briefing.crypto = {
          symbol: "BTC",
          price: btc.regularMarketPrice,
          change: btc.regularMarketChangePercent
        };
      }

      // News
      if (newsRes.articles) {
        briefing.news = newsRes.articles.map(a => ({
          title: a.title,
          description: (a.description || "").substring(0, 150),
          url: a.url,
          image: a.image || "",
          source: a.source?.name || "",
          publishedAt: a.publishedAt
        }));
      }

      // Market summary
      const ibov = briefing.indices.find(i => i.symbol === "^BVSP");
      const now = new Date();
      const hour = now.getUTCHours() - 3; // BRT
      briefing.market = {
        ibovespa: ibov ? ibov.price : null,
        ibovespaChange: ibov ? ibov.change : null,
        status: (hour >= 10 && hour < 18) ? "aberto" : "fechado",
        totalStocks: quotesRes.results ? quotesRes.results.length : 0,
        totalGainers: briefing.topGainers.length,
        totalLosers: briefing.topLosers.length
      };

      await cacheRef.set({
        ...briefing,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json(briefing);
    } catch (error) {
      console.error("getDailyBriefing error:", error);
      res.status(500).json({ error: error.message });
    }
  });
});

// =============================================
// TELEGRAM BOT
// =============================================
const telegramBot = require("./telegramBot");
exports.telegramWebhook = telegramBot.telegramWebhook;
exports.checkPriceAlerts = telegramBot.checkPriceAlerts;
exports.dailyNews = telegramBot.dailyNews;
exports.weeklyReport = telegramBot.weeklyReport;
