/**
 * cardCycleUtils.ts
 * Engine de ciclos de fatura de cartão de crédito.
 *
 * MODELO DE CICLO:
 *   - closeDay: dia do mês em que a fatura fecha (ex: 3)
 *   - dueDay:   dia do mês em que o pagamento vence (ex: 10)
 *   - closeDate e dueDate ficam NO MESMO mês (mês de vencimento)
 *   - Exemplo (closeDay=3, dueDay=10, dueMonth=fev):
 *       fecha 03/fev → vence 10/fev → compras de 04/jan a 03/fev
 *   - Chave canônica do ciclo: "YYYY-MM" do mês de vencimento
 *
 * Todas as funções são puras — sem I/O, sem Firebase, testáveis isoladamente.
 */

export interface CardCycle {
  /** Chave canônica "YYYY-MM" do mês de vencimento */
  key: string;
  /** Primeiro dia do ciclo (dia seguinte ao fechamento anterior) */
  startDate: string;
  /** Último dia do ciclo = data de fechamento */
  closeDate: string;
  /** Data de vencimento do pagamento */
  dueDate: string;
  /** true se o fechamento já passou (fatura fechada) */
  isClosed: boolean;
  /** true se o vencimento já passou */
  isOverdue: boolean;
}

export interface CardInstallment {
  total: number;
  current: number;
  installmentValue: number;
  originalDesc: string;
  groupId: string;
}

export interface CardPurchaseNew {
  id: string;
  desc: string;
  value: number;
  date: string;
  category?: string;
  /** Chave do ciclo ao qual esta compra pertence ("YYYY-MM") */
  cycleKey: string;
  installment?: CardInstallment;
  pluggyTransactionId?: string;
}

export interface CardBillingState {
  currentCycleKey: string;
  unpaidCycles: string[];
  paidCycles: string[];
}

// ── Helpers de data ───────────────────────────────────────────────────────────

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(day: number, year: number, month: number): number {
  return Math.min(day, daysInMonth(year, month));
}

// ── Cálculo de ciclo ──────────────────────────────────────────────────────────

/**
 * Retorna o ciclo para um mês de vencimento específico.
 * closeDate e dueDate ficam NO MESMO mês (dueYear/dueMonth).
 */
export function getCycleForDueMonth(
  closeDay: number,
  dueDay: number,
  dueYear: number,
  dueMonth: number,
  today: Date = new Date(),
): CardCycle {
  const todayYmd = ymd(today);

  const closeDayClamped = clampDay(closeDay, dueYear, dueMonth);
  const closeDate = ymd(new Date(dueYear, dueMonth - 1, closeDayClamped));

  const dueDayClamped = clampDay(dueDay, dueYear, dueMonth);
  const dueDateStr = ymd(new Date(dueYear, dueMonth - 1, dueDayClamped));

  // Início do ciclo = dia seguinte ao fechamento do mês ANTERIOR
  const prevMonth = dueMonth === 1 ? 12 : dueMonth - 1;
  const prevYear  = dueMonth === 1 ? dueYear - 1 : dueYear;
  const prevCloseClamped = clampDay(closeDay, prevYear, prevMonth);
  const startDate = ymd(new Date(prevYear, prevMonth - 1, prevCloseClamped + 1));

  return {
    key: monthKey(dueYear, dueMonth),
    startDate,
    closeDate,
    dueDate: dueDateStr,
    isClosed: todayYmd > closeDate,
    isOverdue: todayYmd > dueDateStr,
  };
}

/**
 * Retorna o ciclo atual (em aberto).
 * "Atual" = ciclo cuja janela de compras inclui hoje.
 */
export function getCurrentCycle(
  closeDay: number,
  dueDay: number,
  today: Date = new Date(),
): CardCycle {
  const year  = today.getFullYear();
  const month = today.getMonth() + 1;
  const day   = today.getDate();
  const closeDayClamped = clampDay(closeDay, year, month);

  if (day > closeDayClamped) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear  = month === 12 ? year + 1 : year;
    return getCycleForDueMonth(closeDay, dueDay, nextYear, nextMonth, today);
  }
  return getCycleForDueMonth(closeDay, dueDay, year, month, today);
}

/**
 * Determina a qual ciclo pertence uma data de compra.
 */
