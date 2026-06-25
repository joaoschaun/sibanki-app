/**
 * persistValidators.ts — backstop de runtime na FRONTEIRA DE ESCRITA do Firestore.
 *
 * Contexto (health-check, item #8): `persistUserData.ts` grava arrays via casts
 * `as Card[]`/`as any`, então o TypeScript para de proteger exatamente no ponto
 * onde dado malformado vira corrupção silenciosa (ex.: sync Pluggy escrevendo um
 * cartão sem `id`, ou um `value` NaN). Os validators de UI (`validators.ts`) são
 * feitos para INPUT do usuário e rejeitariam writes internos legítimos (entry de
 * pagamento com value 0, transferências), gerando falso-positivo.
 *
 * Estes validadores são DELIBERADAMENTE LENIENTES: só sinalizam dado
 * estruturalmente quebrado (id ausente, value não-finito, tipo errado), nunca
 * regra de negócio. São usados em modo OBSERVABILIDADE (logClientWarn,
 * não-bloqueante) — nunca lançam nem impedem a gravação.
 */
import type { Entry, Card } from '../types/userData';

export interface PersistIssue {
  kind: 'entry' | 'card';
  index: number;
  id: unknown;
  problems: string[];
}

const ENTRY_TYPES = new Set(['receita', 'despesa', 'transferencia']);

/** Checa um lançamento na fronteira de escrita. Retorna null se OK. */
export function checkEntryForPersist(e: unknown, index: number): PersistIssue | null {
  if (e == null || typeof e !== 'object') {
    return { kind: 'entry', index, id: undefined, problems: ['não é um objeto'] };
  }
  const entry = e as Partial<Entry> & Record<string, unknown>;
  const problems: string[] = [];
  if (entry.id == null) problems.push('id ausente');
  // value 0 é VÁLIDO (pagamento de fatura de ciclo vazio, etc.) — só exige número finito.
  if (typeof entry.value !== 'number' || !Number.isFinite(entry.value)) {
    problems.push('value não é número finito');
  }
  if (entry.type != null && !ENTRY_TYPES.has(String(entry.type))) {
    problems.push(`type fora do conjunto válido: ${String(entry.type)}`);
  }
  if (entry.date != null && typeof entry.date !== 'string') problems.push('date não é string');
  return problems.length ? { kind: 'entry', index, id: entry.id, problems } : null;
}

/** Checa um cartão na fronteira de escrita. Retorna null se OK. */
export function checkCardForPersist(c: unknown, index: number): PersistIssue | null {
  if (c == null || typeof c !== 'object') {
    return { kind: 'card', index, id: undefined, problems: ['não é um objeto'] };
  }
  const card = c as Partial<Card> & Record<string, unknown>;
  const problems: string[] = [];
  if (typeof card.id !== 'number' || !Number.isFinite(card.id)) problems.push('id ausente ou não-numérico');
  if (card.name != null && typeof card.name !== 'string') problems.push('name não é string');
  if (card.purchases != null && !Array.isArray(card.purchases)) problems.push('purchases não é array');
  if (card.purchasesV2 != null && !Array.isArray(card.purchasesV2)) problems.push('purchasesV2 não é array');
  return problems.length ? { kind: 'card', index, id: card.id, problems } : null;
}

/**
 * Varre um payload de escrita e devolve os problemas estruturais encontrados em
 * `cards` e `entries`. Só inspeciona arrays; ignora campos ausentes (write parcial).
 * NÃO inclui valores financeiros nos issues (só id + descrição do problema) — seguro
 * para logar.
 */
export function collectPersistIssues(payload: { cards?: unknown; entries?: unknown }): PersistIssue[] {
  const issues: PersistIssue[] = [];
  if (Array.isArray(payload.cards)) {
    payload.cards.forEach((c, i) => {
      const r = checkCardForPersist(c, i);
      if (r) issues.push(r);
    });
  }
  if (Array.isArray(payload.entries)) {
    payload.entries.forEach((e, i) => {
      const r = checkEntryForPersist(e, i);
      if (r) issues.push(r);
    });
  }
  return issues;
}
