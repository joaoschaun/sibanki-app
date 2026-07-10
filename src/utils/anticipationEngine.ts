/**
 * anticipationEngine.ts — Motor de Antecipação do Consultor IA (Sibanki)
 *
 * Codifica em código puro o "Contrato de quando falar" (docs/DESIGN-SYSTEM-RUBRIC.md §9)
 * e o princípio "sempre à frente" (§8.5). É a fonte única da lógica que decide, para cada
 * compromisso futuro, SE e COMO o Consultor deve falar — sem gerar ansiedade.
 *
 * Princípio-raiz (§9): ansiedade = ameaça SEM alavanca. O gatilho não é um countdown de
 * "dias antes", é a POSIÇÃO DE CAIXA (cash-aware): só fale quando o usuário pode agir.
 *
 * IMPORTANTE: módulo PURO — sem Firestore, sem Cloud Functions, sem I/O. Consumível tanto
 * pela entrada do Consultor (client) quanto, futuramente, pelo `dailyPushAlerts` (server).
 * Os inputs derivam da mesma fonte da Projeção de 15 dias já existente em Accounts.tsx.
 */

import type { Recurrent, CreditObligation, Card } from '../types/userData';

// ─── Constantes do contrato (§9.1 / §9.3) ────────────────────────────────────

/** Horizonte de antecipação, em dias (mesma janela da projeção de Contas). */
export const HORIZON_DAYS = 15;
/** Ponto sem volta: aqui o tom sobe para urgente (§9.1 passo 3). */
export const URGENT_DAYS = 3;
/** Janela de decisão ativa (3–5 dias): tom "aja agora", mas ainda calmo (§9.3). */
export const ACTIVE_DAYS = 5;

/** Dial de autonomia (§9.4a): quão à frente o usuário quer ser avisado. */
export type LeadPreference = 'urgent-only' | 'week' | 'all';

/** Janela (em dias) que cada preferência do dial libera. Default: 'week' (7). */
export function leadWindowDays(pref: LeadPreference = 'week'): number {
  if (pref === 'urgent-only') return URGENT_DAYS;
  if (pref === 'all') return HORIZON_DAYS;
  return 7;
}

// ─── Decisão de "quando falar" (§9.1) ────────────────────────────────────────

/**
 * - `silence`: sem alavanca OU longe demais → o Consultor fica calmo (vira nota no Painel).
 * - `plan`   : passivo, calmo, planejamento ("quer já separar?"). Só quando há ação possível.
 * - `act`    : decisão ativa — há caixa e está se aproximando (3–5 dias).
 * - `urgent` : ponto sem volta (≤3 dias) e não resolvido; só aqui o vermelho domina.
 */
export type SpeakDecision = 'silence' | 'plan' | 'act' | 'urgent';

export interface HorizonItem {
  id: string;
  kind: CreditObligation['kind'] | 'recorrente' | 'cartao';
  label: string;
  amount: number;
  dueDate: string;        // ISO
  daysUntilDue: number;
  /** Ainda dá para mudar o resultado? Sem alavanca ⇒ silêncio (§9.1 passo 1). */
  hasLever: boolean;
  /** Ranking por ALAVANCA RESTANTE, não por urgência (§8.5). Maior = fala primeiro. */
  leverageScore: number;
  /** O valor lido em Dias de Liberdade (§8.3). */
  freedomDays: number;
  decision: SpeakDecision;
  /** Frase de enquadramento em tom de PRESERVAÇÃO, não de perda (§9.2). */
  reason: string;
}

export interface AnticipationInput {
  /** Injetável para testes; default `new Date()`. */
  today?: Date;
  /** Caixa líquido disponível para agir agora (mesma base de `liquidCash` em Accounts). */
  liquidCash: number;
  /** Burn diário vindo de `calculateFreedom` (DaysOfFreedomResult.dailyBurnRate). */
  dailyBurnRate: number;
  recurrents: Recurrent[];
  creditObligations: CreditObligation[];
  cards: Card[];
  /** Dial de autonomia do usuário (§9.4a). */
  leadPref?: LeadPreference;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * §8.3 — helper CANÔNICO: traduz um valor em R$ para "Dias de Liberdade", usando o
 * burn rate diário. Ex.: R$ 900 / (R$ 150/dia) = 6 dias.
 */
export function reaisToFreedomDays(value: number, dailyBurnRate: number): number {
  if (!(value > 0) || !(dailyBurnRate > 0)) return 0;
  return Math.round(value / dailyBurnRate);
}

/** Dias inteiros de `from` até `to` (pode ser negativo). Normaliza a meia-noite. */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Próxima ocorrência (>= hoje) de um dia-do-mês, com clamp ao último dia do mês. */
export function nextDayOfMonth(day: number, today: Date): Date {
  const clampToMonth = (year: number, month: number, d: number) => {
    const last = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(d, last));
  };
  const thisMonth = clampToMonth(today.getFullYear(), today.getMonth(), day);
  if (daysBetween(today, thisMonth) >= 0) return thisMonth;
  return clampToMonth(today.getFullYear(), today.getMonth() + 1, day);
}

