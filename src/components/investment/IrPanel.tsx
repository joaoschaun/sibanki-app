/**
 * IrPanel — estimativa de IR sobre ganhos de capital.
 *
 * Regras simplificadas brasileiras:
 * - Ações: 15% s/ lucro acima de R$20k de vendas/mês (isento abaixo)
 * - FIIs: 20%
 * - Renda Fixa / CDB: tabela regressiva (estimativa: 17,5% para prazo médio)
 * - Criptoativos: 15%
 *
 * Exibe: ganho bruto total, IR estimado, ganho líquido, alíquota média.
 */
import { Receipt, Info } from 'lucide-react';
import type { IrEstimate } from '../../hooks/usePortfolioMetrics';

interface Props {
  ir: IrEstimate;
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function IrPanel({ ir }: Props) {
  const { ganhoTotal, irAnual, ganhoLiquido, aliquotaMedia } = ir;

  if (ganhoTotal <= 0) {
    return (
      <div className="bg-si-card border border-si-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-zinc-500" />
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">IR Estimado</h4>
        </div>
        <p className="text-sm text-zinc-500">Nenhum ganho de capital para tributar no momento.</p>
      </div>
    );
  }

  const irPct = ganhoTotal > 0 ? (irAnual / ganhoTotal) * 100 : 0;

  return (
    <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Receipt className="w-4 h-4 text-zinc-400" />
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">IR Estimado (ganho de capital)</h4>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Ganho bruto</p>
          <p className="text-lg font-black text-emerald-400">{fmtBRL(ganhoTotal)}</p>
          <p className="text-[10px] text-zinc-600">valor atual − aplicado</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">IR estimado</p>
          <p className="text-lg font-black text-amber-400">{fmtBRL(irAnual)}</p>
          <p className="text-[10px] text-zinc-600">{irPct.toFixed(1)}% do ganho</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Ganho líquido</p>
          <p className="text-lg font-black text-si-1">{fmtBRL(ganhoLiquido)}</p>
          <p className="text-[10px] text-zinc-600">após IR estimado</p>
        </div>
      </div>

      {/* Barra ganho/IR */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden flex">
          <div
            className="bg-emerald-500/70 transition-all duration-500"
            style={{ width: `${100 - irPct}%` }}
          />
          <div
            className="bg-amber-500/70 transition-all duration-500"
            style={{ width: `${irPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>Líquido ({(100 - irPct).toFixed(0)}%)</span>
          <span>IR ({irPct.toFixed(0)}%)</span>
        </div>
      </div>

      {/* Tabela por classe (alíquotas) */}
      <div className="pt-1 border-t border-si-border">
        <div className="flex items-center gap-1.5 mb-2">
          <Info className="w-3 h-3 text-zinc-600" />
          <span className="text-[10px] text-zinc-600">Alíquotas utilizadas nesta estimativa</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-zinc-500">
          <div className="flex justify-between"><span>Ações (venda &gt; R$20k/mês)</span><span className="font-bold text-zinc-400">15%</span></div>
          <div className="flex justify-between"><span>FIIs</span><span className="font-bold text-zinc-400">20%</span></div>
          <div className="flex justify-between"><span>Renda Fixa / CDB</span><span className="font-bold text-zinc-400">17,5%*</span></div>
          <div className="flex justify-between"><span>Criptoativos</span><span className="font-bold text-zinc-400">15%</span></div>
        </div>
        <p className="text-[10px] text-zinc-700 mt-2">
          * Estimativa para prazo médio. Consulte um contador para declaração oficial.
          Alíquota média ponderada: {(aliquotaMedia * 100).toFixed(1)}%.
        </p>
      </div>
    </div>
  );
}
