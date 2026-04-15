/**
 * Análise fundamentalista (Graham, Bazin, Lynch, Buffett) — lógica alinhada ao legado `public/app/app.js`.
 * Dados vêm do payload brapi (`results[0]` com financialData, defaultKeyStatistics, etc.).
 *
 * Graham: √(22,5 × LPA × VPA). Bazin: teto = dividendo/ação ÷ 6% (DY alvo).
 * Lynch: PEG = P/L ÷ crescimento EPS (%) quando `earningsGrowth` existir no payload.
 */

export type B3RawStock = Record<string, unknown>;

export interface B3ExtractedIndicators {
  price: number;
  pe: number;
  eps: number;
  vpa: number;
  pvp: number;
  roe: number;
  dy: number;
  /** Proventos por ação somados em 12 meses (quando `dividendsData` vier na resposta). */
  dps12m: number;
  margLiq: number;
  margOp: number;
  divPL: number;
  liqCorr: number;
  mktCap: number;
  fcf: number;
  fd: Record<string, unknown>;
}

export interface GrahamBlock {
  fairPrice: number;
  upsidePct: number;
  ok: boolean;
}

export interface BazinBlock {
  ceilingPrice: number;
  upsidePct: number;
  ok: boolean;
  /** Fonte principal usada para estimar dividendo/ação no teto Bazin. */
  base: 'dps12m' | 'dy' | 'none';
  /** Dividendo por ação usado na conta do teto Bazin (R$/ação). */
  divPerShareUsed: number;
}

export interface LynchBlock {
  score: number;
  verdict: 'COMPRAR' | 'ANALISAR' | 'CAUTELA';
  items: string[];
  /** P/L ÷ crescimento EPS (%) quando ambos &gt; 0 — GARP */
  peg: number | null;
  /** Crescimento de lucros usado no PEG (% a.a.), a partir do payload Brapi */
  epsGrowthPct: number | null;
}

export interface BuffettBlock {
  score: number;
  verdict: 'COMPRAR' | 'ANALISAR' | 'CAUTELA' | 'EVITAR';
  moatScore: number;
  mgtScore: number;
  finScore: number;
  mosScore: number;
  intrinsicValue: number;
}

