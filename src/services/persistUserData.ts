import { db } from '../firebase';
import {
  doc, getDoc, setDoc, collection, getDocs, deleteDoc,
  writeBatch, runTransaction,
} from 'firebase/firestore';
import { mergeInlineAndOverflowEntries } from '../utils/entryUtils';
import { calculateFinScore } from '../utils/calculateScore';
import { getCycleKeyForPurchaseDate, expandInstallments } from '../utils/cardCycleUtils';
import type { CardPurchaseNew } from '../utils/cardCycleUtils';
import {
  validateEntry,
  validateCard,
  validateCardPurchase,
  validateGoal,
  validateInvestment,
  validateRecurrent,
  validateAccount,
} from './validators';
import type {
  Entry,
  UserData,
  Card,
  CardBenefits,
  CardPurchase,
  Goal,
  Investment,
  Recurrent,
  CommProfile,
  CreditAccount,
  CreditObligation,
  CreditSnapshot,
  RoundUpConfig,
  RoundUpEntry,
  QuarentenaItem,
  Filho,
  FilhoTarefa,
  FilhoTransacao,
} from '../types/userData';

/** Erro lançado quando dados falham na validação antes de persistir. */
export class ValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(errors.join(' | '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/** Lança ValidationError se result.ok === false. */
function assertValid(result: { ok: boolean; errors: string[] }, _context: string): void {
  if (!result.ok) {
    throw new ValidationError(result.errors);
  }
}

async function loadInlineEntries(uid: string): Promise<Entry[]> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return ((snap.exists() ? snap.data()?.entries : []) ?? []) as Entry[];
}

async function loadOverflowEntries(uid: string): Promise<Entry[]> {
  const col = collection(db, 'users', uid, 'entriesOverflow');
  const snap = await getDocs(col);
  const list: Entry[] = [];
  snap.forEach((d) => {
    list.push({ ...(d.data() as Entry), entryLocation: 'overflow' });
  });
  return list;
}

/** Verifica se o usuário já teve entries migradas para subcoleção. */
async function isEntriesMigrated(uid: string): Promise<boolean> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() && Boolean(snap.data()?.entriesMigratedAt);
}

/**
 * Grava um lançamento na subcoleção /users/{uid}/entries/{id}.
 * Usado em dual-write durante período de transição.
 */
async function writeEntryToSubcollection(uid: string, entry: Entry): Promise<void> {
  const clean = { ...entry } as Record<string, unknown>;
  delete clean.entryLocation; // não persistir campo de localização
  const docId = String(entry.id);
  await setDoc(doc(db, 'users', uid, 'entries', docId), clean);
}

/**
 * Remove um lançamento da subcoleção /users/{uid}/entries/{id}.
 */
async function deleteEntryFromSubcollection(uid: string, id: number | string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'entries', String(id)));
}

async function deleteEntriesOverflowCollection(uid: string): Promise<void> {
  const col = collection(db, 'users', uid, 'entriesOverflow');
  const snap = await getDocs(col);
  const refs = snap.docs.map((d) => d.ref);
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

/** Janela mínima entre writes idênticos consecutivos (retries/offline/duplo clique). */
const UPDATE_USER_DOC_DEBOUNCE_MS = 1500;

let updateUserDocDebouncing = false;
let lastUpdateUserDocPayloadSig: string | null = null;
let lastUpdateUserDocAt = 0;

function payloadSignature(payload: Partial<UserData>): string {
  try {
    return JSON.stringify(payload);
  } catch {
    const keys = Object.keys(payload).sort();
    const entries = payload.entries;
    const n = Array.isArray(entries) ? entries.length : 0;
    return `fallback:${keys.join(',')}:entriesLen=${n}`;
  }
}

/**
 * Atualiza apenas alguns campos do documento users/{uid} (merge).
 * Usa runTransaction quando precisa recalcular finScore para evitar race conditions.
 *
 * Debounce em memória: bloqueia segunda chamada com o mesmo payload dentro de
 * {@link UPDATE_USER_DOC_DEBOUNCE_MS} enquanto um write anterior está em curso ou
 * acabou de completar (mitiga retries do SDK e duplo submit).
 */
export async function updateUserDoc(
  uid: string,
  payload: Partial<UserData>
): Promise<void> {
  const now = Date.now();
  const currentSig = payloadSignature(payload);

  if (
    updateUserDocDebouncing &&
    lastUpdateUserDocPayloadSig === currentSig &&
    now - lastUpdateUserDocAt < UPDATE_USER_DOC_DEBOUNCE_MS
  ) {
    if (import.meta.env.DEV) {
      console.warn('[Idempotência] updateUserDoc ignorado (payload idêntico em janela de debounce)', {
        keys: Object.keys(payload),
      });
    }
    return;
  }

  updateUserDocDebouncing = true;
  lastUpdateUserDocPayloadSig = currentSig;
  lastUpdateUserDocAt = now;

  const ref = doc(db, 'users', uid);

  const shouldRecalculateScore =
    'entries' in payload ||
    'goals' in payload ||
    'budgets' in payload ||
    'accountBalances' in payload ||
    'accountMeta' in payload ||
    'creditSnapshot' in payload;

  try {
    if (shouldRecalculateScore) {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        const current = (snap.exists() ? snap.data() : {}) as Partial<UserData>;
        const merged = { ...current, ...payload } as Partial<UserData>;
        const finScore = calculateFinScore(
          merged.entries ?? [],
          merged.goals ?? [],
          (merged.budgets ?? {}) as Record<string, unknown>,
          merged.accountBalances ?? {},
          merged.accountMeta ?? {},
          merged.creditSnapshot ?? null,
        );
        transaction.set(ref, { ...payload, finScore, updated: new Date().toISOString() }, { merge: true });
      });
    } else {
      await setDoc(ref, { ...payload, updated: new Date().toISOString() }, { merge: true });
    }
  } finally {
    setTimeout(() => {
      updateUserDocDebouncing = false;
    }, UPDATE_USER_DOC_DEBOUNCE_MS);
  }
}

