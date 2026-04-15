/** Converte Timestamp Firestore, ISO string ou objeto `{ seconds }` em Date válida. */
export function parseFirestoreDate(input: unknown): Date | null {
  if (input == null) return null;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    const d = input > 1e12 ? new Date(input) : new Date(input * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const t = input.trim();
    if (!t) return null;
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'object' && input !== null && 'toDate' in input && typeof (input as { toDate?: () => Date }).toDate === 'function') {
    const d = (input as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'object' && input !== null && 'seconds' in input) {
    const s = Number((input as { seconds: number }).seconds);
    if (!Number.isFinite(s)) return null;
    return new Date(s * 1000);
  }
  if (typeof input === 'object' && input !== null && '_seconds' in input) {
    const s = Number((input as { _seconds: number })._seconds);
    if (!Number.isFinite(s)) return null;
    return new Date(s * 1000);
  }
  return null;
}

export function formatFirestoreDatePtBR(input: unknown): string {
  const d = parseFirestoreDate(input);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR');
}
