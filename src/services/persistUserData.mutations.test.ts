/**
 * persistUserData.mutations.test.ts
 *
 * Testes de CARACTERIZAÇÃO das mutações de cartões, lançamentos e transferências
 * em persistUserData.ts. Complementa persistUserData.cardCycle.test.ts (ciclos de
 * fatura). Juntos travam o comportamento atual do arquivo mais crítico do app
 * (1.573 linhas, núcleo de toda a escrita financeira) antes de qualquer refactor
 * dos casts `as Card[]`/`as any`.
 *
 * Mesma estratégia de mock do firebase/firestore: store em memória por uid,
 * runTransaction síncrono, get→snapshot, set→merge. uid distinto por teste evita
 * supressão por debounce/_writeId do updateUserDoc.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, any> = {};

vi.mock('../firebase', () => ({ db: { __fake: true } }));

vi.mock('firebase/firestore', () => {
  const snapOf = (uid: string) => {
    const data = store[uid];
    return { exists: () => data !== undefined, data: () => data };
  };
  return {
    doc: (_db: unknown, _col: string, uid: string, ..._rest: unknown[]) => ({ __uid: uid }),
    getDoc: async (ref: { __uid: string }) => snapOf(ref.__uid),
    runTransaction: async (_db: unknown, cb: (tx: any) => Promise<void>) => {
      const tx = {
        get: async (ref: { __uid: string }) => snapOf(ref.__uid),
        set: (ref: { __uid: string }, payload: any, opts?: { merge?: boolean }) => {
          const prev = store[ref.__uid] ?? {};
          store[ref.__uid] = opts?.merge ? { ...prev, ...payload } : { ...payload };
        },
      };
      await cb(tx);
    },
    setDoc: async () => {},
    getDocs: async () => ({ forEach: () => {} }),
    collection: () => ({}),
    deleteDoc: async () => {},
    writeBatch: () => ({ set: () => {}, delete: () => {}, commit: async () => {} }),
  };
});

import {
  addCard,
  updateCard,
  deleteCard,
  addCardPurchase,
  deleteCardPurchase,
  addEntry,
  addTransfer,
  updateEntry,
  deleteEntry,
  ValidationError,
} from './persistUserData';
import type { Entry } from '../types/userData';

const VALID_CARD = { name: 'Nubank', limit: 1000, closeDay: 10, dueDay: 17 };

function seed(uid: string, doc: any) { store[uid] = doc; }
function cardsOf(uid: string) { return (store[uid].cards as any[]) ?? []; }
function entriesOf(uid: string) { return (store[uid].entries as Entry[]) ?? []; }

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

// ─── addCard / updateCard / deleteCard ───────────────────────────────────────
describe('CRUD de cartões', () => {
  it('addCard anexa cartão com id e purchases vazio', async () => {
    const uid = 'm-card-1';
    seed(uid, { cards: [] });
    await addCard(uid, [], { ...VALID_CARD } as any);
    const cards = cardsOf(uid);
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('Nubank');
    expect(cards[0].purchases).toEqual([]);
    expect(typeof cards[0].id).toBe('number');
  });

  it('addCard rejeita cartão inválido (nome vazio) com ValidationError', async () => {
    const uid = 'm-card-2';
    seed(uid, { cards: [] });
    await expect(addCard(uid, [], { name: '', limit: 100 } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it('updateCard altera só o cartão alvo e preserva os demais', async () => {
    const uid = 'm-card-3';
    const current = [
      { id: 1, name: 'Nubank', limit: 1000, purchases: [] },
      { id: 2, name: 'Inter', limit: 2000, purchases: [] },
    ];
    seed(uid, { cards: current });
    await updateCard(uid, current as any, 1, { limit: 5000 });
    const cards = cardsOf(uid);
    expect(cards.find((c) => c.id === 1).limit).toBe(5000);
    expect(cards.find((c) => c.id === 2).limit).toBe(2000); // intacto
  });

  it('deleteCard remove o cartão pelo id', async () => {
    const uid = 'm-card-4';
    const current = [{ id: 1, name: 'Nubank', purchases: [] }, { id: 2, name: 'Inter', purchases: [] }];
    seed(uid, { cards: current });
    await deleteCard(uid, current as any, 1);
    expect(cardsOf(uid).map((c) => c.id)).toEqual([2]);
  });
});

// ─── addCardPurchase (compra parcelada) ──────────────────────────────────────
describe('addCardPurchase', () => {
  it('parcela compra em N e divide o valor, gerando purchases + entries', async () => {
    const uid = 'm-buy-1';
    const current = [{ id: 1, name: 'Nubank', closeDay: 10, dueDay: 17, purchases: [] }];
    seed(uid, { cards: current, entries: [] });

    await addCardPurchase(uid, current as any, [], 1, {
      desc: 'Geladeira', category: 'Casa', value: 300, date: '2026-06-05', parcelas: 3,
    });

    const purchases = cardsOf(uid)[0].purchases;
    expect(purchases).toHaveLength(3);
    expect(purchases.every((p: any) => p.value === 100)).toBe(true);
    expect(purchases.every((p: any) => p.totalValue === 300)).toBe(true);
    expect(purchases.map((p: any) => p.parcela)).toEqual([1, 2, 3]);
    expect(purchases[0].desc).toBe('Geladeira (1/3)');

    const entries = entriesOf(uid);
    expect(entries).toHaveLength(3);
    expect(entries.every((e: any) => e.account === 'Nubank')).toBe(true);
    expect(entries.every((e: any) => e.type === 'despesa' && e.status === 'pendente')).toBe(true);
    expect(entries[0].desc).toBe('[Nubank] Geladeira (1/3)');
  });

  it('compra à vista (1 parcela) não adiciona sufixo de parcela', async () => {
    const uid = 'm-buy-2';
    const current = [{ id: 1, name: 'Nubank', closeDay: 10, dueDay: 17, purchases: [] }];
    seed(uid, { cards: current, entries: [] });

    await addCardPurchase(uid, current as any, [], 1, {
      desc: 'Livro', category: 'Educação', value: 80, date: '2026-06-05',
    });

    const purchases = cardsOf(uid)[0].purchases;
    expect(purchases).toHaveLength(1);
    expect(purchases[0].value).toBe(80);
    expect(purchases[0].desc).toBe('Livro');
    expect(entriesOf(uid)).toHaveLength(1);
  });

  it('lança erro quando o cartão não existe', async () => {
    const uid = 'm-buy-3';
    seed(uid, { cards: [], entries: [] });
    await expect(
      addCardPurchase(uid, [], [], 999, { desc: 'X', category: 'Y', value: 10, date: '2026-06-05' }),
    ).rejects.toThrow('Cartão não encontrado');
  });
});

// ─── deleteCardPurchase (remove compra + lançamentos vinculados) ─────────────
describe('deleteCardPurchase', () => {
  it('remove as parcelas da compra e os entries com mesmo cardPurchaseId', async () => {
    const uid = 'm-del-1';
    const current = [{
      id: 1, name: 'Nubank', purchases: [
        { id: 11, purchaseId: 100, value: 50 },
        { id: 12, purchaseId: 100, value: 50 },
        { id: 21, purchaseId: 200, value: 30 },
      ],
    }];
    seed(uid, {
      cards: current,
      entries: [
        { id: 11, cardPurchaseId: 100, value: 50, desc: 'a', date: '2026-06-01', type: 'despesa' },
        { id: 12, cardPurchaseId: 100, value: 50, desc: 'b', date: '2026-06-01', type: 'despesa' },
        { id: 21, cardPurchaseId: 200, value: 30, desc: 'c', date: '2026-06-01', type: 'despesa' },
      ],
    });

    await deleteCardPurchase(uid, current as any, [], 1, 100);

    const purchases = cardsOf(uid)[0].purchases;
    expect(purchases.map((p: any) => p.purchaseId)).toEqual([200]); // só a compra 200 sobra
    expect(entriesOf(uid).map((e) => e.id)).toEqual([21]);          // entries 11/12 removidos
  });
});

// ─── addEntry / addTransfer / updateEntry / deleteEntry ──────────────────────
describe('lançamentos', () => {
  it('addEntry anexa lançamento válido com id', async () => {
    const uid = 'm-ent-1';
    seed(uid, { entries: [] });
    await addEntry(uid, [], { desc: 'Mercado', value: 120, date: '2026-06-10', type: 'despesa' } as any);
    const entries = entriesOf(uid);
    expect(entries).toHaveLength(1);
    expect(entries[0].desc).toBe('Mercado');
    expect(entries[0].value).toBe(120);
    expect(typeof entries[0].id).toBe('number');
  });

  it('addEntry rejeita lançamento inválido (valor zero) com ValidationError', async () => {
    const uid = 'm-ent-2';
    seed(uid, { entries: [] });
    await expect(
      addEntry(uid, [], { desc: 'X', value: 0, date: '2026-06-10', type: 'despesa' } as any),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('addTransfer cria 2 lançamentos (despesa + receita) marcados como transferência', async () => {
    const uid = 'm-ent-3';
    seed(uid, { entries: [] });
    await addTransfer(uid, [], { from: 'Conta A', to: 'Conta B', date: '2026-06-10', value: 200 });
    const entries = entriesOf(uid);
    expect(entries).toHaveLength(2);
    expect(entries.every((e: any) => e.isTransfer === true)).toBe(true);
    expect(entries.find((e: any) => e.type === 'despesa')!.account).toBe('Conta A');
    expect(entries.find((e: any) => e.type === 'receita')!.account).toBe('Conta B');
  });

  it('addTransfer é no-op quando origem == destino', async () => {
    const uid = 'm-ent-4';
    seed(uid, { entries: [] });
    await addTransfer(uid, [], { from: 'Conta A', to: 'Conta A', date: '2026-06-10', value: 200 });
    expect(entriesOf(uid)).toHaveLength(0);
  });

  it('addTransfer é no-op quando valor <= 0', async () => {
    const uid = 'm-ent-5';
    seed(uid, { entries: [] });
    await addTransfer(uid, [], { from: 'A', to: 'B', date: '2026-06-10', value: 0 });
    expect(entriesOf(uid)).toHaveLength(0);
  });

  it('updateEntry atualiza campos do lançamento inline por id', async () => {
    const uid = 'm-ent-6';
    const merged: Entry[] = [{ id: 1, desc: 'Mercado', value: 120, date: '2026-06-10', type: 'despesa' } as Entry];
    seed(uid, { entries: [...merged] });
    await updateEntry(uid, merged, 1, { value: 150 });
    expect(entriesOf(uid)[0].value).toBe(150);
  });

  it('deleteEntry remove o lançamento inline por id', async () => {
    const uid = 'm-ent-7';
    const merged: Entry[] = [
      { id: 1, desc: 'A', value: 10, date: '2026-06-10', type: 'despesa' } as Entry,
      { id: 2, desc: 'B', value: 20, date: '2026-06-10', type: 'despesa' } as Entry,
    ];
    seed(uid, { entries: [...merged] });
    await deleteEntry(uid, merged, 1);
    expect(entriesOf(uid).map((e) => e.id)).toEqual([2]);
  });
});
