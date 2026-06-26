/**
 * Sibanki — Consultant Context Builder
 *
 * Monta a string de contexto enviada à Cloud Function chatApi.
 * Versão enriquecida com métricas de Soberania (Days of Freedom, Spread Gap)
 * integradas ao modelo de dados real do Sibanki.
 */

import type {
  CreditSnapshot,
  Entry,
  Goal,
  Investment,
  CreditObligation,
  Card,
  CardBenefits,
} from '../types/userData';
import { isTransferEntry } from './entryUtils';
import { buildSovereigntySnapshot } from './sovereigntyEngine';

function formatBenefitsConcise(b?: CardBenefits): string {
  if (!b) return 'sem benefícios cadastrados';
  const parts: string[] = [];
  if (b.cashbackPct != null && b.cashbackPct > 0) parts.push(`cashback ${b.cashbackPct}%`);
  if (b.pointsProgram) parts.push(String(b.pointsProgram));
  if (b.vipLounge) parts.push('sala VIP');
  if (b.travelInsurance) parts.push('seguro viagem');
  if (b.purchaseProtection) parts.push('proteção de compra');
  if (b.extendedWarranty) parts.push('garantia estendida');
  if (b.concierge) parts.push('concierge');
  if (parts.length === 0) return 'sem benefícios cadastrados';
  return parts.join(', ');
}

function formatCardContextLine(c: {
  name?: string;
  flag?: string;
  limit?: number;
  currentBill?: number;
  cardBenefits?: CardBenefits;
}): string {
  const nm = c.name || '?';
  const fl = c.flag || '?';
  const lim = (Number(c.limit) || 0).toFixed(0);
  const bill = (Number(c.currentBill) || 0).toFixed(0);
  const benefitsText = formatBenefitsConcise(c.cardBenefits);
  const headFull = `${nm} (${fl}): lim. R$ ${lim}, fat. R$ ${bill}`;
  const tail = ` | ${benefitsText}`;
  const max = 80;
  if (headFull.length + tail.length <= max) return headFull + tail;
  const headBudget = max - tail.length;
  if (headBudget >= 12) {
    const head =
      headFull.length > headBudget ? `${headFull.slice(0, Math.max(8, headBudget - 1))}…` : headFull;
    const line = head + tail;
    return line.length > max ? `${line.slice(0, max - 3)}...` : line;
  }
  return `${benefitsText.slice(0, max - 3)}...`;
}

/** Dados necessários para montar o contexto enviado ao chatApi. */
export interface FinancialContextInput {
  entries: Entry[];
  goals: Goal[];
  investments: Investment[];
  budgets: Record<string, unknown>;
  accounts: string[];
  accountBalances: Record<string, number>;
  accountMeta?: Record<string, { incluirNaSoma?: boolean; tipo?: string }>;
  cards: {
    name?: string;
    limit?: number;
    active?: boolean;
    currentBill?: number;
    flag?: string;
    cardBenefits?: CardBenefits;
  }[];
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
  const activeCards = cards.filter((c) => c.active !== false);
  const cartoesInfo =
    activeCards.length > 0
      ? ['Cartões ativos:', ...activeCards.map((c) => `- ${formatCardContextLine(c)}`)].join('\n')
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
  ctx += `${cartoesInfo}\n`;

  // Transações recentes (Últimos lançamentos para Generative UI)
  const recentEntries = entries
    .filter((e) => !isTransferEntry(e))
    .slice()
    .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime())
    .slice(0, 10);

  if (recentEntries.length > 0) {
    const txsStr = recentEntries
      .map((e) => `- ${e.date || "S/D"}: ${e.desc || "Sem descrição"} (${e.category || "Outros"}): ${e.type === "receita" ? "+" : "-"} R$ ${Number(e.value).toFixed(2)}`)
      .join("\n");
    ctx += `Transações recentes:\n${txsStr}\n`;
  }

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
