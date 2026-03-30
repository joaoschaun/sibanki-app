import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_COLORS, tooltipStyle, fmtBRL } from './chartConfig';

interface Segment {
  name: string;
  value: number;
  pct: number;
}

interface Props {
  data: Segment[];
  height?: number;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
      <p style={{ color: p.payload.fill, fontWeight: 500, marginBottom: 4 }}>{p.name}</p>
      <p style={{ color: '#f4f4f5', fontSize: 12 }}>{fmtBRL(p.value)}</p>
      <p style={{ color: '#a1a1aa', fontSize: 11 }}>{p.payload.pct.toFixed(1)}%</p>
    </div>
  );
}

export function PortfolioChart({ data, height = 240 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={85}
          dataKey="value"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.9} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
