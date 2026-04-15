/**
 * Briefing do dia — usado no Assistente (coluna inicial) e derivado do mesmo modelo da antiga página Início.
 */
import type { AppContextValue } from '../context/AppContext';
import type { SpreadGapResult, SpreadVerdict } from './sovereigntyEngine';
import { isTransferEntry } from './entryUtils';

export function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function in7DaysStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function inNDaysStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Próxima data de vencimento no formato YYYY-MM-DD para um dia fixo do mês (ex.: dia 10). */
function nextDueDateYmd(dueDay: number, from: Date): string {
  const y = from.getFullYear();
  const m = from.getMonth();
  const lastThis = new Date(y, m + 1, 0).getDate();
  const dayThis = Math.min(dueDay, lastThis);
  let cand = new Date(y, m, dayThis);
  cand.setHours(0, 0, 0, 0);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (cand < start) {
    const nm = m + 1;
    const lastNext = new Date(y, nm + 1, 0).getDate();
    const dayNext = Math.min(dueDay, lastNext);
    cand = new Date(y, nm, dayNext);
    cand.setHours(0, 0, 0, 0);
  }
  return `${cand.getFullYear()}-${String(cand.getMonth() + 1).padStart(2, '0')}-${String(cand.getDate()).padStart(2, '0')}`;
}

