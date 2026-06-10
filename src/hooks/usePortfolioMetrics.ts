/**
 * usePortfolioMetrics — fonte única de verdade para todas as métricas da carteira.
 *
 * Substitui os múltiplos useMemo espalhados em Growth.tsx e InvestmentInsights.tsx.
 * Inclui: rentabilidade vs CDI/Selic/IBOVESPA, IR estimado, rebalanceamento,
 * renda passiva, FIRE, evolução histórica sintética e breakdown por tipo.
 */
import { useMemo } from 'react';
import type { Investment, Entry, InvestorProfile } from '../types/userData';

// ── Tipos exportados ───────────────────────────────────────────────────────────

export interface AllocationSlice {
  tipo: string;
  valor: number;
  pct: number;
  targetPctMin: number;
  targetPctMax: number;
  delta: number;          // pct - midTarget (negativo = abaixo, positivo = acima)
  rebalanceAmount: number; // R$ a comprar (>0) ou vender (<0) para atingir alvo
  color: string;
}

export interface BenchmarkItem {
  label: string;
  pct: number;
  color: string;
  isPortfolio?: boolean;
}

export interface IrEstimate {
  /** Ganho bruto acumulado (valor atual - valor aplicado) */
  ganhoTotal: number;
  /** IR estimado anual sobre ganho (alíquota simplificada) */
  irAnual: number;
  /** Ganho líquido estimado */
  ganhoLiquido: number;
  /** Alíquota média ponderada usada */
  aliquotaMedia: number;
}

export interface PortfolioMetrics {
  // Totais básicos
  totalAplicado: number;
  totalAtual: number;
  totalPnl: number;
  rentabPct: number;          // % bruta sobre aplicado

  // Benchmarks (% a.a. estimados)
  rentabAnualizadaPct: number; // rentabilidade anualizada (simplificada)
  cdiAnualPct: number;
  selicAnualPct: number;
  vsCodiPct: number;          // rentabAnualizada - CDI
  vsSelicPct: number;

  // Renda passiva
  rendaPassivaMensal: number;
  rendaPassivaAnual: number;
  yieldOnCost: number;        // renda / total aplicado * 12

  // FIRE
  fireTarget: number;
  firePct: number;
  monthlyExpenses: number;

  // Rebalanceamento por tipo
  allocation: AllocationSlice[];

  // IR simplificado
  ir: IrEstimate;

  // Evolução histórica sintética (investido por mês)
  investedHistory: Array<{ month: string; totalInvestido: number; totalAtual: number }>;

  // Dividendos esperados próximos 30 dias (aproximação)
  rendaEsperadaProxMes: number;
}

// ── Paleta de cores por tipo ──────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  'Ações':           '#60a5fa',
  'FIIs':            '#34d399',
  'ETFs':            '#a78bfa',
  'Renda Fixa':      '#fbbf24',
  'Criptoativos':    '#f97316',
  'Tesouro Direto':  '#e879f9',
  'Debêntures':      '#94a3b8',
  'Fundos':          '#2dd4bf',
  'Exterior':        '#fb7185',
  'Outros':          '#6b7280',
};

