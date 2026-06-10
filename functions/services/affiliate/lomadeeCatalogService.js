/**
 * Catalogo da Loja - Lomadee
 *
 * Estrategia em cascata:
 * 1) GET /affiliate/products  (x-api-key header) - catalogo de produtos
 * 2) GET /affiliate/brands    (x-api-key header) - marcas/anunciantes
 * 3) GET /v3/{token}/store/_all  (token no path) - fallback anunciantes
 * 4) Demo estatico se tudo falhar
 */

const { fetchJson } = require("../../httpClient");
const { LOMADEE_APP_TOKEN, LOMADEE_SOURCE_ID } = require("../../config");
const { logWarn } = require("../../logger");

const LOMADEE_BASE = "https://api-beta.lomadee.com.br";
const PRODUCTS_URL = `${LOMADEE_BASE}/affiliate/products`;
const BRANDS_URL   = `${LOMADEE_BASE}/affiliate/brands`;

const V3_PATHS = [
  (token) => `${LOMADEE_BASE}/v3/${token}/store/_all`,
  (token) => `${LOMADEE_BASE}/v3/${token}/program/_all`,
  (token) => `${LOMADEE_BASE}/v3/${token}/advertiser/_all`,
];

const CACHE_TTL_MS    = 5 * 60_000;  // 5 min
const DEEPLINK_TTL_MS = 60 * 60_000; // 1 h

let catalogCache = { key: "", expiresAt: 0, value: null };
const deeplinkCache = new Map();

