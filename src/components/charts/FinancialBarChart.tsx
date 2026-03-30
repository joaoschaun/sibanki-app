import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { tooltipStyle, tooltipCursorStyle, axisStyle, gridStyle, fmtBRL, fmtAxis, EMERALD, ROSE } from './chartConfig';

interface MonthRow {
  monthKey: string;
  label: string;
  receita: number;
  despesa: number;
}

interface Props {
  data: MonthRow[];
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

export function FinancialBarChart({ data, height = 220 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={4} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtAxis} tick={axisStyle} axisLine={false} tickLine={false} width={54} />
        <Tooltip content={<CustomTooltip />} cursor={tooltipCursorStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#a1a1aa', paddingTop: 8 }}
        />
        <Bar dataKey="receita" name="Receita" fill={EMERALD} fillOpacity={0.85} radius={[4, 4, 0, 0]} />
        <Bar dataKey="despesa" name="Despesa" fill={ROSE}    fillOpacity={0.85} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