export async function setCreditAccounts(uid: string, creditAccounts: CreditAccount[]): Promise<void> {
  await updateUserDoc(uid, { creditAccounts });
}

export async function setCreditObligations(uid: string, creditObligations: CreditObligation[]): Promise<void> {
  await updateUserDoc(uid, { creditObligations });
}

export async function setCreditSnapshot(uid: string, creditSnapshot: CreditSnapshot | null): Promise<void> {
  await updateUserDoc(uid, { creditSnapshot });
}

/**
 * Adiciona um lançamento ao array entries e persiste.
 * Se round-up estiver ativo e for despesa, acumula a diferença no cofre.
 */
export async function addEntry(uid: string, _currentEntries: Entry[], newEntry: Omit<Entry, 'id'>): Promise<void> {
  assertValid(validateEntry(newEntry), 'addEntry');
  const id = Date.now();
  const entry: Entry = { ...newEntry, id } as Entry;

  // Dual-write: grava na subcoleção (pós-migração) E mantém inline (retrocompat)
  const migrated = await isEntriesMigrated(uid);
  if (migrated) {
    await writeEntryToSubcollection(uid, entry);
  }

  const inline = await loadInlineEntries(uid);
  const payload: Partial<UserData> = { entries: [...inline, entry] };

  if (newEntry.type === 'despesa' && !newEntry.isTransfer) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const cfg = snap.exists() ? (snap.data()?.roundUpConfig as RoundUpConfig | undefined) : undefined;
    if (cfg?.enabled && cfg.roundTo) {
      const val = Number(newEntry.value);
      const rounded = Math.ceil(val / cfg.roundTo) * cfg.roundTo;
      const diff = Math.round((rounded - val) * 100) / 100;
      if (diff > 0) {
        const history = (cfg.cofreHistory ?? []).slice(-99);
        const entryDate = String(newEntry.date);
        const roundUpEntry: RoundUpEntry = { id, entryId: id, originalValue: val, roundedValue: rounded, diff, date: entryDate };
        payload.roundUpConfig = {
          ...cfg,
          cofreTotal: Math.round(((cfg.cofreTotal ?? 0) + diff) * 100) / 100,
          cofreHistory: [...history, roundUpEntry],
        };
      }
    }
  }

  await updateUserDoc(uid, payload);
}

/**
 * Adiciona uma transferência entre contas (gravando 2 entries):
 * - despesa (conta origem) com `isTransfer=true`
 * - receita (conta destino) com `isTransfer=true`
 *
 * Observação: a UI/relatórios devem excluir transfers quando calcularem receitas/despesas.
 */
export async function addTransfer(
  uid: string,
  _currentEntries: Entry[],
  opts: { from: string; to: string; date: string; value: number }
): Promise<void> {
  const from = opts.from?.trim();
  const to = opts.to?.trim();
  const date = opts.date;
  const val = Math.round((opts.value ?? 0) * 100) / 100;

  if (!from || !to || from === to) return;
  if (!date) return;
  if (!Number.isFinite(val) || val <= 0) return;

  const now = Date.now();

  const despesa: Omit<Entry, 'id'> = {
    date,
    type: 'despesa',
    desc: `Transf. para ${to}`,
    category: 'Transferencia',
    value: val,
    account: from,
    status: 'pago',
    isTransfer: true,
  };

  const receita: Omit<Entry, 'id'> = {
    date,
    type: 'receita',
    desc: `Transf. de ${from}`,
    category: 'Transferencia',
    value: val,
    account: to,
    status: 'pago',
    isTransfer: true,
  };

  const inline = await loadInlineEntries(uid);
  const entries: Entry[] = [
    ...inline,
    { ...despesa, id: now } as Entry,
    { ...receita, id: now + 1 } as Entry,
  ];

  await updateUserDoc(uid, { entries });
}

/**
 * Atualiza um lançamento por id. `mergedEntries` deve incluir entriesOverflow (via merge do hook).
 */
export async function updateEntry(
  uid: string,
  mergedEntries: Entry[],
  id: number,
  updates: Partial<Entry>
): Promise<void> {
  const target = mergedEntries.find((e) => e.id === id);
  if (!target) return;
  assertValid(validateEntry({ ...target, ...updates, id: target.id }), 'updateEntry');

  // Overflow (Pluggy): atualiza no doc de overflow
  if (target.entryLocation === 'overflow' && target.pluggyTransactionId) {
    const dref = doc(db, 'users', uid, 'entriesOverflow', `pg_${target.pluggyTransactionId}`);
    await setDoc(dref, { ...target, ...updates, id } as Entry, { merge: true });
    return;
  }

  // Subcoleção: atualiza lá + inline (dual-write)
  if ((target as any).entryLocation === 'subcollection') {
    await writeEntryToSubcollection(uid, { ...target, ...updates, id } as Entry);
  }

  const inline = await loadInlineEntries(uid);
  const entries = inline.map((e) => (e.id === id ? { ...e, ...updates, id } : e)) as Entry[];
  await updateUserDoc(uid, { entries });
}

/**
 * Remove um lançamento por id. `mergedEntries` deve incluir overflow para excluir arquivados Pluggy.
 */
export async function deleteEntry(uid: string, mergedEntries: Entry[], id: number): Promise<void> {
  const target = mergedEntries.find((e) => e.id === id);

  // Overflow (Pluggy)
  if (target?.entryLocation === 'overflow' && target.pluggyTransactionId) {
    await deleteDoc(doc(db, 'users', uid, 'entriesOverflow', `pg_${target.pluggyTransactionId}`));
    return;
  }

  // Subcoleção: remove de lá também (dual-delete)
  if ((target as any)?.entryLocation === 'subcollection') {
    await deleteEntryFromSubcollection(uid, id);
  }

  const inline = await loadInlineEntries(uid);
  await updateUserDoc(uid, { entries: inline.filter((e) => e.id !== id) });
}

