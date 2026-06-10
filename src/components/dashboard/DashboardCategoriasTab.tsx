/**
 * Aba "Categorias" do Dashboard (Ação #8 — Análise 360).
 * Extraída de Dashboard.tsx: donut de distribuição de despesas + progresso de
 * consumo por categoria contra o orçamento. Recebe catTotals/budgetMap por
 * props porque a página já os computa para a Visão Geral.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ExpensesPieChart } from '../charts/ExpensesPieChart';

interface Props {
  catTotals: Record<string, number>;
  budgetMap: Record<string, number>;
  donutSegments: { name: string; value: number; pct: number }[];
  donutTotal: number;
}

export function DashboardCategoriasTab({ catTotals, budgetMap, donutSegments, donutTotal }: Props) {
  const categoryBudgets = useMemo(() => {
    const list: {
      category: string;
      spent: number;
      limit: number;
      percent: number;
    }[] = [];

    const allCats = new Set([...Object.keys(budgetMap), ...Object.keys(catTotals)]);

    for (const cat of allCats) {
      if (cat === 'Transferência') continue;
      const spent = catTotals[cat] ?? 0;
      const limit = budgetMap[cat] ?? 0;
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      list.push({ category: cat, spent, limit, percent });
    }

    return list.sort((a, b) => b.spent - a.spent);
  }, [budgetMap, catTotals]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de pizza */}
        <div className="lg:col-span-1 bg-si-card rounded-2xl border border-si-border p-6 flex flex-col justify-center">
          <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-4 text-center">
            Distribuição de Despesas
          </h3>
          {donutTotal > 0 ? (
            <ExpensesPieChart data={donutSegments} height={200} innerRadius={46} outerRadius={72} />
          ) : (
            <p className="text-si-5 text-sm py-8 text-center">Nenhuma despesa para exibir.</p>
          )}
        </div>

        {/* Listagem de orçamentos */}
        <div className="lg:col-span-2 bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider">
              Consumo por Categoria vs Orçamento
            </h3>
            <Link to="/orcamento" className="text-xs text-blue-400 hover:underline">Configurar Limites</Link>
          </div>

          {categoryBudgets.length === 0 ? (
            <p className="text-si-5 text-sm py-8 text-center">Nenhum lançamento no mês para exibir.</p>
          ) : (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {categoryBudgets.map((item) => {
                const overBudget = item.limit > 0 && item.spent > item.limit;
                const warning = item.limit > 0 && item.spent > item.limit * 0.8;
                const progressVal = item.limit > 0 ? Math.min(100, item.percent) : 100;
                return (
                  <div key={item.category} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-si-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-si-1">{item.category}</span>
                        {overBudget ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold text-[10px] uppercase">Estourado</span>
                        ) : warning ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[10px] uppercase">Atenção</span>
                        ) : null}
                      </div>
                      <span className="text-si-4">
                        R$ {item.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                        {item.limit > 0 ? `de R$ ${item.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '(Sem Limite)'}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-si-over-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          overBudget ? 'bg-rose-500' : warning ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressVal}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
