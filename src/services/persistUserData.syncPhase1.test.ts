/**
 * persistUserData.syncPhase1.test.ts
 *
 * Trava o comportamento da Fase 1 da correcao de sync (PUD-5): para usuarios
 * MIGRADOS, os lancamentos manuais viram fonte unica na subcolecao
 * `users/{uid}/entries` — sem reescrever o array inline (que estourava o limite
 * de 1MB do doc e causava divergencia permanente entre mobile e web).
 *
 * Invariantes cobertas:
 *  1. addEntry (migrado): grava na subcolecao, NAO toca o array inline.
 *  2. addEntry (nao-migrado): mantem o caminho legado inline.
 *  3. updateEntry (migrado): atualiza a subcolecao, NAO reescreve o inline.
 *  4. deleteEntry (migrado): remove da subcolecao E limpa a copia inline legada
 *     (mata o "lancamento fantasma" que ressurgia do inline).
 *
 * Mock path-aware do firebase/firestore: doc de usuario por uid + Map da
 * subcolecao por uid. uid distinto por teste evita supressao por debounce/
 * _writeId do updateUserDoc.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const users: Record<string, any> = {};
const subs: Record<string, Map<string, any>> = {};

function getSub(uid: string): Map<string, any> {
  if (!subs[uid]) subs[uid] = new Map();
  return subs[uid];
}

vi.mock('../firebase', () => ({ db: { __fake: true } }));

vi.mock('firebase/firestore', () => {
  const snapUser = (uid: string) => ({
    exists: () => users[uid] !== undefined,
    data: () => users[uid],
  });
  return {
    // doc(db, 'users', uid)                      -> ref do doc do usuario
    // doc(db, 'users', uid, 'entries', docId)     -> ref de doc da subcolecao
    doc: (_db: unknown, _col: string, uid: string, ...rest: unknown[]) => {
      if (rest.length === 0) return { __k: 'user', uid };
      return { __k: String(rest[0]), uid, docId: String(rest[1]) };
    },
    getDoc: async (ref: { uid: string }) => snapUser(ref.uid),
    setDoc: async (ref: any, payload: any, opts?: { merge?: boolean }) => {
      if (ref.__k === 'entries') { getSub(ref.uid).set(ref.docId, payload); return; }
      const prev = users[ref.uid] ?? {};
      users[ref.uid] = opts?.merge ? { ...prev, ...payload } : { ...payload };
    },
    deleteDoc: async (ref: any) => {
      if (ref.__k === 'entries') { getSub(ref.uid).delete(ref.docId); return; }
    },
    runTransaction: async (_db: unknown, cb: (tx: any) => Promise<void>) => {
      const tx = {
        get: async (ref: { uid: string }) => snapUser(ref.uid),
        set: (ref: { uid: string }, payload: any, opts?: { merge?: boolean }) => {
          const prev = users[ref.uid] ?? {};
          users[ref.uid] = opts?.merge ? { ...prev, ...payload } : { ...payload };
        },
      };
      await cb(tx);
    },
    collection: (_db: unknown, _colName: string, uid: string, subName?: string) => {
      return { __k: subName || 'user', uid };
    },
    getDocs: async (colRef: { __k: string; uid: string }) => {
      const list: any[] = [];
      if (colRef.__k === 'entries') {
        const subMap = getSub(colRef.uid);
        subMap.forEach((val, key) => {
          list.push({
            id: key,
            data: () => val,
          });
        });
      }
      return {
        forEach: (cb: (d: any) => void) => {
          list.forEach(cb);
        },
        docs: list,
      };
    },
    writeBatch: () => ({ set: () => {}, delete: () => {}, commit: async () => {} }),
  };
});

import {
  addEntry, updateEntry, deleteEntry,
  addTransfer, addCardPurchase, importCardPurchases, generateEntriesFromRecurrents
} from './persistUserData';
import type { Entry } from '../types/userData';

const MIGRATED_AT = '2026-06-01T00:00:00.000Z';

beforeEach(() => {
  for (const k of Object.keys(users)) delete users[k];
  for (const k of Object.keys(subs)) delete subs[k];
});

describe('Fase 1 sync — usuario MIGRADO usa a subcolecao como fonte unica', () => {
  it('addEntry grava na subcolecao e NAO toca o array inline', async () => {
    const uid = 's1-add-migrado';
    users[uid] = { entries: [], entriesMigratedAt: MIGRATED_AT };

    await addEntry(uid, [], { desc: 'Mercado', value: 120, date: '2026-06-10', type: 'despesa' } as any);

    const sub = getSub(uid);
    expect(sub.size).toBe(1);
    expect([...sub.values()][0].desc).toBe('Mercado');
    // Inline permanece intocado (nao reescreve o array => nao estoura 1MB).
    expect(users[uid].entries).toEqual([]);
    // finScore foi persistido via write enxuto.
    expect(typeof users[uid].finScore).toBe('number');
  });

  it('updateEntry atualiza a subcolecao e NAO reescreve o inline', async () => {
    const uid = 's1-update-migrado';
    users[uid] = { entries: [], entriesMigratedAt: MIGRATED_AT };
    getSub(uid).set('1', { id: 1, desc: 'Mercado', value: 120, date: '2026-06-10', type: 'despesa' });

    const merged: Entry[] = [
      { id: 1, desc: 'Mercado', value: 120, date: '2026-06-10', type: 'despesa', entryLocation: 'subcollection' } as Entry,
    ];
    await updateEntry(uid, merged, 1, { value: 150 });

    expect(getSub(uid).get('1').value).toBe(150);
    expect(users[uid].entries).toEqual([]); // inline nao reescrito
  });

  it('deleteEntry remove da subcolecao E limpa a copia inline legada (sem fantasma)', async () => {
    const uid = 's1-delete-migrado';
    // Cenario realista pos dual-write antigo: o lancamento existe nos DOIS stores.
    users[uid] = {
      entries: [
        { id: 1, desc: 'A', value: 10, date: '2026-06-10', type: 'despesa' },
        { id: 2, desc: 'B', value: 20, date: '2026-06-10', type: 'despesa' },
      ],
      entriesMigratedAt: MIGRATED_AT,
    };
    getSub(uid).set('1', { id: 1, desc: 'A', value: 10, date: '2026-06-10', type: 'despesa' });
    getSub(uid).set('2', { id: 2, desc: 'B', value: 20, date: '2026-06-10', type: 'despesa' });

    const merged: Entry[] = [
      { id: 1, desc: 'A', value: 10, date: '2026-06-10', type: 'despesa', entryLocation: 'subcollection' } as Entry,
      { id: 2, desc: 'B', value: 20, date: '2026-06-10', type: 'despesa', entryLocation: 'subcollection' } as Entry,
    ];
    await deleteEntry(uid, merged, 1);

    // Removido da subcolecao...
    expect(getSub(uid).has('1')).toBe(false);
    expect(getSub(uid).has('2')).toBe(true);
    // ...e a copia inline zumbi foi eliminada (nao ressurge no merge).
    expect((users[uid].entries as Entry[]).map((e) => e.id)).toEqual([2]);
    expect(typeof users[uid].finScore).toBe('number');
  });
});

describe('Fase 1 sync — usuario NAO migrado mantem o caminho legado inline', () => {
  it('addEntry anexa no array inline e nao usa a subcolecao', async () => {
    const uid = 's1-add-legado';
    users[uid] = { entries: [] }; // sem entriesMigratedAt

    await addEntry(uid, [], { desc: 'Padaria', value: 30, date: '2026-06-10', type: 'despesa' } as any);

    expect((users[uid].entries as Entry[]).map((e) => e.desc)).toEqual(['Padaria']);
    expect(getSub(uid).size).toBe(0);
  });
});

describe('Fase 1.5 sync — subcolecao em transfers, card purchases, import e recurrents', () => {
  it('addTransfer (migrado) grava os dois na subcolecao e nao toca o array inline', async () => {
    const uid = 's1.5-transfer-migrado';
    users[uid] = { entries: [], entriesMigratedAt: MIGRATED_AT };

    await addTransfer(uid, [], { from: 'Conta A', to: 'Conta B', date: '2026-06-10', value: 250 });

    const sub = getSub(uid);
    expect(sub.size).toBe(2);
    const entries = [...sub.values()];
    expect(entries.some(e => e.type === 'despesa' && e.account === 'Conta A')).toBe(true);
    expect(entries.some(e => e.type === 'receita' && e.account === 'Conta B')).toBe(true);
    expect(users[uid].entries).toEqual([]);
    expect(typeof users[uid].finScore).toBe('number');
  });

  it('addTransfer (nao-migrado) grava os dois no array inline e nao usa a subcolecao', async () => {
    const uid = 's1.5-transfer-legado';
    users[uid] = { entries: [] };

    await addTransfer(uid, [], { from: 'Conta A', to: 'Conta B', date: '2026-06-10', value: 250 });

    expect(getSub(uid).size).toBe(0);
    expect(users[uid].entries.length).toBe(2);
    expect(users[uid].entries[0].type).toBe('despesa');
    expect(users[uid].entries[1].type).toBe('receita');
  });

  it('addCardPurchase (migrado) com 2 parcelas grava na subcolecao e atualiza o cards sem tocar inline', async () => {
    const uid = 's1.5-card-migrado';
    const cardId = 123;
    users[uid] = {
      entries: [],
      entriesMigratedAt: MIGRATED_AT,
      cards: [{ id: cardId, name: 'Nubank', limit: 1000, purchases: [] }]
    };

    await addCardPurchase(uid, users[uid].cards, [], cardId, {
      desc: 'Smart TV',
      category: 'Eletronicos',
      value: 1200,
      date: '2026-06-10',
      parcelas: 2
    });

    const sub = getSub(uid);
    expect(sub.size).toBe(2);
    const subEntries = [...sub.values()];
    expect(subEntries[0].desc).toContain('Smart TV (1/2)');
    expect(subEntries[1].desc).toContain('Smart TV (2/2)');
    expect(users[uid].entries).toEqual([]);
    expect(users[uid].cards[0].purchases.length).toBe(2);
    expect(typeof users[uid].finScore).toBe('number');
  });

  it('importCardPurchases (migrado) grava na subcolecao e atualiza o cards sem tocar inline', async () => {
    const uid = 's1.5-import-card-migrado';
    const cardId = 123;
    users[uid] = {
      entries: [],
      entriesMigratedAt: MIGRATED_AT,
      cards: [{ id: cardId, name: 'Nubank', limit: 1000, purchases: [] }]
    };

    await importCardPurchases(uid, users[uid].cards, [], cardId, [
      { desc: 'Uber', category: 'Transporte', value: 30, date: '2026-06-10' },
      { desc: 'Ifood', category: 'Alimentacao', value: 80, date: '2026-06-11' }
    ]);

    const sub = getSub(uid);
    expect(sub.size).toBe(2);
    expect(users[uid].entries).toEqual([]);
    expect(users[uid].cards[0].purchases.length).toBe(2);
    expect(typeof users[uid].finScore).toBe('number');
  });

  it('generateEntriesFromRecurrents (migrado) grava recorrentes na subcolecao, faz dedup lendo-a e atualiza finScore', async () => {
    const uid = 's1.5-recurrent-migrado';
    users[uid] = {
      entries: [],
      entriesMigratedAt: MIGRATED_AT
    };
    const recurrents = [
      { id: 1, active: true, freq: 'mensal', type: 'despesa', desc: 'Internet', category: 'Utilidades', value: 100, day: 5 }
    ];

    // 1º Run: deve gerar 1 doc na subcoleção e retornar 1
    const count1 = await generateEntriesFromRecurrents(uid, [], recurrents as any);
    expect(count1).toBe(1);
    expect(getSub(uid).size).toBe(1);

    const firstEntry = [...getSub(uid).values()][0];
    expect(firstEntry.desc).toContain('Internet');

    // 2º Run: deve retornar 0 (já gerado, dedup via subcoleção)
    const count2 = await generateEntriesFromRecurrents(uid, [firstEntry], recurrents as any);
    expect(count2).toBe(0);
    expect(getSub(uid).size).toBe(1);
    expect(typeof users[uid].finScore).toBe('number');
  });

  it('generateEntriesFromRecurrents (nao-migrado) grava no inline por append sem reescrever tudo', async () => {
    const uid = 's1.5-recurrent-legado';
    const preExisting = { id: 999, type: 'receita', date: '2026-06-01', desc: 'Salario', value: 5000, category: 'Salario' };
    users[uid] = {
      entries: [preExisting]
    };
    const recurrents = [
      { id: 1, active: true, freq: 'mensal', type: 'despesa', desc: 'Internet', category: 'Utilidades', value: 100, day: 5 }
    ];

    const count = await generateEntriesFromRecurrents(uid, [preExisting] as any, recurrents as any);
    expect(count).toBe(1);
    expect(getSub(uid).size).toBe(0);
    expect(users[uid].entries.length).toBe(2);
    expect(users[uid].entries[0]).toEqual(preExisting);
    expect(users[uid].entries[1].desc).toContain('Internet');
  });
});
