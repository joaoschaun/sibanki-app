/**
 * BudgetBarChart — Gasto vs Limite por categoria.
 *
 * Reescrito em HTML/CSS puro (13/06/2026): o BarChart vertical do Recharts v3
 * não pintava as barras (eixos ok, séries vazias) e o visual de barras de
 * utilização é o padrão da casa (Hub de Crédito / mockup da landing).
 * Interface mantida (drop-in).
 */

export interface BudgetRow {
  category: string;
  gasto: number;
  limite: number;
  over: boolean;
}

interface Props {
  data: BudgetRow[];
  height?: number; // mantido por compatibilidade; ignorado
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function BudgetBarChart({ data }: Props) {
  if (!data.length) return null;
  return (
    <div className="space-y-4">
      {data.map((row) => {
        const limite = Number(row.limite) || 0;
        const gasto = Number(row.gasto) || 0;
        const pct = limite > 0 ? Math.min((gasto / limite) * 100, 100) : gasto > 0 ? 100 : 0;
        const near = !row.over && limite > 0 && gasto / limite >= 0.8;
        return (
          <div key={row.category}>
            <div className="flex items-baseline justify-between mb-1.5 gap-3">
              <span className="text-[13px] font-medium text-si-2 truncate">{row.category}</span>
              <span className="text-[12px] tabular-nums shrink-0">
                <span className={row.over ? 'text-rose-400 font-semibold' : near ? 'text-amber-400 font-semibold' : 'text-si-3'}>
                  {fmt(gasto)}
                </span>
                <span className="text-si-5"> / {fmt(limite)}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-si-over-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  row.over ? 'bg-rose-400' : near ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {row.over && (
              <p className="mt-1 text-[11px] text-rose-400/80">
                {fmt(gasto - limite)} acima do limite
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
