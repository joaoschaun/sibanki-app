/**
 * Tema compartilhado para recharts — dark mode do app.
 * Importar onde precisar de consistência visual.
 */

export const CHART_COLORS = [
  '#4F8CFF', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#a855f7',
];

export const CHART_GRID = { stroke: 'var(--si-border)', strokeDasharray: '3 3' };

export const CHART_AXIS = {
  tick: { fill: 'var(--si-text-4)', fontSize: 11 },
  axisLine: { stroke: 'var(--si-border-md)' },
  tickLine: false as const,
};

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--si-card)',
  border: '1px solid var(--si-border-md)',
  borderRadius: '12px',
  color: 'var(--si-text-2)',
  fontSize: 12,
};

export const CHART_LEGEND_STYLE = {
  fontSize: 12,
  color: 'var(--si-text-4)',
};

export function fmtBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
