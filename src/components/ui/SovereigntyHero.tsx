/**
 * SovereigntyHero — Pierre-inspired full-width hero card for Dashboard.
 *
 * Design philosophy (Pierre Finance / CloudWalk):
 *  - ONE dominant metric at the centre (Dias de Liberdade)
 *  - Radial glow that changes colour with the sovereignty tier
 *  - Secondary numbers (receita / despesa / saldo / spread) as a compact bottom strip
 *  - Greeting + "Novo lançamento" CTA in the same card — no clutter outside
 */

import { useState } from 'react';
import { ArrowUpRight, Shield, TrendingUp, TrendingDown, Zap, CheckCircle2, AlertCircle, HelpCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Types (must stay in sync with sovereigntyEngine) ──────────────────────────
export type FreedomStatus =
  | 'inabalavel'
  | 'soberano'
  | 'resiliente'
  | 'em-construcao'
  | 'fragil';

export type SpreadVerdict =
  | 'alavancagem-inteligente'
  | 'zona-neutra'
  | 'ineficiencia-moderada'
  | 'dreno-critico';

export type FreedomResult = {
  days: number;
  coverageMonths: number;
  dailyBurnRate: number;
  status: FreedomStatus;
  dataConfidence?: 'alta' | 'media' | 'baixa';
  verifiedExpensesPct?: number;
  isEstimated?: boolean;
};

export type SpreadResult = {
  spreadGap: number;
  monthlyLeakage: number;
  verdict: SpreadVerdict;
};

// ─── Style maps ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<FreedomStatus, string> = {
  inabalavel: 'Inabalável',
  soberano: 'Soberano',
  resiliente: 'Resiliente',
  'em-construcao': 'Em construção',
  fragil: 'Frágil',
};

const STATUS_NUM: Record<FreedomStatus, string> = {
  inabalavel: 'text-violet-300',
  soberano: 'text-emerald-300',
  resiliente: 'text-blue-300',
  'em-construcao': 'text-amber-300',
  fragil: 'text-rose-300',
};

const STATUS_BADGE: Record<FreedomStatus, string> = {
  inabalavel: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  soberano: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  resiliente: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'em-construcao': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  fragil: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

// Radial glow position + colour per tier (inline style, TW can't compute dynamic values)
const GLOW_STYLE: Record<FreedomStatus, string> = {
  inabalavel: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(139,92,246,0.22) 0%, transparent 70%)',
  soberano: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%)',
  resiliente: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.16) 0%, transparent 70%)',
  'em-construcao': 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245,158,11,0.14) 0%, transparent 70%)',
  fragil: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(244,63,94,0.14) 0%, transparent 70%)',
};

