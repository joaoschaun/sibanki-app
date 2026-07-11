import { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useIntelligence } from '../context/IntelligenceContext';
import { topHorizonItem, nextIncomeDate } from '../utils/anticipationEngine';

export function useHorizonTop() {
  const {
    accounts,
    accountBalances,
    accountMeta,
    recurrents,
    cards,
    creditObligations = [],
  } = useAppContext();

  const { freedom } = useIntelligence();

  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(() => new Set());

  const liquidCash = useMemo(
    () => (accounts || [])
      .filter((name) => {
        const meta = accountMeta[name];
        if (meta?.incluirNaSoma === false) return false;
        const tipo = meta?.tipo ?? 'Conta corrente';
        return tipo !== 'Investimento' && tipo !== 'Poupança';
      })
      .reduce((sum, name) => sum + (accountBalances[name] ?? 0), 0),
    [accounts, accountBalances, accountMeta]
  );

  const incomeDate = useMemo(() => nextIncomeDate(recurrents, new Date()), [recurrents]);

  const item = useMemo(() => {
    const top = topHorizonItem({
      liquidCash,
      dailyBurnRate: freedom.dailyBurnRate,
      recurrents,
      creditObligations,
      cards,
    });
    return top && snoozedIds.has(top.id) ? null : top;
  }, [liquidCash, freedom.dailyBurnRate, recurrents, creditObligations, cards, snoozedIds]);

  const snooze = (id: string) => {
    setSnoozedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return { item, incomeDate, snooze };
}
