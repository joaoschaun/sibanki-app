import { describe, it, expect } from 'vitest';
import { deriveCreditAccountsFromCards, deriveSnapshotFromAccounts } from './deriveCreditData';
import { getBillingMonth } from '../services/persistUserData';
import type { Card } from '../types/userData';

const makeCard = (overrides: Partial<Card> = {}): Card => ({
  id: 1,
  name: 'Nubank',
  limit: 10_000,
  closeDay: 3,
  dueDay: 10,
  purchases: [],
  ...overrides,
});

describe('deriveCreditAccountsFromCards', () => {
  it('mapeia card para CreditAccount com kind=cartao', () => {
    const [acc] = deriveCreditAccountsFromCards([makeCard()]);
    expect(acc.kind).toBe('cartao');
    expect(acc.label).toBe('Nubank');
    expect(acc.limitTotal).toBe(10_000);
    expect(acc.source).toBe('legacy-derived');
  });

  it('balanceUsed = soma das compras do mês atual', () => {
    const today = new Date().toISOString().split('T')[0];
    const bm = getBillingMonth(makeCard({ purchases: [] }), today);
    const card = makeCard({
      purchases: [
        { id: 1, desc: 'a', value: 300, date: `${bm}-05`, billingMonth: bm },
        { id: 2, desc: 'b', value: 200, date: `${bm}-06`, billingMonth: bm },
        { id: 3, desc: 'c', value: 100, date: `${bm}-15`, billingMonth: '2020-01' },
      ],
    });
    const [acc] = deriveCreditAccountsFromCards([card]);
    expect(acc.balanceUsed).toBe(500);
  });

  it('filtra cartões com active=false', () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2, active: false })];
    expect(deriveCreditAccountsFromCards(cards)).toHaveLength(1);
  });

  it('retorna [] para array vazio', () => {
    expect(deriveCreditAccountsFromCards([])).toHaveLength(0);
  });
});

describe('deriveSnapshotFromAccounts', () => {
  it('calcula pressureLevel controlado com utilização < 30%', () => {
    const accts = deriveCreditAccountsFromCards([
      makeCard({ limit: 10_000, purchases: [] }),
    ]);
    const snap = deriveSnapshotFromAccounts(accts);
    expect(snap.pressureLevel).toBe('controlado');
    expect(snap.cardUtilizationPct).toBe(0);
  });

  it('calcula pressureLevel critico com utilização > 80%', () => {
    const today = new Date().toISOString().split('T')[0];
    const bm = getBillingMonth(makeCard({ limit: 1_000, purchases: [] }), today);
    const card = makeCard({
      limit: 1_000,
      purchases: [{ id: 1, desc: 'x', value: 900, date: `${bm}-01`, billingMonth: bm }],
    });
    const accts = deriveCreditAccountsFromCards([card]);
    const snap = deriveSnapshotFromAccounts(accts);
    expect(snap.pressureLevel).toBe('critico');
    expect(snap.cardUtilizationPct).toBeGreaterThan(80);
  });

  it('totalLimit = soma dos limites', () => {
    const cards = [makeCard({ id: 1, limit: 5_000 }), makeCard({ id: 2, limit: 3_000 })];
    const accts = deriveCreditAccountsFromCards(cards);
    expect(deriveSnapshotFromAccounts(accts).totalLimit).toBe(8_000);
  });

  it('version=0 indica dado derivado localmente', () => {
    const snap = deriveSnapshotFromAccounts(deriveCreditAccountsFromCards([makeCard()]));
    expect(snap.version).toBe(0);
  });
});
