import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { tooltipStyle, axisStyle, gridStyle, fmtBRL, fmtAxis, EMERALD, ROSE, BLUE } from './chartConfig';

export interface BudgetRow {
  category: string;
  gasto: number;
  limite: number;
  over: boolean;
}

interface Props {
  data: BudgetRow[];
  height?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
      <p style={{ color: '#a1a1aa', fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0', fontSize: 12 }}>
          {p.name}: {fmtBRL(p.value)}
        </p>
      ))}
    </div>
  );
}

export function BudgetBarChart({ data, height = 280 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" barGap={2} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" {...gridStyle} horizontal={false} />
        <XAxis type="number" tickFormatter={fmtAxis} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="category" tick={axisStyle} axisLine={false} tickLine={false} width={90} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
        <Bar dataKey="limite" name="Limite" fill={BLUE} fillOpacity={0.4} radius={[0, 4, 4, 0]} />
        <Bar dataKey="gasto" name="Gasto" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.over ? ROSE : EMERALD} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
