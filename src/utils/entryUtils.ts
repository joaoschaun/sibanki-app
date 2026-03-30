import type { Entry } from '../types/userData';

export const TRANSFER_CATEGORY = 'Transferencia';

export function isTransferEntry(e: Entry | null | undefined): boolean {
  if (!e) return false;
  return Boolean((e as any).isTransfer) || (e.category === TRANSFER_CATEGORY);
}

export function nonTransferEntries(entries: Entry[]): Entry[] {
  return entries.filter((e) => !isTransferEntry(e));
}

