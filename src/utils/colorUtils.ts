/**
 * colorUtils.ts
 * Utilitários de cor para detecção automática de contraste logo × fundo.
 * Usado pelo sistema de logos de bancos.
 */

/** Converte hex para RGB [0–255] */
export function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/** Luminância relativa de uma cor (WCAG 2.1) */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dois hex (1–21) */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determina se a logo (originalmente colorida/escura) precisa de inversão
 * para ter contraste suficiente sobre o fundo `bgHex`.
 *
 * Lógica:
 *  - Branco (#fff) sobre qualquer fundo saturado ≥ 3:1 → não inverte (logo já é clara)
 *  - Se contraste logo-cor × fundo < 2.5 → inverte para branco (filter invert)
 *  - Se fundo é escuro (lum < 0.15) → inverte para branco
 *
 * @param bgHex       cor de fundo do card
 * @param logoColor   cor dominante da logo (ex: cor primária do banco)
 * @returns CSS filter string a aplicar, ou '' se não precisar
 */
export function logoFilterForBackground(bgHex: string, logoColor: string): string {
  const bgLum   = relativeLuminance(bgHex);
  const logoLum = relativeLuminance(logoColor);

  // Fundo muito escuro (ex: C6 #2D2D2D, XP #111) → logo branca
  if (bgLum < 0.12) return 'brightness(0) invert(1)';

  // Contraste entre cor da logo e fundo < 2 → logo e fundo se misturam
  const ratio = contrastRatio(bgHex, logoColor);
  if (ratio < 2.5) return 'brightness(0) invert(1)';

  // Fundo claro ou amarelo (BB #F9DD16) → logo escura está OK
  if (bgLum > 0.3 && logoLum < 0.3) return ''; // logo escura em fundo claro ✓

  return '';
}
