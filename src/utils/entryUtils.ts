import type { Entry } from '../types/userData';

export const TRANSFER_CATEGORY = 'Transferencia';

export function isTransferEntry(e: Entry | null | undefined): boolean {
  if (!e) return false;
  return Boolean((e as any).isTransfer) || (e.category === TRANSFER_CATEGORY);
}

export function nonTransferEntries(entries: Entry[]): Entry[] {
  return entries.filter((e) => !isTransferEntry(e));
}

/** Junta lançamentos do documento users com arquivos Pluggy em entriesOverflow (dedup por pluggyTransactionId). */
export function mergeInlineAndOverflowEntries(inline: Entry[], overflow: Entry[]): Entry[] {
  const byPg = new Map<string, Entry>();
  for (const e of overflow) {
    if (e.pluggyTransactionId) {
      byPg.set(String(e.pluggyTransactionId), { ...e, entryLocation: 'overflow' });
    }
  }
  for (const e of inline) {
    if (e.pluggyTransactionId) {
      byPg.set(String(e.pluggyTransactionId), { ...e, entryLocation: 'inline' });
    }
  }
  const manual = inline.filter((e) => !e.pluggyTransactionId);
  const pluggyMerged = Array.from(byPg.values());
  return [...manual, ...pluggyMerged].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/**
 * Merge das 3 fontes de lançamentos — dedup por id (preferência: subcoleção > inline > overflow).
 *
 * Prioridade de escrita:
 *  1. subcollection: fonte canônica pós-migração
 *  2. inline: legacy (array no documento principal)
 *  3. overflow: lançamentos Pluggy arquivados (legacy)
 *
 * Dedup por pluggyTransactionId preserva o comportamento atual.
 */
export function mergeAllEntries(
  inline: Entry[],
  overflow: Entry[],
  subcollection: Entry[],
): Entry[] {
  // Sem subcoleção: mantém comportamento legado
  if (subcollection.length === 0) {
    return mergeInlineAndOverflowEntries(inline, overflow);
  }

  // Com subcoleção: usa como fonte canônica, complementa com inline manual não-migrado
  const byId = new Map<string | number, Entry>();

  // 1. Overflow (prioridade mais baixa)
  for (const e of overflow) {
    const key = e.pluggyTransactionId ?? e.id;
    byId.set(key, { ...e, entryLocation: 'overflow' });
  }

  // 2. Inline (sobrescreve overflow)
  for (const e of inline) {
    const key = e.pluggyTransactionId ?? e.id;
    byId.set(key, { ...e, entryLocation: 'inline' });
  }

  // 3. Subcoleção (prioridade mais alta — fonte canônica)
  for (const e of subcollection) {
    const key = e.pluggyTransactionId ?? e.id;
    byId.set(key, { ...e, entryLocation: 'subcollection' as any });
  }

  return Array.from(byId.values())
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