/**
 * Adiciona uma conta e saldo inicial (merge em accounts e accountBalances).
 */
export async function addAccount(
  uid: string,
  currentAccounts: string[],
  currentBalances: Record<string, number>,
  name: string,
  initialBalance: number = 0
): Promise<void> {
  const nameTrim = name.trim();
  assertValid(validateAccount(nameTrim, initialBalance), 'addAccount');
  if (!nameTrim || currentAccounts.includes(nameTrim)) return;
  const accounts = [...currentAccounts, nameTrim];
  const accountBalances = { ...currentBalances, [nameTrim]: initialBalance };
  await updateUserDoc(uid, { accounts, accountBalances });
}

/**
 * Mês de fechamento da fatura (YYYY-MM) para uma data, conforme dia de fechamento do cartão.
 */
export function getBillingMonth(card: Card, dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  let month = d.getMonth();
  let year = d.getFullYear();
  if (d.getDate() > (card.closeDay ?? 31)) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Adiciona um cartão ao array cards.
 */
export async function addCard(
  uid: string,
  currentCards: Card[],
  newCard: Omit<Card, 'id'>
): Promise<void> {
  assertValid(validateCard(newCard), 'addCard');
  const id = Date.now();
  const cards = [...currentCards, { ...newCard, id, purchases: (newCard as Card).purchases ?? [] } as Card];
  await updateUserDoc(uid, { cards });
}

/**
 * Adiciona compra(s) na fatura do cartão (1 ou N parcelas) e os lançamentos correspondentes.
 */
export async function addCardPurchase(
  uid: string,
  currentCards: Card[],
  _currentEntries: Entry[],
  cardId: number,
  opts: { desc: string; category: string; value: number; date: string; parcelas?: number }
): Promise<void> {
  assertValid(validateCardPurchase(opts), 'addCardPurchase');
  const card = currentCards.find((c) => c.id === cardId);
  if (!card) throw new Error('Cartão não encontrado');
  const purchases = card.purchases ?? [];
  const parcelas = Math.max(1, opts.parcelas ?? 1);
  const total = Math.round(opts.value * 100) / 100;
  const valParc = Math.round((total / parcelas) * 100) / 100;
  const purchaseId = Date.now();
  const newPurchases: CardPurchase[] = [];
  const newEntries: Entry[] = [];
  for (let p = 0; p < parcelas; p++) {
    const pDate = (() => {
      const d = new Date(opts.date + 'T12:00:00');
      d.setMonth(d.getMonth() + p);
      return d.toISOString().split('T')[0];
    })();
    const bm = getBillingMonth(card, pDate);
    const descParc = opts.desc + (parcelas > 1 ? ` (${p + 1}/${parcelas})` : '');
    newPurchases.push({
      id: purchaseId + p,
      purchaseId,
      desc: descParc,
      category: opts.category,
      value: valParc,
      totalValue: total,
      parcela: p + 1,
      totalParcelas: parcelas,
      date: pDate,
      billingMonth: bm,
    });
    newEntries.push({
      id: purchaseId + p,
      cardPurchaseId: purchaseId,
      type: 'despesa',
      desc: `[${card.name}] ${descParc}`,
      value: valParc,
      category: opts.category,
      date: pDate,
      account: card.name,
      status: 'pendente',
      formaPgto: 'cartao',
      tags: ['cartão', card.name.toLowerCase()],
    } as Entry);
  }
  const updatedCards = currentCards.map((c) =>
    c.id === cardId ? { ...c, purchases: [...purchases, ...newPurchases] } : c
  ) as Card[];
  const inline = await loadInlineEntries(uid);
  await updateUserDoc(uid, { cards: updatedCards, entries: [...inline, ...newEntries] });
}

/**
 * Importa várias compras de fatura de uma vez (ex.: CSV/texto), gerando parcelas e lançamentos.
 * Cada item segue o mesmo formato de addCardPurchase.
 */
export async function importCardPurchases(
  uid: string,
  currentCards: Card[],
  _currentEntries: Entry[],
  cardId: number,
  items: { desc: string; category: string; value: number; date: string; parcelas?: number }[]
): Promise<void> {
  if (!items.length) return;
  const card = currentCards.find((c) => c.id === cardId);
  if (!card) throw new Error('Cartão não encontrado');
  const purchases = card.purchases ?? [];
  const allPurchases: CardPurchase[] = [];
  const allEntries: Entry[] = [];

  for (const opts of items) {
    const parcelas = Math.max(1, opts.parcelas ?? 1);
    const total = Math.round(opts.value * 100) / 100;
    const valParc = Math.round((total / parcelas) * 100) / 100;
    const purchaseId = Date.now() + Math.floor(Math.random() * 1000);
    for (let p = 0; p < parcelas; p++) {
      const pDate = (() => {
        const d = new Date(opts.date + 'T12:00:00');
        d.setMonth(d.getMonth() + p);
        return d.toISOString().split('T')[0];
      })();
      const bm = getBillingMonth(card, pDate);
      const descParc = opts.desc + (parcelas > 1 ? ` (${p + 1}/${parcelas})` : '');
      allPurchases.push({
        id: purchaseId + p,
        purchaseId,
        desc: descParc,
        category: opts.category,
        value: valParc,
        totalValue: total,
        parcela: p + 1,
        totalParcelas: parcelas,
        date: pDate,
        billingMonth: bm,
      });
      allEntries.push({
        id: purchaseId + p,
        cardPurchaseId: purchaseId,
        type: 'despesa',
        desc: `[${card.name}] ${descParc}`,
        value: valParc,
        category: opts.category,
        date: pDate,
        account: card.name,
        status: 'pendente',
        formaPgto: 'cartao',
        tags: ['cartão', card.name.toLowerCase()],
      } as Entry);
    }
  }

  const updatedCards = currentCards.map((c) =>
    c.id === cardId ? { ...c, purchases: [...purchases, ...allPurchases] } : c
  ) as Card[];
  const inline = await loadInlineEntries(uid);
  await updateUserDoc(uid, { cards: updatedCards, entries: [...inline, ...allEntries] });
}

/**
 * Atualiza um cartão (nome, limite, closeDay, dueDay, flag, color, etc.). Não altera purchases.
 */
export async function updateCard(
  uid: string,
  currentCards: Card[],
  cardId: number,
  updates: Partial<
    Pick<Card, 'name' | 'limit' | 'closeDay' | 'dueDay' | 'flag' | 'color' | 'cardBenefits'> & {
      bank?: string;
      annualFee?: number;
      annualFeeMonth?: number;
      cardBenefits?: CardBenefits;
    }
  >
): Promise<void> {
  const existing = currentCards.find((c) => c.id === cardId);
  if (existing && (updates.name !== undefined || updates.limit !== undefined)) {
    assertValid(validateCard({ ...existing, ...updates }), 'updateCard');
  }
  const cards = currentCards.map((c) =>
    c.id === cardId ? { ...c, ...updates } : c
  ) as Card[];
  await updateUserDoc(uid, { cards });
}

/**
 * Remove um cartão. Compras e lançamentos vinculados permanecem (entries mantêm descrição com nome do cartão).
 */
export async function deleteCard(uid: string, currentCards: Card[], cardId: number): Promise<void> {
  const cards = currentCards.filter((c) => c.id !== cardId);
  await updateUserDoc(uid, { cards });
}

/**
 * Remove uma compra da fatura (todas as parcelas) e os lançamentos vinculados.
 */
export async function deleteCardPurchase(
  uid: string,
  currentCards: Card[],
  _currentEntries: Entry[],
  cardId: number,
  purchaseId: number
): Promise<void> {
  const updatedCards = currentCards.map((c) => {
    if (c.id !== cardId) return c;
    const purchases = (c.purchases ?? []).filter((p) => p.purchaseId !== purchaseId && p.id !== purchaseId);
    return { ...c, purchases };
  }) as Card[];
  const inline = await loadInlineEntries(uid);
  const entries = inline.filter((e) => (e as Entry & { cardPurchaseId?: number }).cardPurchaseId !== purchaseId);
  await updateUserDoc(uid, { cards: updatedCards, entries });
}

/**
 * Adiciona uma meta ao array goals.
 */
export async function addGoal(
  uid: string,
  currentGoals: Goal[],
  newGoal: Omit<Goal, 'id'>
): Promise<void> {
  assertValid(validateGoal(newGoal), 'addGoal');
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `g_${Date.now()}`;
  const goals = [...currentGoals, { ...newGoal, id, current: newGoal.current ?? 0 } as Goal];
  await updateUserDoc(uid, { goals });
}

/**
 * Atualiza uma meta (ex.: valor atual) e persiste.
 */
export async function updateGoal(
  uid: string,
  currentGoals: Goal[],
  id: string,
  updates: Partial<Goal>
): Promise<void> {
  const idStr = String(id);
  const existing = currentGoals.find((g) => String(g.id) === idStr);
  if (existing) {
    assertValid(validateGoal({ ...existing, ...updates, id: existing.id }), 'updateGoal');
  }
  const goals = currentGoals.map((g) => (String(g.id) === idStr ? { ...g, ...updates, id: g.id } : g)) as Goal[];
  await updateUserDoc(uid, { goals });
}

/**
 * Remove uma meta por id e persiste.
 */
export async function deleteGoal(uid: string, currentGoals: Goal[], id: string): Promise<void> {
  const idStr = String(id);
  const goals = currentGoals.filter((g) => String(g.id) !== idStr);
  await updateUserDoc(uid, { goals });
}

/**
 * Adiciona um investimento ao array investments.
 */
export async function addInvestment(
  uid: string,
  currentInvestments: Investment[],
  newInv: Omit<Investment, 'id'>
): Promise<void> {
  assertValid(validateInvestment(newInv), 'addInvestment');
  const id = Date.now();
  const investments = [...currentInvestments, { ...newInv, id } as Investment];
  await updateUserDoc(uid, { investments });
}

/**
 * Atualiza um investimento (ex.: valor atual) e persiste.
 */
export async function updateInvestment(
  uid: string,
  currentInvestments: Investment[],
  id: number,
  updates: Partial<Investment>
): Promise<void> {
  const existing = currentInvestments.find((inv) => inv.id === id);
  if (existing) {
    assertValid(validateInvestment({ ...existing, ...updates, id: existing.id }), 'updateInvestment');
  }
  const investments = currentInvestments.map((inv) =>
    inv.id === id ? { ...inv, ...updates, id } : inv
  ) as Investment[];
  await updateUserDoc(uid, { investments });
}

/**
 * Remove um investimento por id e persiste.
 */
export async function deleteInvestment(
  uid: string,
  currentInvestments: Investment[],
  id: number
): Promise<void> {
  const investments = currentInvestments.filter((inv) => inv.id !== id);
  await updateUserDoc(uid, { investments });
}

/**
 * Atualiza o perfil da comunidade no doc do usuário.
 */
export async function updateCommProfile(uid: string, profile: CommProfile): Promise<void> {
  await updateUserDoc(uid, { commProfile: profile });
}

/**
 * Atualiza a lista de posts salvos (bookmarks) no doc do usuário.
 */
export async function setCommBookmarks(uid: string, bookmarks: string[]): Promise<void> {
  await updateUserDoc(uid, { commBookmarks: bookmarks });
}

/**
 * Atualiza o orçamento por categoria (objeto budgets: categoria -> limite).
 */
export async function updateBudgets(
  uid: string,
  budgets: Record<string, number>
): Promise<void> {
  await updateUserDoc(uid, { budgets });
}

/**
 * Atualiza o saldo de uma conta (merge em accountBalances).
 */
export async function updateAccountBalance(
  uid: string,
  currentBalances: Record<string, number>,
  accountName: string,
  newBalance: number
): Promise<void> {
  if (typeof newBalance !== 'number' || !isFinite(newBalance) || Math.abs(newBalance) > 1_000_000_000) {
    throw new ValidationError(['Saldo deve ser um número válido (máx R$ 1 bilhão).']);
  }
  const accountBalances = { ...currentBalances, [accountName]: newBalance };
  await updateUserDoc(uid, { accountBalances });
}

/** Meta de uma conta (cor, incluir na soma, tipo e limite opcional). */
export type AccountMetaEntry = {
  cor?: string;
  incluirNaSoma?: boolean;
  tipo?: string;
  temChequeEspecial?: boolean;
  chequeEspecialLimite?: number;
  chequeEspecialJurosPct?: number;
  /** Número da agência (ex: "0001-7") */
  agency?: string;
  /** Número da conta (ex: "12345-8") */
  accountNumber?: string;
  /** Código ISPB / número do banco (ex: "260" para Nubank) */
  bankCode?: string;
  /** Moeda da conta (ex: "BRL", "USD", "EUR") */
  currency?: string;
  /** Status de conexão Open Finance para esta conta */
  ofStatus?: 'nao-conectado' | 'ativo' | 'erro' | 'expirado';
  /** ID do item Pluggy vinculado a esta conta */
  pluggyItemId?: string;
  /** ID da conta Pluggy */
  pluggyAccountId?: string;
};

/**
 * Remove uma conta (accounts, accountBalances, accountMeta). Entries que referenciam a conta permanecem com o nome (conta removida).
 */
export async function deleteAccount(
  uid: string,
  currentAccounts: string[],
  currentBalances: Record<string, number>,
  currentMeta: Record<string, AccountMetaEntry>,
  accountName: string
): Promise<void> {
  const accounts = currentAccounts.filter((a) => a !== accountName);
  const accountBalances = { ...currentBalances };
  delete accountBalances[accountName];
  const accountMeta = { ...currentMeta };
  delete accountMeta[accountName];
  await updateUserDoc(uid, { accounts, accountBalances, accountMeta });
}

/**
 * Atualiza a meta de uma conta (cor, incluirNaSoma, tipo, agência, etc.).
 * Remove campos `undefined` antes de salvar para evitar rejeição do Firestore.
 */
export async function updateAccountMeta(
  uid: string,
  currentMeta: Record<string, AccountMetaEntry>,
  accountName: string,
  updates: Partial<AccountMetaEntry>
): Promise<void> {
  // Firestore rejeita valores undefined — removemos antes de salvar
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  ) as Partial<AccountMetaEntry>;

  const accountMeta = { ...currentMeta };
  accountMeta[accountName] = { ...(accountMeta[accountName] ?? {}), ...cleanUpdates };
  await updateUserDoc(uid, { accountMeta });
}

