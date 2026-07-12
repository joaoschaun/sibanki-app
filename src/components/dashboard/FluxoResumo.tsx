import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Activity, ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface Props {
  receitaMes: number;
  despesaMes: number;
  saldoMes: number;
  last6Months: { monthKey: string; receita: number; despesa: number }[];
}

export function FluxoResumo({ receitaMes, despesaMes, saldoMes, last6Months = [] }: Props) {
  // Sparkline data
  const sparkData = (() => {
    let acc = 0;
    return last6Months.map((row) => {
      acc += row.receita - row.despesa;
      return { value: acc };
    });
  })();

  const isPositive = saldoMes >= 0;

  return (
    <Card surface="raised" className="w-full p-5 border border-si-border flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-si-4" />
            <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-si-4">
              Fluxo de caixa
            </span>
          </div>
          <span className={cn(
            "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
            isPositive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          )}>
            {isPositive ? 'superávit' : 'déficit'}
          </span>
        </div>

        {/* Sparkline (mini chart) */}
        {sparkData.length > 0 ? (
          <div className="h-10 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? "#10b981" : "#ef4444"}
                  strokeWidth={1.5}
                  fill="url(#sparkGrad)"
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-10 flex items-center justify-center">
            <span className="text-[10px] text-si-5">Sem dados de histórico</span>
          </div>
        )}

        {/* 3 Microlabels */}
        <div className="grid grid-cols-3 gap-2 border-t border-si-border/30 pt-3">
          <div>
            <span className="text-[9px] text-si-4 uppercase tracking-wider block mb-0.5">Receitas</span>
            <span className="text-xs font-bold text-si-1">
              R$ {receitaMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-si-4 uppercase tracking-wider block mb-0.5">Despesas</span>
            <span className="text-xs font-bold text-si-1">
              R$ {despesaMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-si-4 uppercase tracking-wider block mb-0.5">Sobra</span>
            <span className={cn(
              "text-xs font-bold",
              isPositive ? "text-emerald-400" : "text-rose-400"
            )}>
              R$ {saldoMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-si-border/30 pt-3 mt-4">
        <Link
          to="/contas"
          className="text-[10px] font-bold text-si-3 hover:text-si-1 flex items-center gap-1 group transition-colors"
        >
          Ver fluxo completo
          <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </Card>
  );
}
