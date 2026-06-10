/**
 * PortfolioEvolutionChart — gráfico de evolução do patrimônio investido.
 *
 * Mostra duas séries:
 *   - Total investido (aportes acumulados — sempre preciso)
 *   - Valor atual (snapshots salvos localmente ao sincronizar preços)
 *
 * Usa Recharts (já no bundle) para consistência visual com o resto do app.
 */
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DataPoint {
  month: string;
  totalInvestido: number;
  totalAtual: number;
}

interface Props {
  history: DataPoint[];
}

const fmtBRL = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `R$ ${(v / 1_000).toFixed(0)}k`
      : `R$ ${v.toFixed(0)}`;

function shortMonth(iso: string): string {
  const [year, month] = iso.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[Number(month) - 1]}/${year.slice(2)}`;
}

export function PortfolioEvolutionChart({ history }: Props) {
  const data = useMemo(
    () => history.map((h) => ({ ...h, label: shortMonth(h.month) })),
    [history]
  );

  if (data.length < 2) {
    return (
      <div className="bg-si-card border border-si-border rounded-2xl p-5">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Evolução Patrimonial</p>
        <p className="text-sm text-zinc-500 mt-4">
          Histórico disponível após pelo menos 2 meses de aportes registrados.
        </p>
      </div>
    );
  }

  const hasRealValues = data.some((d) => d.totalAtual !== d.totalInvestido);

  return (
    <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Evolução Patrimonial</p>
          <p className="text-xs text-zinc-500 mt-0.5">Aportes acumulados e valor de mercado</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-zinc-500 inline-block rounded" />
            Investido
          </span>
          {hasRealValues && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-0.5 bg-emerald-500 inline-block rounded" />
              Atual
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradInvestido" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#71717a" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradAtual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmtBRL(v)}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
            formatter={(value, name) => [
              fmtBRL(Number(value ?? 0)),
              name === 'totalInvestido' ? 'Total investido' : 'Valor atual',
            ]}
          />
          <Area
            type="monotone"
            dataKey="totalInvestido"
            stroke="#71717a"
            strokeWidth={1.5}
            fill="url(#gradInvestido)"
            dot={false}
          />
          {hasRealValues && (
            <Area
              type="monotone"
              dataKey="totalAtual"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradAtual)"
              dot={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
