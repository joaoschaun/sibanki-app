/**
 * InvestmentInsights — "Raio X da Carteira"
 *
 * Painel inteligente que conecta os dados reais da carteira com os
 * simuladores e métricas de soberania, sem pedir nada ao usuário.
 * Aparece no topo de Investimentos quando há pelo menos 1 ativo registrado.
 */

import { useMemo } from 'react';
import {
  TrendingUp,
  Zap,
  Flame,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { Investment, Entry, InvestorProfile } from '../../types/userData';
import type { DataFreshness } from '../../context/AppContext';

interface Props {
  investments: Investment[];
  entries: Entry[];
  investorProfile?: InvestorProfile;
  hasOpenFinance?: boolean;
  dataFreshness?: DataFreshness;
  verifiedEntries?: Entry[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPct = (v: number, showSign = false) =>
  `${showSign && v > 0 ? '+' : ''}${v.toFixed(1)}%`;

function getMonthlyExpenses(entries: Entry[], verifiedEntries?: Entry[]): number {
  const now = new Date();
  const monthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const source = verifiedEntries && verifiedEntries.length > 0 ? verifiedEntries : entries;
  const relevant = source.filter(
    (e) => e.type === 'despesa' && (e.date || '').startsWith(monthRef)
  );

  if (relevant.length > 0) {
    return relevant.reduce((s, e) => s + Number(e.value || 0), 0);
  }

  // Fallback: média dos últimos 3 meses
  const months: Record<string, number> = {};
  for (const e of entries.filter((e) => e.type === 'despesa')) {
    const m = (e.date || '').slice(0, 7);
    if (!m) continue;
    months[m] = (months[m] || 0) + Number(e.value || 0);
  }
  const sorted = Object.values(months).sort((a, b) => b - a).slice(0, 3);
  return sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
}

// Alinhamento entre perfil declarado e composição real da carteira
function getProfileAlignment(
  investments: Investment[],
  profile?: InvestorProfile
): { ok: boolean; message: string } {
  if (!profile || investments.length === 0) return { ok: true, message: '' };

  const totalAtual = investments.reduce((s, i) => s + (i.atual ?? i.valor ?? 0), 0);
  const variavelTipos = ['Ações', 'FIIs', 'ETF', 'Criptoativos', 'Renda Variável', 'Cripto'];
  const variavelTotal = investments
    .filter((i) => variavelTipos.some((t) => (i.tipo || '').toLowerCase().includes(t.toLowerCase())))
    .reduce((s, i) => s + (i.atual ?? i.valor ?? 0), 0);
  const variavelPct = totalAtual > 0 ? (variavelTotal / totalAtual) * 100 : 0;

  const p = profile.profile;
  if (p === 'conservador' && variavelPct > 20) {
    return {
      ok: false,
      message: `Perfil conservador mas ${fmtPct(variavelPct)} em renda variável — acima do recomendado`,
    };
  }
  if (p === 'arrojado' && variavelPct < 30) {
    return {
      ok: false,
      message: `Perfil arrojado mas apenas ${fmtPct(variavelPct)} em renda variável — abaixo do potencial`,
    };
  }
  return { ok: true, message: `Carteira alinhada ao perfil ${p}` };
}

// ── Componente ────────────────────────────────────────────────────────────────
export function InvestmentInsights({
  investments,
  entries,
  investorProfile,
  hasOpenFinance,
  dataFreshness,
  verifiedEntries,
}: Props) {
  const metrics = useMemo(() => {
    const totalAplicado = investments.reduce((s, i) => s + (i.valor ?? 0), 0);
    const totalAtual = investments.reduce((s, i) => s + (i.atual ?? i.valor ?? 0), 0);
    const rentab = totalAplicado > 0 ? ((totalAtual - totalAplicado) / totalAplicado) * 100 : 0;

    // Renda passiva estimada a 0.8% a.m. (referência conservadora CDI-like)
    const MONTHLY_YIELD = 0.008;
    const rendaPassiva = totalAtual * MONTHLY_YIELD;

    // Despesas mensais reais
    const monthlyExpenses = getMonthlyExpenses(entries, verifiedEntries);

    // Dias de liberdade financeira do patrimônio
    // (quantos meses o patrimônio sustenta os gastos)
    const mesesLiberdade = monthlyExpenses > 0 ? totalAtual / monthlyExpenses : 0;
    const diasLiberdade = Math.round(mesesLiberdade * 30);

    // FIRE — regra dos 4%: capital alvo = gastos anuais / 0.04
    const fireTarget = monthlyExpenses > 0 ? (monthlyExpenses * 12) / 0.04 : 0;
    const firePct = fireTarget > 0 ? Math.min(100, (totalAtual / fireTarget) * 100) : 0;

    // Alinhamento de perfil
    const alignment = getProfileAlignment(investments, investorProfile);

    return {
      totalAtual,
      totalAplicado,
      rentab,
      rendaPassiva,
      monthlyExpenses,
      diasLiberdade,
      mesesLiberdade,
      fireTarget,
      firePct,
      alignment,
    };
  }, [investments, entries, verifiedEntries, investorProfile]);

  if (investments.length === 0) return null;

  const { rentab, rendaPassiva, diasLiberdade, mesesLiberdade, firePct, fireTarget, monthlyExpenses, alignment } = metrics;

  // Barra FIRE
  const fireBarWidth = Math.max(2, Math.min(100, firePct));
  const fireColor =
    firePct >= 80 ? '#10b981' : firePct >= 40 ? '#f59e0b' : '#60a5fa';

  const dataLabel =
    hasOpenFinance && dataFreshness === 'fresh'
      ? 'dados verificados pelo banco'
      : hasOpenFinance
      ? 'dados do banco (pode estar desatualizado)'
      : 'dados inseridos manualmente';

  return (
    <div className="bg-[#0d0d0f] border border-white/[0.07] rounded-2xl overflow-hidden">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Raio X da Carteira</span>
        </div>
        <span className="text-[10px] text-zinc-600">{dataLabel}</span>
      </div>

      {/* ── Métricas ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/[0.06]">
        {/* Rentabilidade */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Rentabilidade</span>
          </div>
          <p
            className={`text-2xl font-bold tabular-nums ${
              rentab >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {fmtPct(rentab, true)}
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5">sobre o valor aplicado</p>
        </div>

        {/* Renda passiva estimada */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Renda passiva</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{fmtBRL(rendaPassiva)}</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">estimado/mês a 0,8%</p>
        </div>

        {/* Dias de liberdade */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Liberdade</span>
          </div>
          {monthlyExpenses > 0 ? (
            <>
              <p className="text-2xl font-bold text-white tabular-nums">
                {diasLiberdade > 9999 ? '∞' : diasLiberdade.toLocaleString('pt-BR')}
                <span className="text-sm font-normal text-zinc-500 ml-1">dias</span>
              </p>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                {mesesLiberdade >= 12
                  ? `${(mesesLiberdade / 12).toFixed(1)} anos sustentados`
                  : `${mesesLiberdade.toFixed(1)} meses sustentados`}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600 mt-1">Registre despesas para calcular</p>
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
              {/* Barra de progresso */}
              <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${fireBarWidth}%`, backgroundColor: fireColor }}
                />
              </div>
              <p className="text-[11px] text-zinc-600 mt-1">
                Meta: {fmtBRL(fireTarget)}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600 mt-1">Registre despesas para calcular</p>
          )}
        </div>
      </div>

      {/* ── Alinhamento de perfil ──────────────────────────────────────────── */}
      {investorProfile && (
        <div
          className={`flex items-start gap-3 px-5 py-3 border-t border-white/[0.06] text-sm ${
            alignment.ok ? 'text-zinc-400' : 'text-amber-400'
          }`}
        >
          {alignment.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span className="text-[12px] leading-relaxed">
            <span className="font-semibold capitalize">{investorProfile.profile} </span>
            {alignment.ok ? '·' : '—'} {alignment.ok ? alignment.message.replace(`Carteira alinhada ao perfil ${investorProfile.profile}`, 'carteira alinhada ao seu perfil declarado') : alignment.message}
          </span>

          {/* Open Finance badge inline */}
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
