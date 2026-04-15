const { fetchJson, fetchText } = require("../../httpClient");
const { logEvent, logWarn } = require("../../logger");

const _cache = new Map();
const TTL = 15 * 60_000; // 15 min

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  _cache.set(key, { ts: Date.now(), data });
}

function toNumberPtBr(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function fetchBcbLatest(seriesCode) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/1?formato=json`;
  const json = await fetchJson(url, { timeout: 10000 }, `bcb_${seriesCode}`);
  const item = Array.isArray(json) ? json[json.length - 1] : null;
  return {
    code: String(seriesCode),
    date: item?.data || null,
    value: toNumberPtBr(item?.valor),
  };
}

function normalizeTesouroTitle(raw) {
  const annualRate = Number(raw?.annualInvestmentRate);
  const unitPrice = Number(raw?.unitPrice);
  const minPrice = Number(raw?.minInvestmentAmount);
  return {
    code: raw?.tradingCode || raw?.bondType || null,
    name: raw?.bondName || raw?.extendedDescription || raw?.tradingCode || null,
    indexer: raw?.indexer || null,
    maturityDate: raw?.maturityDate || null,
    annualInvestmentRate: Number.isFinite(annualRate) ? annualRate : null,
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : null,
    minInvestmentAmount: Number.isFinite(minPrice) ? minPrice : null,
  };
}

async function fetchTesouroDirectData() {
  // Endpoint público usado pela página do Tesouro Direto.
  const url = "https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json";
  const json = await fetchJson(url, { timeout: 12000 }, "tesouro_direto");
  const titleList = json?.response?.TrsrBdTradgList || [];
  return {
    source: "tesouro_direto_public_api",
    updatedAt: json?.response?.BizSts?.DtTm || new Date().toISOString(),
    titles: Array.isArray(titleList) ? titleList.map(normalizeTesouroTitle) : [],
  };
}

function parsePtBrDateToIso(raw) {
  if (!raw || !/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return null;
  const [dd, mm, yyyy] = raw.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function parseTesouroCsv(csvText) {
  const lines = String(csvText || "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
  const idx = (name) => headers.findIndex((h) => h.includes(name));
  const iDate = idx("data base");
  const iName = idx("tipo titulo");
  const iMaturity = idx("data vencimento");
  const iRateBuy = idx("taxa compra manha");
  const iPuBuy = idx("pu compra manha");
  if (iDate < 0 || iName < 0) return [];

  const byName = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";").map((c) => c.replace(/^"|"$/g, "").trim());
    const name = cols[iName];
    const baseDateIso = parsePtBrDateToIso(cols[iDate]);
    if (!name || !baseDateIso) continue;
    const prev = byName.get(name);
    if (!prev || baseDateIso > prev.baseDateIso) {
      byName.set(name, {
        code: null,
        name,
        indexer: null,
        maturityDate: parsePtBrDateToIso(cols[iMaturity]),
        annualInvestmentRate: toNumberPtBr(cols[iRateBuy]),
        unitPrice: toNumberPtBr(cols[iPuBuy]),
        minInvestmentAmount: null,
        baseDateIso,
      });
    }
  }
  return Array.from(byName.values()).map(({ baseDateIso, ...rest }) => rest);
}

async function fetchTesouroTransparencyCsvData() {
  const pkgUrl = "https://www.tesourotransparente.gov.br/ckan/api/3/action/package_show?id=taxas-dos-titulos-ofertados-pelo-tesouro-direto";
  const pkg = await fetchJson(pkgUrl, { timeout: 15000 }, "tesouro_ckan_package");
  const resources = Array.isArray(pkg?.result?.resources) ? pkg.result.resources : [];
  const csvRes = resources.find((r) => /csv/i.test(String(r?.format || "")) && /^https?:\/\//.test(String(r?.url || "")));
  if (!csvRes?.url) {
    throw new Error("CSV de taxas do Tesouro não encontrado no CKAN");
  }
  const csvText = await fetchText(csvRes.url, { timeout: 20000 }, "tesouro_ckan_csv");
  return {
    source: "tesouro_transparente_ckan_csv",
    updatedAt: new Date().toISOString(),
    titles: parseTesouroCsv(csvText),
  };
}

function buildSyntheticProducts({ cdiAnnual, ipcaAnnual }) {
  const cdi = Number.isFinite(cdiAnnual) ? cdiAnnual : 0.12;
  const ipca = Number.isFinite(ipcaAnnual) ? ipcaAnnual : 0.045;
  const fmtPct = (n) => Number((n * 100).toFixed(2));
  return [
    {
      id: "cdb-100-cdi",
      type: "cdb",
      name: "CDB 100% CDI (benchmark)",
      indexer: "cdi",
      grossAnnualRatePct: fmtPct(cdi),
      netAnnualRatePct: fmtPct(cdi * 0.85), // faixa IR 15% para horizonte longo
      realAnnualRatePct: fmtPct((cdi * 0.85) - ipca),
      liquidity: "D+1",
      fgcCovered: true,
    },
    {
      id: "lci-90-cdi",
      type: "lci",
      name: "LCI 90% CDI (benchmark)",
      indexer: "cdi",
      grossAnnualRatePct: fmtPct(cdi * 0.9),
      netAnnualRatePct: fmtPct(cdi * 0.9), // isento IR
      realAnnualRatePct: fmtPct((cdi * 0.9) - ipca),
      liquidity: "vencimento",
      fgcCovered: true,
    },
    {
      id: "lca-92-cdi",
      type: "lca",
      name: "LCA 92% CDI (benchmark)",
      indexer: "cdi",
      grossAnnualRatePct: fmtPct(cdi * 0.92),
      netAnnualRatePct: fmtPct(cdi * 0.92), // isento IR
      realAnnualRatePct: fmtPct((cdi * 0.92) - ipca),
      liquidity: "vencimento",
      fgcCovered: true,
    },
  ];
}

async function getFixedIncomeCatalog(forceRefresh = false) {
  const cacheKey = "fixed_income_catalog_v1";
  if (!forceRefresh) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      logEvent("fixed_income", "catalog_cache_hit", { ttlMinutes: 15 });
      return cached;
    }
  }

  const status = { bcb: "ok", tesouro: "ok" };
  let selic = null;
  let ipca = null;
  let tesouro = { source: "tesouro_direto_public_api", updatedAt: null, titles: [] };

  try {
    // 432 = Selic meta anual (% a.a.); 433 = IPCA acumulado 12 meses (%)
    const [selicRaw, ipcaRaw] = await Promise.all([fetchBcbLatest(432), fetchBcbLatest(433)]);
    selic = selicRaw?.value != null ? selicRaw.value / 100 : null;
    ipca = ipcaRaw?.value != null ? ipcaRaw.value / 100 : null;
  } catch (e) {
    status.bcb = `degraded:${e.message}`;
    logWarn("fixed_income", "bcb_fetch_failed", { message: e.message });
  }

  try {
    tesouro = await fetchTesouroDirectData();
  } catch (e) {
    try {
      tesouro = await fetchTesouroTransparencyCsvData();
      status.tesouro = "ok_csv_fallback";
      logWarn("fixed_income", "tesouro_primary_failed_using_csv_fallback", { message: e.message });
    } catch (e2) {
      status.tesouro = `degraded:${e2.message}`;
      logWarn("fixed_income", "tesouro_fetch_failed", { message: `${e.message} | fallback: ${e2.message}` });
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    indicators: {
      selicAnnual: selic, // decimal (ex.: 0.105)
      cdiAnnualProxy: selic, // proxy simples para comparativos iniciais
      ipcaAnnual: ipca, // decimal (ex.: 0.045)
    },
    tesouro,
    syntheticProducts: buildSyntheticProducts({ cdiAnnual: selic, ipcaAnnual: ipca }),
    status,
  };

  cacheSet(cacheKey, out);
  return out;
}

module.exports = {
  getFixedIncomeCatalog,
};