/**
 * Renomeia uma conta (atualiza accounts, accountBalances, accountMeta e entries que usam a conta).
 */
export async function renameAccount(
  uid: string,
  currentAccounts: string[],
  currentBalances: Record<string, number>,
  currentMeta: Record<string, AccountMetaEntry>,
  _currentEntries: Entry[],
  oldName: string,
  newName: string
): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return;
  if (currentAccounts.includes(trimmed)) throw new Error('Já existe uma conta com esse nome.');
  const accounts = currentAccounts.map((a) => (a === oldName ? trimmed : a));
  const accountBalances = { ...currentBalances };
  accountBalances[trimmed] = accountBalances[oldName] ?? 0;
  delete accountBalances[oldName];
  const accountMeta = { ...currentMeta };
  accountMeta[trimmed] = accountMeta[oldName] ?? {};
  delete accountMeta[oldName];
  const inline = await loadInlineEntries(uid);
  const entries = inline.map((e) =>
    e.account === oldName ? { ...e, account: trimmed } : e
  ) as Entry[];
  await updateUserDoc(uid, { accounts, accountBalances, accountMeta, entries });
  const overflow = await loadOverflowEntries(uid);
  for (const e of overflow) {
    if (e.account === oldName && e.pluggyTransactionId) {
      await setDoc(
        doc(db, 'users', uid, 'entriesOverflow', `pg_${e.pluggyTransactionId}`),
        { ...e, account: trimmed } as Entry,
        { merge: true },
      );
    }
  }
}

