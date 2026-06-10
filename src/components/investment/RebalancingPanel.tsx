/**
 * RebalancingPanel — quanto comprar/vender por classe de ativo para rebalancear.
 *
 * Mostra alocação atual vs alvo (baseado no perfil), e o valor exato em R$
 * a comprar (verde) ou vender (vermelho) em cada classe.
 */
import { ArrowUpRight, ArrowDownRight, CheckCircle2, Target } from 'lucide-react';
import type { AllocationSlice } from '../../hooks/usePortfolioMetrics';

interface Props {
  allocation: AllocationSlice[];
  totalAtual: number;
  profile: string;
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

export function RebalancingPanel({ allocation, totalAtual, profile }: Props) {
  if (allocation.length === 0 || totalAtual === 0) return null;

  const needsRebalance = allocation.some((a) => Math.abs(a.delta) > 3);
  const tooBig   = allocation.filter((a) => a.delta > 3).sort((a, b) => b.delta - a.delta);
  const tooSmall = allocation.filter((a) => a.delta < -3).sort((a, b) => a.delta - b.delta);
  const aligned  = allocation.filter((a) => Math.abs(a.delta) <= 3);

  return (
    <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Target className="w-4 h-4 text-zinc-400" />
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Rebalanceamento</h4>
          </div>
          <p className="text-xs text-zinc-400">
            {needsRebalance
              ? 'Sua carteira desviou do alvo — veja o que ajustar'
              : 'Carteira alinhada ao perfil — nenhuma ação necessária'}
          </p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-si-over-1 border border-si-border text-zinc-400 shrink-0 capitalize">{profile}</span>
      </div>

      {/* Grid de alocações */}
      <div className="space-y-2">
        {/* Acima do alvo (vender/reduzir) */}
        {tooBig.map((slice) => (
          <div key={slice.tipo} className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-si-2">{slice.tipo}</span>
                <div className="flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3 text-rose-400" />
                  <span className="text-[11px] font-bold text-rose-400">{fmtBRL(Math.abs(slice.rebalanceAmount))} a menos</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-500">Atual: {slice.pct.toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-600">→</span>
                <span className="text-[10px] text-zinc-400">Alvo: {slice.targetPctMin}–{slice.targetPctMax}%</span>
                <span className="text-[10px] text-rose-400 ml-auto">{fmtPct(slice.delta)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Abaixo do alvo (comprar/aumentar) */}
        {tooSmall.map((slice) => (
          <div key={slice.tipo} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-si-2">{slice.tipo}</span>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px] font-bold text-emerald-400">{fmtBRL(Math.abs(slice.rebalanceAmount))} a mais</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-500">Atual: {slice.pct.toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-600">→</span>
                <span className="text-[10px] text-zinc-400">Alvo: {slice.targetPctMin}–{slice.targetPctMax}%</span>
                <span className="text-[10px] text-emerald-400 ml-auto">{fmtPct(slice.delta)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Alinhados */}
        {aligned.map((slice) => (
          <div key={slice.tipo} className="flex items-center gap-3 p-2.5 rounded-xl bg-si-over-1 border border-si-border">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">{slice.tipo}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">{slice.pct.toFixed(1)}%</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {needsRebalance && (
        <p className="text-[10px] text-zinc-600 pt-1">
          Valores baseados no ponto médio do alvo do perfil <span className="capitalize">{profile}</span>. Rebalanceamento não obriga venda — considere aportar nas classes subrepresentadas.
        </p>
      )}
    </div>
  );
}
