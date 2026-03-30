import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { tooltipStyle, axisStyle, gridStyle, fmtBRL, fmtAxis, EMERALD, ROSE } from './chartConfig';

interface DataPoint {
  label: string;
  saldo: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
      <p style={{ color: '#a1a1aa', fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color: v >= 0 ? EMERALD : ROSE, fontWeight: 500 }}>{fmtBRL(v)}</p>
    </div>
  );
}

export function BalanceAreaChart({ data, height = 200 }: Props) {
  const hasNegative = data.some(d => d.saldo < 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={EMERALD} stopOpacity={0.3} />
            <stop offset="95%" stopColor={EMERALD} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtAxis} tick={axisStyle} axisLine={false} tickLine={false} width={54} />
        {hasNegative && <ReferenceLine y={0} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" />}
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke={EMERALD}
          strokeWidth={2}
          fill="url(#saldoGrad)"
          dot={{ r: 3, fill: EMERALD, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: EMERALD }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