/**
 * Adiciona um lançamento recorrente.
 */
export async function addRecurrent(
  uid: string,
  currentRecurrents: Recurrent[],
  newRecurrent: Omit<Recurrent, 'id'>
): Promise<void> {
  assertValid(validateRecurrent(newRecurrent), 'addRecurrent');
  const id = Date.now();
  const recurrents = [...currentRecurrents, { ...newRecurrent, id, active: newRecurrent.active ?? true } as Recurrent];
  await updateUserDoc(uid, { recurrents });
}

/**
 * Remove um recorrente por id.
 */
export async function deleteRecurrent(
  uid: string,
  currentRecurrents: Recurrent[],
  id: number
): Promise<void> {
  const recurrents = currentRecurrents.filter((r) => r.id !== id);
  await updateUserDoc(uid, { recurrents });
}

const FREQ_LABEL: Record<string, string> = {
  mensal: 'fixo',
  semanal: 'semanal',
  quinzenal: 'quinzenal',
  bimestral: 'bimestral',
  trimestral: 'trimestral',
  semestral: 'semestral',
  anual: 'anual',
};

/**
 * Gera lançamentos do mês atual a partir dos recorrentes ativos que ainda não foram gerados.
 * Retorna o número de lançamentos criados. Compatível com o legado (procRc).
 */
