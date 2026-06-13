/**
 * useSovereigntyScores — Sv por lançamento (despesas) como hook compartilhado.
 *
 * Extraído de DashboardTransactionsTab (13/06/2026) para reutilização na
 * lista de Lançamentos — uma única implementação do cálculo de Sv na UI.
 */
import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useIntelligence } from '../context/IntelligenceContext';
import { isTransferEntry } from '../utils/entryUtils';
import { calculateSovereigntyScore } from '../utils/sovereigntyEngine';

const ESSENTIAL_CATS = new Set([
  'Moradia', 'Saúde', 'Educação', 'Transporte', 'Alimentação', 'Utilidades', 'Serviços essenciais',
]);

export type SovereigntyScoreResult = ReturnType<typeof calculateSovereigntyScore>;

export function useSovereigntyScores(): Map<number, SovereigntyScoreResult> {
  const { entries, budgets } = useAppContext();
  const { freedom } = useIntelligence();
  const now = useMemo(() => new Date(), []);

  return useMemo(() => {
    const liquidity = freedom.totalLiquidity ?? 0;
    const dailyBurnRate = freedom.dailyBurnRate > 0 ? freedom.dailyBurnRate : 50;

    const budgetMap: Record<string, number> = {};
    if (budgets && typeof budgets === 'object') {
      for (const [k, v] of Object.entries(budgets as Record<string, unknown>)) {
        const n = Number(v);
        if (!isNaN(n)) budgetMap[k] = n;
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

    const map = new Map<number, SovereigntyScoreResult>();
    for (const e of entries) {
      if (e.type !== 'despesa') continue;
      const cat = e.category || 'Outros';
      const limit = budgetMap[cat];
      const spent = catSpent[cat] || 0;
      const budgetRemaining = limit != null ? limit - spent : undefined;
      const dayOfWeek = new Date(e.date || '').getDay();
      const impulseStreakCount = Math.max(0, (streakMap.get(`${cat}|${dayOfWeek}`) || 0) - 1);

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
  }, [entries, budgets, freedom, now]);
}