function typeColor(tipo: string): string {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (tipo.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#6b7280';
}

// ── Alvo de alocação por perfil ───────────────────────────────────────────────

type ProfileKey = 'conservador' | 'moderado' | 'arrojado';

interface AllocationTarget { min: number; max: number }

// [tipo parcial] → min/max %
const PROFILE_TARGETS: Record<ProfileKey, Record<string, AllocationTarget>> = {
  conservador: {
    'renda fixa':    { min: 60, max: 80 },
    'tesouro':       { min: 10, max: 25 },
    'ações':         { min:  0, max: 10 },
    'fiis':          { min:  0, max:  5 },
    'etfs':          { min:  0, max:  5 },
    'cripto':        { min:  0, max:  2 },
    'outros':        { min:  0, max:  5 },
  },
  moderado: {
    'renda fixa':    { min: 30, max: 55 },
    'tesouro':       { min:  5, max: 20 },
    'ações':         { min: 15, max: 35 },
    'fiis':          { min: 10, max: 25 },
    'etfs':          { min:  5, max: 15 },
    'cripto':        { min:  0, max:  5 },
    'outros':        { min:  0, max:  5 },
  },
  arrojado: {
    'renda fixa':    { min: 10, max: 25 },
    'tesouro':       { min:  0, max: 10 },
    'ações':         { min: 30, max: 55 },
    'fiis':          { min: 10, max: 20 },
    'etfs':          { min:  5, max: 20 },
    'cripto':        { min:  5, max: 15 },
    'outros':        { min:  0, max:  5 },
  },
};

function getTarget(tipo: string, profile: ProfileKey): AllocationTarget {
  const targets = PROFILE_TARGETS[profile];
  const tipoLower = tipo.toLowerCase();
  for (const [key, target] of Object.entries(targets)) {
    if (tipoLower.includes(key)) return target;
  }
  return { min: 0, max: 5 };
}

// ── IR simplificado (Brasil — ações) ──────────────────────────────────────────
// Regra: ganho em ações isentos se venda mensal < R$20k; acima: 15%.
// FIIs: 20%. Criptoativos: 15%. Renda fixa: tabela regressiva (estimativa: 17,5%).

function calcIr(investments: Investment[]): IrEstimate {
  let ganhoTotal = 0;
  let irPonderado = 0;
  let baseTotal = 0;

  for (const inv of investments) {
    const aplicado = inv.valor ?? 0;
    const atual = inv.atual ?? inv.valor ?? 0;
    const ganho = atual - aplicado;
    if (ganho <= 0) continue;

    const tipo = (inv.tipo || '').toLowerCase();
    let aliq = 0.175; // padrão: renda fixa/CDB (tabela regressiva média)
    if (tipo.includes('ação') || tipo.includes('ações') || tipo.includes('etf')) aliq = 0.15;
    if (tipo.includes('fii')) aliq = 0.20;
    if (tipo.includes('cripto')) aliq = 0.15;

    ganhoTotal += ganho;
    irPonderado += ganho * aliq;
    baseTotal += ganho;
  }

  const aliquotaMedia = baseTotal > 0 ? irPonderado / baseTotal : 0.15;
  const irAnual = irPonderado;
  const ganhoLiquido = ganhoTotal - irAnual;

  return { ganhoTotal, irAnual, ganhoLiquido, aliquotaMedia };
}

// ── Evolução histórica sintética ──────────────────────────────────────────────
// Recalcula "total investido por mês" com base nas datas de compra.
// Para "valor atual" usamos snapshots de localStorage se disponíveis.

const SNAPSHOT_KEY = 'sib_portfolio_snapshots';

interface PortfolioSnapshot {
  month: string;
  totalAtual: number;
}

export function savePortfolioSnapshot(totalAtual: number) {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    const snaps: PortfolioSnapshot[] = raw ? JSON.parse(raw) : [];
    const month = new Date().toISOString().slice(0, 7);
    const existing = snaps.findIndex((s) => s.month === month);
    if (existing >= 0) {
      snaps[existing].totalAtual = totalAtual;
    } else {
      snaps.push({ month, totalAtual });
    }
    // Mantém últimos 24 meses
    const sorted = snaps.sort((a, b) => a.month.localeCompare(b.month)).slice(-24);
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(sorted));
  } catch {
    // ignora
  }
}

function loadSnapshots(): PortfolioSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Hook principal ─────────────────────────────────────────────────────────────

