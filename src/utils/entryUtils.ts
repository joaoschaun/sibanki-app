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

