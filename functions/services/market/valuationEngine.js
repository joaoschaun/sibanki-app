/**
 * valuationEngine.js
 * Cálculos de valuation fundamentalista para o backend (porta do sovereigntyEngine.ts).
 * Usado pelo assistantOrchestrator no Raio-X de ações.
 */

/**
 * Graham: Valor Intrínseco = √(22.5 × LPA × VPA)
 * Também calcula o Preço Justo de Graham (√(22.5 × LPA × VPA)).
 * @param {number} price  Preço atual
 * @param {number} lpa    Lucro por Ação (EPS)
 * @param {number} vpa    Valor Patrimonial por Ação (Book Value per Share)
 * @returns {{ intrinsicValue: number|null, discount: number|null, verdict: string }}
 */
function calculateGrahamIntrinsicValue(price, lpa, vpa) {
  if (!lpa || !vpa || lpa <= 0 || vpa <= 0) {
    return { intrinsicValue: null, discount: null, verdict: "dados insuficientes" };
  }
  const intrinsicValue = Math.sqrt(22.5 * lpa * vpa);
  const discount = ((intrinsicValue - price) / intrinsicValue) * 100;
  let verdict;
  if (discount >= 15) verdict = "ABAIXO do valor justo (margem de segurança)";
  else if (discount >= 0) verdict = "próximo do valor justo";
  else if (discount >= -20) verdict = "levemente acima do valor justo";
  else verdict = "ACIMA do valor justo (sobrevalorizado)";
  return { intrinsicValue, discount, verdict };
}

/**
 * Bazin: Preço Teto = Dividendo Anual / Taxa Mínima de Retorno
 * Default: taxa mínima de 6% a.a.
 * @param {number} price      Preço atual
 * @param {number} dyPct      Dividend Yield % a.a. (ex.: 8.5 = 8,5%)
 * @param {number} minYield   Taxa mínima (default 6%)
 * @returns {{ ceiling: number|null, aboveCeiling: boolean|null, verdict: string }}
 */
function calculateBazinPriceCeiling(price, dyPct, minYield = 6) {
  if (!dyPct || dyPct <= 0 || !price || price <= 0) {
    return { ceiling: null, aboveCeiling: null, verdict: "DY insuficiente para cálculo" };
  }
  const dividendAnual = price * (dyPct / 100);
  const ceiling = dividendAnual / (minYield / 100);
  const aboveCeiling = price > ceiling;
  const diff = ((ceiling - price) / ceiling) * 100;
  let verdict;
  if (!aboveCeiling && diff >= 20) verdict = "ABAIXO do teto Bazin (boa margem de dividendos)";
  else if (!aboveCeiling) verdict = "abaixo do teto Bazin";
  else verdict = "ACIMA do teto Bazin (caro para renda)";
  return { ceiling, aboveCeiling, verdict };
}

/**
 * Solidez resumida (checklist rápido para o prompt).
 * @param {{ roe, margin, debtToEquity, currentRatio, pvp, pe, dy }} f
 * @returns {string[]} linhas de checklist
 */
function buildSolidezChecklist(f) {
  if (!f) return [];
  const lines = [];
  if (f.roe != null)          lines.push(`ROE: ${Number(f.roe).toFixed(1)}% ${f.roe >= 15 ? "✅" : f.roe >= 10 ? "⚠️" : "❌"} (ref: ≥15%)`);
  if (f.margin != null)       lines.push(`Margem oper.: ${Number(f.margin).toFixed(1)}% ${f.margin >= 10 ? "✅" : "⚠️"}`);
  if (f.debtToEquity != null) lines.push(`Dívida/PL: ${Number(f.debtToEquity).toFixed(2)} ${f.debtToEquity <= 1 ? "✅" : f.debtToEquity <= 2 ? "⚠️" : "❌"} (ref: ≤1)`);
  if (f.currentRatio != null) lines.push(`Liquidez corrente: ${Number(f.currentRatio).toFixed(2)} ${f.currentRatio >= 1.5 ? "✅" : f.currentRatio >= 1 ? "⚠️" : "❌"}`);
  if (f.pvp != null)          lines.push(`P/VP: ${Number(f.pvp).toFixed(2)} ${f.pvp <= 1 ? "✅" : f.pvp <= 2 ? "⚠️" : "❌"}`);
  if (f.pe != null)           lines.push(`P/L: ${Number(f.pe).toFixed(2)} ${f.pe > 0 && f.pe <= 15 ? "✅" : f.pe <= 25 ? "⚠️" : "❌"}`);
  if (f.dy != null)           lines.push(`DY: ${Number(f.dy).toFixed(2)}% ${f.dy >= 6 ? "✅" : f.dy >= 3 ? "⚠️" : "❌"}`);
  return lines;
}

module.exports = {
  calculateGrahamIntrinsicValue,
  calculateBazinPriceCeiling,
  buildSolidezChecklist,
};
