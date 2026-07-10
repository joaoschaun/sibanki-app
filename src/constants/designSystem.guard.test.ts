import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guarda anti-regressão do Design System (ratchet).
 * Cada gate codifica uma regra da rubric (docs/DESIGN-SYSTEM-RUBRIC.md) que dá
 * para checar mecanicamente. Regra geral: os números só podem CAIR.
 *
 * Gate 1 — fundo sólido colorido (CTA decorativo): anti-padrão Pierre "sem
 *   botão colorido". Fills semânticos com opacidade (`bg-rose-500/15`) são
 *   PERMITIDOS (estado Ld/Sg/Sv) e ficam de fora por causa do `/`.
 * Gate 2 — foco fora da marca (`focus:ring-blue-500` etc.): congelado em 0.
 * Gate 3 — glow colorido (`shadow-blue-600/20` etc.): o Pierre é "sem glow".
 *   Congelado em 0.
 * Gate 4 — labels `text-si-5 uppercase`: si-5 reprova contraste (< 3:1) em
 *   texto pequeno; label deve ser si-4+. Congelado em 0.
 * Gate 5 — tokens de texto (`--si-text-*`) devem ser OKLCH, nunca hex: garante
 *   a escala perceptualmente uniforme + contraste por construção. 0 hex.
 */
const MAX_SOLID_DECORATIVE_BG = 29;

const ROOT = join(__dirname, '..');
const SRC = ROOT;
const SOLID_BG = /bg-(blue|indigo|violet|purple|sky|cyan|teal|red|green)-(400|500|600|700)(?![\d/])/g;
const OFFBRAND_FOCUS = /focus:(ring|border)-(blue|indigo|violet|purple|sky|cyan)-\d+(\/\d+)?/g;
const COLORED_GLOW = /shadow-(blue|indigo|violet|purple|sky|cyan|emerald|green|rose|amber)-\d+\/\d+/g;
const SI5_LABEL = /text-si-5 uppercase/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function countAll(re: RegExp): [number, Record<string, number>] {
  let total = 0;
  const offenders: Record<string, number> = {};
  for (const file of walk(SRC)) {
    const matches = readFileSync(file, 'utf8').match(re);
    if (matches) {
      total += matches.length;
      offenders[file.replace(SRC, 'src')] = matches.length;
    }
  }
  return [total, offenders];
}

describe('design system — sem botão colorido sólido (ratchet)', () => {
  it(`não ultrapassa ${MAX_SOLID_DECORATIVE_BG} fundos sólidos decorativos`, () => {
    const [total, offenders] = countAll(SOLID_BG);
    if (total > MAX_SOLID_DECORATIVE_BG) console.error('Fundos sólidos:', offenders);
    expect(total, `Botão colorido sólido novo. Use <Button>. Se REDUZIU, baixe o teto para ${total}.`)
      .toBeLessThanOrEqual(MAX_SOLID_DECORATIVE_BG);
  });
});

describe('design system — foco neutro Pierre (ratchet)', () => {
  it('não tem foco colorido fora da marca (0)', () => {
    const [total, offenders] = countAll(OFFBRAND_FOCUS);
    if (total > 0) console.error('Foco colorido:', offenders);
    expect(total, 'Foco colorido. Use focus:border-si-border-lg ou o :focus-visible global.').toBe(0);
  });
});

describe('design system — sem glow colorido (ratchet)', () => {
  it('não tem sombra colorida (0)', () => {
    const [total, offenders] = countAll(COLORED_GLOW);
    if (total > 0) console.error('Glow colorido:', offenders);
    expect(total, 'Sombra colorida (glow). Pierre é "sem glow" — use shadow-black/NN.').toBe(0);
  });
});

describe('design system — label com contraste AA (ratchet)', () => {
  it('não usa text-si-5 em label uppercase (0)', () => {
    const [total, offenders] = countAll(SI5_LABEL);
    if (total > 0) console.error('Label si-5 (reprova contraste):', offenders);
    expect(total, 'Label em si-5 reprova contraste. Use si-4 ou mais claro.').toBe(0);
  });
});

describe('design system — tokens de texto em OKLCH (ratchet)', () => {
  it('nenhum --si-text-* em hex (só oklch)', () => {
    const css = readFileSync(join(ROOT, 'index.css'), 'utf8');
    const hexToken = css
      .split('\n')
      .filter((l) => l.includes('--si-text-') && /#[0-9a-fA-F]{3,6}/.test(l.split('/*')[0]));
    if (hexToken.length) console.error('Tokens de texto em hex:', hexToken);
    expect(hexToken.length, 'Token --si-text-* em hex. Use oklch(L 0 0) — escala uniforme + contraste garantido.').toBe(0);
  });
});