/**
 * Data da próxima RENDA (recorrente de receita ativa), ou `null` se não houver
 * recorrente de entrada — o caso de renda irregular (§9.1 passo 4).
 */
export function nextIncomeDate(recurrents: Recurrent[], today: Date): Date | null {
  const dates = (recurrents || [])
    .filter((r) => r.type === 'receita' && r.active !== false && typeof r.day === 'number')
    .map((r) => nextDayOfMonth(r.day, today))
    .sort((a, b) => a.getTime() - b.getTime());
  return dates.length ? dates[0] : null;
}

// ─── Núcleo: decisão + construção do Horizonte ───────────────────────────────

interface CashContext {
  today: Date;
  liquidCash: number;
  incomeDate: Date | null;
  leadPref: LeadPreference;
}

/**
 * A árvore de decisão de "quando falar" (§9.1), pura e testável.
 * Recebe um item já com `daysUntilDue`/`hasLever` calculados + o contexto de caixa.
 */
export function decideWhenToSpeak(
  item: Pick<HorizonItem, 'amount' | 'daysUntilDue' | 'hasLever'>,
  ctx: CashContext,
): SpeakDecision {
  // Passo 1 — sem alavanca ⇒ silêncio (nunca ameaça sem agência).
  if (!item.hasLever) return 'silence';

  // Passo 3 (aplicado cedo) — ponto sem volta e não resolvido ⇒ urgente.
  if (item.daysUntilDue <= URGENT_DAYS) return 'urgent';

  const daysToIncome = ctx.incomeDate != null ? daysBetween(ctx.today, ctx.incomeDate) : null;
  const incomeAlreadyLanded = daysToIncome != null && daysToIncome <= 0;
  const hasCashNow = ctx.liquidCash >= item.amount;

  // Passo 2 — tem caixa para agir agora? Se sim, planejar ao longo de TODO o horizonte é
  // calmo (§9.3): perto ⇒ decisão ativa; mais longe ⇒ planejamento passivo. O dial NÃO
  // silencia quem já pode agir — ele protege quem AINDA não pode (branch abaixo).
  if (hasCashNow || incomeAlreadyLanded) {
    return item.daysUntilDue <= ACTIVE_DAYS ? 'act' : 'plan';
  }

  // Sem caixa: a renda entra a tempo (antes/no vencimento)? ⇒ SEGURA até ela cair — nunca
  // mostrar a conta antes do dinheiro que a cobre (o que gera o "sinto que já estou devendo").
  const incomeCoversInTime =
    daysToIncome != null && daysToIncome > 0 && daysToIncome <= item.daysUntilDue;
  if (incomeCoversInTime) return 'silence';

  // Renda irregular / não cobre a tempo (§9.1 passo 4): só nudge dentro do dial (default 7d).
  return item.daysUntilDue <= leadWindowDays(ctx.leadPref) ? 'plan' : 'silence';
}

/** Score de alavanca (§8.5): custo evitado (em Dias de Liberdade) × tempo restante para agir. */
function computeLeverageScore(freedomDays: number, daysUntilDue: number): number {
  const room = Math.max(0, Math.min(daysUntilDue, HORIZON_DAYS)) / HORIZON_DAYS;
  return Math.round(freedomDays * room * 100) / 100;
}

function framing(decision: SpeakDecision, freedomDays: number): string {
  if (decision === 'urgent') {
    return `Último dia para evitar o rotativo — ~${freedomDays} dias da sua liberdade em jogo.`;
  }
  if (decision === 'act' || decision === 'plan') {
    return `Agir agora preserva ~${freedomDays} dias da sua liberdade.`;
  }
  return '';
}

