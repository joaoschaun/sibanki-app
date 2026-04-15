/**
 * Infere benefícios típicos a partir do nome e da bandeira do cartão (sem API).
 */
import type { CardBenefits } from '../types/userData';
import {
  listCatalogByFlag,
  type CardBenefitsCatalogEntry,
} from '../constants/cardBenefitsCatalog';

export interface InferredBenefits {
  benefits: CardBenefits;
  catalogId: string;
  confidence: 'high' | 'medium' | 'low';
}

type TierKind = 'topo' | 'premium' | 'intermediario' | 'basico';

const KNOWN_FLAGS = new Set(['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outros']);

function normalizeFlagInput(flag: string): string {
  const raw = (flag || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  const map: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    mc: 'Mastercard',
    elo: 'Elo',
    amex: 'Amex',
    'american express': 'Amex',
    hipercard: 'Hipercard',
    outros: 'Outros',
    other: 'Outros',
  };
  if (map[lower]) return map[lower];
  if (KNOWN_FLAGS.has(raw)) return raw;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function detectTier(cardName: string): { tier: TierKind; confidence: 'high' | 'medium' | 'low' } {
  const n = cardName
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

  if (/\binfinite\b|ultraviolet/.test(n)) return { tier: 'topo', confidence: 'high' };
  if (/\bblack\b|world\s+elite/.test(n)) return { tier: 'topo', confidence: 'high' };
  if (/platinum|grafite|nanquim/.test(n)) return { tier: 'premium', confidence: 'high' };
  if (/gold|personalite|personalité/.test(n)) return { tier: 'intermediario', confidence: 'medium' };
  if (/\bstandard\b|básico|basico|\bclassic\b/.test(n)) return { tier: 'basico', confidence: 'medium' };
  return { tier: 'intermediario', confidence: 'low' };
}

function pickCatalogEntry(flag: string, tier: TierKind): CardBenefitsCatalogEntry | null {
  const rows = listCatalogByFlag(flag);
  if (!rows.length) return null;

  const f = (flag || '').trim() || 'Outros';

  if (f === 'Hipercard') {
    return rows[0] ?? null;
  }

  if (f === 'Outros' || rows[0]?.flag === 'Outros') {
    if (tier === 'topo' || tier === 'premium') {
      return rows.find((r) => r.id === 'outros-completo') ?? rows[rows.length - 1] ?? null;
    }
    return rows.find((r) => r.id === 'outros-basico') ?? rows[0] ?? null;
  }

  const byLabel = (label: string) => rows.find((r) => r.tierLabel === label);

  if (f === 'Amex') {
    if (tier === 'basico') return byLabel('Básico') ?? rows[0] ?? null;
    return byLabel('Premium') ?? rows.find((r) => r.id === 'amex-premium') ?? null;
  }

  const tryLabels: Record<TierKind, string[]> = {
    topo: ['Topo de linha', 'Premium'],
    premium: ['Premium'],
    intermediario: ['Intermediário'],
    basico: ['Básico'],
  };

  for (const label of tryLabels[tier]) {
    const hit = byLabel(label);
    if (hit) return hit;
  }

  if (tier === 'topo' || tier === 'premium') {
    const prem = byLabel('Premium');
    if (prem) return prem;
  }

  const mid = byLabel('Intermediário');
  if (mid) return mid;

  return rows[0] ?? null;
}

/**
 * Infere benefícios a partir do nome e da bandeira. `source` do benefício é definido pelo chamador (open-finance / catalog).
 */
export function inferCardBenefitsFromMeta(cardName: string, flag: string): InferredBenefits | null {
  const normalizedFlag = normalizeFlagInput(flag);
  const { tier, confidence } = detectTier(cardName);

  if (confidence === 'low' && (!normalizedFlag || normalizedFlag === 'Outros')) {
    return null;
  }

  const effectiveFlag = normalizedFlag || 'Outros';
  const entry = pickCatalogEntry(effectiveFlag, tier);
  if (!entry) return null;

  const benefits: CardBenefits = {
    ...entry.benefits,
    notes: entry.notesHint,
  };

  return {
    benefits,
    catalogId: entry.id,
    confidence,
  };
}