function daysFromTodayTo(iso: string, today: string): number {
  const a = new Date(`${today}T12:00:00`).getTime();
  const b = new Date(`${iso}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

const SPREAD_VERDICT_PT: Record<SpreadVerdict, string> = {
  'alavancagem-inteligente': 'rendimento da carteira acima do custo médio das dívidas.',
  'zona-neutra': 'rendimento e custo de dívidas estão equilibrados.',
  'ineficiencia-moderada': 'dívidas custam mais do que a carteira tende a render — vale revisar prioridades.',
  'dreno-critico': 'custo das dívidas está alto frente aos investimentos — priorize redução de encargos.',
};

export function appendSpreadBriefingLine(
  items: BriefingItem[],
  ctx: AppContextValue,
  spread: SpreadGapResult,
) {
  const hasInv = (ctx.investments ?? []).length > 0;
  const hasDebt =
    (ctx.creditSnapshot?.totalUsed ?? 0) > 100 ||
    (ctx.creditObligations ?? []).some((o) => o.status !== 'paga') ||
    (ctx.cards ?? []).some((c) => (Number((c as { currentBill?: number }).currentBill) || 0) > 50);
  if (!hasInv || !hasDebt) return;
  const pct = (spread.spreadGap * 100).toFixed(2);
  items.push({
    emoji: '⚖️',
    text: `**Spread (carteira vs dívidas):** ~${pct}% a.m. — ${SPREAD_VERDICT_PT[spread.verdict]}`,
    link: '/crescimento',
  });
}

export type BriefingItem = {
  emoji: string;
  text: string;
  link?: string;
  verified?: boolean;
  kind?: 'warn' | 'info' | 'normal';
  /** Ação primária no card (ex.: sync Open Finance sem ir a Configurações). */
  action?: 'sync_open_finance';
};

export function buildBriefingItems(ctx: AppContextValue): BriefingItem[] {
  const {
    entries, recurrents, cards, goals, budgets,
    accountBalances, accountMeta, investments,
    hasOpenFinance, openFinanceCreditBills, openFinanceSyncedAt,
    dataFreshness,
    data,
    creditAccounts,
    creditObligations,
    creditSnapshot,
  } = ctx;

  const items: BriefingItem[] = [];
  const today = todayDateStr();
  const in7 = in7DaysStr();
  const now = new Date();
  const currentMonth = today.slice(0, 7);
  const todayDay = now.getDate();
  const ddaBoletos = data?.ddaBoletos ?? [];
  const loanKinds = new Set(['emprestimo', 'financiamento', 'consignado']);

  if (hasOpenFinance && dataFreshness === 'stale' && openFinanceSyncedAt) {
    const hoursAgo = Math.round(
      (Date.now() - new Date(openFinanceSyncedAt).getTime()) / 3_600_000,
    );
    items.push({
      emoji: '🔄',
      text: `Dados bancários desatualizados — última sincronização há **${hoursAgo}h**.`,
      link: '/configuracoes',
      kind: 'warn',
      action: 'sync_open_finance',
    });
  }

  if (ddaBoletos.length > 0) {
    const urgentBols = ddaBoletos.filter((b) => {
      if (b.status === 'pago' || b.status === 'cancelado') return false;
      const v = b.vencimento;
      if (!v) return false;
      if (v < today) return b.status === 'pendente' || b.status === 'vencido';
      return v <= in7;
    });
    urgentBols.sort((a, b) => (a.vencimento ?? '').localeCompare(b.vencimento ?? ''));
    const totalBol = urgentBols.reduce((s, b) => s + (Number(b.valor) || 0), 0);
    if (urgentBols.length === 1) {
      const b = urgentBols[0];
      const overdue = (b.vencimento ?? '') < today;
      const dLeft = b.vencimento ? daysFromTodayTo(b.vencimento, today) : 0;
      items.push({
        emoji: overdue ? '⚠️' : '📄',
        text: overdue
          ? `Boleto **${b.beneficiario}** vencido — R$ ${fmtBRL(Number(b.valor) || 0)}.`
          : `Boleto **${b.beneficiario}** ${b.vencimento === today ? 'vence hoje' : `vence em ${dLeft} dia(s)`} — R$ ${fmtBRL(Number(b.valor) || 0)}.`,
        link: '/meus-boletos',
        verified: b.source === 'dda' || b.source === 'open-finance',
      });
    } else if (urgentBols.length > 1) {
      items.push({
        emoji: '📄',
        text: `**${urgentBols.length} boletos** (vencidos ou até 7 dias) — total **R$ ${fmtBRL(totalBol)}**.`,
        link: '/meus-boletos',
      });
    }
  }

  let obligationsInWindow = 0;
  for (const ob of creditObligations ?? []) {
    if (ob.status === 'paga') continue;
    const due = ob.dueDate;
    if (!due) continue;
    if (due >= today && due <= in7) {
      obligationsInWindow += 1;
      const dLeft = daysFromTodayTo(due, today);
      const kindEmoji = ob.kind === 'fatura' ? '💳' : '🏦';
      items.push({
        emoji: kindEmoji,
        text: `**${ob.label}** — R$ ${fmtBRL(Number(ob.amount) || 0)} ${due === today ? 'vence hoje' : `vence em ${dLeft} dia(s)`}.`,
        link: '/credito',
        verified: ob.source === 'open-finance',
      });
    } else if (due < today && ob.status === 'atrasada') {
      obligationsInWindow += 1;
      items.push({
        emoji: '⚠️',
        text: `**${ob.label}** atrasada — R$ ${fmtBRL(Number(ob.amount) || 0)}.`,
        link: '/credito',
        kind: 'warn',
      });
    }
  }

  if (
    creditSnapshot &&
    (creditSnapshot.dueSoonCount ?? 0) > 0 &&
    obligationsInWindow === 0
  ) {
    items.push({
      emoji: '🏦',
      text: `**${creditSnapshot.dueSoonCount} compromissos** de crédito somam **R$ ${fmtBRL(creditSnapshot.dueSoonAmount)}** a vencer em breve.`,
      link: '/credito',
    });
  }

  for (const acc of creditAccounts ?? []) {
    if (!loanKinds.has(acc.kind)) continue;
    const dd = acc.dueDay;
    if (dd == null) continue;
    const dueStr = nextDueDateYmd(dd, now);
    if (dueStr >= today && dueStr <= in7) {
      const inst = Number(acc.monthlyInstallment) || 0;
      if (inst > 0) {
        items.push({
          emoji: '🏠',
          text: `Parcela **${acc.label}** — R$ ${fmtBRL(inst)} (vencimento dia **${dd}** neste ciclo).`,
          link: '/credito',
          verified: acc.source === 'open-finance',
        });
      }
    }
  }

  const recVenc: { name: string; value: number; day: number }[] = [];
  for (const r of recurrents ?? []) {
    if (!(r as any).active && (r as any).active !== undefined) continue;
    const day = Number((r as any).dueDay ?? (r as any).dia ?? (r as any).day ?? 0);
    if (!day) continue;
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
    const dateStr = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateStr >= today && dateStr <= in7) {
      const name = (r as any).desc || (r as any).name || 'Recorrente';
      const value = Number((r as any).value ?? (r as any).valor ?? 0);
      recVenc.push({ name, value, day });
    }
  }
  if (recVenc.length > 0) {
    const total = recVenc.reduce((s, r) => s + r.value, 0);
    if (recVenc.length === 1) {
      const daysLeft = recVenc[0].day - todayDay;
      items.push({
        emoji: '📅',
        text: `**${recVenc[0].name}** vence ${daysLeft <= 0 ? 'hoje' : `em ${daysLeft} dia(s)`} — R$ ${fmtBRL(recVenc[0].value)}.`,
        link: '/recorrentes',
      });
    } else {
      items.push({
        emoji: '📅',
        text: `**${recVenc.length} contas** vencem nos próximos 7 dias — total R$ ${fmtBRL(total)}.`,
        link: '/recorrentes',
      });
    }
  }

  if (hasOpenFinance && openFinanceCreditBills.length > 0) {
    const in5 = inNDaysStr(5);
    const urgentBills = openFinanceCreditBills
      .filter((b) => b.dueDate && b.dueDate >= today && b.dueDate <= in5 && b.totalAmount > 0)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

    for (const bill of urgentBills) {
      const card = cards?.find((c) => (c as any).pluggyAccountId === bill.pluggyAccountId);
      const cardName = card?.name ?? 'cartão';
      const dueParts = (bill.dueDate ?? '').split('-');
      const dueDate = new Date(
        Number(dueParts[0]), Number(dueParts[1]) - 1, Number(dueParts[2]),
      );
      const nowMid = new Date(now);
      nowMid.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((dueDate.getTime() - nowMid.getTime()) / 86_400_000);
      items.push({
        emoji: '💳',
        text: `Fatura **${cardName}** de R$ ${fmtBRL(bill.totalAmount)} vence ${daysLeft <= 0 ? 'hoje' : `em ${daysLeft} dia(s)`} — confirmado pelo banco.`,
        link: '/cartoes',
        verified: true,
      });
    }
  } else {
    for (const card of cards ?? []) {
      if (!card.closeDay) continue;
      const daysLeft = card.closeDay - todayDay;
      if (daysLeft >= 0 && daysLeft <= 5) {
        const fat = (card.purchases ?? [])
          .filter((p) => (p.billingMonth ?? '').startsWith(currentMonth))
          .reduce((s, p) => s + (p.value ?? 0), 0);
        if (fat > 0) {
          items.push({
            emoji: '💳',
            text: `Fatura do **${card.name || 'cartão'}** fecha em ${daysLeft === 0 ? 'hoje' : `${daysLeft} dia(s)`} — R$ ${fmtBRL(fat)}.`,
            link: '/cartoes',
          });
        }
      }
    }
  }

  const budgetMap: Record<string, number> = {};
  if (budgets && typeof budgets === 'object') {
    for (const [k, v] of Object.entries(budgets)) {
      const n = Number(v);
      if (!isNaN(n) && n > 0) budgetMap[k] = n;
    }
  }
  const catSpent: Record<string, number> = {};
  for (const e of entries ?? []) {
    if (isTransferEntry(e)) continue;
    if (e.type !== 'despesa') continue;
    if ((e.date ?? '').slice(0, 7) !== currentMonth) continue;
    const cat = e.category || 'Outros';
    catSpent[cat] = (catSpent[cat] ?? 0) + (Number(e.value) || 0);
  }
  const overBudget: { cat: string; pct: number }[] = [];
  for (const [cat, limit] of Object.entries(budgetMap)) {
    const spent = catSpent[cat] ?? 0;
    if (spent > limit) {
      overBudget.push({ cat, pct: Math.round((spent / limit) * 100) });
    }
  }
  if (overBudget.length > 0) {
    overBudget.sort((a, b) => b.pct - a.pct);
    const top = overBudget[0];
    const suffix = hasOpenFinance ? ' (baseado no seu extrato).' : '.';
    if (overBudget.length === 1) {
      items.push({
        emoji: '⚠️',
        text: `**${top.cat}** está ${top.pct}% do orçamento — acima do limite${suffix}`,
        link: '/orcamento',
        verified: hasOpenFinance,
      });
    } else {
      items.push({
        emoji: '⚠️',
        text: `**${overBudget.length} categorias** acima do orçamento — pior: ${top.cat} (${top.pct}%)${suffix}`,
        link: '/orcamento',
        verified: hasOpenFinance,
      });
    }
  }

  for (const g of goals ?? []) {
    const deadline = (g as any).deadline || (g as any).endDate;
    if (!deadline) continue;
    const dFim = new Date(deadline);
    const daysLeft = Math.ceil((dFim.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft > 0 && daysLeft <= 30) {
      const pct = g.target > 0 ? Math.round(((g.current ?? 0) / g.target) * 100) : 0;
      if (pct < 100) {
        const falta = g.target - (g.current ?? 0);
        items.push({
          emoji: '🎯',
          text: `Meta **${(g as any).name || g.title}** vence em ${daysLeft} dias — faltam R$ ${fmtBRL(falta)} (${pct}% concluída).`,
          link: '/planejamento',
        });
      }
    }
  }

  const invList = investments ?? [];
  if (invList.length > 0) {
    const totalInv = invList.reduce((s, i) => s + Number((i as any).atual ?? (i as any).currentValue ?? (i as any).value ?? 0), 0);
    if (totalInv > 0) {
      const cdiMes = 0.0107;
      const totalYield = invList.reduce((s, i) => {
        const rate = Number((i as any).monthlyRate ?? (i as any).rate ?? 0);
        const val = Number((i as any).atual ?? (i as any).currentValue ?? (i as any).value ?? 0);
        return s + val * (rate || cdiMes);
      }, 0);
      const rendMes = totalInv > 0 ? (totalYield / totalInv) * 100 : 0;
      const verifiedCount = invList.filter((i) => (i as any).source === 'open-finance').length;
      const verifiedSuffix = verifiedCount > 0 ? ` (${verifiedCount} confirmado${verifiedCount > 1 ? 's' : ''} pelo banco)` : '';
      items.push({
        emoji: '📈',
        text: `Carteira de **R$ ${fmtBRL(totalInv)}** rendendo ~${rendMes.toFixed(2)}% a.m.${verifiedSuffix} — ${rendMes >= cdiMes * 100 * 0.9 ? 'acima' : 'abaixo'} do CDI.`,
        link: '/crescimento',
        verified: verifiedCount > 0,
      });
    }
  }

  let saldoContas = 0;
  let saldoVerified = false;
  for (const [acc, bal] of Object.entries(accountBalances ?? {})) {
    if ((accountMeta as any)?.[acc]?.incluirNaSoma === false) continue;
    saldoContas += Number(bal) || 0;
    if ((accountMeta as any)?.[acc]?.source === 'open-finance') saldoVerified = true;
  }
  if (saldoContas > 0 && items.filter((i) => i.kind !== 'warn').length === 0) {
    const suffix = saldoVerified
      ? ' — saldo verificado pelo Open Finance.'
      : ' em contas registradas.';
    items.push({
      emoji: '💰',
      text: `Saldo disponível: **R$ ${fmtBRL(saldoContas)}**${suffix}`,
      verified: saldoVerified,
    });
  }

  if (!hasOpenFinance && items.filter((i) => i.kind !== 'warn').length === 0) {
    items.push({
      emoji: '🏦',
      text: `Conecte seu banco via **Open Finance** para que eu veja seu extrato real e possa te orientar com dados verificados.`,
      link: '/configuracoes#open-finance',
      kind: 'info',
    });
  }

  return items;
}
