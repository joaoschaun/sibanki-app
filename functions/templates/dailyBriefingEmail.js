/**
 * Template — Briefing diário
 * Pierre Finance · ultra-minimalista · "terminal financeiro"
 *
 * Princípio: máximo 4 blocos, máximo 200 palavras.
 * Cada seção só aparece se houver conteúdo.
 */
const { esc, fmtBRL, buildEmail, btn, C } = require("./emailBase");

/**
 * @param {object} opts
 * @param {string}  opts.nome
 * @param {string}  opts.dataLabel       ex: "SEG 09/06"
 * @param {number}  opts.ld              Dias de Liberdade calculados
 * @param {string}  opts.ldTrend         "up" | "down" | "stable"
 * @param {number}  [opts.ldDelta]       Variação vs último registrado
 * @param {Array}   opts.alerts          [{icon, text, value?, color?}]
 * @param {Array}   opts.goals           [{name, pct, remaining?}]
 * @param {string}  [opts.insight]       Insight do dia (1-2 frases)
 * @param {string}  opts.appUrl
 * @param {string}  [opts.unsubUrl]
 */
function getDailyBriefingEmailHtml({
  nome, dataLabel, ld, ldTrend, ldDelta,
  alerts = [], goals = [], insight = "",
  appUrl, unsubUrl,
}) {
  const n   = esc(nome  || "");
  const url = esc(appUrl || "https://virtus-financeiro-cd7bd.web.app");

  // ── Ld hero ────────────────────────────────────────────────────────────────
  const ldColor  = ld >= 180 ? C.green : ld >= 90 ? C.blue : ld >= 30 ? C.amber : C.red;
  const trendIcon = ldTrend === "up" ? "↑" : ldTrend === "down" ? "↓" : "→";
  const trendColor = ldTrend === "up" ? C.green : ldTrend === "down" ? C.red : C.text4;
  const deltaStr = ldDelta && Math.abs(ldDelta) >= 1
    ? ` ${trendIcon}${Math.abs(Math.round(ldDelta))}d`
    : "";

  const ldBlock = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 2px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">Dias de Liberdade</p>
          <p style="margin:0;color:${ldColor};font-size:32px;font-weight:800;letter-spacing:-0.03em;line-height:1;">
            ${Math.round(ld)}<span style="font-size:16px;font-weight:600;color:${C.text3}"> dias</span>
            ${deltaStr ? `<span style="font-size:14px;font-weight:700;color:${trendColor};margin-left:8px;">${esc(deltaStr)}</span>` : ""}
          </p>
        </td>
      </tr>
    </table>`;

  // ── Alertas do dia ─────────────────────────────────────────────────────────
  const alertsBlock = alerts.length > 0 ? `
    <p style="margin:0 0 8px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">Hoje</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0 4px;margin-bottom:20px;">
      ${alerts.map((a, i) => `
        <tr>
          <td style="padding:11px 16px;${i < alerts.length - 1 ? `border-bottom:1px solid rgba(255,255,255,0.05);` : ""}">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:${C.text3};font-size:13px;width:20px;">${a.icon || "·"}</td>
                <td style="color:${C.text2};font-size:13px;padding-left:8px;">${esc(a.text)}</td>
                ${a.value ? `<td style="text-align:right;color:${a.color || C.text1};font-size:13px;font-weight:700;white-space:nowrap;">${esc(a.value)}</td>` : ""}
              </tr>
            </table>
          </td>
        </tr>`).join("")}
    </table>` : "";

  // ── Metas quase batendo ────────────────────────────────────────────────────
  const goalsBlock = goals.length > 0 ? `
    <p style="margin:0 0 8px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">Metas</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:0 4px;margin-bottom:20px;">
      ${goals.map((g, i) => `
        <tr>
          <td style="padding:11px 16px;${i < goals.length - 1 ? `border-bottom:1px solid rgba(255,255,255,0.05);` : ""}">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <span style="color:${C.text2};font-size:13px;">${esc(g.name)}</span>
                  ${g.remaining ? `<span style="color:${C.text4};font-size:11px;margin-left:6px;">faltam R$ ${fmtBRL(g.remaining)}</span>` : ""}
                </td>
                <td style="text-align:right;white-space:nowrap;">
                  <span style="color:${C.green};font-size:13px;font-weight:700;">${Math.round(g.pct)}%</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:5px;">
                  <div style="height:2px;background:rgba(255,255,255,0.06);border-radius:99px;">
                    <div style="height:2px;width:${Math.min(Math.round(g.pct), 100)}%;background:${C.green};border-radius:99px;"></div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`).join("")}
    </table>` : "";

  // ── Insight do dia ─────────────────────────────────────────────────────────
  const insightBlock = insight ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border-left:2px solid rgba(255,255,255,0.12);padding-left:16px;margin-bottom:20px;">
      <tr>
        <td>
          <p style="margin:0 0 2px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">Insight do dia</p>
          <p style="margin:0;color:${C.text2};font-size:13px;line-height:1.65;">${esc(insight)}</p>
        </td>
      </tr>
    </table>` : "";

  const body = `
    ${ldBlock}
    ${alertsBlock}
    ${goalsBlock}
    ${insightBlock}
    ${btn("Abrir o Sibanki", url)}`;

  return buildEmail({
    preheader: `Ld: ${Math.round(ld)} dias${alerts.length ? ` · ${alerts.length} alerta${alerts.length > 1 ? "s" : ""}` : ""}${insight ? " · " + insight.slice(0, 60) + "…" : ""}`,
    overline: dataLabel,
    headline: n ? `Bom dia, ${n}.` : "Bom dia.",
    sub: "Seu briefing financeiro do dia.",
    body,
    footerExtra: "Você recebe este briefing porque ativou o briefing diário nas Configurações.",
    unsubUrl: esc(unsubUrl || ""),
  });
}

module.exports = { getDailyBriefingEmailHtml };