export function usePortfolioMetrics(
  investments: Investment[],
  entries: Entry[],
  investorProfile?: InvestorProfile | null,
  /** CDI mensal em decimal (ex: 0.0107) */
  cdiMonthly?: number,
  selicAnnual?: number,
): PortfolioMetrics {
  return useMemo(() => {
    const cdiM = cdiMonthly ?? 0.0107;
    const cdiAnualPct = (Math.pow(1 + cdiM, 12) - 1) * 100;
    const selicAnualPct = (selicAnnual ?? 0.1275) * 100;

    // ── Totais ──
    const totalAplicado = investments.reduce((s, i) => s + (i.valor ?? 0), 0);
    const totalAtual    = investments.reduce((s, i) => s + (i.atual ?? i.valor ?? 0), 0);
    const totalPnl      = totalAtual - totalAplicado;
    const rentabPct     = totalAplicado > 0 ? (totalPnl / totalAplicado) * 100 : 0;

    // Anualização simplificada: usa data mais antiga de investimento
    const dates = investments.map((i) => i.date).filter(Boolean).sort();
    const firstDate = dates[0] ? new Date(dates[0] + 'T12:00:00') : null;
    const yearsHeld = firstDate
      ? Math.max(0.08, (Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 1;
    const rentabAnualizadaPct = totalAplicado > 0
      ? (Math.pow(totalAtual / totalAplicado, 1 / yearsHeld) - 1) * 100
      : 0;

    const vsCodiPct  = rentabAnualizadaPct - cdiAnualPct;
    const vsSelicPct = rentabAnualizadaPct - selicAnualPct;

    // ── Renda passiva ──
    const YIELD_FALLBACK = 0.005;
    let rendaPassivaMensal = 0;
    for (const inv of investments) {
      const valor = inv.atual ?? inv.valor ?? 0;
      if (Number(inv.proventosMensais) > 0) {
        rendaPassivaMensal += Number(inv.proventosMensais);
      } else {
        const dy = (inv as any).dy as number | undefined;
        if (dy && dy > 0) {
          rendaPassivaMensal += (valor * (dy / 100)) / 12;
        } else if (!(inv.tipo || '').toLowerCase().includes('cripto')) {
          rendaPassivaMensal += valor * YIELD_FALLBACK;
        }
      }
    }
    const rendaPassivaAnual = rendaPassivaMensal * 12;
    const yieldOnCost = totalAplicado > 0 ? (rendaPassivaAnual / totalAplicado) * 100 : 0;

    // ── Despesas e FIRE ──
    const now = new Date();
    const monthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let monthlyExpenses = entries
      .filter((e) => e.type === 'despesa' && (e.date || '').startsWith(monthRef))
      .reduce((s, e) => s + Number(e.value || 0), 0);
    if (monthlyExpenses === 0) {
      const byMonth: Record<string, number> = {};
      for (const e of entries.filter((e) => e.type === 'despesa')) {
        const m = (e.date || '').slice(0, 7);
        if (m) byMonth[m] = (byMonth[m] || 0) + Number(e.value || 0);
      }
      const vals = Object.values(byMonth).sort((a, b) => b - a).slice(0, 3);
      monthlyExpenses = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    const fireTarget = monthlyExpenses > 0 ? (monthlyExpenses * 12) / 0.04 : 0;
    const firePct = fireTarget > 0 ? Math.min(100, (totalAtual / fireTarget) * 100) : 0;

    // ── Alocação e rebalanceamento ──
    const byType: Record<string, number> = {};
    for (const inv of investments) {
      const tipo = inv.tipo || 'Outros';
      byType[tipo] = (byType[tipo] ?? 0) + (inv.atual ?? inv.valor ?? 0);
    }
    const profile = (investorProfile?.profile ?? 'moderado') as ProfileKey;
    const allocation: AllocationSlice[] = Object.entries(byType)
      .map(([tipo, valor]) => {
        const pct = totalAtual > 0 ? (valor / totalAtual) * 100 : 0;
        const target = getTarget(tipo, profile);
        const midTarget = (target.min + target.max) / 2;
        const delta = pct - midTarget;
        const targetValor = totalAtual * (midTarget / 100);
        const rebalanceAmount = targetValor - valor;
        return {
          tipo, valor,
          pct: +pct.toFixed(1),
          targetPctMin: target.min,
          targetPctMax: target.max,
          delta: +delta.toFixed(1),
          rebalanceAmount: +rebalanceAmount.toFixed(2),
          color: typeColor(tipo),
        };
      })
      .sort((a, b) => b.valor - a.valor);

    // ── IR estimado ──
    const ir = calcIr(investments);

    // ── Evolução histórica ──
    const snapshots = loadSnapshots();
    const snapshotMap: Record<string, number> = {};
    for (const s of snapshots) snapshotMap[s.month] = s.totalAtual;

    // Meses desde o primeiro investimento
    const investedHistory: Array<{ month: string; totalInvestido: number; totalAtual: number }> = [];
    if (firstDate) {
      const start = new Date(firstDate);
      start.setDate(1);
      const cursor = new Date(start);
      while (cursor <= now) {
        const m = cursor.toISOString().slice(0, 7);
        const totalInvestidoAteM = investments
          .filter((i) => (i.date || '') <= m + '-31')
          .reduce((s, i) => s + (i.valor ?? 0), 0);
        const snapshotAtual = snapshotMap[m] ?? (m === now.toISOString().slice(0, 7) ? totalAtual : totalInvestidoAteM);
        investedHistory.push({ month: m, totalInvestido: totalInvestidoAteM, totalAtual: snapshotAtual });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    // ── Renda esperada próximo mês ──
    const rendaEsperadaProxMes = rendaPassivaMensal;

    return {
      totalAplicado, totalAtual, totalPnl, rentabPct,
      rentabAnualizadaPct, cdiAnualPct, selicAnualPct,
      vsCodiPct, vsSelicPct,
      rendaPassivaMensal, rendaPassivaAnual, yieldOnCost,
      fireTarget, firePct, monthlyExpenses,
      allocation, ir,
      investedHistory,
      rendaEsperadaProxMes,
    };
  }, [investments, entries, investorProfile, cdiMonthly, selicAnnual]);
}