/**
 * Constrói os itens do Horizonte a partir da mesma fonte da projeção de 15 dias
 * (obrigações de crédito + recorrentes de despesa + faturas de cartão), aplica a
 * decisão de "quando falar" e ordena por ALAVANCA RESTANTE (não por urgência).
 *
 * Só retorna o que o Consultor pode legitimamente falar: itens com decisão `silence`
 * são filtrados fora (viram, no máximo, nota no Painel — nunca voz do Consultor).
 */
export function buildHorizonItems(input: AnticipationInput): HorizonItem[] {
  const today = input.today ?? new Date();
  const horizonEnd = new Date(today);
  horizonEnd.setDate(today.getDate() + HORIZON_DAYS);

  const ctx: CashContext = {
    today,
    liquidCash: input.liquidCash,
    incomeDate: nextIncomeDate(input.recurrents, today),
    leadPref: input.leadPref ?? 'week',
  };

  const raw: Array<Omit<HorizonItem, 'leverageScore' | 'freedomDays' | 'decision' | 'reason'>> = [];

  // 1) Obrigações de crédito (faturas, parcelas, empréstimos) com vencimento no horizonte.
  for (const o of input.creditObligations || []) {
    if (!o.dueDate) continue;
    if (o.status === 'paga') continue;
    const due = new Date(o.dueDate);
    const d = daysBetween(today, due);
    if (d < 0 || d > HORIZON_DAYS) continue;
    raw.push({
      id: `obl:${o.id}`,
      kind: o.kind,
      label: o.label,
      amount: o.amount ?? 0,
      dueDate: o.dueDate,
      daysUntilDue: d,
      // Alavanca: ainda dá para agir enquanto não está paga/atrasada e não venceu.
      hasLever: o.status !== 'atrasada' && d >= 0,
    });
  }

  // 2) Faturas de cartão que fecham/vencem no horizonte.
  for (const c of input.cards || []) {
    if (typeof c.dueDay !== 'number') continue;
    const due = nextDayOfMonth(c.dueDay, today);
    const d = daysBetween(today, due);
    if (d < 0 || d > HORIZON_DAYS) continue;
    const amount = c.currentBill ?? 0;
    if (amount <= 0) continue;
    raw.push({
      id: `card:${c.id}`,
      kind: 'cartao',
      label: c.name ? `Fatura ${c.name}` : 'Fatura do cartão',
      amount,
      dueDate: due.toISOString(),
      daysUntilDue: d,
      hasLever: d >= 0,
    });
  }

  // 3) Recorrentes de despesa com data conhecida no horizonte.
  for (const r of input.recurrents || []) {
    if (r.type !== 'despesa' || r.active === false || typeof r.day !== 'number') continue;
    const due = nextDayOfMonth(r.day, today);
    const d = daysBetween(today, due);
    if (d < 0 || d > HORIZON_DAYS) continue;
    raw.push({
      id: `rec:${r.id}`,
      kind: 'recorrente',
      label: r.desc || 'Despesa recorrente',
      amount: r.value ?? 0,
      dueDate: due.toISOString(),
      daysUntilDue: d,
      hasLever: d >= 0,
    });
  }

  const items: HorizonItem[] = raw.map((it) => {
    const decision = decideWhenToSpeak(it, ctx);
    const freedomDays = reaisToFreedomDays(it.amount, input.dailyBurnRate);
    return {
      ...it,
      freedomDays,
      leverageScore: computeLeverageScore(freedomDays, it.daysUntilDue),
      decision,
      reason: framing(decision, freedomDays),
    };
  });

  // Só o que o Consultor pode falar; ordenado por alavanca restante (desc).
  return items
    .filter((it) => it.decision !== 'silence')
    .sort((a, b) => b.leverageScore - a.leverageScore);
}

/**
 * Conveniência para o briefing: o ÚNICO item que o Consultor deve trazer agora
 * (§8.2 "a única coisa que importa agora"). `null` ⇒ dia calmo, que é o melhor
 * resultado (§9.2) — a UI deve tratar como conquista, não como tela vazia.
 */
export function topHorizonItem(input: AnticipationInput): HorizonItem | null {
  const items = buildHorizonItems(input);
  return items.length ? items[0] : null;
}