export function getCycleKeyForPurchaseDate(
  purchaseDate: string,
  closeDay: number,
  dueDay: number,
): string {
  const d = parseYmd(purchaseDate);
  const year  = d.getFullYear();
  const month = d.getMonth() + 1;
  const day   = d.getDate();
  const closeDayClamped = clampDay(closeDay, year, month);

  if (day > closeDayClamped) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear  = month === 12 ? year + 1 : year;
    return monthKey(nextYear, nextMonth);
  }
  return monthKey(year, month);
}

/**
 * Retorna N ciclos anteriores (fechados) para histórico.
 * Ordenados do mais recente para o mais antigo.
 */
export function getPastCycles(
  closeDay: number,
  dueDay: number,
  n: number = 6,
  today: Date = new Date(),
): CardCycle[] {
  const current = getCurrentCycle(closeDay, dueDay, today);
  const [cy, cm] = current.key.split('-').map(Number);
  const cycles: CardCycle[] = [];

  for (let i = 1; i <= n; i++) {
    let m = cm - i;
    let y = cy;
    while (m <= 0) { m += 12; y -= 1; }
    cycles.push(getCycleForDueMonth(closeDay, dueDay, y, m, today));
  }
  return cycles;
}

// ── Totais e filtragem ────────────────────────────────────────────────────────

export function sumPurchasesForCycle(
  purchases: CardPurchaseNew[],
  cycleKey: string,
): number {
  return purchases
    .filter(p => p.cycleKey === cycleKey)
    .reduce((s, p) => s + (Number(p.value) || 0), 0);
}

export function purchasesForCycle(
  purchases: CardPurchaseNew[],
  cycleKey: string,
): CardPurchaseNew[] {
  return purchases.filter(p => p.cycleKey === cycleKey);
}

// ── Estado de cobrança ────────────────────────────────────────────────────────

export function computeCardBillingState(
  purchases: CardPurchaseNew[],
  paidCycles: string[],
  closeDay: number,
  dueDay: number,
  today: Date = new Date(),
): CardBillingState {
  const current = getCurrentCycle(closeDay, dueDay, today);
  const past    = getPastCycles(closeDay, dueDay, 12, today);
  const paidSet = new Set(paidCycles);

  const unpaidCycles = past
    .filter(c => c.isClosed && !paidSet.has(c.key))
    .filter(c => sumPurchasesForCycle(purchases, c.key) > 0)
    .map(c => c.key);

  return {
    currentCycleKey: current.key,
    unpaidCycles,
    paidCycles: paidCycles.filter(k => k !== current.key),
  };
}

// ── Parcelas ──────────────────────────────────────────────────────────────────

/**
 * Expande uma compra parcelada em N CardPurchaseNew, cada uma no ciclo correto.
 * O remainder (centavos) vai para a última parcela.
 */
export function expandInstallments(
  desc: string,
  totalValue: number,
  totalParcelas: number,
  firstDate: string,
  closeDay: number,
  dueDay: number,
  baseId: string,
): CardPurchaseNew[] {
  const installmentValue = Math.round((totalValue / totalParcelas) * 100) / 100;
  const remainder = Math.round((totalValue - installmentValue * totalParcelas) * 100) / 100;
  const purchases: CardPurchaseNew[] = [];
  const startDate = parseYmd(firstDate);

  for (let i = 0; i < totalParcelas; i++) {
    const pDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + i,
      startDate.getDate(),
    );
    const dateStr  = ymd(pDate);
    const cycleKey = getCycleKeyForPurchaseDate(dateStr, closeDay, dueDay);
    const value    = i === totalParcelas - 1
      ? Math.round((installmentValue + remainder) * 100) / 100
      : installmentValue;

    purchases.push({
      id: `${baseId}_p${i + 1}`,
      desc: `${desc} (${i + 1}/${totalParcelas})`,
      value,
      date: dateStr,
      cycleKey,
      installment: {
        total: totalParcelas,
        current: i + 1,
        installmentValue,
        originalDesc: desc,
        groupId: baseId,
      },
    });
  }
  return purchases;
}

// ── Formatação ────────────────────────────────────────────────────────────────

/** Formata "YYYY-MM" como "Jan/2024" */
export function formatCycleKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[m - 1]}/${y}`;
}

/** Formata "YYYY-MM-DD" como "DD/MM" */
export function formatDayMonth(ymdStr: string): string {
  const [, m, d] = ymdStr.split('-');
  return `${d}/${m}`;
}
