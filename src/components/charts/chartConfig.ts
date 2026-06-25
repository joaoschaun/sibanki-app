/**
 * Configurações e helpers compartilhados para todos os charts do app.
 * Usa a paleta do legado para consistência visual.
 */

export const CHART_COLORS = [
  '#4F8CFF', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#14b8a6', '#6366f1', '#a855f7',
];

export const EMERALD = '#10b981';
export const ROSE    = '#ef4444';
export const BLUE    = '#4F8CFF';
export const AMBER   = '#f59e0b';

/** Formatador de Real Brasileiro para tooltips */
export function fmtBRL(value: number): string {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Formatador compacto (k/M) para eixos. Evita ticks duplicados usando precisão significativa e limpando finais ".0" */
export function fmtAxis(value: number): string {
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1);
    return `R$${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}M`;
  }
  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1);
    return `R$${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}k`;
  }
  return `R$${value.toFixed(0)}`;
}

/**
 * Helper para o prop `formatter` do Tooltip do recharts v3.
 * A lib tipifica o valor como ValueType | undefined; este helper faz o cast seguro.
 */
export function makeFmt(label?: string) {
  return (v: unknown): [string, string] => [
    `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    label ?? '',
  ];
}

/** Estilo comum de tooltip */
export const tooltipStyle = {
  backgroundColor: 'var(--si-card)',
  border: '1px solid var(--si-border-md)',
  borderRadius: '12px',
  color: 'var(--si-text-1)',
  fontSize: 12,
};

export const tooltipCursorStyle = {
  fill: 'var(--si-over-1)',
  radius: 4,
};

/** Estilo do eixo (cor cinza para ticks e linhas) */
export const axisStyle = { fill: 'var(--si-text-4)', fontSize: 11 };
export const gridStyle = { stroke: 'var(--si-border)' };