export interface B3FundamentalPack {
  graham: GrahamBlock;
  bazin: BazinBlock;
  lynch: LynchBlock;
  buffett: BuffettBlock;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Extrai indicadores do objeto brapi (mesma ordem de precedência do legado). */
export function extractB3Indicators(stock: B3RawStock, priceFallback: number): B3ExtractedIndicators {
  const fd = (stock.financialData as Record<string, unknown>) || {};
  const dks = (stock.defaultKeyStatistics as Record<string, unknown>) || {};
  const price = num(stock.regularMarketPrice ?? stock.close ?? stock.price, priceFallback);

  let pe = num(stock.priceEarnings ?? fd.trailingPE ?? dks.trailingPE ?? dks.forwardPE, 0);
  let eps = num(stock.earningsPerShare ?? dks.trailingEps, 0);
  if (!eps && pe > 0 && price > 0) eps = price / pe;

  let vpa = 0;
  if (dks.bookValue != null) vpa = num(dks.bookValue);
  else if (stock.bookValue != null) vpa = num(stock.bookValue);
  else if (num(stock.priceToBookRatio) > 0 && price > 0) vpa = price / num(stock.priceToBookRatio);

  let pvp = num(stock.priceToBookRatio ?? dks.priceToBook, 0);
  if (!pvp && vpa > 0 && price > 0) pvp = price / vpa;

  let roe = num(fd.returnOnEquity ?? dks.returnOnEquity, 0);
  if (roe && roe <= 1) roe *= 100;
  else if (!roe && eps > 0 && vpa > 0) roe = (eps / vpa) * 100;

  let dy = num(stock.dividendYield ?? dks.yield, 0);
  if (dy > 0 && dy < 1) dy *= 100;

  const divsData = (stock.dividendsData as { cashDividends?: unknown[] } | undefined)?.cashDividends;
  let dps12m = 0;
  if (Array.isArray(divsData)) {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    for (const d of divsData) {
      const row = d as { paymentDate?: string; approvedDate?: string; lastDatePrior?: string; value?: number; rate?: number };
      const dDate = new Date(row.paymentDate || row.approvedDate || row.lastDatePrior || 0);
      if (dDate >= oneYearAgo) dps12m += num(row.value ?? row.rate, 0);
    }
    if ((!dy || dy === 0) && dps12m > 0 && price > 0) dy = (dps12m / price) * 100;
  }

  let margLiq = num(fd.profitMargins, 0);
  if (margLiq && margLiq <= 1) margLiq *= 100;

  let margOp = num(fd.operatingMargins, 0);
  if (margOp && margOp <= 1) margOp *= 100;

  const divPL = num(fd.debtToEquity, 0);
  const liqCorr = num(fd.currentRatio, 0);
  const mktCap = num(stock.marketCap, 0);
  const fcf = num(fd.freeCashflow, 0);

  return {
    price,
    pe,
    eps,
    vpa,
    pvp,
    roe,
    dy,
    dps12m,
    margLiq,
    margOp,
    divPL,
    liqCorr,
    mktCap,
    fcf,
    fd: fd as Record<string, unknown>,
  };
}

export function computeFundamentalPack(ind: B3ExtractedIndicators): B3FundamentalPack {
  const { price, pe, eps, vpa, roe, dy, dps12m, fd } = ind;

  // Graham √(22.5 × LPA × VPA)
  let grahamFair = 0;
  let grahamUpside = 0;
  if (eps > 0 && vpa > 0) {
    grahamFair = Math.sqrt(22.5 * eps * vpa);
    if (!Number.isFinite(grahamFair)) grahamFair = 0;
    if (grahamFair > 0 && price > 0) grahamUpside = ((grahamFair - price) / price) * 100;
  }
  const graham: GrahamBlock = {
    fairPrice: grahamFair,
    upsidePct: grahamUpside,
    ok: grahamFair > 0,
  };

  // Bazin — preço teto com DY mínimo 6%
  // Reconciliamos proventos 12m com DY reportado para evitar discrepâncias quando a fonte vier parcial.
  let bazinCeiling = 0;
  let bazinUpside = 0;
  let bazinBase: BazinBlock['base'] = 'none';
  const divPerShareFromDy = dy > 0 && price > 0 ? (dy / 100) * price : 0;
  let divPerShare = 0;
  if (dps12m > 0 && divPerShareFromDy > 0) {
    const ratio = dps12m / divPerShareFromDy;
    if (ratio >= 0.5 && ratio <= 1.8) {
      divPerShare = dps12m;
      bazinBase = 'dps12m';
    } else {
      divPerShare = divPerShareFromDy;
      bazinBase = 'dy';
    }
  } else if (dps12m > 0) {
    divPerShare = dps12m;
    bazinBase = 'dps12m';
  } else if (divPerShareFromDy > 0) {
    divPerShare = divPerShareFromDy;
    bazinBase = 'dy';
  }

  if (divPerShare > 0 && price > 0) {
    bazinCeiling = divPerShare / 0.06;
    if (bazinCeiling > 0) bazinUpside = ((bazinCeiling - price) / price) * 100;
  }
  const bazin: BazinBlock = {
    ceilingPrice: bazinCeiling,
    upsidePct: bazinUpside,
    ok: bazinCeiling > 0,
    base: bazinBase,
    divPerShareUsed: divPerShare,
  };

  // Lynch — inclui PEG (P/L ÷ crescimento EPS) quando earningsGrowth estiver disponível
  const earGrowRaw = num(fd.earningsGrowth, 0);
  const epsGrowthPct =
    earGrowRaw !== 0
      ? Math.abs(earGrowRaw) <= 1
        ? earGrowRaw * 100
        : earGrowRaw
      : null;
  let peg: number | null = null;
  if (pe > 0 && epsGrowthPct != null && epsGrowthPct > 0) {
    peg = pe / epsGrowthPct;
    if (!Number.isFinite(peg)) peg = null;
  }

  const lynchItems: string[] = [];
  let lynchScore = 0;
  if (peg != null) {
    if (peg < 1) {
      lynchScore += 22;
      lynchItems.push(`PEG ${peg.toFixed(2)} (< 1 — típico GARP)`);
    } else if (peg < 2) {
      lynchScore += 12;
      lynchItems.push(`PEG ${peg.toFixed(2)} (< 2)`);
    } else {
      lynchItems.push(`PEG ${peg.toFixed(2)} (crescimento caro vs P/L)`);
    }
  } else if (epsGrowthPct != null && epsGrowthPct <= 0) {
    lynchItems.push('Crescimento EPS ≤ 0 — PEG não aplicável');
  } else {
    lynchItems.push('PEG — crescimento EPS indisponível na Brapi (use balanços históricos para refinar)');
  }

  if (pe > 0 && pe < 15) {
    lynchScore += 30;
    lynchItems.push(`P/L baixo (${pe.toFixed(1)}) — ótimo`);
  } else if (pe > 0 && pe < 25) {
    lynchScore += 15;
    lynchItems.push(`P/L moderado (${pe.toFixed(1)})`);
  } else if (pe > 0) {
    lynchScore += 5;
    lynchItems.push(`P/L alto (${pe.toFixed(1)})`);
  }
  if (dy >= 3) {
    lynchScore += 20;
    lynchItems.push(`Bons dividendos (${dy.toFixed(1)}%)`);
  } else if (dy > 0) {
    lynchScore += 10;
    lynchItems.push(`Dividendos modestos (${dy.toFixed(1)}%)`);
  }
  if (roe >= 15) {
    lynchScore += 25;
    lynchItems.push(`ROE excelente (${roe.toFixed(1)}%)`);
  } else if (roe >= 8) {
    lynchScore += 15;
    lynchItems.push(`ROE razoável (${roe.toFixed(1)}%)`);
  } else if (roe > 0) {
    lynchScore += 5;
    lynchItems.push(`ROE fraco (${roe.toFixed(1)}%)`);
  }
  const cr = num(fd.currentRatio, 0);
  if (cr >= 1.5) {
    lynchScore += 15;
    lynchItems.push(`Boa liquidez (${cr.toFixed(2)})`);
  } else if (cr >= 1) {
    lynchScore += 8;
    lynchItems.push(`Liquidez OK (${cr.toFixed(2)})`);
  } else if (cr > 0) {
    lynchItems.push(`Liquidez baixa (${cr.toFixed(2)})`);
  }
  const de = num(fd.debtToEquity, 0);
  if (de && de < 50) {
    lynchScore += 10;
    lynchItems.push('Baixo endividamento');
  } else if (de && de < 100) {
    lynchScore += 5;
    lynchItems.push('Endividamento moderado');
  } else if (de) {
    lynchItems.push('Alto endividamento');
  }
  lynchScore = Math.min(100, lynchScore);
  const lynchVerdict: LynchBlock['verdict'] =
    lynchScore >= 70 ? 'COMPRAR' : lynchScore >= 40 ? 'ANALISAR' : 'CAUTELA';

  // Buffett — 4 pilares (mesma lógica resumida do legado)
  let buffScore = 0;
  let moatScore = 0;
  if (roe >= 20) moatScore += 10;
  else if (roe >= 15) moatScore += 7;
  else if (roe >= 10) moatScore += 4;
  else if (roe > 0) moatScore += 1;
  const ml = ind.margLiq;
  if (ml >= 20) moatScore += 8;
  else if (ml >= 10) moatScore += 5;
  else if (ml > 0) moatScore += 2;
  const mo = ind.margOp;
  if (mo >= 20) moatScore += 7;
  else if (mo >= 12) moatScore += 4;
  else if (mo > 0) moatScore += 1;
  moatScore = Math.min(25, moatScore);
  buffScore += moatScore;

  let mgtScore = 0;
  if (roe >= 20 && de < 80) mgtScore += 10;
  else if (roe >= 15) mgtScore += 6;
  else if (roe >= 8) mgtScore += 3;
  const revGrow = num(fd.revenueGrowth, 0) * (Math.abs(num(fd.revenueGrowth, 0)) <= 1 ? 100 : 1);
  if (revGrow > 15) mgtScore += 8;
  else if (revGrow > 5) mgtScore += 5;
  else if (revGrow > 0) mgtScore += 2;
  const earGrow = num(fd.earningsGrowth, 0) * (Math.abs(num(fd.earningsGrowth, 0)) <= 1 ? 100 : 1);
  if (earGrow > 20) mgtScore += 7;
  else if (earGrow > 5) mgtScore += 4;
  else if (earGrow > 0) mgtScore += 2;
  mgtScore = Math.min(25, mgtScore);
  buffScore += mgtScore;

  let finScore = 0;
  if (de && de < 30) finScore += 10;
  else if (de && de < 50) finScore += 7;
  else if (de && de < 100) finScore += 3;
  if (cr >= 2) finScore += 7;
  else if (cr >= 1.5) finScore += 5;
  else if (cr >= 1) finScore += 2;
  const fcfVal = ind.fcf;
  if (fcfVal > 0) finScore += 8;
  finScore = Math.min(25, finScore);
  buffScore += finScore;

  let mosScore = 0;
  let intrinsicValue = 0;
  const ocf = num(fd.operatingCashflow, 0);
  const ownerEarnings = fcfVal || ocf;
  if (ownerEarnings > 0 && ind.mktCap > 0 && price > 0) {
    const shares = ind.mktCap / price;
    const ownerPerShare = ownerEarnings / shares;
    intrinsicValue = ownerPerShare * 12;
    const buffUpside = ((intrinsicValue - price) / price) * 100;
    if (buffUpside > 30) mosScore += 12;
    else if (buffUpside > 10) mosScore += 8;
    else if (buffUpside > 0) mosScore += 4;
    else mosScore += 1;
  }
  if (pe > 0 && pe < 12) mosScore += 7;
  else if (pe > 0 && pe < 15) mosScore += 5;
  else if (pe > 0 && pe < 20) mosScore += 2;
  if (grahamUpside > 30) mosScore += 6;
  else if (grahamUpside > 10) mosScore += 3;
  mosScore = Math.min(25, mosScore);
  buffScore += mosScore;

  buffScore = Math.min(100, Math.max(0, buffScore));
  const buffVerdict: BuffettBlock['verdict'] =
    buffScore >= 75 ? 'COMPRAR' : buffScore >= 50 ? 'ANALISAR' : buffScore >= 30 ? 'CAUTELA' : 'EVITAR';

  const buffett: BuffettBlock = {
    score: buffScore,
    verdict: buffVerdict,
    moatScore: Math.min(25, moatScore),
    mgtScore,
    finScore,
    mosScore,
    intrinsicValue,
  };

  return {
    graham,
    bazin,
    lynch: {
      score: lynchScore,
      verdict: lynchVerdict,
      items: lynchItems,
      peg,
      epsGrowthPct,
    },
    buffett,
  };
}
