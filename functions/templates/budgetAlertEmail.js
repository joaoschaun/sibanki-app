/**
 * Template — Alerta de orçamento estourado
 * Pierre Finance identity via emailBase.js
 */
const { esc, fmtBRL, buildEmail, btn, C } = require("./emailBase");

/**
 * @param {string} nome
 * @param {Array<{category, spent, limit, pct}>} overBudget   categorias > 80%
 * @param {string} appUrl
 * @param {string} [unsubUrl]
 */
function getBudgetAlertEmailHtml(nome, overBudget, appUrl, unsubUrl) {
  const n   = esc(nome || "");
  const url = esc(appUrl || "https://virtus-financeiro-cd7bd.web.app");

  // Separa estouradas (≥100%) de próximas ao limite (80–99%)
  const blown  = overBudget.filter(c => c.pct >= 100);
  const close  = overBudget.filter(c => c.pct >= 80 && c.pct < 100);

  function categoryRow(c) {
    const pct      = Math.min(Math.round(c.pct), 999);
    const barColor = c.pct >= 100 ? C.red : C.amber;
    const barPct   = Math.min(pct, 100);
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td><span style="color:${C.text2};font-size:13px;">${esc(c.category)}</span></td>
              <td style="text-align:right;">
                <span style="color:${barColor};font-size:13px;font-weight:700;">${pct}%</span>
                <span style="color:${C.text4};font-size:11px;"> · R$ ${fmtBRL(c.spent)} / R$ ${fmtBRL(c.limit)}</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:6px;">
                <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:99px;">
                  <div style="height:3px;width:${barPct}%;background:${barColor};border-radius:99px;"></div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  const blownHtml = blown.length > 0 ? `
    <p style="margin:0 0 10px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Limite ultrapassado</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:0 16px;margin-bottom:20px;">
      ${blown.map(categoryRow).join("")}
    </table>` : "";

  const closeHtml = close.length > 0 ? `
    <p style="margin:0 0 10px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Próximo ao limite</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.12);border-radius:10px;padding:0 16px;margin-bottom:20px;">
      ${close.map(categoryRow).join("")}
    </table>` : "";

  const body = `
    <p style="margin:0 0 20px;color:${C.text2};font-size:14px;line-height:1.7;">
      ${n ? `${n}, ` : ""}monitoramos seu orçamento hoje e encontramos categorias que precisam de atenção.
    </p>

    ${blownHtml}
    ${closeHtml}

    <div style="height:1px;background:rgba(255,255,255,0.06);margin:0 0 20px;"></div>

    <p style="margin:0 0 20px;color:${C.text3};font-size:13px;line-height:1.6;">
      Ajuste seus gastos ou revise os limites de orçamento diretamente no app.
    </p>

    ${btn("Abrir Orçamento", `${url}/orcamento`)}`;

  const blownCount = blown.length;
  const headline = blownCount > 0
    ? `${blownCount} categoria${blownCount > 1 ? "s" : ""} com orçamento estourado`
    : "Você está próximo do limite em algumas categorias";

  return buildEmail({
    preheader: `${overBudget.length} categoria(s) do seu orçamento precisam de atenção.`,
    overline: "Alerta de orçamento",
    headline,
    sub: "Monitoramento automático do dia.",
    body,
    footerExtra: "Você recebe este alerta porque ativou os alertas de orçamento nas Configurações.",
    unsubUrl: esc(unsubUrl || ""),
  });
}

module.exports = { getBudgetAlertEmailHtml };
