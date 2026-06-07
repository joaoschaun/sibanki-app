/**
 * validators.ts — Validação centralizada de dados antes de persistir no Firestore.
 *
 * Previne gravação de dados malformados que causam crashes silenciosos em cálculos
 * como Ld, Sg e Sv. Todas as funções retornam { ok, errors[] } para que o caller
 * possa exibir erros específicos ao usuário sem try/catch genérico.
 */
import type { Entry, Card, Goal, Investment, Recurrent, CreditObligation } from '../types/userData';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** ISO 8601 date string: YYYY-MM-DD */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Tipos válidos de lançamento */
const VALID_ENTRY_TYPES = ['receita', 'despesa', 'transferencia'] as const;

/** Tipos válidos de investimento */
const VALID_INVESTMENT_TYPES = ['renda-fixa', 'renda-variavel', 'cripto', 'fundo', 'previdencia', 'imovel', 'outro'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function isValidDate(d: string): boolean {
  if (!ISO_DATE_RE.test(d)) return false;
  const ts = Date.parse(d);
  return !isNaN(ts);
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && isFinite(n) && n > 0;
}

function isNonNegativeFinite(n: unknown): n is number {
  return typeof n === 'number' && isFinite(n) && n >= 0;
}

function notEmptyString(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY
// ─────────────────────────────────────────────────────────────────────────────

export function validateEntry(entry: Partial<Entry>): ValidationResult {
  const errors: string[] = [];

  if (!notEmptyString(entry.desc)) {
    errors.push('Descrição é obrigatória.');
  } else if (entry.desc.trim().length > 200) {
    errors.push('Descrição deve ter no máximo 200 caracteres.');
  }

  if (!isPositiveFinite(entry.value)) {
    errors.push('Valor deve ser um número positivo.');
  } else if (entry.value > 1_000_000_000) {
    errors.push('Valor não pode exceder R$ 1 bilhão.');
  }

  if (!entry.date || !isValidDate(entry.date)) {
    errors.push('Data inválida. Use o formato YYYY-MM-DD.');
  }

  if (!entry.type || !VALID_ENTRY_TYPES.includes(entry.type as typeof VALID_ENTRY_TYPES[number])) {
    errors.push(`Tipo inválido. Use: ${VALID_ENTRY_TYPES.join(', ')}.`);
  }

  const parcelas = entry.parcelas as number | undefined | null;
  if (parcelas !== undefined && parcelas !== null) {
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 120) {
      errors.push('Número de parcelas deve ser entre 1 e 120.');
    }
  }

  return { ok: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────────────────────────

export function validateCard(card: Partial<Card>): ValidationResult {
  const errors: string[] = [];

  if (!notEmptyString(card.name)) {
    errors.push('Nome do cartão é obrigatório.');
  } else if (card.name.trim().length > 100) {
    errors.push('Nome do cartão deve ter no máximo 100 caracteres.');
  }

  if (card.limit !== undefined && card.limit !== null) {
    if (!isNonNegativeFinite(card.limit)) {
      errors.push('Limite deve ser um número não-negativo.');
    } else if (card.limit > 10_000_000) {
      errors.push('Limite não pode exceder R$ 10 milhões.');
    }
  }

  const closeDay = card.closeDay ?? (card as Card & { closingDay?: number }).closingDay;
  if (closeDay !== undefined && closeDay !== null) {
    if (!Number.isInteger(closeDay) || closeDay < 1 || closeDay > 31) {
      errors.push('Dia de fechamento deve ser entre 1 e 31.');
    }
  }

  if (card.dueDay !== undefined && card.dueDay !== null) {
    if (!Number.isInteger(card.dueDay) || card.dueDay < 1 || card.dueDay > 31) {
      errors.push('Dia de vencimento deve ser entre 1 e 31.');
    }
  }

  return { ok: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD PURCHASE (compra parcelada)
// ─────────────────────────────────────────────────────────────────────────────

export interface CardPurchaseInput {
  desc: string;
  value: number;
  date: string;
  parcelas?: number;
}

export function validateCardPurchase(p: Partial<CardPurchaseInput>): ValidationResult {
  const errors: string[] = [];

  if (!notEmptyString(p.desc)) {
    errors.push('Descrição da compra é obrigatória.');
  } else if (p.desc.trim().length > 200) {
    errors.push('Descrição deve ter no máximo 200 caracteres.');
  }

  if (!isPositiveFinite(p.value)) {
    errors.push('Valor deve ser um número positivo.');
  } else if (p.value > 1_000_000_000) {
    errors.push('Valor não pode exceder R$ 1 bilhão.');
  }

  if (!p.date || !isValidDate(p.date)) {
    errors.push('Data inválida. Use o formato YYYY-MM-DD.');
  }

  if (p.parcelas !== undefined && p.parcelas !== null) {
    if (!Number.isInteger(p.parcelas) || p.parcelas < 1 || p.parcelas > 120) {
      errors.push('Número de parcelas deve ser entre 1 e 120.');
    }
  }

  return { ok: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL
// ─────────────────────────────────────────────────────────────────────────────

export function validateGoal(goal: Partial<Goal>): ValidationResult {
  const errors: string[] = [];

  const titleRaw = goal.title ?? (goal as Goal & { name?: string }).name;
  if (!notEmptyString(titleRaw)) {
    errors.push('Nome da meta é obrigatório.');
  } else if (String(titleRaw).trim().length > 150) {
    errors.push('Nome da meta deve ter no máximo 150 caracteres.');
  }

  if (!isPositiveFinite(goal.target)) {
    errors.push('Valor alvo deve ser um número positivo.');
  } else if (goal.target > 1_000_000_000) {
    errors.push('Valor alvo não pode exceder R$ 1 bilhão.');
  }

  if (goal.current !== undefined && goal.current !== null) {
    if (!isNonNegativeFinite(goal.current)) {
      errors.push('Valor atual deve ser um número não-negativo.');
    }
  }

  const deadline = goal.deadline as string | undefined;
  if (deadline && !isValidDate(deadline)) {
    errors.push('Data limite inválida. Use o formato YYYY-MM-DD.');
  }

  return { ok: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// INVESTMENT
// ─────────────────────────────────────────────────────────────────────────────

export function validateInvestment(inv: Partial<Investment>): ValidationResult {
  const errors: string[] = [];

  const nome = inv.nome ?? (inv as Investment & { name?: string }).name;
  if (!notEmptyString(nome)) {
    errors.push('Nome do investimento é obrigatório.');
  } else if (String(nome).trim().length > 150) {
    errors.push('Nome do investimento deve ter no máximo 150 caracteres.');
  }

  const currentVal = inv.atual ?? (inv as Investment & { current?: number }).current;
  if (!isNonNegativeFinite(currentVal)) {
    errors.push('Valor atual deve ser um número não-negativo.');
  } else if (currentVal > 1_000_000_000) {
    errors.push('Valor atual não pode exceder R$ 1 bilhão.');
  }

  const tipo = inv.tipo ?? (inv as Investment & { type?: string }).type;
  if (tipo && !VALID_INVESTMENT_TYPES.includes(tipo as typeof VALID_INVESTMENT_TYPES[number])) {
    errors.push(`Tipo de investimento inválido. Use: ${VALID_INVESTMENT_TYPES.join(', ')}.`);
  }

  if (inv.rate !== undefined && inv.rate !== null) {
    if (typeof inv.rate !== 'number' || !isFinite(inv.rate) || inv.rate < -100 || inv.rate > 10000) {
      errors.push('Taxa de rendimento deve ser um número entre -100% e 10.000%.');
    }
  }

  if (inv.proventosMensais !== undefined && inv.proventosMensais !== null) {
    if (typeof inv.proventosMensais !== 'number' || !isFinite(inv.proventosMensais) || inv.proventosMensais < 0 || inv.proventosMensais > 1_000_000_000) {
      errors.push('Proventos mensais estimados devem ser um número entre R$ 0 e R$ 1 bilhão.');
    }
  }

  return { ok: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURRENT
// ─────────────────────────────────────────────────────────────────────────────

export function validateRecurrent(rec: Partial<Recurrent>): ValidationResult {
  const errors: string[] = [];

  if (!notEmptyString(rec.desc)) {
    errors.push('Descrição é obrigatória.');
  } else if (rec.desc.trim().length > 200) {
    errors.push('Descrição deve ter no máximo 200 caracteres.');
  }

  if (!isPositiveFinite(rec.value)) {
    errors.push('Valor deve ser um número positivo.');
  } else if (rec.value > 1_000_000_000) {
    errors.push('Valor não pode exceder R$ 1 bilhão.');
  }

  if (rec.day !== undefined && rec.day !== null) {
    if (!Number.isInteger(rec.day) || rec.day < 1 || rec.day > 31) {
      errors.push('Dia de recorrência deve ser entre 1 e 31.');
    }
  }

  return { ok: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT
// ─────────────────────────────────────────────────────────────────────────────

export function validateAccount(name: string, initialBalance?: number): ValidationResult {
  const errors: string[] = [];

  if (!notEmptyString(name)) {
    errors.push('Nome da conta é obrigatório.');
  } else if (name.trim().length > 100) {
    errors.push('Nome da conta deve ter no máximo 100 caracteres.');
  }

  if (initialBalance !== undefined && initialBalance !== null) {
    if (typeof initialBalance !== 'number' || !isFinite(initialBalance)) {
      errors.push('Saldo inicial deve ser um número válido.');
    } else if (Math.abs(initialBalance) > 1_000_000_000) {
      errors.push('Saldo inicial não pode exceder R$ 1 bilhão (positivo ou negativo).');
    }
  }

  return { ok: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREDIT OBLIGATION
// ─────────────────────────────────────────────────────────────────────────────

export function validateCreditObligation(ob: Partial<CreditObligation>): ValidationResult {
  const errors: string[] = [];

  if (!notEmptyString(ob.label)) {
    errors.push('Descrição/Label da obrigação é obrigatório.');
  } else if (ob.label.trim().length > 200) {
    errors.push('Descrição/Label deve ter no máximo 200 caracteres.');
  }

  if (!isPositiveFinite(ob.amount)) {
    errors.push('Valor da obrigação deve ser um número positivo.');
  } else if (ob.amount > 1_000_000_000) {
    errors.push('Valor não pode exceder R$ 1 bilhão.');
  }

  if (!ob.dueDate || !isValidDate(ob.dueDate)) {
    errors.push('Data de vencimento inválida. Use o formato YYYY-MM-DD.');
  }

  if (ob.interestRatePct !== undefined && ob.interestRatePct !== null) {
    if (typeof ob.interestRatePct !== 'number' || !isFinite(ob.interestRatePct) || ob.interestRatePct < 0 || ob.interestRatePct > 500) {
      errors.push('Taxa de juros deve ser um número entre 0% e 500% a.m.');
    }
  }

  const kind = ob.kind;
  const validKinds = ['fatura', 'parcela', 'emprestimo', 'financiamento', 'rotativo', 'negociacao', 'outro'];
  if (!kind || !validKinds.includes(kind)) {
    errors.push(`Tipo de obrigação inválido. Use um de: ${validKinds.join(', ')}.`);
  }

  return { ok: errors.length === 0, errors };
}
