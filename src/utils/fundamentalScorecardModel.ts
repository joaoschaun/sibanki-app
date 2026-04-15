/**
 * Deriva score composto, pilares para radar e checklist a partir de B3FundamentalPack.
 * Sem comparação com setor — apenas perfil interno da ação (0–100).
 */

import type { B3FundamentalPack } from './b3Fundamentals';
import { GRAHAM_MAX_PE, GRAHAM_MAX_PVP, LYNCH_PEG_EXCELLENT } from '../constants/fundamentalAnalysis';
import { scoreToRedBlueHsl } from './scoreHue';

export interface ScorecardPillars {
  /** Componente derivado de Graham (margem vs preço justo), 0–100 */
  valor: number;
  /** Componente derivado de Bazin (margem vs teto DY 6%), 0–100 */
  dividendos: number;
  /** Score composto Lynch (P/L, DY, ROE, liquidez, dívida) — não é só “crescimento EPS” */
  lynch: number;
  /** Score Buffett (moat, gestão, saúde, margem de segurança), 0–100 */
  qualidade: number;
}

export function grahamScoreComponent(graham: B3FundamentalPack['graham']): number {
  if (!graham.ok || graham.fairPrice <= 0) return 35;
  return Math.min(100, Math.max(0, 50 + graham.upsidePct * 0.45));
}

export function bazinScoreComponent(bazin: B3FundamentalPack['bazin']): number {
  if (!bazin.ok || bazin.ceilingPrice <= 0) return 35;
  return Math.min(100, Math.max(0, 50 + bazin.upsidePct * 0.45));
}

export function computeCompositeScore(pack: B3FundamentalPack): number {
  const g = grahamScoreComponent(pack.graham);
  const b = bazinScoreComponent(pack.bazin);
  return Math.round((g + b + pack.lynch.score + pack.buffett.score) / 4);
}

export function computePillars(pack: B3FundamentalPack): ScorecardPillars {
  return {
    valor: Math.round(grahamScoreComponent(pack.graham)),
    dividendos: Math.round(bazinScoreComponent(pack.bazin)),
    lynch: pack.lynch.score,
    qualidade: pack.buffett.score,
  };
}

/** Média dos preços “justos” disponíveis (Graham, Bazin, intrínseco Buffett). */
export function computeFairAveragePrice(pack: B3FundamentalPack): number | null {
  const prices: number[] = [];
  if (pack.graham.ok && pack.graham.fairPrice > 0) prices.push(pack.graham.fairPrice);
  if (pack.bazin.ok && pack.bazin.ceilingPrice > 0) prices.push(pack.bazin.ceilingPrice);
  if (pack.buffett.intrinsicValue > 0) prices.push(pack.buffett.intrinsicValue);
  if (prices.length === 0) return null;
  return Math.round((prices.reduce((a, c) => a + c, 0) / prices.length) * 100) / 100;
}

export function marginVsFairAvg(fairAvg: number, price: number): number {
  if (price <= 0) return 0;
  return ((fairAvg - price) / price) * 100;
}

export interface ChecklistItem {
  id: string;
  label: string;
  ok: boolean;
}

export function buildFundamentalChecklist(
  pack: B3FundamentalPack,
  opts: { pe?: number; pvp?: number; roe?: number },
): ChecklistItem[] {
  const { pe, pvp, roe } = opts;
  const base: ChecklistItem[] = [
    {
      id: 'graham-margin',
      label: 'Margem vs. preço justo Graham',
      ok: pack.graham.ok && pack.graham.upsidePct > 0,
    },
    {
      id: 'bazin-ceiling',
      label: 'Preço no teto ou abaixo (Bazin, DY 6%)',
      ok: pack.bazin.ok && pack.bazin.upsidePct >= 0,
    },
    {
      id: 'pl',
      label: `P/L ≤ ${GRAHAM_MAX_PE} (filtro Graham)`,
      ok: typeof pe === 'number' && pe > 0 && pe <= GRAHAM_MAX_PE,
    },
    {
      id: 'pvp',
      label: `P/VP ≤ ${GRAHAM_MAX_PVP} (filtro Graham)`,
      ok: typeof pvp === 'number' && pvp > 0 && pvp <= GRAHAM_MAX_PVP,
    },
    {
      id: 'roe',
      label: 'ROE ≥ 15% (qualidade)',
      ok: typeof roe === 'number' && roe >= 15,
    },
    {
      id: 'lynch',
      label: 'Sinal Lynch favorável',
      ok: pack.lynch.verdict === 'COMPRAR',
    },
    {
      id: 'buffett',
      label: 'Sinal Buffett favorável',
      ok: pack.buffett.verdict === 'COMPRAR',
    },
  ];

  if (pack.lynch.peg != null) {
    base.splice(5, 0, {
      id: 'peg',
      label: `PEG < ${LYNCH_PEG_EXCELLENT} (Lynch, GARP)`,
      ok: pack.lynch.peg > 0 && pack.lynch.peg < LYNCH_PEG_EXCELLENT,
    });
  }

  return base;
}

export function compositeTier(composite: number): { label: string; color: string } {
  const label = composite >= 70 ? 'Oportunidade' : composite >= 45 ? 'Atenção' : 'Cautela';
  return { label, color: scoreToRedBlueHsl(composite) };
}
