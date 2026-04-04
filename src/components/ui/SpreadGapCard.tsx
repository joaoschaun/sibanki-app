/**
 * SpreadGapCard — Spread Gap (Sg) em destaque no Dashboard.
 *
 * Exibe se o usuário está "vazando capital" (juros > rendimento),
 * em equilíbrio ou com alavancagem inteligente.
 *
 * Design: Pierre Finance — monocromático, veredicto ALL CAPS,
 * número grande em R$/mês, barra visual de diferença.
 */

import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { SpreadGapResult } from '../../utils/sovereigntyEngine';

// ─── Configurações por veredicto ────────────────────────────────────────────
const VERDICT_CONFIG = {
  'dreno-critico': {
    label: 'DRENO CRÍTICO',
    sublabel: 'Seus juros consomem mais do que seus investimentos rendem.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/08',
    bar: 'bg-rose-500',
    border: 'border-rose-500/20',
    icon: TrendingDown,
    cta: { label: 'Organizar dívidas', to: '/consultor-ia' },
  },
  'ineficiencia-moderada': {
    label: 'INEFICIÊNCIA MODERADA',
    sublabel: 'Pequeno vazamento de capital. Vale renegociar.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/08',
    bar: 'bg-amber-500',
    border: 'border-amber-500/20',
    icon: TrendingDown,
    cta: { label: 'Ver estratégias', to: '/crescimento' },
  },
  'zona-neutra': {
    label: 'ZONA NEUTRA',
    sublabel: 'Spread irrelevante. Foco no crescimento do portfólio.',
    color: 'text-si-3',
    bg: 'bg-si-over-1',
    bar: 'bg-si-3',
    border: 'border-si-border',
    icon: Minus,
    cta: { label: 'Ver investimentos', to: '/crescimento' },
  },
  'alavancagem-inteligente': {
    label: 'ALAVANCAGEM INTELIGENTE',
    sublabel: 'Seus investimentos rendem mais do que custam suas dívidas.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/08',
    bar: 'bg-emerald-500',
    border: 'border-emerald-500/20',
    icon: TrendingUp,
    cta: { label: 'Ampliar posição', to: '/crescimento' },
  },
} as const;

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtBRL = (v: number) =>
  'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface SpreadGapCardProps {
  spread: SpreadGapResult;
}

export function SpreadGapCard({ spread }: SpreadGapCardProps) {
  const cfg = VERDICT_CONFIG[spread.verdict];
  const Icon = cfg.icon;

  // Barra: mostra proporção de yield vs debt (escala visual 0-5% ao mês)
  const maxRate = Math.max(spread.avgInvestmentYieldMonthly, spread.avgDebtCostMonthly, 0.01);
  const yieldPct = Math.min((spread.avgInvestmentYieldMonthly / maxRate) * 100, 100);
  const debtPct = Math.min((spread.avgDebtCostMonthly / maxRate) * 100, 100);

  const isNegative = spread.spreadGap < 0;
  const hasLeakage = spread.monthlyLeakage > 0;

  return (
    <div className={`rounded-2xl border ${cfg.border} bg-si-card p-5 space-y-4`}>

      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-si-5 uppercase tracking-[0.18em]">Spread Gap — Sg</p>
          <p className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
      </div>

      {/* ── Número principal: dreno mensal ou spread positivo ── */}
      <div>
        {hasLeakage && isNegative ? (
          <>
            <p className="text-[10px] text-si-5 uppercase tracking-wide mb-0.5">Vazamento mensal</p>
            <p className={`text-3xl font-black tabular-nums leading-none ${cfg.color}`}>
              −{fmtBRL(spread.monthlyLeakage)}
            </p>
            <p className="text-[11px] text-si-5 mt-1">por mês saindo da sua riqueza</p>
          </>
        ) : (
          <>
            <p className="text-[10px] text-si-5 uppercase tracking-wide mb-0.5">Spread</p>
            <p className={`text-3xl font-black tabular-nums leading-none ${cfg.color}`}>
              {spread.spreadGap >= 0 ? '+' : ''}{fmtPct(spread.spreadGap)} /mês
            </p>
            <p className="text-[11px] text-si-5 mt-1">{cfg.sublabel}</p>
          </>
        )}
      </div>

      {/* ── Barra comparativa: investimento vs dívida ── */}
      {(spread.avgInvestmentYieldMonthly > 0 || spread.avgDebtCostMonthly > 0) && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            {/* Rendimento */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-si-5 w-20 uppercase tracking-wide shrink-0">Rendimento</span>
              <div className="flex-1 h-1 rounded-full bg-si-over-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-si-3 transition-all"
                  style={{ width: `${yieldPct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-si-3 w-12 text-right tabular-nums">
                {fmtPct(spread.avgInvestmentYieldMonthly)}/m
              </span>
            </div>
            {/* Custo da dívida */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-si-5 w-20 uppercase tracking-wide shrink-0">Juros</span>
              <div className="flex-1 h-1 rounded-full bg-si-over-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${cfg.bar}`}
                  style={{ width: `${debtPct}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold w-12 text-right tabular-nums ${cfg.color}`}>
                {fmtPct(spread.avgDebtCostMonthly)}/m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Contexto adicional quando há dreno ── */}
      {hasLeakage && isNegative && (
        <p className="text-[11px] text-si-5 border-t border-si-border pt-3">
          {cfg.sublabel}{' '}
          Em 12 meses:{' '}
          <span className={`font-bold ${cfg.color}`}>
            −{fmtBRL(spread.monthlyLeakage * 12)}
          </span>
        </p>
      )}

      {/* ── CTA ── */}
      <Link
        to={cfg.cta.to}
        className="flex items-center justify-between w-full pt-1 text-[10px] font-bold text-si-5 hover:text-si-2 uppercase tracking-[0.12em] transition-colors group"
      >
        <span>{cfg.cta.label}</span>
        <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </Link>
    </div>
  );
}
