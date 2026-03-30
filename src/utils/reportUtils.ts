import type { Entry } from '../types/userData';
import { isTransferEntry } from './entryUtils';

/** Formata valor em R$ */
export function fmt(v: number | undefined | null): string {
  if (v === undefined || v === null || Number.isNaN(v)) return 'R$ 0,00';
  const n = v < 0;
  const s = Math.abs(v).toFixed(2);
  const [intP, dec] = s.split('.');
  let res = '';
  for (let i = intP.length - 1; i >= 0; i--) {
    if ((intP.length - 1 - i) > 0 && (intP.length - 1 - i) % 3 === 0) res = '.' + res;
    res = intP[i] + res;
  }
  return (n ? '- ' : '') + 'R$ ' + res + ',' + dec;
}

/** Retorna dados agregados por mês (YYYY-MM): { r: receita, d: despesa } */
export function getMD(entries: Entry[]): Record<string, { r: number; d: number }> {
  const m: Record<string, { r: number; d: number }> = {};
  for (const e of entries) {
    if (isTransferEntry(e) || e.category === 'Transferencia' || e.status === 'pendente' || e.status === 'agendado')
      continue;
    const k = (e.date ?? '').substring(0, 7);
    if (!k) continue;
    if (!m[k]) m[k] = { r: 0, d: 0 };
    const val = Number(e.value) || 0;
    if (e.type === 'receita') m[k].r += val;
    else m[k].d += val;
  }
  return m;
}

/** Sequência de dias consecutivos com lançamentos (a partir de hoje) */
export function getStreak(entries: Entry[]): number {
  if (!entries.length) return 0;
  const days = new Set(entries.map((e) => e.date).filter(Boolean));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().split('T')[0];
    if (days.has(ds)) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