export async function generateEntriesFromRecurrents(
  uid: string,
  _currentEntries: Entry[],
  currentRecurrents: Recurrent[]
): Promise<number> {
  const inline = await loadInlineEntries(uid);
  const overflow = await loadOverflowEntries(uid);
  const mergedForTags = mergeInlineAndOverflowEntries(inline, overflow);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
  const maxDay = new Date(y, m + 1, 0).getDate();
  const existingTags = new Set(
    mergedForTags.map((e) => (e as { rcTag?: string }).rcTag).filter(Boolean)
  );

  const toAdd: Entry[] = [];
  const baseId = Date.now();

  for (let i = 0; i < currentRecurrents.length; i++) {
    const r = currentRecurrents[i];
    if (r.active === false) continue;
    const freq = r.freq || 'mensal';
    let shouldRun = true;
    if (freq === 'bimestral') shouldRun = m % 2 === 0;
    else if (freq === 'trimestral') shouldRun = m % 3 === 0;
    else if (freq === 'semestral') shouldRun = m % 6 === 0;
    else if (freq === 'anual') shouldRun = m === 0;
    if (!shouldRun) continue;

    let tag = `rc_${r.id}_${ym}`;
    if (freq === 'semanal') {
      const week = Math.ceil(now.getDate() / 7);
      tag = `rc_${r.id}_${ym}_w${week}`;
    } else if (freq === 'quinzenal') {
      const quinz = now.getDate() <= 15 ? 'q1' : 'q2';
      tag = `rc_${r.id}_${ym}_${quinz}`;
    }
    if (existingTags.has(tag)) continue;

    const day = Math.min(Math.max(1, r.day ?? 1), maxDay);
    const date = `${ym}-${String(day).padStart(2, '0')}`;
    const label = FREQ_LABEL[freq] || 'fixo';
    toAdd.push({
      id: baseId + i,
      type: r.type,
      date,
      desc: `${r.desc || 'Recorrente'} (${label})`,
      category: r.category,
      value: r.value ?? 0,
      account: r.account,
      rcTag: tag,
      isFixed: true,
    } as Entry);
    existingTags.add(tag);
  }

  if (toAdd.length === 0) return 0;
  const newEntries = [...inline, ...toAdd];
  await updateUserDoc(uid, { entries: newEntries });
  return toAdd.length;
}

// ─── Round-up ───────────────────────────────────────────────────────────────

export async function updateRoundUpConfig(uid: string, config: Partial<RoundUpConfig>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const current = (snap.exists() ? snap.data()?.roundUpConfig : {}) as Partial<RoundUpConfig>;
  await updateUserDoc(uid, {
    roundUpConfig: { enabled: false, roundTo: 1, cofreTotal: 0, cofreHistory: [], ...current, ...config } as RoundUpConfig,
  });
}

export async function investirCofre(
  uid: string,
  currentGoals: Goal[],
  goalId: string,
  amount: number
): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const cfg = (snap.exists() ? snap.data()?.roundUpConfig : null) as RoundUpConfig | null;
  if (!cfg || cfg.cofreTotal < amount) throw new Error('Saldo insuficiente no cofre.');
  const goals = currentGoals.map((g) =>
    String(g.id) === goalId ? { ...g, current: Math.round((g.current + amount) * 100) / 100 } : g
  ) as Goal[];
  await updateUserDoc(uid, {
    goals,
    roundUpConfig: { ...cfg, cofreTotal: Math.round((cfg.cofreTotal - amount) * 100) / 100 },
  });
}

// ─── Quarentena de Compras ──────────────────────────────────────────────────

export async function addQuarentena(uid: string, item: Omit<QuarentenaItem, 'id' | 'criadoEm' | 'expiraEm' | 'status'>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const current = (snap.exists() ? (snap.data()?.quarentena ?? []) : []) as QuarentenaItem[];
  const now = new Date();
  const expira = new Date(now.getTime() + 48 * 3600_000);
  const newItem: QuarentenaItem = {
    id: crypto.randomUUID?.() ?? `q_${Date.now()}`,
    ...item,
    criadoEm: now.toISOString(),
    expiraEm: expira.toISOString(),
    status: 'pendente',
  };
  await updateUserDoc(uid, { quarentena: [...current, newItem] } as Partial<UserData>);
}

export async function resolveQuarentena(
  uid: string,
  itemId: string,
  action: 'comprado' | 'desistido',
  _currentEntries: Entry[]
): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const items = (snap.exists() ? (snap.data()?.quarentena ?? []) : []) as QuarentenaItem[];
  const item = items.find((q) => q.id === itemId);
  if (!item) return;

  const updated = items.map((q) => q.id === itemId ? { ...q, status: action } : q) as QuarentenaItem[];
  const payload: Partial<UserData> = { quarentena: updated };

  if (action === 'comprado') {
    const inline = await loadInlineEntries(uid);
    const entry: Entry = {
      id: Date.now(),
      type: 'despesa',
      desc: item.descricao,
      category: item.categoria || 'Outros',
      value: item.valor,
      date: new Date().toISOString().split('T')[0],
      tags: ['quarentena-aprovada'],
    };
    payload.entries = [...inline, entry];
  } else {
    const cfg = snap.data()?.roundUpConfig as RoundUpConfig | undefined;
    if (cfg?.enabled) {
      payload.roundUpConfig = {
        ...cfg,
        cofreTotal: Math.round((cfg.cofreTotal + item.valor) * 100) / 100,
      };
    }
  }

  await updateUserDoc(uid, payload);
}

