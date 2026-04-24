import { describe, it, expect } from 'vitest';
import { mergeInlineAndOverflowEntries, mergeAllEntries, isTransferEntry, nonTransferEntries } from './entryUtils';
import type { Entry } from '../types/userData';

const e = (id: number, overrides: Partial<Entry> = {}): Entry => ({
  id, type: 'despesa', value: 100, date: '2024-01-15', ...overrides,
});

// ── isTransferEntry ───────────────────────────────────────────────────────────
describe('isTransferEntry', () => {
  it('retorna true quando isTransfer=true', () => {
    expect(isTransferEntry(e(1, { isTransfer: true }))).toBe(true);
  });
  it('retorna true quando category=Transferencia', () => {
    expect(isTransferEntry(e(1, { category: 'Transferencia' }))).toBe(true);
  });
  it('retorna false para entry normal', () => {
    expect(isTransferEntry(e(1, { category: 'Alimentação' }))).toBe(false);
  });
  it('retorna false para null/undefined', () => {
    expect(isTransferEntry(null)).toBe(false);
    expect(isTransferEntry(undefined)).toBe(false);
  });
});

// ── nonTransferEntries ────────────────────────────────────────────────────────
describe('nonTransferEntries', () => {
  it('filtra transferências', () => {
    const entries = [e(1), e(2, { isTransfer: true }), e(3, { category: 'Transferencia' })];
    expect(nonTransferEntries(entries)).toHaveLength(1);
    expect(nonTransferEntries(entries)[0].id).toBe(1);
  });
});

// ── mergeInlineAndOverflowEntries ─────────────────────────────────────────────
describe('mergeInlineAndOverflowEntries', () => {
  it('retorna entries inline quando overflow vazio', () => {
    const result = mergeInlineAndOverflowEntries([e(1), e(2)], []);
    expect(result).toHaveLength(2);
  });

  it('dedup por pluggyTransactionId — inline tem prioridade', () => {
    const inlineEntry = e(1, { pluggyTransactionId: 'pg1', desc: 'inline' });
    const overflowEntry = e(2, { pluggyTransactionId: 'pg1', desc: 'overflow' });
    const result = mergeInlineAndOverflowEntries([inlineEntry], [overflowEntry]);
    expect(result).toHaveLength(1);
    expect(result[0].desc).toBe('inline');
  });

  it('mantém entries manuais sem pluggyTransactionId', () => {
    const manual = e(1, { desc: 'manual' });
    const pluggy = e(2, { pluggyTransactionId: 'pg1' });
    const result = mergeInlineAndOverflowEntries([manual, pluggy], []);
    expect(result).toHaveLength(2);
  });

  it('ordena por data decrescente', () => {
    const entries = [
      e(1, { date: '2024-01-10' }),
      e(2, { date: '2024-01-20' }),
      e(3, { date: '2024-01-15' }),
    ];
    const result = mergeInlineAndOverflowEntries(entries, []);
    expect(result[0].date).toBe('2024-01-20');
    expect(result[2].date).toBe('2024-01-10');
  });
});

// ── mergeAllEntries ───────────────────────────────────────────────────────────
describe('mergeAllEntries', () => {
  it('delega para mergeInlineAndOverflowEntries quando subcollection vazio', () => {
    const result = mergeAllEntries([e(1), e(2)], [], []);
    expect(result).toHaveLength(2);
  });

  it('subcoleção tem prioridade sobre inline para mesmo id', () => {
    const inlineEntry = e(1, { desc: 'inline' });
    const subEntry    = { ...e(1, { desc: 'subcollection' }), entryLocation: 'subcollection' as any };
    const result = mergeAllEntries([inlineEntry], [], [subEntry]);
    expect(result).toHaveLength(1);
    expect(result[0].desc).toBe('subcollection');
  });

  it('subcoleção tem prioridade sobre overflow para mesmo pluggyTransactionId', () => {
    const overflow = e(1, { pluggyTransactionId: 'pg1', desc: 'overflow' });
    const sub      = { ...e(2, { pluggyTransactionId: 'pg1', desc: 'sub' }), entryLocation: 'subcollection' as any };
    const result = mergeAllEntries([], [overflow], [sub]);
    expect(result).toHaveLength(1);
    expect(result[0].desc).toBe('sub');
  });

  it('combina todas as fontes sem duplicatas', () => {
    const inline = [e(1, { desc: 'a' }), e(2, { desc: 'b' })];
    const overflow = [e(3, { pluggyTransactionId: 'pg3', desc: 'c' })];
    const sub = [{ ...e(4, { desc: 'd' }), entryLocation: 'subcollection' as any }];
    const result = mergeAllEntries(inline, overflow, sub);
    expect(result).toHaveLength(4);
  });

  it('inline não sobrescreve subcoleção', () => {
    const sub    = [{ ...e(10, { desc: 'sub-version' }), entryLocation: 'subcollection' as any }];
    const inline = [e(10, { desc: 'inline-version' })];
    const result = mergeAllEntries(inline, [], sub);
    expect(result[0].desc).toBe('sub-version');
  });

  it('ordena resultado por data decrescente', () => {
    const sub = [
      { ...e(1, { date: '2024-03-01' }), entryLocation: 'subcollection' as any },
      { ...e(2, { date: '2024-01-01' }), entryLocation: 'subcollection' as any },
    ];
    const result = mergeAllEntries([], [], sub);
    expect(result[0].date).toBe('2024-03-01');
  });
});
