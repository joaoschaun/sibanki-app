import type { Entry, Goal, Investment } from '../types/userData';

/** Dados necessários para montar o contexto enviado ao chatApi (mesmo formato do legado). */
export interface FinancialContextInput {
  entries: Entry[];
  goals: Goal[];
  investments: Investment[];
  budgets: Record<string, unknown>;
  accounts: string[];
  accountBalances: Record<string, number>;
  accountMeta?: Record<string, { incluirNaSoma?: boolean }>;
  cards: { name?: string; limit?: number; active?: boolean }[];
  recurrents?: unknown[];
}

/**
 * Monta a string de contexto enviada à Cloud Function chatApi (compatível com o legado).
 */
export function buildFinancialContextString(input: FinancialContextInput): string {
  const {
    entries,
    goals,
    investments,
    budgets,
    accounts,
    accountBalances,
    accountMeta = {},
    cards,
    recurrents = [],
  } = input;

  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();
  const mesEntries = entries.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date + 'T12:00:00');
    return d.getMonth() === cm && d.getFullYear() === cy;
  });
  const recM = mesEntries.filter((e) => e.type === 'receita').reduce((s, e) => s + Number(e.value), 0);
  const despM = mesEntries.filter((e) => e.type === 'despesa').reduce((s, e) => s + Number(e.value), 0);
  const saldo = recM - despM;

  const catTotals: Record<string, number> = {};
  mesEntries.filter((e) => e.type === 'despesa').forEach((e) => {
    const c = e.category || 'Outros';
    catTotals[c] = (catTotals[c] || 0) + Number(e.value);
  });
  const topCats = Object.keys(catTotals)
    .sort((a, b) => catTotals[b] - catTotals[a])
    .slice(0, 5);
  const topCatsStr = topCats.map((c) => `${c}: R$ ${catTotals[c].toFixed(2)}`).join(', ');

  const metasInfo =
    goals.length > 0
      ? goals
          .map((g) => {
            const t = Number(g.target) || 0;
            const c = Number(g.current) || 0;
            const pct = t > 0 ? Math.round((c / t) * 100) : 0;
            return `${g.title || (g as any).name || '?'}: R$ ${c.toFixed(2)}/R$ ${t.toFixed(2)} (${pct}%)`;
          })
          .join('; ')
      : 'Nenhuma meta cadastrada';

  const invInfo =
    investments.length > 0
      ? investments
          .map((i) => `${i.nome || '?'}: R$ ${(i.atual ?? i.valor ?? 0).toFixed(2)} (${i.tipo || '?'})`)
          .join('; ')
      : 'Nenhum investimento';

  const orcInfo =
    Object.keys(budgets).length > 0
      ? Object.keys(budgets)
          .map((c) => {
            const gasto = catTotals[c] || 0;
            const budget = Number(budgets[c]) || 0;
            const pct = budget > 0 ? Math.round((gasto / budget) * 100) : 0;
            return `${c}: R$ ${gasto.toFixed(2)}/R$ ${budget.toFixed(2)} (${pct}%)`;
          })
          .join('; ')
      : 'Nenhum orçamento definido';

  const accBals: Record<string, number> = {};
  accounts.forEach((a) => {
    let init = accountBalances[a] ?? 0;
    const rec = entries.filter((e) => e.account === a && e.type === 'receita').reduce((s, e) => s + Number(e.value), 0);
    const desp = entries.filter((e) => e.account === a && e.type === 'despesa').reduce((s, e) => s + Number(e.value), 0);
    accBals[a] = init + rec - desp;
  });
  const accStr =
    Object.keys(accBals).length > 0
      ? Object.entries(accBals)
          .map(([a, v]) => `${a}: R$ ${v.toFixed(2)}`)
          .join(', ')
      : 'Nenhuma conta';

  const cartoesInfo =
    cards.filter((c) => c.active !== false).length > 0
      ? cards
          .filter((c) => c.active !== false)
          .map((c) => `${c.name || '?'}: limite R$ ${(Number(c.limit) || 0).toFixed(2)}`)
          .join('; ')
      : 'Nenhum cartão';

  let contextStr = `Receita mensal: R$ ${recM.toFixed(2)}\nDespesa mensal: R$ ${despM.toFixed(2)}\nSaldo: R$ ${saldo.toFixed(2)}\n`;
  if (topCatsStr) contextStr += `Categorias: ${topCatsStr}\n`;
  contextStr += `Metas: ${metasInfo}\n`;
  contextStr += `Contas: ${accStr}\n`;
  contextStr += `Investimentos: ${invInfo}\n`;
  contextStr += `Orçamentos: ${orcInfo}\n`;
  contextStr += `Cartões: ${cartoesInfo}\n`;
  if (recurrents.length > 0) {
    const recStr = (recurrents as { desc?: string; value?: number; type?: string; day?: number }[])
      .map((r) => `${r.desc || '?'}: R$ ${(r.value || 0).toFixed(2)} (${r.type || '?'}, dia ${r.day ?? '?'})`)
      .join('; ');
    contextStr += `Recorrentes: ${recStr}\n`;
  }
  return contextStr;
}
