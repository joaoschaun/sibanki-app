/**
 * Template — Resumo semanal financeiro
 * Pierre Finance identity via emailBase.js
 */
const { esc, fmtBRL, buildEmail, btn, C } = require("./emailBase");

function getWeeklySummaryEmailHtml(nome, receitaTotal, despesaTotal, topCategorias, periodoInicio, periodoFim, appUrl, unsubUrl) {
  const n      = esc(nome || "");
  const rec    = fmtBRL(receitaTotal  ?? 0);
  const desp   = fmtBRL(despesaTotal  ?? 0);
  const saldo  = Number(receitaTotal ?? 0) - Number(despesaTotal ?? 0);
  const saldoStr = fmtBRL(saldo);
  const saldoColor = saldo >= 0 ? C.green : C.red;
  const inicio = esc(periodoInicio ?? "");
  const fim    = esc(periodoFim    ?? "");
  const url    = esc(appUrl || "https://virtus-financeiro-cd7bd.web.app");
  const unsub  = esc(unsubUrl || "");

  // Top categorias
  const cats = Array.isArray(topCategorias) ? topCategorias.slice(0, 5) : [];
  const maxCatVal = cats.length > 0 ? Math.max(...cats.map(c => Number(c.value) || 0)) : 1;

  const catsHtml = cats.length > 0
    ? cats.map((c, i) => {
        const pct = Math.round((Number(c.value) || 0) / maxCatVal * 100);
        const last = i === cats.length - 1;
        return `
          <tr>
            <td style="padding:10px 0;${last ? "" : `border-bottom:1px solid rgba(255,255,255,0.05);`}">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="color:${C.text2};font-size:13px;">${esc(c.name)}</span>
                  </td>
                  <td style="text-align:right;">
                    <span style="color:${C.text1};font-size:13px;font-weight:600;">R$ ${fmtBRL(c.value)}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:5px;">
                    <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:99px;">
                      <div style="height:3px;width:${pct}%;background:rgba(255,255,255,0.25);border-radius:99px;"></div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
      }).join("")
    : `<tr><td style="padding:12px 0;color:${C.text4};font-size:13px;">Nenhuma despesa no período.</td></tr>`;

  const body = `
    <p style="margin:0 0 20px;color:${C.text2};font-size:14px;line-height:1.7;">
      ${n ? `${n}, aqui está` : "Aqui está"} o resumo financeiro de <strong style="color:${C.text1};">${inicio}</strong> a <strong style="color:${C.text1};">${fim}</strong>.
    </p>

    <!-- KPIs -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td><span style="color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">Receitas</span></td>
              <td style="text-align:right;"><span style="color:${C.green};font-size:15px;font-weight:700;">R$ ${rec}</span></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td><span style="color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">Despesas</span></td>
              <td style="text-align:right;"><span style="color:${C.amber};font-size:15px;font-weight:700;">R$ ${desp}</span></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td><span style="color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">Saldo da semana</span></td>
              <td style="text-align:right;"><span style="color:${saldoColor};font-size:18px;font-weight:800;letter-spacing:-0.01em;">R$ ${saldoStr}</span></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Top categorias -->
    <p style="margin:0 0 12px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Top categorias de despesa</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0 16px;margin-bottom:24px;">
      ${catsHtml}
    </table>

    ${btn("Abrir o Sibanki", url)}`;

  return buildEmail({
    preheader: `Saldo da semana: R$ ${saldoStr} — ${inicio} a ${fim}.`,
    overline: "Resumo semanal",
    headline: "Sua semana financeira",
    sub: `${inicio} — ${fim}`,
    body,
    footerExtra: "Você recebe este e-mail porque ativou o resumo semanal nas Configurações.",
    unsubUrl: unsub,
  });
}

module.exports = { getWeeklySummaryEmailHtml };
