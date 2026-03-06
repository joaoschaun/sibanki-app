const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { BRAPI_TOKEN, BRAPI_BASE, GNEWS_KEY, NEWSDATA_KEY } = require("../../config");
const { fetchText } = require("../../httpClient");
const { logEvent, logError } = require("../../logger");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

function parseRSSItems(xml, source, category) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const getTag = (tag) => {
      const r = new RegExp("<" + tag + "[^>]*>(?:<!\\\\[CDATA\\\\[)?([\\s\\S]*?)(?:\\\\]\\\\]>)?<\\/" + tag + ">", "s");
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

async function getNews({ category, forceRefresh }) {
  try {
    const cacheRef = db.collection("cache").doc("news_" + category);
    if (!forceRefresh) {
      const cached = await cacheRef.get();
      if (cached.exists) {
        const data = cached.data();
        const age = Date.now() - (data.updatedAt?.toDate?.()?.getTime() || 0);
        if (age < 1800000) {
          logEvent("news", "cache_hit", { category, count: data.articles?.length || 0 });
          return { articles: data.articles, cached: true, updatedAt: data.updatedAt };
        }
      }
    }

    const allArticles = [];
    const fetchPromises = [];

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
        fetchText(url, { timeout: 8000 }, "googleNews")
          .then(xml => {
            const items = parseRSSItems(xml, "Google News", cat);
            allArticles.push(...items.slice(0, 8));
          })
          .catch(e => console.log("Google News error:", e.message))
      );
    });

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

    const seen = {};
    const unique = allArticles.filter(a => {
      if (!a.title) return false;
      const key = a.title.toLowerCase().substring(0, 50);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

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
    logEvent("news", "cache_write", { category, count: final.length });
    return { articles: final, cached: false, count: final.length };
  } catch (error) {
    logError("news", "getNews_error", error, { category });
    throw error;
  }
}

async function getDailyBriefing({ forceRefresh }) {
  try {
    const cacheRef = db.collection("cache").doc("daily_briefing");
    if (!forceRefresh) {
      const cached = await cacheRef.get();
      if (cached.exists) {
        const data = cached.data();
        const age = Date.now() - (data.updatedAt?.toDate?.()?.getTime() || 0);
        if (age < 3600000) {
          logEvent("news", "daily_briefing_cache_hit", {});
          return data;
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

    if (indicesRes.results) {
      briefing.indices = indicesRes.results.map(r => ({
        symbol: r.symbol,
        name: r.shortName || r.longName || r.symbol,
        price: r.regularMarketPrice,
        change: r.regularMarketChangePercent,
        previousClose: r.regularMarketPreviousClose
      }));
    }

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

    if (cryptoRes.coins && cryptoRes.coins.length) {
      const btc = cryptoRes.coins[0];
      briefing.crypto = {
        symbol: "BTC",
        price: btc.regularMarketPrice,
        change: btc.regularMarketChangePercent
      };
    }

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

    const ibov = briefing.indices.find(i => i.symbol === "^BVSP");
    const now = new Date();
    const hour = now.getUTCHours() - 3;
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
    logEvent("news", "daily_briefing_generated", {
      totalStocks: briefing.market.totalStocks,
      totalNews: briefing.news.length
    });
    return briefing;
  } catch (error) {
    logError("news", "daily_briefing_error", error, {});
    throw error;
  }
}

module.exports = {
  getNews,
  getDailyBriefing
};

