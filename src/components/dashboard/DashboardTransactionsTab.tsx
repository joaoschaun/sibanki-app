/**
 * Aba "Transações" do Dashboard (Ação #8 — Análise 360).
 * Extraída de Dashboard.tsx: busca local + lista das 15 transações recentes
 * com SovereigntyBadge calculado por transação.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useIntelligence } from '../../context/IntelligenceContext';
import { isTransferEntry } from '../../utils/entryUtils';
import { calculateSovereigntyScore } from '../../utils/sovereigntyEngine';
import { MerchantLogo } from '../transactions/MerchantLogo';
import { SovereigntyBadge } from '../ui/SovereigntyBadge';

export function DashboardTransactionsTab() {
  const { entries, budgets } = useAppContext();
  const { freedom } = useIntelligence();
  const [txSearch, setTxSearch] = useState('');
  const now = useMemo(() => new Date(), []);

  const sovereigntyBase = useMemo(() => {
    const liquidity = freedom.totalLiquidity ?? 0;
    const dailyBurnRate = freedom.dailyBurnRate > 0 ? freedom.dailyBurnRate : 50;

    const budgetMapLocal: Record<string, number> = {};
    if (budgets && typeof budgets === 'object') {
      for (const [k, v] of Object.entries(budgets as Record<string, unknown>)) {
        const n = Number(v);
        if (!isNaN(n)) budgetMapLocal[k] = n;
      }
    }

    const nowMonth = now.toISOString().slice(0, 7);
    const catSpent: Record<string, number> = {};
    for (const e of entries) {
      if (e.type === 'despesa' && !isTransferEntry(e) && (e.date || '').startsWith(nowMonth)) {
        const cat = e.category || 'Outros';
        catSpent[cat] = (catSpent[cat] || 0) + (Number(e.value) || 0);
      }
    }

    const ESSENTIAL_CATS = new Set(['Moradia', 'Saúde', 'Educação', 'Transporte', 'Alimentação', 'Utilidades', 'Serviços essenciais']);

    return { liquidity, dailyBurnRate, budgetMap: budgetMapLocal, catSpent, ESSENTIAL_CATS };
  }, [freedom, entries, budgets, now]);

  const scoreMap = useMemo(() => {
    const map = new Map<number, ReturnType<typeof calculateSovereigntyScore>>();
    const { liquidity, dailyBurnRate, budgetMap: localBMap, catSpent, ESSENTIAL_CATS } = sovereigntyBase;

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff30 = thirtyDaysAgo.toISOString().slice(0, 10);

    const recentExpenses = entries.filter(
      (e) => e.type === 'despesa' && !isTransferEntry(e) && (e.date || '') >= cutoff30
    );

    const streakMap = new Map<string, number>();
    for (const e of recentExpenses) {
      const key = `${e.category || 'Outros'}|${new Date(e.date || '').getDay()}`;
      streakMap.set(key, (streakMap.get(key) || 0) + 1);
    }

    for (const e of entries) {
      if (e.type !== 'despesa') continue;
      const cat = e.category || 'Outros';
      const limit = localBMap[cat];
      const spent = catSpent[cat] || 0;
      const budgetRemaining = limit != null ? limit - spent : undefined;
      const dayOfWeek = new Date(e.date || '').getDay();
      const streakKey = `${cat}|${dayOfWeek}`;
      const impulseStreakCount = Math.max(0, (streakMap.get(streakKey) || 0) - 1);

      map.set(e.id, calculateSovereigntyScore({
        value: Number(e.value) || 0,
        category: cat,
        isEssential: ESSENTIAL_CATS.has(cat),
        liquidity,
        dailyBurnRate,
        budgetRemaining,
        impulseStreakCount,
      }));
    }
    return map;
  }, [entries, sovereigntyBase, now]);

  const filteredTx = useMemo(() => {
    const base = entries.filter((e) => !isTransferEntry(e));
    return base
      .filter((e) =>
        !txSearch || [e.desc, e.category, e.account].some((s) =>
          String(s ?? '').toLowerCase().includes(txSearch.toLowerCase())
        )
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 15);
  }, [entries, txSearch]);

  return (
    <div className="space-y-6">
      <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-[11px] font-bold text-si-5 uppercase tracking-[0.18em]">Transações Recentes</h3>
            <p className="text-si-5 text-xs mt-0.5">Últimos lançamentos e impacto Sv em tempo real.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
            <input
              type="text"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="Buscar transações..."
              className="w-full bg-si-bg border border-si-border rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="divide-y divide-si-border">
          {filteredTx.length === 0 ? (
            <p className="text-si-5 text-sm py-8 text-center">Nenhum lançamento encontrado.</p>
          ) : (
            filteredTx.map((e) => {
              const dateObj = e.date ? new Date(e.date + 'T12:00:00') : null;
              const dateFormatted = dateObj
                ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : '';
              return (
                <div key={e.id} className="flex items-center justify-between gap-4 py-3 hover:bg-si-over-1/3 transition-colors px-2 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <MerchantLogo
                      description={e.desc}
                      category={e.category}
                      type={e.type}
                      size={28}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-si-1 truncate">{e.desc || e.category || '—'}</p>
                      <p className="text-xs text-si-5 mt-0.5">
                        {dateFormatted} · {e.category} {e.account ? `· ${e.account}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <span className={`text-sm font-bold ${e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {e.type === 'receita' ? '+' : '-'} R$ {e.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {e.type === 'despesa' && scoreMap.has(e.id) && (
                      <SovereigntyBadge
                        score={scoreMap.get(e.id)!.score}
                        daysLost={scoreMap.get(e.id)!.daysLost}
                        opportunityCost10y={scoreMap.get(e.id)!.opportunityCost10y}
                        compact
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-si-border pt-4 text-xs text-si-5">
          <span>Exibindo até 15 lançamentos recentes</span>
          <Link to="/lancamentos" className="text-blue-400 hover:underline">Ver todos →</Link>
        </div>
      </div>
    </div>
  );
}
