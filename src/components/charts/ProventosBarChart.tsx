import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { tooltipStyle, axisStyle, gridStyle, fmtBRL, fmtAxis, EMERALD } from './chartConfig';

interface DataPoint { label: string; valor: number }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
      <p style={{ color: '#a1a1aa', fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color: EMERALD, fontWeight: 500 }}>{fmtBRL(payload[0].value)}</p>
    </div>
  );
}

export function ProventosBarChart({ data, height = 180 }: { data: DataPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtAxis} tick={axisStyle} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 4 }} />
        <Bar dataKey="valor" name="Proventos" fill={EMERALD} fillOpacity={0.85} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
