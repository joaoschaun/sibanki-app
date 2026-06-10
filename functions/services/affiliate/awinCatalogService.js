/**
 * Catalogo Awin - Publisher API
 *
 * Endpoints em cascata:
 * 1) GET /publishers/{pubId}/programmes?relationship=joined  → programas conectados
 * 2) GET /publishers/{pubId}/programmes?relationship=joined&countryCode=BR → filtrado BR
 *
 * Auth: Bearer {AWIN_API_KEY}
 */

const { fetchJson } = require("../../httpClient");
const { AWIN_API_KEY, AWIN_PUBLISHER_ID } = require("../../config");
const { logWarn } = require("../../logger");

const AWIN_BASE = "https://api.awin.com";
const CACHE_TTL_MS = 10 * 60_000; // 10 min

let catalogCache = { key: "", expiresAt: 0, value: null };

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractCommission(prog) {
  // Awin retorna commissionRange ou commissionSummary
  const cr = prog.commissionRange;
  if (cr) {
    const max = cr.max ?? cr.min ?? 0;
    if (max > 0) return Math.round(max * 10) / 10;
  }
  const cs = prog.commissionSummary;
  if (cs && typeof cs === "string") {
    const m = cs.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) return parseFloat(m[1]);
  }
  return 0;
}

function extractCategory(prog) {
  // primarySector ou sector
  const s = prog.primarySector || prog.sector || "";
  if (!s) return "Geral";
  // Awin usa nomes em ingles — traduz os mais comuns
  const map = {
    "Fashion": "Moda",
    "Travel": "Viagem",
    "Technology": "Tecnologia",
    "Finance": "Financas",
    "Home & Garden": "Casa",
    "Sports & Fitness": "Esportes",
    "Food & Drink": "Alimentacao",
    "Health & Beauty": "Saude",
    "Entertainment": "Entretenimento",
    "Education": "Educacao",
    "Retail": "Varejo",
    "Insurance": "Seguros",
  };
  return map[s] || s.slice(0, 60) || "Geral";
}

function normalizeProgramme(prog) {
  const commissionPct = extractCommission(prog);
  const logoUrl = prog.logoUrl || prog.displayUrl || null;
  const targetUrl = prog.clickThroughUrl || prog.displayUrl || null;
  const name = String(prog.name || "Loja").slice(0, 120);
  const category = extractCategory(prog);

  return {
    id: `awin:${prog.id}`,
    merchant: name,
    desc: prog.description
      ? String(prog.description).replace(/<[^>]+>/g, " ").trim().slice(0, 150)
      : `${commissionPct > 0 ? commissionPct + "% comissao · " : ""}${category}`.replace(/^ · /, "").slice(0, 150),
    cashbackPct: commissionPct,
    category,
    logo: logoUrl ? "" : "🏬",
    logoUrl,
    network: "Awin",
    featured: !!(prog.primarySector && commissionPct >= 5),
    targetUrl,
  };
}

// ── Fetch programas ───────────────────────────────────────────────────────────
async function fetchProgrammes(opts = {}) {
  const page  = Math.max(0, (Number(opts.page) || 1) - 1); // Awin usa 0-indexed
  const limit = Math.min(100, Math.max(1, Number(opts.limit) || 50));

  const headers = {
    Authorization: `Bearer ${AWIN_API_KEY}`,
    "Content-Type": "application/json",
  };

  // Tenta primeiro com countryCode=BR, depois sem filtro
  const attempts = [
    `${AWIN_BASE}/publishers/${AWIN_PUBLISHER_ID}/programmes?relationship=joined&countryCode=BR&page=${page}&pageSize=${limit}`,
    `${AWIN_BASE}/publishers/${AWIN_PUBLISHER_ID}/programmes?relationship=joined&page=${page}&pageSize=${limit}`,
  ];

  let lastError = null;
  for (const url of attempts) {
    try {
      const json = await fetchJson(url, { method: "GET", timeout: 20_000, headers }, "awinProgrammes");
      // Awin retorna array direto ou { programmes: [...] }
      const rows = Array.isArray(json) ? json
        : Array.isArray(json.programmes) ? json.programmes
        : Array.isArray(json.data)       ? json.data
        : [];

      if (!rows.length && attempts.indexOf(url) === 0) continue; // tenta sem countryCode

      const offers = rows
        .map((p) => normalizeProgramme(p))
        .filter((o) => o.id && o.merchant !== "Loja");

      // Aplica filtro de busca client-side
      const search = typeof opts.search === "string" ? opts.search.toLowerCase().trim() : "";
      const filtered = search
        ? offers.filter((o) => o.merchant.toLowerCase().includes(search) || o.category.toLowerCase().includes(search))
        : offers;

      return {
        source: "awin",
        catalogKind: "programmes",
        offers: filtered,
        pagination: { total: filtered.length, page: (page + 1), limit, totalPages: 1 },
        cached: false,
      };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Awin API falhou");
}

// ── getCatalog - ponto de entrada publico ─────────────────────────────────────
async function getCatalog(opts = {}) {
  if (!AWIN_API_KEY || !AWIN_PUBLISHER_ID) {
    return null; // sem credenciais → delegar para outro provider
  }

  const cacheKey = `${opts.page || 1}:${opts.limit || 50}:${opts.search || ""}`;
  if (!opts.forceRefresh && catalogCache.key === cacheKey && Date.now() < catalogCache.expiresAt) {
    return { ...catalogCache.value, cached: true };
  }

  try {
    const result = await fetchProgrammes(opts);
    if (result.offers.length > 0) {
      catalogCache = { key: cacheKey, expiresAt: Date.now() + CACHE_TTL_MS, value: result };
      return result;
    }
    return null;
  } catch (e) {
    logWarn({ domain: "awinCatalog", action: "fetch_failed", message: e.message });
    return null;
  }
}

module.exports = { getCatalog };
