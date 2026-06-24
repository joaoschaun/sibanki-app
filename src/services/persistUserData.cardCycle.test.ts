/**
 * persistUserData.cardCycle.test.ts
 *
 * Testes de CARACTERIZAÇÃO do núcleo de mutação de cartões em persistUserData.ts.
 *
 * Contexto (health-check de engenharia, 23/06/2026): persistUserData.ts (1.573
 * linhas) concentra TODA a mutação financeira de cartões/lançamentos/saldos e
 * estava 100% sem testes — o maior ponto cego de corretude do app. Estes testes
 * TRAVAM o comportamento atual das funções de ciclo de fatura para que qualquer
 * refactor futuro (ex.: remoção dos casts `as Card[]`) grite se quebrar um saldo.
 *
 * Estratégia: mock no limite do `firebase/firestore`. Um store em memória por uid
 * simula o documento `users/{uid}`. `runTransaction` é executado de forma síncrona
 * com um objeto de transação fake (get → snapshot, set → merge no store). Cada
 * teste usa um uid distinto, então nem o debounce in-memory nem a dedup por
 * `_writeId` do updateUserDoc suprimem a escrita.
 *
 * Cobertura:
 *  - addCardPurchasesV2: append + dedup por id e por pluggyTransactionId
 *  - removeCardPurchaseV2: remoção por id
 *  - removeCardInstallmentGroup: remoção por installment.groupId
 *  - payCardCycle: idempotência, soma do ciclo e entry de pagamento de fatura
 *  - unpayCardCycle: estorno do ciclo + remoção do entry de pagamento
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Store em memória + mock do firebase/firestore ───────────────────────────
// O store é por uid: { [uid]: documentData }. Os refs carregam o uid para que
// get/set saibam qual doc tocar.
const store: Record<string, any> = {};

vi.mock('../firebase', () => ({ db: { __fake: true } }));

vi.mock('firebase/firestore', () => {
  return {
    doc: (_db: unknown, _col: string, uid: string) => ({ __uid: uid }),
    getDoc: async (ref: { __uid: string }) => {
      const data = store[ref.__uid];
      return {
        exists: () => data !== undefined,
        data: () => data,
      };
    },
    runTransaction: async (_db: unknown, cb: (tx: any) => Promise<void>) => {
      const tx = {
        get: async (ref: { __uid: string }) => {
          const data = store[ref.__uid];
          return { exists: () => data !== undefined, data: () => data };
        },
        set: (ref: { __uid: string }, payload: any, opts?: { merge?: boolean }) => {
          const prev = store[ref.__uid] ?? {};
          store[ref.__uid] = opts?.merge ? { ...prev, ...payload } : { ...payload };
        },
      };
      await cb(tx);
    },
    // Superfície não exercida por estas funções — stubs para o import não quebrar.
    setDoc: async () => {},
    getDocs: async () => ({ forEach: () => {} }),
    collection: () => ({}),
    deleteDoc: async () => {},
    writeBatch: () => ({ set: () => {}, delete: () => {}, commit: async () => {} }),
  };
});

// Import APÓS os mocks (vi.mock é hoisted, mas mantemos a ordem explícita).
import {
  addCardPurchasesV2,
  removeCardPurchaseV2,
  removeCardInstallmentGroup,
  payCardCycle,
  unpayCardCycle,
} from './persistUserData';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function seedUser(uid: string, doc: any) {
  store[uid] = doc;
}
function getCard(uid: string, cardId: number) {
  return (store[uid].cards as any[]).find((c) => c.id === cardId);
}
function purchase(id: string, cycleKey: string, value: number, extra: Record<string, unknown> = {}) {
  return { id, cycleKey, value, ...extra };
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

// ─── addCardPurchasesV2 ──────────────────────────────────────────────────────
describe('addCardPurchasesV2', () => {
  it('anexa novas compras ao purchasesV2 do cartão', async () => {
    const uid = 'u-add-1';
    seedUser(uid, { cards: [{ id: 1, name: 'Nubank', purchasesV2: [] }] });

    await addCardPurchasesV2(uid, 1, [purchase('p1', '2026-06', 100), purchase('p2', '2026-06', 50)]);

    const card = getCard(uid, 1);
    expect(card.purchasesV2.map((p: any) => p.id)).toEqual(['p1', 'p2']);
  });

  it('deduplica por id (não duplica compra já existente)', async () => {
    const uid = 'u-add-2';
    seedUser(uid, { cards: [{ id: 1, name: 'Nubank', purchasesV2: [purchase('p1', '2026-06', 100)] }] });

    await addCardPurchasesV2(uid, 1, [purchase('p1', '2026-06', 999), purchase('p2', '2026-06', 50)]);

    const card = getCard(uid, 1);
    // p1 não é re-adicionada (mantém valor original 100); só p2 entra.
    expect(card.purchasesV2.map((p: any) => p.id)).toEqual(['p1', 'p2']);
    expect(card.purchasesV2.find((p: any) => p.id === 'p1').value).toBe(100);
  });

  it('deduplica por pluggyTransactionId', async () => {
    const uid = 'u-add-3';
    seedUser(uid, {
      cards: [{ id: 1, name: 'Nubank', purchasesV2: [purchase('p1', '2026-06', 100, { pluggyTransactionId: 'tx-abc' })] }],
    });

    await addCardPurchasesV2(uid, 1, [purchase('p2', '2026-06', 50, { pluggyTransactionId: 'tx-abc' })]);

    const card = getCard(uid, 1);
    // p2 tem id novo mas mesmo pluggyTransactionId → não entra.
    expect(card.purchasesV2.map((p: any) => p.id)).toEqual(['p1']);
  });

  it('no-op quando lista de novas compras é vazia', async () => {
    const uid = 'u-add-4';
    seedUser(uid, { cards: [{ id: 1, name: 'Nubank', purchasesV2: [purchase('p1', '2026-06', 100)] }] });
    await addCardPurchasesV2(uid, 1, []);
    expect(getCard(uid, 1).purchasesV2).toHaveLength(1);
  });
});

// ─── removeCardPurchaseV2 / removeCardInstallmentGroup ───────────────────────
describe('remoção de compras', () => {
  it('removeCardPurchaseV2 remove a compra pelo id', async () => {
    const uid = 'u-rm-1';
    seedUser(uid, {
      cards: [{ id: 1, name: 'Nubank', purchasesV2: [purchase('p1', '2026-06', 100), purchase('p2', '2026-06', 50)] }],
    });

    await removeCardPurchaseV2(uid, 1, 'p1');

    expect(getCard(uid, 1).purchasesV2.map((p: any) => p.id)).toEqual(['p2']);
  });

  it('removeCardInstallmentGroup remove todas as parcelas do grupo', async () => {
    const uid = 'u-rm-2';
    seedUser(uid, {
      cards: [{
        id: 1, name: 'Nubank', purchasesV2: [
          purchase('p1', '2026-06', 100, { installment: { groupId: 'g1', n: 1, total: 3 } }),
          purchase('p2', '2026-07', 100, { installment: { groupId: 'g1', n: 2, total: 3 } }),
          purchase('p3', '2026-06', 50),
        ],
      }],
    });

    await removeCardInstallmentGroup(uid, 1, 'g1');

    expect(getCard(uid, 1).purchasesV2.map((p: any) => p.id)).toEqual(['p3']);
  });
});

// ─── payCardCycle / unpayCardCycle ───────────────────────────────────────────
describe('payCardCycle', () => {
  it('soma o ciclo, marca paidCycles e cria entry de pagamento de fatura', async () => {
    const uid = 'u-pay-1';
    seedUser(uid, {
      entries: [],
      cards: [{
        id: 1, name: 'Nubank', paidCycles: [], purchasesV2: [
          purchase('p1', '2026-06', 100),
          purchase('p2', '2026-06', 50),
          purchase('p3', '2026-07', 999), // outro ciclo — não deve somar
        ],
      }],
    });

    await payCardCycle(uid, 1, '2026-06', '2026-06-25');

    const card = getCard(uid, 1);
    expect(card.paidCycles).toContain('2026-06');

    const payments = (store[uid].entries as any[]).filter((e) => e.isCardPayment);
    expect(payments).toHaveLength(1);
    const pay = payments[0];
    expect(pay.value).toBe(150);          // soma só do ciclo 2026-06
    expect(pay.type).toBe('despesa');
    expect(pay.category).toBe('Cartões');
    expect(pay.cardId).toBe(1);
    expect(pay.cycleKey).toBe('2026-06');
    expect(pay.date).toBe('2026-06-25');
  });

  it('é idempotente: ciclo já pago não cria segundo pagamento', async () => {
    const uid = 'u-pay-2';
    seedUser(uid, {
      entries: [],
      cards: [{ id: 1, name: 'Nubank', paidCycles: ['2026-06'], purchasesV2: [purchase('p1', '2026-06', 100)] }],
    });

    await payCardCycle(uid, 1, '2026-06', '2026-06-25');

    // Nada gravado (early return) — entries continua vazio.
    expect((store[uid].entries as any[]).filter((e) => e.isCardPayment)).toHaveLength(0);
  });

  it('unpayCardCycle desfaz: remove o ciclo de paidCycles e o entry de pagamento', async () => {
    const uid = 'u-unpay-1';
    seedUser(uid, { entries: [], cards: [{ id: 1, name: 'Nubank', paidCycles: [], purchasesV2: [purchase('p1', '2026-06', 100)] }] });

    await payCardCycle(uid, 1, '2026-06', '2026-06-25');
    expect(getCard(uid, 1).paidCycles).toContain('2026-06');
    expect((store[uid].entries as any[]).filter((e) => e.isCardPayment)).toHaveLength(1);

    await unpayCardCycle(uid, 1, '2026-06');

    expect(getCard(uid, 1).paidCycles).not.toContain('2026-06');
    expect((store[uid].entries as any[]).filter((e) => e.isCardPayment)).toHaveLength(0);
  });
});
