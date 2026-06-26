import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MerchantLogo } from '../transactions/MerchantLogo';
import { SovereigntyBadge } from '../ui/SovereigntyBadge';

interface GenerativeUiContainerProps {
  uiPayload: {
    type: 'budgets' | 'transactions' | 'goals' | 'chart';
    data: any;
  };
}

export function GenerativeUiContainer({ uiPayload }: GenerativeUiContainerProps) {
  const { type, data } = uiPayload;

  if (!data) return null;

  switch (type) {
    case 'budgets': {
      const budgetsList = Array.isArray(data) ? data : data.budgets || [];
      if (!budgetsList.length) return null;

      return (
        <div className="mt-4 p-4 rounded-xl bg-si-card border border-si-border-md space-y-3.5 w-full">
          <div className="flex items-center justify-between border-b border-si-border pb-2">
            <span className="text-[10px] font-bold text-si-4 uppercase tracking-[0.18em]">
              Orçamentos Ativos
            </span>
            <span className="text-[9px] font-semibold text-si-5 uppercase">
              Envelope (ZBB)
            </span>
          </div>
          <div className="space-y-3">
            {budgetsList.map((b: any, index: number) => {
              const limit = Number(b.limit) || 0;
              const actual = Number(b.actual) || 0;
              const pct = limit > 0 ? Math.min(100, Math.round((actual / limit) * 100)) : 0;
              const isOver = actual > limit;

              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-si-2">
                    <span className="uppercase tracking-wider text-[11px] text-si-1">
                      {b.category || 'Categoria'}
                    </span>
                    <span className={isOver ? 'text-rose-400 font-bold' : 'text-si-3'}>
                      R$ {actual.toFixed(0)} / R$ {limit.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-si-over-2 rounded-full overflow-hidden border border-si-border">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isOver ? 'bg-rose-500' : 'bg-white'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case 'transactions': {
      const txs = Array.isArray(data) ? data : data.transactions || [];
      if (!txs.length) return null;

      return (
        <div className="mt-4 p-4 rounded-xl bg-si-card border border-si-border-md space-y-3 w-full">
          <div className="flex items-center justify-between border-b border-si-border pb-2">
            <span className="text-[10px] font-bold text-si-4 uppercase tracking-[0.18em]">
              Lançamentos Envolvidos
            </span>
            <span className="text-[9px] font-semibold text-si-5 uppercase">
              {txs.length} itens
            </span>
          </div>
          <div className="divide-y divide-si-border max-h-60 overflow-y-auto no-scrollbar">
            {txs.map((t: any, index: number) => {
              const isDesp = t.type === 'despesa';
              const val = Number(t.value) || 0;

              return (
                <div key={index} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MerchantLogo description={t.desc} category={t.category} size={28} />
                    <div className="min-w-0">
                      <p className="font-bold text-si-2 truncate uppercase tracking-wide text-[11px]">
                        {t.desc || 'Sem descrição'}
                      </p>
                      <p className="text-[10px] text-si-4 tracking-wider uppercase">
                        {t.category || 'Outros'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className={`font-bold ${isDesp ? 'text-si-2' : 'text-emerald-400'}`}>
                      {isDesp ? '-' : '+'} R$ {val.toFixed(2)}
                    </span>
                    {t.score !== undefined && (
                      <SovereigntyBadge score={Number(t.score)} daysLost={0} opportunityCost10y={0} compact />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case 'goals': {
      const goalsList = Array.isArray(data) ? data : data.goals || [];
      if (!goalsList.length) return null;

      return (
        <div className="mt-4 p-4 rounded-xl bg-si-card border border-si-border-md space-y-3.5 w-full">
          <div className="flex items-center justify-between border-b border-si-border pb-2">
            <span className="text-[10px] font-bold text-si-4 uppercase tracking-[0.18em]">
              Metas & Objetivos
            </span>
            <span className="text-[9px] font-semibold text-si-5 uppercase">
              Economia
            </span>
          </div>
          <div className="space-y-3.5">
            {goalsList.map((g: any, index: number) => {
              const target = Number(g.target) || 0;
              const current = Number(g.current) || 0;
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-si-2">
                    <span className="uppercase tracking-wider text-[11px] text-si-1">
                      {g.name || g.title || 'Meta'}
                    </span>
                    <span className="text-si-3 font-bold">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-si-over-2 rounded-full overflow-hidden border border-si-border">
                    <div
                      className="h-full bg-white transition-all duration-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-si-4">
                    <span>Guardado: R$ {current.toFixed(0)}</span>
                    <span>Alvo: R$ {target.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case 'chart': {
      const chartPoints = Array.isArray(data) ? data : data.points || [];
      if (!chartPoints.length) return null;

      // Formata a moeda no Tooltip
      const formatCurrency = (value: any) => {
        const val = Number(value);
        return isNaN(val) ? value : `R$ ${val.toFixed(2)}`;
      };

      return (
        <div className="mt-4 p-4 rounded-xl bg-si-card border border-si-border-md space-y-3 w-full">
          <div className="flex items-center justify-between border-b border-si-border pb-1">
            <span className="text-[10px] font-bold text-si-4 uppercase tracking-[0.18em]">
              Evolução & Tendência
            </span>
            <span className="text-[9px] font-semibold text-si-5 uppercase">
              Gráfico Reativo
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="generativeAreaColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  dy={5}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '9px', fontWeight: 'bold' }}
                  formatter={formatCurrency}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#generativeAreaColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
