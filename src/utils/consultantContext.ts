/**
 * Sibanki — Consultant Context Builder
 *
 * Monta a string de contexto enviada à Cloud Function chatApi.
 * Versão enriquecida com métricas de Soberania (Days of Freedom, Spread Gap)
 * integradas ao modelo de dados real do Sibanki.
 */

import type { CreditSnapshot, Entry, Goal, Investment, CreditObligation, Card } from '../types/userData';
import { isTransferEntry } from './entryUtils';
import { buildSovereigntySnapshot } from './sovereigntyEngine';

/** Dados necessários para montar o contexto enviado ao chatApi. */
export interface FinancialContextInput {
  entries: Entry[];
  goals: Goal[];
  investments: Investment[];
  budgets: Record<string, unknown>;
  accounts: string[];
  accountBalances: Record<string, number>;
  accountMeta?: Record<string, { incluirNaSoma?: boolean; tipo?: string }>;
  cards: { name?: string; limit?: number; active?: boolean; currentBill?: number }[];
  recurrents?: unknown[];
  investorProfile?: { profile?: string; score?: number } | null;
  creditSnapshot?: CreditSnapshot | null;
  creditObligations?: CreditObligation[];
  /** Taxa CDI mensal atual (obtida via BRAPI). Padrão conservador se ausente. */
  currentCdiMonthly?: number;
}