// ─── Component ─────────────────────────────────────────────────────────────────
export function SovereigntyHero({
  userName,
  score,
  freedom,
  spread,
  receitaMes,
  despesaMes,
  saldoMes,
  varReceita,
  varDespesa,
}: {
  userName: string;
  score: number;
  freedom: FreedomResult;
  spread: SpreadResult;
  receitaMes: number;
  despesaMes: number;
  saldoMes: number;
  varReceita: number;
  varDespesa: number;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour >= 18 ? 'Boa noite' : hour >= 12 ? 'Boa tarde' : 'Bom dia';
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const fmtBRL2 = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtBRL0 = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="relative overflow-hidden bg-si-card rounded-2xl border border-si-border">
      {/* Tier-coloured radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: GLOW_STYLE[freedom.status] }}
      />

      <div className="relative p-6 space-y-5">
        {/* ── Top row: greeting + score badge + CTA ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-si-4 text-sm">
              {greeting}, <span className="text-si-2 font-semibold">{userName}</span>
            </p>
            <p className="text-si-5 text-xs mt-0.5 capitalize">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-si-over-2 text-si-4 text-[11px] font-bold px-2 py-1 rounded-md border border-si-border hidden sm:flex items-center gap-1">
              <Shield className="w-3 h-3" /> {score}
            </span>
            <Link
              to="/lancamentos"
              className="bg-si-over-3 hover:bg-si-over-4 border border-si-border text-si-2 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lançamento</span>
              <span className="sm:hidden">+</span>
            </Link>
          </div>
        </div>

        {/* ── Hero: Dias de Liberdade ── */}
        <div className="flex flex-col items-center py-3">
          <p className="text-si-5 text-xs uppercase tracking-widest font-semibold mb-2">
            Dias de Liberdade
          </p>
          <div className="flex items-end gap-2 leading-none">
            <span className={`text-[52px] sm:text-[72px] font-black tracking-tight leading-none ${STATUS_NUM[freedom.status]}`}>
              {freedom.days}
            </span>
            <span className="text-si-4 text-xl sm:text-2xl mb-1.5">dias</span>
          </div>
          <p className="text-si-5 text-xs mt-2">
            {freedom.coverageMonths.toFixed(1)} meses&nbsp;·&nbsp;queima R$&nbsp;
            {fmtBRL0(freedom.dailyBurnRate)}/dia
          </p>
          <span
            className={`mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${STATUS_BADGE[freedom.status]}`}
          >
            {STATUS_LABEL[freedom.status]}
          </span>

          {/* Confidence badge — only shown when meaningful */}
          {freedom.dataConfidence === 'alta' && (
            <span className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400/80">
              <CheckCircle2 className="w-3 h-3" />
              {freedom.verifiedExpensesPct}% das despesas verificadas pelo banco
            </span>
          )}
          {freedom.isEstimated && (
            <span className="mt-2 flex items-center gap-1 text-[11px] text-amber-400/80">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              baseado em estimativas do cadastro — adicione contas/lançamentos para precisão
            </span>
          )}
          {!freedom.isEstimated && freedom.dataConfidence === 'baixa' && (
            <span className="mt-2 flex items-center gap-1 text-[11px] text-si-5">
              <AlertCircle className="w-3 h-3 text-amber-400/60" />
              baseado em dados manuais — conecte seu banco para maior precisão
            </span>
          )}
        </div>

        {/* ── O que significa? ── */}
        {!showExplanation ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className="flex items-center gap-1.5 text-[11px] text-si-5 hover:text-si-3 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              O que significam esses números?
            </button>
          </div>
        ) : (
          <div className="bg-si-over-1 rounded-xl border border-si-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-si-4">Glossário rápido</p>
              <button type="button" onClick={() => setShowExplanation(false)} className="text-si-5 hover:text-si-3">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2.5 text-[12px]">
              <div>
                <p className="font-bold text-si-2">Ld — Dias de Liberdade</p>
                <p className="text-si-4 mt-0.5">Quantos dias você consegue viver com seu patrimônio atual sem precisar de nenhuma renda. Quanto maior, mais soberano você é.</p>
              </div>
              <div>
                <p className="font-bold text-si-2">Sg — Spread Gap</p>
                <p className="text-si-4 mt-0.5">Diferença entre o rendimento médio dos seus investimentos e o custo médio das suas dívidas. Positivo = seu dinheiro rende mais do que custa. Negativo = suas dívidas drenam mais do que você investe.</p>
              </div>
              <div>
                <p className="font-bold text-si-2">Sv — Sovereignty Score</p>
                <p className="text-si-4 mt-0.5">Pontuação de 0–100 por gasto, indicando se ele aumenta ou diminui sua soberania financeira. Ver nos lançamentos.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="border-t border-si-border" />

        {/* ── Bottom strip: receita / despesa / saldo / spread ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p className="text-si-5 text-xs">Receitas (mês)</p>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">R$ {fmtBRL2(receitaMes)}</p>
            {varReceita !== 0 && (
              <p
                className={`text-xs flex items-center gap-0.5 mt-0.5 ${
                  varReceita >= 0 ? 'text-emerald-500' : 'text-rose-400'
                }`}
              >
                {varReceita >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {varReceita >= 0 ? '+' : ''}
                {varReceita.toFixed(1)}%
              </p>
            )}
          </div>

          <div>
            <p className="text-si-5 text-xs">Despesas (mês)</p>
            <p className="text-sm font-bold text-rose-400 mt-0.5">R$ {fmtBRL2(despesaMes)}</p>
            {varDespesa !== 0 && (
              <p
                className={`text-xs flex items-center gap-0.5 mt-0.5 ${
                  varDespesa <= 0 ? 'text-emerald-500' : 'text-rose-400'
                }`}
              >
                {varDespesa <= 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3" />
                )}
                {varDespesa >= 0 ? '+' : ''}
                {varDespesa.toFixed(1)}%
              </p>
            )}
          </div>

          <div>
            <p className="text-si-5 text-xs">Saldo (mês)</p>
            <p
              className={`text-sm font-bold mt-0.5 ${
                saldoMes >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              R$ {fmtBRL2(saldoMes)}
            </p>
          </div>

          <div>
            <p className="text-si-5 text-xs">Spread Gap</p>
            <p
              className={`text-sm font-bold mt-0.5 flex items-center gap-1 ${
                spread.spreadGap >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <Zap className="w-3 h-3" />
              {spread.spreadGap >= 0 ? '+' : ''}
              {(spread.spreadGap * 100).toFixed(2)}%
            </p>
            <p className="text-xs text-si-5 mt-0.5">
              {spread.spreadGap < 0
                ? `−R$ ${fmtBRL0(Math.abs(spread.monthlyLeakage))}/mês`
                : 'positivo'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