export async function deleteQuarentena(uid: string, itemId: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const items = (snap.exists() ? (snap.data()?.quarentena ?? []) : []) as QuarentenaItem[];
  await updateUserDoc(uid, { quarentena: items.filter((q) => q.id !== itemId) } as Partial<UserData>);
}

// ─── Finanças dos Filhos ────────────────────────────────────────────────────

export async function addFilho(uid: string, filho: Omit<Filho, 'id' | 'saldo' | 'sibcoinBalance' | 'tarefas' | 'historico'>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const current = (snap.exists() ? (snap.data()?.filhos ?? []) : []) as Filho[];
  const novo: Filho = {
    id: crypto.randomUUID?.() ?? `f_${Date.now()}`,
    ...filho,
    saldo: 0,
    sibcoinBalance: 0,
    tarefas: [],
    historico: [],
  };
  await updateUserDoc(uid, { filhos: [...current, novo] } as Partial<UserData>);
}

export async function updateFilho(uid: string, filhoId: string, updates: Partial<Filho>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const current = (snap.exists() ? (snap.data()?.filhos ?? []) : []) as Filho[];
  const filhos = current.map((f) => f.id === filhoId ? { ...f, ...updates, id: f.id } : f) as Filho[];
  await updateUserDoc(uid, { filhos } as Partial<UserData>);
}

export async function deleteFilho(uid: string, filhoId: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const current = (snap.exists() ? (snap.data()?.filhos ?? []) : []) as Filho[];
  await updateUserDoc(uid, { filhos: current.filter((f) => f.id !== filhoId) } as Partial<UserData>);
}

export async function addTarefaFilho(uid: string, filhoId: string, tarefa: Omit<FilhoTarefa, 'id' | 'status'>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const filhos = (snap.exists() ? (snap.data()?.filhos ?? []) : []) as Filho[];
  const updated = filhos.map((f) => {
    if (f.id !== filhoId) return f;
    const nova: FilhoTarefa = { id: crypto.randomUUID?.() ?? `t_${Date.now()}`, ...tarefa, status: 'pendente' };
    return { ...f, tarefas: [...f.tarefas, nova] };
  }) as Filho[];
  await updateUserDoc(uid, { filhos: updated } as Partial<UserData>);
}

export async function completarTarefaFilho(uid: string, filhoId: string, tarefaId: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const filhos = (snap.exists() ? (snap.data()?.filhos ?? []) : []) as Filho[];
  const updated = filhos.map((f) => {
    if (f.id !== filhoId) return f;
    const tarefa = f.tarefas.find((t) => t.id === tarefaId);
    if (!tarefa || tarefa.status === 'completa') return f;
    const tarefas = f.tarefas.map((t) =>
      t.id === tarefaId ? { ...t, status: 'completa' as const, completaEm: new Date().toISOString() } : t
    );
    const transacao: FilhoTransacao = {
      id: crypto.randomUUID?.() ?? `ft_${Date.now()}`,
      tipo: 'tarefa',
      descricao: tarefa.titulo,
      valor: tarefa.recompensa,
      date: new Date().toISOString().split('T')[0],
    };
    return {
      ...f,
      tarefas,
      saldo: Math.round((f.saldo + tarefa.recompensa) * 100) / 100,
      sibcoinBalance: f.sibcoinBalance + Math.round(tarefa.recompensa),
      historico: [...f.historico.slice(-49), transacao],
    };
  }) as Filho[];
  await updateUserDoc(uid, { filhos: updated } as Partial<UserData>);
}

export async function pagarMesada(uid: string, filhoId: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const filhos = (snap.exists() ? (snap.data()?.filhos ?? []) : []) as Filho[];
  const updated = filhos.map((f) => {
    if (f.id !== filhoId) return f;
    const transacao: FilhoTransacao = {
      id: crypto.randomUUID?.() ?? `fm_${Date.now()}`,
      tipo: 'mesada',
      descricao: `Mesada ${f.mesadaFrequencia}`,
      valor: f.mesadaValor,
      date: new Date().toISOString().split('T')[0],
    };
    return {
      ...f,
      saldo: Math.round((f.saldo + f.mesadaValor) * 100) / 100,
      historico: [...f.historico.slice(-49), transacao],
    };
  }) as Filho[];
  await updateUserDoc(uid, { filhos: updated } as Partial<UserData>);
}

/** Categorias padrão (mesmo do app legado). */
export const DEFAULT_CATEGORIES = [
  'Moradia', 'Transporte', 'Alimentação', 'Saúde', 'Bem-estar', 'Educação',
  'Lazer', 'Cartões', 'Empréstimo', 'Assinaturas', 'Imprevisto', 'Salário',
  'Freela', 'Investimentos', 'Transferencia', 'Outros',
];

/**
 * Recomeçar do zero: apaga lançamentos, metas, contas, investimentos, orçamentos, etc.
 * Mantém nome e e-mail (e conta de login). Compatível com o legado.
 */
export async function resetUserData(
  uid: string,
  keep: { name?: string; email?: string }
): Promise<void> {
  await deleteEntriesOverflowCollection(uid);
  const emptyData: Partial<UserData> = {
    entries: [],
    investments: [],
    goals: [],
    budgets: {},
    orcamentosByMonth: {},
    categories: DEFAULT_CATEGORIES.slice(),
    accounts: ['Carteira física'],
    accountBalances: { 'Carteira física': 0 },
    accountMeta: {},
    accountCesta: {},
    recurrents: [],
    cards: [],
    commProfile: null,
    commPosts: [],
    commBookmarks: [],
    investorProfile: null,
    finScore: calculateFinScore([], [], {}, { 'Carteira física': 0 }, {}, null),
    ...(keep.name !== undefined && { name: keep.name }),
    ...(keep.email !== undefined && { email: keep.email }),
  };
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...emptyData, updated: new Date().toISOString() }, { merge: true });
}