// ── Demo (exibido so quando API e inacessivel) ────────────────────────────────
const DEMO_OFFERS = [
  { id: "demo-1", merchant: "Amazon",        desc: "3% de cashback em eletronicos",        cashbackPct: 3,   category: "Eletronicos", logo: "📦", logoUrl: null, network: "Demo", featured: true,  targetUrl: null },
  { id: "demo-2", merchant: "Shopee",         desc: "2.5% em tudo na Shopee",              cashbackPct: 2.5, category: "Geral",       logo: "🛍️", logoUrl: null, network: "Demo", featured: false, targetUrl: null },
  { id: "demo-3", merchant: "Netshoes",       desc: "5% em calcados e roupas esportivas",  cashbackPct: 5,   category: "Moda",        logo: "👟", logoUrl: null, network: "Demo", featured: true,  targetUrl: null },
  { id: "demo-4", merchant: "iFood",          desc: "2% em pedidos acima de R$ 50",        cashbackPct: 2,   category: "Alimentacao", logo: "🍔", logoUrl: null, network: "Demo", featured: false, targetUrl: null },
  { id: "demo-5", merchant: "Magazine Luiza", desc: "2.2% em eletrodomesticos",            cashbackPct: 2.2, category: "Casa",        logo: "🏠", logoUrl: null, network: "Demo", featured: false, targetUrl: null },
  { id: "demo-6", merchant: "Americanas",     desc: "1.8% em todas as categorias",         cashbackPct: 1.8, category: "Geral",       logo: "🛒", logoUrl: null, network: "Demo", featured: false, targetUrl: null },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(s) {
  if (!s || typeof s !== "string") return "";
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function priceFromCents(pricing) {
  if (!Array.isArray(pricing) || !pricing.length) return null;
  const p = pricing[0];
  const cents = typeof p.price === "number" ? p.price
    : typeof p.listPrice === "number" ? p.listPrice : null;
  if (cents == null) return null;
  return (cents / 100).toFixed(2);
}

function extractImageUrl(p) {
  if (Array.isArray(p.images) && p.images[0]?.url) return p.images[0].url;
  const opt0 = Array.isArray(p.options) && p.options[0] ? p.options[0] : null;
  if (opt0 && Array.isArray(opt0.images) && opt0.images[0]?.url) return opt0.images[0].url;
  return null;
}

function extractCategoryName(p) {
  const opt0 = Array.isArray(p.options) && p.options[0] ? p.options[0] : null;
  const cats = (opt0 && Array.isArray(opt0.categories) && opt0.categories) ||
               (Array.isArray(p.categories) && p.categories) || [];
  if (cats[0]) {
    const c = cats[0];
    return (typeof c === "string" ? c : c?.name || "").slice(0, 80) || "Geral";
  }
  return "Geral";
}

function extractBrandMerchant(p) {
  const opt0 = Array.isArray(p.options) && p.options[0] ? p.options[0] : null;
  const brands = (opt0 && Array.isArray(opt0.brands) && opt0.brands.length ? opt0.brands :
                  Array.isArray(p.brands) ? p.brands : []);
  if (brands.length) {
    const b0 = brands[0];
    return (typeof b0 === "string" ? b0 : b0?.name || "").slice(0, 80) || "Parceiro";
  }
  return "Parceiro";
}

function extractCommission(adv) {
  const c = adv.commission;
  if (c && typeof c === "object") {
    const v = c.value ?? c.maxValue ?? c.minValue;
    if (typeof v === "number" && v > 0) return Math.round(v * 10) / 10;
  }
  if (typeof adv.maxCommission === "number" && adv.maxCommission > 0) return Math.round(adv.maxCommission * 10) / 10;
  if (typeof adv.commissionValue === "number" && adv.commissionValue > 0) return Math.round(adv.commissionValue * 10) / 10;
  if (typeof adv.commissionRate === "number" && adv.commissionRate > 0) return Math.round(adv.commissionRate * 10) / 10;
  return 0;
}

function extractLogoUrl(adv) {
  for (const key of ["logo", "logoUrl", "thumbnail", "image", "imageUrl", "brandLogoUrl"]) {
    const v = adv[key];
    if (typeof v === "string" && v.startsWith("http")) return v;
  }
  return null;
}

function extractAdvertiserUrl(adv) {
  for (const key of ["link", "siteUrl", "url", "websiteUrl", "advertiserUrl", "site"]) {
    const v = adv[key];
    if (typeof v === "string" && v.startsWith("http")) return v;
  }
  return null;
}

// ── Normalize: produto /affiliate/products ────────────────────────────────────
function normalizeProduct(p, targetUrl) {
  const org = String(p.organizationId || "");
  const pid = String(p.id || p._id || "");
  const id  = org && pid ? `${org}:${pid}` : pid || String(p._id || "");
  const name     = String(p.name || "Produto").slice(0, 140);
  const brand    = extractBrandMerchant(p);
  const category = extractCategoryName(p);
  const logoUrl  = extractImageUrl(p);
  const opt0     = Array.isArray(p.options) && p.options[0] ? p.options[0] : null;
  const priceStr = priceFromCents(opt0?.pricing || p.pricing);
  const descBase = stripHtml(p.description || "").slice(0, 100) || name.slice(0, 80);
  const desc     = `${brand}${priceStr ? ` · R$ ${priceStr}` : ""} · ${descBase}`.replace(/^ · /, "").slice(0, 180);
  const rawUrl   = typeof p.url === "string" && p.url.startsWith("http") ? p.url : null;
  return {
    id,
    merchant: name.slice(0, 120),
    desc: desc.slice(0, 180),
    cashbackPct: 0,
    category,
    logo: logoUrl ? "" : "🛒",
    logoUrl,
    network: "Lomadee",
    featured: false,
    targetUrl: targetUrl || rawUrl,
  };
}

// ── Normalize: anunciante /affiliate/brands ou /v3/.../store/_all ─────────────
function normalizeAdvertiser(adv, targetUrl) {
  const commissionPct = extractCommission(adv);
  const logoUrl = extractLogoUrl(adv);
  const segment =
    (typeof adv.segment === "string" && adv.segment.trim()) ||
    (Array.isArray(adv.categories) && adv.categories[0]?.name) ||
    (typeof adv.category === "string" && adv.category.trim()) ||
    "Geral";
  const featured = !!(adv.trait?.isHighlight || adv.highlight || adv.featured || adv.isFeatured);
  const rawUrl = extractAdvertiserUrl(adv);
  return {
    id: String(adv.id || adv.advertiserId || adv.programId || ""),
    merchant: String(adv.name || adv.advertiserName || adv.programName || "Loja").slice(0, 120),
    desc: adv.description
      ? String(adv.description).slice(0, 120)
      : `${commissionPct > 0 ? commissionPct + "% comissao · " : ""}${segment}`.replace(/^ · /, "").slice(0, 120),
    cashbackPct: commissionPct,
    category: segment.slice(0, 80),
    logo: logoUrl ? "" : "🏬",
    logoUrl,
    network: "Lomadee",
    featured,
    targetUrl: targetUrl || rawUrl,
  };
}

// ── Deeplink ──────────────────────────────────────────────────────────────────
async function resolveDeeplink(rawUrl) {
  if (!rawUrl || !LOMADEE_APP_TOKEN || !LOMADEE_SOURCE_ID) return rawUrl || null;
  const cached = deeplinkCache.get(rawUrl);
  if (cached && Date.now() < cached.expiresAt) return cached.link;
  try {
    const u = new URL(`${LOMADEE_BASE}/v3/${LOMADEE_APP_TOKEN}/deeplink/create`);
    u.searchParams.set("sourceId", LOMADEE_SOURCE_ID);
    u.searchParams.set("url", rawUrl);
    const json = await fetchJson(u.toString(), { method: "GET", timeout: 8_000 }, "lomadeeDeeplink");
    const dl   = json.deeplink || json;
    const link = (dl.shortUrl?.startsWith("http") ? dl.shortUrl : null) ||
                 (dl.longUrl?.startsWith("http")  ? dl.longUrl  : null) ||
                 rawUrl;
    deeplinkCache.set(rawUrl, { link, expiresAt: Date.now() + DEEPLINK_TTL_MS });
    return link;
  } catch {
    deeplinkCache.set(rawUrl, { link: rawUrl, expiresAt: Date.now() + 5 * 60_000 });
    return rawUrl;
  }
}

async function resolveDeeplinksBatched(urls, chunkSize = 4) {
  const out = [];
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk    = urls.slice(i, i + chunkSize);
    const resolved = await Promise.all(chunk.map((u) => resolveDeeplink(u)));
    out.push(...resolved);
    if (i + chunkSize < urls.length) await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

// ── Fetch 1: /affiliate/products ──────────────────────────────────────────────
async function fetchProducts(opts) {
  const page   = Math.max(1, Number(opts.page)  || 1);
  const limit  = Math.min(100, Math.max(1, Number(opts.limit) || 24));
  const search = typeof opts.search === "string" ? opts.search.trim().slice(0, 120) : "";

  const buildUrl = (withAvail) => {
    const u = new URL(PRODUCTS_URL);
    u.searchParams.set("page",  String(page));
    u.searchParams.set("limit", String(limit));
    if (withAvail) u.searchParams.set("isAvailable", "true");
    if (search)    u.searchParams.set("search", search);
    return u.toString();
  };

  const headers = { "x-api-key": LOMADEE_APP_TOKEN };
  let json;
  try {
    json = await fetchJson(buildUrl(true), { method: "GET", timeout: 25_000, headers }, "lomadeeProducts");
  } catch (e) {
    if (e.status === 400) {
      json = await fetchJson(buildUrl(false), { method: "GET", timeout: 25_000, headers }, "lomadeeProducts");
    } else throw e;
  }

  const rows = Array.isArray(json.data) ? json.data : [];
  const meta = json.meta || {};
  const total      = Number(meta.total)      || rows.length;
  const totalPages = Number(meta.totalPages) || Math.max(1, Math.ceil(total / limit));
  const rawUrls    = rows.map((p) => (p.url?.startsWith("http") ? p.url : null));
  const targetUrls = LOMADEE_SOURCE_ID
    ? await resolveDeeplinksBatched(rawUrls)
    : rawUrls;

  return {
    source: "lomadee",
    catalogKind: "products",
    offers: rows.map((p, i) => normalizeProduct(p, targetUrls[i])).filter((o) => o.id),
    pagination: { total, page, limit, totalPages },
    cached: false,
  };
}

// ── Fetch 2: /affiliate/brands ────────────────────────────────────────────────
async function fetchBrands(opts) {
  const page   = Math.max(1, Number(opts.page)  || 1);
  const limit  = Math.min(100, Math.max(1, Number(opts.limit) || 24));
  const search = typeof opts.search === "string" ? opts.search.trim().slice(0, 120) : "";

  const u = new URL(BRANDS_URL);
  u.searchParams.set("page",  String(page));
  u.searchParams.set("limit", String(limit));
  if (search) u.searchParams.set("search", search);

  const headers = { "x-api-key": LOMADEE_APP_TOKEN };
  const json = await fetchJson(u.toString(), { method: "GET", timeout: 25_000, headers }, "lomadeeBrands");

  const rows = Array.isArray(json.data) ? json.data :
               Array.isArray(json)      ? json       : [];
  const meta = json.meta || {};
  const total      = Number(meta.total)      || rows.length;
  const totalPages = Number(meta.totalPages) || Math.max(1, Math.ceil(total / limit));
  const rawUrls    = rows.map((a) => extractAdvertiserUrl(a));
  const targetUrls = LOMADEE_SOURCE_ID
    ? await resolveDeeplinksBatched(rawUrls)
    : rawUrls;

  return {
    source: "lomadee",
    catalogKind: "brands",
    offers: rows.map((a, i) => normalizeAdvertiser(a, targetUrls[i])).filter((o) => o.id),
    pagination: { total, page, limit, totalPages },
    cached: false,
  };
}

// ── Fetch 3: /v3/{token}/store/_all (fallback) ────────────────────────────────
async function fetchV3Stores(opts) {
  const page  = Math.max(1, Number(opts.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 24));
  let lastError = null;

  for (const pathFn of V3_PATHS) {
    try {
      const u = new URL(pathFn(LOMADEE_APP_TOKEN));
      u.searchParams.set("sourceId", LOMADEE_SOURCE_ID || "");
      u.searchParams.set("size",     String(limit));
      u.searchParams.set("page",     String(page));

      const json = await fetchJson(u.toString(), { method: "GET", timeout: 20_000 }, "lomadeeV3Stores");

      const rows = Array.isArray(json.storeList) ? json.storeList :
                   Array.isArray(json.data)       ? json.data      :
                   Array.isArray(json)             ? json           : [];

      if (!rows.length) continue;

      const rawUrls    = rows.map((a) => extractAdvertiserUrl(a));
      const targetUrls = LOMADEE_SOURCE_ID
        ? await resolveDeeplinksBatched(rawUrls)
        : rawUrls;

      return {
        source: "lomadee",
        catalogKind: "stores",
        offers: rows.map((a, i) => normalizeAdvertiser(a, targetUrls[i])).filter((o) => o.id),
        pagination: { total: rows.length, page, limit, totalPages: 1 },
        cached: false,
      };
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Todos os paths v3 falharam");
}

// ── getCatalog - ponto de entrada publico ─────────────────────────────────────
async function getCatalog(opts = {}) {
  if (!LOMADEE_APP_TOKEN) {
    return {
      source: "demo",
      catalogKind: "demo",
      offers: DEMO_OFFERS,
      pagination: { total: DEMO_OFFERS.length, page: 1, limit: DEMO_OFFERS.length, totalPages: 1 },
      message: "LOMADEE_APP_TOKEN nao configurado.",
    };
  }

  const cacheKey = `${opts.page || 1}:${opts.limit || 24}:${opts.search || ""}`;
  if (!opts.forceRefresh && catalogCache.key === cacheKey && Date.now() < catalogCache.expiresAt) {
    return { ...catalogCache.value, cached: true };
  }

  const attempts = [
    { name: "products", fn: () => fetchProducts(opts) },
    { name: "brands",   fn: () => fetchBrands(opts) },
    { name: "v3stores", fn: () => fetchV3Stores(opts) },
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt.fn();
      if (result.offers && result.offers.length > 0) {
        catalogCache = { key: cacheKey, expiresAt: Date.now() + CACHE_TTL_MS, value: result };
        return result;
      }
    } catch (e) {
      logWarn({
        domain: "lomadeeCatalog",
        action: `${attempt.name}_failed`,
        message: e.message,
      });
    }
  }

  logWarn({ domain: "lomadeeCatalog", action: "all_failed", message: "Retornando catalogo demo." });
  return {
    source: "demo",
    catalogKind: "demo",
    offers: DEMO_OFFERS,
    pagination: { total: DEMO_OFFERS.length, page: 1, limit: DEMO_OFFERS.length, totalPages: 1 },
    message: "API indisponivel - catalogo de demonstracao.",
  };
}

module.exports = { getCatalog };
