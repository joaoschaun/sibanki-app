/**
 * Escala de Soberania — FONTE ÚNICA de cor/label para os conceitos centrais.
 *
 * Antes, a lógica "estado → cor" estava duplicada e divergente entre
 * SovereigntyHero (Ld / Dias de Liberdade) e SovereigntyBadge (Sv por transação),
 * com faixas e tons diferentes. Centralizar aqui garante que verde/azul/âmbar/
 * rosa/violeta signifiquem sempre a mesma coisa no produto inteiro.
 */

// ─── Ld — Dias de Liberdade (status calculado no sovereigntyEngine) ────────────
export type FreedomStatus =
  | 'inabalavel'
  | 'soberano'
  | 'resiliente'
  | 'em-construcao'
  | 'fragil';

export interface FreedomTierStyle {
  label: string;
  /** classe de cor para o número gigante do hero */
  numClass: string;
  /** classes do badge pill (bg + text + border) */
  badgeClass: string;
  /** glow radial por tier (inline style — TW não computa valores dinâmicos) */
  glow: string;
}

export const FREEDOM_TIERS: Record<FreedomStatus, FreedomTierStyle> = {
  inabalavel: {
    label: 'Inabalável',
    numClass: 'text-violet-300',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    glow: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(139,92,246,0.22) 0%, transparent 70%)',
  },
  soberano: {
    label: 'Soberano',
    numClass: 'text-emerald-300',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    glow: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%)',
  },
  resiliente: {
    label: 'Resiliente',
    numClass: 'text-blue-300',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    glow: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.16) 0%, transparent 70%)',
  },
  'em-construcao': {
    label: 'Em construção',
    numClass: 'text-amber-300',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    glow: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245,158,11,0.14) 0%, transparent 70%)',
  },
  fragil: {
    label: 'Frágil',
    numClass: 'text-rose-300',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    glow: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(244,63,94,0.14) 0%, transparent 70%)',
  },
};

// ─── Sv — Sovereignty Score por transação (0–100) ──────────────────────────────
export interface SvTier {
  min: number;
  label: string;
  bg: string;
  text: string;
  border: string;
  /** cor sólida da barra de progresso */
  bar: string;
}

export const SV_TIERS: readonly SvTier[] = [
  { min: 80, label: 'Soberano',       bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', bar: 'bg-emerald-400' },
  { min: 50, label: 'Consciente',     bg: 'bg-blue-500/15',    text: 'text-blue-300',    border: 'border-blue-500/30',    bar: 'bg-blue-400' },
  { min: 25, label: 'Atenção',        bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/30',   bar: 'bg-amber-400' },
  { min: 0,  label: 'Auto-sabotagem', bg: 'bg-rose-500/15',    text: 'text-rose-300',    border: 'border-rose-500/30',    bar: 'bg-rose-400' },
] as const;

export function getSvTier(score: number): SvTier {
  return SV_TIERS.find((t) => score >= t.min) ?? SV_TIERS[SV_TIERS.length - 1];
}

/** Ordem canônica do pior ao melhor — usada pelo espectro (FreedomSpectrum). */
export const FREEDOM_ORDER: readonly FreedomStatus[] = [
  'fragil', 'em-construcao', 'resiliente', 'soberano', 'inabalavel',
] as const;

/** Cor sólida do segmento no espectro (dado = posição na escala; §10.3 / §1 ⚠︎v2). */
export const FREEDOM_SEGMENT: Record<FreedomStatus, string> = {
  fragil:        'bg-rose-500/70',
  'em-construcao':'bg-amber-500/70',
  resiliente:    'bg-blue-500/70',
  soberano:      'bg-emerald-500/70',
  inabalavel:    'bg-violet-500/70',
};
