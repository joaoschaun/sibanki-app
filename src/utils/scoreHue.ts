/**
 * Escala visual do scorecard: 0 = vermelho, 100 = azul (H 0° → 220°).
 */

/**
 * Cor única a partir do score (0–100): quanto menor, mais vermelho; quanto maior, mais azul.
 * Não usar gradiente espacial no gráfico — senão a cor confunde com “lado ruim/bom” da tela.
 */
export function scoreToRedBlueHsl(score: number, lightness = 52, saturation = 72): string {
  const t = Math.min(100, Math.max(0, score)) / 100;
  const h = t * 220;
  return `hsl(${h}, ${saturation}%, ${lightness}%)`;
}