/**
 * Monta a string de contexto completa para o Consultor IA.
 * Inclui: cashflow, categorias, metas, contas, investimentos, orçamentos,
 * cartões, recorrentes, perfil do investidor, crédito estruturado,
 * + métricas de soberania (Days of Freedom, Spread Gap).
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
    investorProfile,
    creditSnapshot,
    creditObligations = [],
    currentCdiMonthly = 0.01,
  } = input;

  // ── 1. Cashflow do mês corrente ────────────────────────────────────────────
  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();

  const mesEntries = entries.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date + 'T12:00:00');
    return d.getMonth() === cm && d.getFullYear() === cy;
  });
  const mesEntriesNoTransfer = mesEntries.filter((e) => !isTransferEntry(e));

  const recM = mesEntriesNoTransfer
    .filter((e) => e.type === 'receita')
    .reduce((s, e) => s + Number(e.value), 0);
  const despM = mesEntriesNoTransfer
    .filter((e) => e.type === 'despesa')
    .reduce((s, e) => s + Number(e.value), 0);
  const saldo = recM - despM;
  const savingsRate = recM > 0 ? ((saldo / recM) * 100).toFixed(1) : '0';

  // ── 2. Top categorias ──────────────────────────────────────────────────────
  const catTotals: Record<string, number> = {};
  mesEntriesNoTransfer
    .filter((e) => e.type === 'despesa')
    .forEach((e) => {
      const c = e.category || 'Outros';
      catTotals[c] = (catTotals[c] || 0) + Number(e.value);
    });
  const topCats = Object.keys(catTotals)
    .sort((a, b) => catTotals[b] - catTotals[a])
    .slice(0, 5);
  const topCatsStr = topCats.map((c) => `${c}: R$ ${catTotals[c].toFixed(2)}`).join(', ');

  // ── 3. Metas ───────────────────────────────────────────────────────────────
  const metasInfo =
    goals.length > 0
      ? goals
          .map((g) => {
            const t = Number(g.target) || 0;
            const c = Number(g.current) || 0;
            const pct = t > 0 ? Math.round((c / t) * 100) : 0;
            return `${g.title || (g as Record<string, unknown>).name || '?'}: R$ ${c.toFixed(2)}/R$ ${t.toFixed(2)} (${pct}%)`;
          })
          .join('; ')
      : 'Nenhuma meta cadastrada';

  // ── 4. Contas ──────────────────────────────────────────────────────────────
  const accBals: Record<string, number> = {};
  accounts.forEach((a) => {
    const init = accountBalances[a] ?? 0;
    const rec = entries
      .filter((e) => e.account === a && e.type === 'receita' && !isTransferEntry(e))
      .reduce((s, e) => s + Number(e.value), 0);
    const desp = entries
      .filter((e) => e.account === a && e.type === 'despesa' && !isTransferEntry(e))
      .reduce((s, e) => s + Number(e.value), 0);
    accBals[a] = init + rec - desp;
  });
  const accStr =
    Object.keys(accBals).length > 0
      ? Object.entries(accBals)
          .map(([a, v]) => `${a}: R$ ${v.toFixed(2)}`)
          .join(', ')
      : 'Nenhuma conta';

  // ── 5. Investimentos ───────────────────────────────────────────────────────
  const invInfo =
    investments.length > 0
      ? (() => {
          const totalAplicado = investments.reduce((s, i) => s + (i.valor ?? 0), 0);
          const totalAtual = investments.reduce((s, i) => s + (i.atual ?? i.valor ?? 0), 0);
          const rendimento = totalAtual - totalAplicado;
          const rendPct = totalAplicado > 0 ? ((rendimento / totalAplicado) * 100).toFixed(1) : '0';
          const porTipo: Record<string, number> = {};
          investments.forEach((i) => {
            const t = i.tipo || 'Outros';
            porTipo[t] = (porTipo[t] || 0) + (i.atual ?? i.valor ?? 0);
          });
          const alocStr = Object.entries(porTipo)
            .sort((a, b) => b[1] - a[1])
            .map(([t, v]) => `${t}: R$ ${v.toFixed(2)}`)
            .join(', ');
          return `Total aplicado: R$ ${totalAplicado.toFixed(2)}, Valor atual: R$ ${totalAtual.toFixed(2)}, Rendimento: R$ ${rendimento.toFixed(2)} (${rendPct}%) | Alocação: ${alocStr}`;
        })()
      : 'Nenhum investimento';

  // ── 6. Orçamentos ──────────────────────────────────────────────────────────
  const orcInfo =
    Object.keys(budgets).length > 0
      ? Object.keys(budgets)
          .map((c) => {
            const gasto = catTotals[c] || 0;
            const budget = Number(budgets[c]) || 0;
            const pct = budget > 0 ? Math.round((gasto / budget) * 100) : 0;
            const status = pct > 100 ? ' ⚠️ ESTOURADO' : '';
            return `${c}: R$ ${gasto.toFixed(2)}/R$ ${budget.toFixed(2)} (${pct}%)${status}`;
          })
          .join('; ')
      : 'Nenhum orçamento definido';

  // ── 7. Cartões ─────────────────────────────────────────────────────────────
  const cartoesInfo =
    cards.filter((c) => c.active !== false).length > 0
      ? cards
          .filter((c) => c.active !== false)
          .map((c) => `${c.name || '?'}: limite R$ ${(Number(c.limit) || 0).toFixed(2)}`)
          .join('; ')
      : 'Nenhum cartão';

  // ── 8. Métricas de Soberania (novo) ───────────────────────────────────────
  const sovereigntyCtx = buildSovereigntySnapshot({
    accountBalances,
    accountMeta,
    investments,
    entries,
    creditObligations,
    cards: cards as Card[],
    currentCdiMonthly,
  });

  // ── 9. Montagem final ──────────────────────────────────────────────────────
  let ctx = '';

  // Bloco financeiro básico
  ctx += `Receita mensal: R$ ${recM.toFixed(2)}\n`;
  ctx += `Despesa mensal: R$ ${despM.toFixed(2)}\n`;
  ctx += `Saldo: R$ ${saldo.toFixed(2)} (taxa de poupança: ${savingsRate}%)\n`;
  if (topCatsStr) ctx += `Categorias principais: ${topCatsStr}\n`;
  ctx += `Metas: ${metasInfo}\n`;
  ctx += `Contas: ${accStr}\n`;
  ctx += `Investimentos: ${invInfo}\n`;
  ctx += `Orçamentos: ${orcInfo}\n`;
  ctx += `Cartões: ${cartoesInfo}\n`;

  // Recorrentes
  if (recurrents.length > 0) {
    const recStr = (recurrents as { desc?: string; value?: number; type?: string; day?: number }[])
      .map((r) => `${r.desc || '?'}: R$ ${(r.value || 0).toFixed(2)} (${r.type || '?'}, dia ${r.day ?? '?'})`)
      .join('; ');
    ctx += `Recorrentes: ${recStr}\n`;
  }

  // Perfil do investidor
  if (investorProfile?.profile) {
    ctx += `Perfil do investidor: ${investorProfile.profile} (score ${investorProfile.score ?? '?'})\n`;
  }

  // Crédito estruturado
  if (creditSnapshot) {
    ctx += `Crédito: limite total R$ ${Number(creditSnapshot.totalLimit || 0).toFixed(2)}, uso R$ ${Number(creditSnapshot.totalUsed || 0).toFixed(2)}, utilização ${Number(creditSnapshot.cardUtilizationPct || 0).toFixed(1)}%, faturas em 7 dias R$ ${Number(creditSnapshot.dueSoonAmount || 0).toFixed(2)}, dívida mensal R$ ${Number(creditSnapshot.monthlyDebtCommitment || 0).toFixed(2)}, pressão ${String(creditSnapshot.pressureLevel || 'controlado')}\n`;
  }

  // Métricas de Soberania (o diferencial)
  ctx += `\n--- SOBERANIA FINANCEIRA ---\n`;
  ctx += sovereigntyCtx.promptContext;
  ctx += '\n';

  return ctx;
}
