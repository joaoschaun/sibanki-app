/**
 * useDashboardData — Extraído do Dashboard.tsx para reduzir o monólito.
 *
 * Calcula: receita/despesa do mês e mês anterior, variações,
 * categorias, últimos 6 meses, donut segments, budget map, alertas.
 */

import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { isTransferEntry, nonTransferEntries } from '../utils/entryUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────────

export function getMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function getMonthLabel(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[m - 1]}`;
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export type MonthRow = { monthKey: string; receita: number; despesa: number };
export type DonutSegment = { name: string; value: number; pct: number };
export type Alerta = { type: 'positive' | 'warning' | 'info'; title: string; text: string; link?: string };

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useDashboardData(widgetInsight: boolean) {
  const { entries, accounts, budgets } = useAppContext();

  const now = useMemo(() => new Date(), []);
  const currentMonthKey = getMonthKey(now);
  const prevMonthKey = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return getMonthKey(d);
  }, [now]);

  const { receitaMes, despesaMes, receitaMesAnt, despesaMesAnt, catTotals, last6Months } = useMemo(() => {
    let rec = 0, desp = 0, recAnt = 0, despAnt = 0;
    const byCat: Record<string, number> = {};
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(getMonthKey(d));
    }
    const byMonthMap: Record<string, { receita: number; despesa: number }> = {};
    for (const mk of monthKeys) byMonthMap[mk] = { receita: 0, despesa: 0 };

    for (const e of entries) {
      if (isTransferEntry(e)) continue;
      const date = e.date ?? '';
      const monthKey = date.slice(0, 7);
      const val = Number(e.value) || 0;
      if (monthKey === currentMonthKey) {
        if (e.type === 'receita') rec += val;
        else if (e.type === 'despesa') {
          desp += val;
          const cat = e.category || 'Outros';
          byCat[cat] = (byCat[cat] ?? 0) + val;
        }
      } else if (monthKey === prevMonthKey) {
        if (e.type === 'receita') recAnt += val;
        else if (e.type === 'despesa') despAnt += val;
      }
      if (byMonthMap[monthKey]) {
        if (e.type === 'receita') byMonthMap[monthKey].receita += val;
        else if (e.type === 'despesa') byMonthMap[monthKey].despesa += val;
      }
    }

    return {
      receitaMes: rec,
      despesaMes: desp,
      receitaMesAnt: recAnt,
      despesaMesAnt: despAnt,
      catTotals: byCat,
      last6Months: monthKeys.map((mk) => ({ monthKey: mk, ...byMonthMap[mk] })),
    };
  }, [entries, currentMonthKey, prevMonthKey, now]);

  const saldoMes = receitaMes - despesaMes;
  const entriesNoTransfer = nonTransferEntries(entries);
  const hasOnboardingData = accounts.length > 0 || entriesNoTransfer.length > 0;
  const totalReceita = entriesNoTransfer.filter((e) => e.type === 'receita').reduce((s, e) => s + (e.value ?? 0), 0);
  const totalDespesa = entriesNoTransfer.filter((e) => e.type === 'despesa').reduce((s, e) => s + (e.value ?? 0), 0);
  const saldo = totalReceita - totalDespesa;

  const varReceita =
    receitaMesAnt > 0 ? ((receitaMes - receitaMesAnt) / receitaMesAnt) * 100 : receitaMes > 0 ? 100 : 0;
  const varDespesa =
    despesaMesAnt > 0 ? ((despesaMes - despesaMesAnt) / despesaMesAnt) * 100 : despesaMes > 0 ? 100 : 0;

  const budgetMap = useMemo(() => {
    const b: Record<string, number> = {};
    if (budgets && typeof budgets === 'object') {
      for (const [k, v] of Object.entries(budgets)) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isNaN(n)) b[k] = n;
      }
    }
    return b;
  }, [budgets]);

  const alertas: Alerta[] = useMemo(() => {
    const list: Alerta[] = [];
    if (saldoMes > 0) {
      list.push({
        type: 'positive',
        title: 'Saldo positivo!',
        text: 'Você gasta menos do que ganha. Direcione o excedente para investimentos.',
      });
    } else if (saldoMes < 0 && despesaMes > 0 && !widgetInsight) {
      list.push({
        type: 'warning',
        title: 'Déficit no mês',
        text: 'Despesas superam receitas. Reveja gastos e orçamento.',
        link: '/orcamento',
      });
    }
    for (const [cat, gasto] of Object.entries(catTotals)) {
      const limite = budgetMap[cat];
      if (limite != null && limite > 0 && gasto > limite) {
        const pct = Math.round((gasto / limite) * 100);
        list.push({
          type: 'warning',
          title: 'Gastos altos',
          text: `${cat}: ${pct}% acima do orçado`,
          link: '/planejamento',
        });
      }
    }
    if (list.length === 0 && entriesNoTransfer.length === 0) {
      list.push({
        type: 'info',
        title: 'Comece a registrar',
        text: 'Adicione receitas e despesas em Lançamentos para ver seu resumo aqui.',
        link: '/lancamentos',
      });
    }
    return list;
  }, [saldoMes, despesaMes, catTotals, budgetMap, entriesNoTransfer.length, widgetInsight]);

  const donutTotal = Object.values(catTotals).reduce((a, b) => a + b, 0);
  const donutSegments: DonutSegment[] = useMemo(() => {
    if (donutTotal <= 0) return [];
    return Object.entries(catTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => {
        const pct = (value / donutTotal) * 100;
        return { name, value, pct };
      });
  }, [catTotals, donutTotal]);

  const maxVal = useMemo(() => {
    let m = 0;
    for (const row of last6Months) m = Math.max(m, row.receita, row.despesa);
    return m || 1;
  }, [last6Months]);

  return {
    now,
    currentMonthKey,
    receitaMes, despesaMes, saldoMes,
    receitaMesAnt, despesaMesAnt,
    varReceita, varDespesa,
    catTotals, last6Months,
    entriesNoTransfer, hasOnboardingData,
    saldo,
    budgetMap, alertas,
    donutTotal, donutSegments, maxVal,
  };
}
