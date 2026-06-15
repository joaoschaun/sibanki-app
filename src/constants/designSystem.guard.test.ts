import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guarda anti-regressão do Design System (ratchet).
 *
 * Conta fundos sólidos coloridos (CTA decorativo) — o anti-padrão Pierre
 * "sem botão colorido". Fills semânticos com opacidade (`bg-rose-500/15`)
 * são PERMITIDOS (linguagem de estado financeiro Ld/Sg/Sv) e ficam de fora
 * por causa do `/`.
 *
 * Regra: o número só pode CAIR. Ao migrar telas para os primitivos
 * (Button/Card/Badge), reduza `MAX_SOLID_DECORATIVE_BG` para o novo total.
 * Nenhuma tela nova pode introduzir botão colorido sólido.
 */
const MAX_SOLID_DECORATIVE_BG = 29;

const SRC = join(__dirname, '..');
const SOLID_BG = /bg-(blue|indigo|violet|purple|sky|cyan|teal|red|green)-(400|500|600|700)(?![\d/])/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('design system — sem botão colorido sólido (ratchet)', () => {
  it(`não ultrapassa ${MAX_SOLID_DECORATIVE_BG} fundos sólidos decorativos`, () => {
    let total = 0;
    const offenders: Record<string, number> = {};
    for (const file of walk(SRC)) {
      const matches = readFileSync(file, 'utf8').match(SOLID_BG);
      if (matches) {
        total += matches.length;
        offenders[file.replace(SRC, 'src')] = matches.length;
      }
    }
    if (total > MAX_SOLID_DECORATIVE_BG) {
      console.error('Fundos sólidos decorativos por arquivo:', offenders);
    }
    expect(
      total,
      `Novos botões coloridos sólidos detectados. Use o primitivo <Button>. ` +
        `Se você REDUZIU, baixe MAX_SOLID_DECORATIVE_BG para ${total}.`,
    ).toBeLessThanOrEqual(MAX_SOLID_DECORATIVE_BG);
  });
});
