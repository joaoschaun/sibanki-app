import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { tooltipStyle, CHART_COLORS, fmtBRL } from './chartConfig';

interface Segment {
  name: string;
  value: number;
}

interface Props {
  data: Segment[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const total = p.payload.total ?? p.value;
  const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0';
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
      <p style={{ color: p.payload.fill, fontWeight: 500, marginBottom: 4 }}>{p.name}</p>
      <p style={{ color: '#f4f4f5', fontSize: 12 }}>{fmtBRL(p.value)}</p>
      <p style={{ color: '#a1a1aa', fontSize: 11 }}>{pct}%</p>
    </div>
  );
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={500}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function ExpensesPieChart({ data, height = 260, innerRadius = 55, outerRadius = 95 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const withTotal = data.map(d => ({ ...d, total }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={withTotal}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {withTotal.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.9} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
