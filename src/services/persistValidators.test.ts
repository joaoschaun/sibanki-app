/**
 * persistValidators.test.ts — garante que o backstop de escrita é LENIENTE na
 * medida certa: pega dado estruturalmente quebrado, mas NÃO gera falso-positivo
 * em writes internos legítimos (value 0 de pagamento, transferências).
 */
import { describe, it, expect } from 'vitest';
import {
  checkEntryForPersist,
  checkCardForPersist,
  collectPersistIssues,
} from './persistValidators';

describe('checkEntryForPersist', () => {
  it('aceita lançamento válido (retorna null)', () => {
    expect(checkEntryForPersist({ id: 1, value: 100, type: 'despesa', date: '2026-06-01' }, 0)).toBeNull();
  });

  it('TOLERA value 0 (pagamento de fatura de ciclo vazio) — não é problema', () => {
    expect(checkEntryForPersist({ id: 1, value: 0, type: 'despesa', date: '2026-06-01' }, 0)).toBeNull();
  });

  it('TOLERA transferência (type transferencia)', () => {
    expect(checkEntryForPersist({ id: 2, value: 50, type: 'transferencia', date: '2026-06-01' }, 0)).toBeNull();
  });

  it('sinaliza value não-finito (NaN)', () => {
    const r = checkEntryForPersist({ id: 1, value: NaN, type: 'despesa' }, 0);
    expect(r?.problems).toContain('value não é número finito');
  });

  it('sinaliza id ausente', () => {
    const r = checkEntryForPersist({ value: 10, type: 'receita' }, 3);
    expect(r?.problems).toContain('id ausente');
    expect(r?.index).toBe(3);
  });

  it('sinaliza type fora do conjunto válido', () => {
    const r = checkEntryForPersist({ id: 1, value: 10, type: 'investimento' }, 0);
    expect(r?.problems.some((p) => p.includes('type fora'))).toBe(true);
  });

  it('sinaliza não-objeto', () => {
    expect(checkEntryForPersist(null, 0)?.problems).toContain('não é um objeto');
    expect(checkEntryForPersist('x', 0)?.problems).toContain('não é um objeto');
  });

  it('NÃO inclui o value financeiro no issue (só id + problema)', () => {
    const r = checkEntryForPersist({ id: 9, value: NaN, type: 'despesa' }, 0);
    expect(r?.id).toBe(9);
    expect(JSON.stringify(r)).not.toContain('value":');
  });
});

describe('checkCardForPersist', () => {
  it('aceita cartão válido', () => {
    expect(checkCardForPersist({ id: 1, name: 'Nubank', purchases: [] }, 0)).toBeNull();
  });

  it('sinaliza id ausente/não-numérico', () => {
    expect(checkCardForPersist({ name: 'X' }, 0)?.problems).toContain('id ausente ou não-numérico');
    expect(checkCardForPersist({ id: 'abc', name: 'X' }, 0)?.problems).toContain('id ausente ou não-numérico');
  });

  it('sinaliza purchases/purchasesV2 não-array', () => {
    expect(checkCardForPersist({ id: 1, purchases: 'x' }, 0)?.problems).toContain('purchases não é array');
    expect(checkCardForPersist({ id: 1, purchasesV2: {} }, 0)?.problems).toContain('purchasesV2 não é array');
  });

  it('tolera cartão sem name (write parcial)', () => {
    expect(checkCardForPersist({ id: 1 }, 0)).toBeNull();
  });
});

describe('collectPersistIssues', () => {
  it('payload limpo → sem issues', () => {
    expect(collectPersistIssues({
      cards: [{ id: 1, name: 'A', purchases: [] }],
      entries: [{ id: 1, value: 10, type: 'despesa', date: '2026-06-01' }],
    })).toEqual([]);
  });

  it('agrega problemas de cards e entries com índices corretos', () => {
    const issues = collectPersistIssues({
      cards: [{ id: 1, name: 'ok', purchases: [] }, { name: 'sem id' }],
      entries: [{ id: 1, value: NaN, type: 'despesa' }],
    });
    expect(issues).toHaveLength(2);
    expect(issues.find((i) => i.kind === 'card')?.index).toBe(1);
    expect(issues.find((i) => i.kind === 'entry')?.index).toBe(0);
  });

  it('ignora write parcial (sem cards/entries)', () => {
    expect(collectPersistIssues({ })).toEqual([]);
    expect(collectPersistIssues({ cards: undefined, entries: undefined })).toEqual([]);
  });

  it('ignora cards/entries que não são array', () => {
    expect(collectPersistIssues({ cards: 'x' as unknown, entries: 5 as unknown })).toEqual([]);
  });
});
