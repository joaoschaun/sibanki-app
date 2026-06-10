/**
 * InvestmentInsights — "Raio X da Carteira" (v2)
 *
 * Usa usePortfolioMetrics para todas as métricas.
 * Mostra: rentabilidade vs CDI, renda passiva, FIRE, Ld, benchmark.
 */

import { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Zap, Flame,
  DollarSign, ShieldCheck, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import type { Investment, Entry, InvestorProfile } from '../../types/userData';
import type { DataFreshness } from '../../context/AppContext';
import { useMarketRates } from '../../hooks/useMarketRates';
import { usePortfolioMetrics } from '../../hooks/usePortfolioMetrics';

interface Props {
  investments: Investment[];
  entries: Entry[];
  investorProfile?: InvestorProfile;
  hasOpenFinance?: boolean;
  dataFreshness?: DataFreshness;
  verifiedEntries?: Entry[];
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPct = (v: number, sign = false) =>
  `${sign && v > 0 ? '+' : ''}${v.toFixed(1)}%`;

export function InvestmentInsights({ investments, entries, investorProfile, hasOpenFinance, dataFreshness, verifiedEntries }: Props) {
  const rates   = useMarketRates();
  const metrics = usePortfolioMetrics(investments, entries, investorProfile, rates.cdiMonthly, rates.selicAnnual);

  const verifiedExpenses = useMemo(() => {
    if (!verifiedEntries?.length) return null;
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return verifiedEntries.filter((e) => e.type === 'despesa' && (e.date || '').startsWith(m))
      .reduce((s, e) => s + Number(e.value || 0), 0);
  }, [verifiedEntries]);

  if (investments.length === 0) return null;

  const {
    totalAtual, totalPnl, rentabPct,
    rentabAnualizadaPct, cdiAnualPct, vsCodiPct,
    rendaPassivaMensal, fireTarget, firePct, monthlyExpenses,
    allocation,
  } = metrics;

  const expenses = verifiedExpenses ?? monthlyExpenses;
  const mesesLiberdade = expenses > 0 ? totalAtual / expenses : 0;
  const diasLiberdade  = Math.round(mesesLiberdade * 30);

  const fireBarWidth = Math.max(2, Math.min(100, firePct));
  const fireColor    = firePct >= 80 ? '#10b981' : firePct >= 40 ? '#f59e0b' : '#60a5fa';

  // Alinhamento
  const profile    = investorProfile?.profile ?? 'moderado';
  const rvTipos    = ['ações', 'fiis', 'etf', 'cripto', 'renda variável'];
  const rvTotal    = allocation.filter((a) => rvTipos.some((t) => a.tipo.toLowerCase().includes(t))).reduce((s, a) => s + a.valor, 0);
  const rvPct      = totalAtual > 0 ? (rvTotal / totalAtual) * 100 : 0;
  const alignOk    = profile === 'conservador' ? rvPct <= 20 : profile === 'arrojado' ? rvPct >= 30 : rvPct >= 15 && rvPct <= 55;
  const alignMsg   = alignOk
    ? `Carteira alinhada — ${fmtPct(rvPct)} em renda variável`
    : `Rebalanceamento sugerido — ${fmtPct(rvPct)} em renda variável (perfil ${profile})`;

  const dataLabel = hasOpenFinance && dataFreshness === 'fresh'
    ? 'dados verificados pelo banco'
    : hasOpenFinance
      ? 'dados do banco (pode estar desatualizado)'
      : 'dados inseridos manualmente';

  return (
    <div className="bg-[#0d0d0f] border border-white/[0.07] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Raio X da Carteira</span>
        </div>
        <span className="text-[10px] text-zinc-600">{dataLabel}</span>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/[0.06]">
        {/* Rentabilidade + benchmark */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            {rentabPct >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-zinc-500" /> : <TrendingDown className="w-3.5 h-3.5 text-zinc-500" />}
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Rentabilidade</span>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${rentabPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmtPct(rentabPct, true)}
          </p>
          <div className="mt-1 space-y-0.5">
            <p className="text-[10px] text-zinc-600">sobre o aplicado</p>
            <p className={`text-[10px] font-semibold ${vsCodiPct >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
              {vsCodiPct >= 0 ? '+' : ''}{vsCodiPct.toFixed(1)}% vs CDI ({cdiAnualPct.toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* Renda passiva */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Renda passiva</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{fmtBRL(rendaPassivaMensal)}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">estimado/mês (DY + proventos)</p>
        </div>

        {/* Dias de liberdade */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Liberdade</span>
          </div>
          {expenses > 0 ? (
            <>
              <p className="text-2xl font-bold text-white tabular-nums">
                {diasLiberdade > 9999 ? '∞' : diasLiberdade.toLocaleString('pt-BR')}
                <span className="text-sm font-normal text-zinc-500 ml-1">dias</span>
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {mesesLiberdade >= 12 ? `${(mesesLiberdade / 12).toFixed(1)} anos` : `${mesesLiberdade.toFixed(1)} meses`}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600 mt-1">Registre despesas</p>
          )}
        </div>

        {/* FIRE */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">FIRE</span>
          </div>
          {fireTarget > 0 ? (
            <>
              <p className="text-2xl font-bold tabular-nums" style={{ color: fireColor }}>
                {fmtPct(firePct)}
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${fireBarWidth}%`, backgroundColor: fireColor }} />
              </div>
              <p className="text-[11px] text-zinc-600 mt-1">Meta: {fmtBRL(fireTarget)}</p>
            </>
          ) : (
            <p className="text-sm text-zinc-600 mt-1">Registre despesas</p>
          )}
        </div>
      </div>

      {/* P&L absoluto */}
      <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[11px] text-zinc-500">
          P&L total: <span className={totalPnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {totalPnl >= 0 ? '+' : ''}{fmtBRL(totalPnl)}
          </span>
        </span>
        <span className="text-[11px] text-zinc-500">
          Rentab. anualiz.: <span className={`font-semibold ${rentabAnualizadaPct >= 0 ? 'text-zinc-300' : 'text-rose-400'}`}>
            {fmtPct(rentabAnualizadaPct, true)} a.a.
          </span>
        </span>
      </div>

      {/* Alinhamento de perfil */}
      {investorProfile && (
        <div className={`flex items-start gap-3 px-5 py-3 border-t border-white/[0.06] text-sm ${alignOk ? 'text-zinc-400' : 'text-amber-400'}`}>
          {alignOk
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="text-[12px] leading-relaxed">
            <span className="font-semibold capitalize">{investorProfile.profile} </span>
            — {alignMsg}
          </span>
          {hasOpenFinance && dataFreshness === 'fresh' && (
            <span className="ml-auto shrink-0 text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              OF verificado
            </span>
          )}
        </div>
      )}
    </div>
  );
}