// ─── Ciclos de Fatura (novo modelo) ─────────────────────────────────────────

/**
 * Adiciona compras (nova API com cycleKey) ao card.purchasesV2.
 * Dedup por id e pluggyTransactionId. Atualiza currentBill com total do ciclo atual.
 */
export async function addCardPurchasesV2(
  uid: string,
  cardId: number,
  newPurchases: CardPurchaseNew[],
): Promise<void> {
  if (!newPurchases.length) return;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Usuário não encontrado');

  const data  = snap.data() as UserData;
  const cards = [...(data.cards ?? [])];
  const idx   = cards.findIndex(c => c.id === cardId);
  if (idx === -1) throw new Error('Cartão não encontrado');

  const card = { ...cards[idx] };
  const existing: CardPurchaseNew[] = (card.purchasesV2 as CardPurchaseNew[]) ?? [];
  const existingIds      = new Set(existing.map(p => p.id));
  const existingPluggyIds = new Set(
    existing.filter(p => p.pluggyTransactionId).map(p => p.pluggyTransactionId!),
  );

  const toAdd = newPurchases.filter(p => {
    if (existingIds.has(p.id)) return false;
    if (p.pluggyTransactionId && existingPluggyIds.has(p.pluggyTransactionId)) return false;
    return true;
  });
  if (!toAdd.length) return;

  const allPurchases = [...existing, ...toAdd] as CardPurchaseNew[];
  card.purchasesV2 = allPurchases;
  cards[idx] = card;
  await updateUserDoc(uid, { cards: cards as Card[] });
}

/**
 * Remove uma compra de card.purchasesV2 por id.
 */
export async function removeCardPurchaseV2(
  uid: string,
  cardId: number,
  purchaseId: string,
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) return;

  const data  = snap.data() as UserData;
  const cards = [...(data.cards ?? [])];
  const idx   = cards.findIndex(c => c.id === cardId);
  if (idx === -1) return;

  const card = { ...cards[idx] };
  card.purchasesV2 = ((card.purchasesV2 as CardPurchaseNew[]) ?? [])
    .filter(p => p.id !== purchaseId);
  cards[idx] = card;
  await updateUserDoc(uid, { cards: cards as Card[] });
}

/**
 * Remove todas as parcelas de um grupo (compra parcelada).
 */
export async function removeCardInstallmentGroup(
  uid: string,
  cardId: number,
  groupId: string,
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) return;

  const data  = snap.data() as UserData;
  const cards = [...(data.cards ?? [])];
  const idx   = cards.findIndex(c => c.id === cardId);
  if (idx === -1) return;

  const card = { ...cards[idx] };
  card.purchasesV2 = ((card.purchasesV2 as CardPurchaseNew[]) ?? [])
    .filter(p => p.installment?.groupId !== groupId);
  cards[idx] = card;
  await updateUserDoc(uid, { cards: cards as Card[] });
}

/**
 * Marca um ciclo de fatura como pago.
 * Salva cycleKey em card.paidCycles[] e cria entry de "pagamento de fatura"
 * para manter o histórico financeiro consistente.
 *
 * @param paymentDate  Data do pagamento (default: hoje)
 */
export async function payCardCycle(
  uid: string,
  cardId: number,
  cycleKey: string,
  paymentDate: string = new Date().toISOString().slice(0, 10),
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Usuário não encontrado');

  const data  = snap.data() as UserData;
  const cards = [...(data.cards ?? [])];
  const idx   = cards.findIndex(c => c.id === cardId);
  if (idx === -1) throw new Error('Cartão não encontrado');

  const card = { ...cards[idx] };
  if ((card.paidCycles as string[] ?? []).includes(cycleKey)) return; // já pago

  // Soma do ciclo
  const cyclePurchases = ((card.purchasesV2 as CardPurchaseNew[]) ?? [])
    .filter(p => p.cycleKey === cycleKey);
  const cycleTotal = cyclePurchases.reduce((s, p) => s + (Number(p.value) || 0), 0);

  card.paidCycles = [...((card.paidCycles as string[]) ?? []), cycleKey];
  cards[idx] = card;

  // Entry de pagamento de fatura
  const inline = await loadInlineEntries(uid);
  const paymentEntry: Entry = {
    id: Date.now(),
    type: 'despesa',
    desc: `Pagamento fatura ${card.name} — ${cycleKey}`,
    category: 'Cartões',
    value: cycleTotal,
    date: paymentDate,
    account: card.name,
    status: 'confirmado',
    isCardPayment: true,
    cardId,
    cycleKey,
  } as Entry;

  await updateUserDoc(uid, {
    cards: cards as Card[],
    entries: [...inline, paymentEntry],
  });
}

/**
 * Desfaz o pagamento de um ciclo (para correção de erro).
 */
export async function unpayCardCycle(
  uid: string,
  cardId: number,
  cycleKey: string,
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) return;

  const data  = snap.data() as UserData;
  const cards = [...(data.cards ?? [])];
  const idx   = cards.findIndex(c => c.id === cardId);
  if (idx === -1) return;

  const card = { ...cards[idx] };
  card.paidCycles = ((card.paidCycles as string[]) ?? []).filter(k => k !== cycleKey);
  cards[idx] = card;

  const entries = await loadInlineEntries(uid);
  const filtered = entries.filter(
    e => !((e as Entry & { isCardPayment?: boolean; cardId?: number; cycleKey?: string })
      .isCardPayment && (e as any).cardId === cardId && (e as any).cycleKey === cycleKey),
  );

  await updateUserDoc(uid, { cards: cards as Card[], entries: filtered });
}
