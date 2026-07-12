import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Tag, ArrowUpRight } from 'lucide-react';
import { useMemo } from 'react';

// Normalizador para as classes do index.css
function getCategoryStyle(categoryName: string) {
  const norm = categoryName.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, '-'); // substitui espaços

  const known = ['alimentacao', 'transporte', 'moradia', 'saude', 'lazer', 'educacao', 'salario', 'investimentos', 'assinaturas'];
  const key = known.includes(norm) ? norm : 'fallback';

  if (key === 'fallback') {
    return {
      bg: 'rgba(255, 255, 255, 0.05)',
      text: 'var(--si-text-2)',
      color: '#a1a1aa'
    };
  }

  return {
    bg: `var(--si-cat-${key}-bg)`,
    text: `var(--si-cat-${key}-text)`,
    color: `var(--si-cat-${key}-text)`
  };
}

export function ParaOndeFoi({ catTotals = {} }: { catTotals?: Record<string, number> }) {

  const { sortedCategories, totalSpent } = useMemo(() => {
    const total = Object.entries(catTotals)
      .filter(([cat]) => cat !== 'Transferência')
      .reduce((sum, [_, val]) => sum + val, 0);

    const sorted = Object.entries(catTotals)
      .filter(([cat, val]) => cat !== 'Transferência' && val > 0)
      .map(([name, value]) => ({
        name,
        value,
        pct: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    return { sortedCategories: sorted, totalSpent: total };
  }, [catTotals]);

  const isEmpty = sortedCategories.length === 0;

  return (
    <Card surface="raised" className="w-full p-5 border border-si-border flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-si-4" />
            <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-si-4">
              Para onde foi
            </span>
          </div>
          {!isEmpty && (
            <span className="text-[10px] text-si-3 font-semibold">
              R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Content */}
        {isEmpty ? (
          <div className="py-4">
            <p className="text-sm font-bold text-si-2">Nenhum gasto no mês</p>
            <p className="text-xs text-si-4 mt-1 leading-relaxed">
              Adicione lançamentos ou sincronize suas contas para ver o destino dos seus gastos.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stacked bar */}
            <div className="w-full h-2 rounded-full bg-si-over-2 overflow-hidden flex border border-si-border/30 animate-in fade-in duration-300">
              {sortedCategories.map((cat) => {
                const style = getCategoryStyle(cat.name);
                return (
                  <div
                    key={cat.name}
                    className="h-full"
                    style={{
                      width: `${cat.pct}%`,
                      backgroundColor: style.color
                    }}
                  />
                );
              })}
            </div>

            {/* List */}
            <div className="space-y-2">
              {sortedCategories.map((cat) => {
                const style = getCategoryStyle(cat.name);
                return (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: style.color }}
                      />
                      <span className="text-si-2 font-medium truncate">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-si-3 shrink-0">
                      <span>R$ {cat.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      <span className="text-[10px] text-si-4">({cat.pct.toFixed(0)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-si-border/30 pt-3 mt-4">
        <Link
          to="/lancamentos"
          className="text-[10px] font-bold text-si-3 hover:text-si-1 flex items-center gap-1 group transition-colors"
        >
          Ver transações
          <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </Card>
  );
}
