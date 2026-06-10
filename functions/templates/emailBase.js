/**
 * emailBase.js — Base compartilhada para todos os e-mails Sibanki
 *
 * Identidade: Pierre Finance — monocromático, sem gradientes coloridos,
 * tipografia ALL CAPS nos labels, fundo #0a0a0a, botão branco/preto.
 *
 * Uso:
 *   const { esc, fmtBRL, buildEmail, row, kpi, btn, divider, badge } = require('./emailBase');
 *   return buildEmail({ preheader, headline, sub, body });
 */

// ── Utilitários ───────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Tokens de cor ─────────────────────────────────────────────────────────────
const C = {
  bg:       "#0a0a0a",
  card:     "#111111",
  card2:    "#161616",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  text1:    "#f0f0f0",
  text2:    "#a0a0a0",
  text3:    "#606060",
  text4:    "#404040",
  green:    "#22c55e",
  red:      "#ef4444",
  amber:    "#f59e0b",
  blue:     "#60a5fa",
};

// ── Logo SVG inline (nunca quebra) ────────────────────────────────────────────
const LOGO_SVG = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">
  <rect width="32" height="32" rx="8" fill="#ffffff" fill-opacity="0.08"/>
  <path d="M10 12.5C10 11.12 11.12 10 12.5 10H14.5C15.88 10 17 11.12 17 12.5C17 13.88 15.88 15 14.5 15H12.5C11.12 15 10 16.12 10 17.5C10 18.88 11.12 20 12.5 20H19.5" stroke="#f0f0f0" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="22" cy="12" r="1.5" fill="#f0f0f0"/>
</svg>`;

// ── Componentes reutilizáveis ─────────────────────────────────────────────────

/** Linha de métrica: label + valor */
const row = (label, value, { color = C.text1, borderBottom = true } = {}) => `
  <tr>
    <td style="padding:12px 0;${borderBottom ? `border-bottom:1px solid ${C.border};` : ""}">
      <span style="color:${C.text2};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;">${esc(label)}</span>
    </td>
    <td style="padding:12px 0;text-align:right;${borderBottom ? `border-bottom:1px solid ${C.border};` : ""}">
      <span style="color:${color};font-size:13px;font-weight:700;">${esc(String(value))}</span>
    </td>
  </tr>`;

/** Card de KPI grande */
const kpi = (label, value, { color = C.text1, sub = "" } = {}) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${C.card2};border:1px solid ${C.border};border-radius:10px;margin-bottom:8px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">${esc(label)}</p>
        <p style="margin:0;color:${color};font-size:26px;font-weight:800;letter-spacing:-0.02em;">${esc(String(value))}</p>
        ${sub ? `<p style="margin:4px 0 0;color:${C.text3};font-size:12px;">${esc(sub)}</p>` : ""}
      </td>
    </tr>
  </table>`;

/** Botão CTA principal — branco sobre preto */
const btn = (label, href, { secondary = false } = {}) => `
  <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center"
        style="background:${secondary ? "transparent" : C.text1};border:1px solid ${secondary ? C.border2 : C.text1};border-radius:8px;">
        <a href="${esc(href)}"
          style="display:inline-block;padding:14px 36px;color:${secondary ? C.text2 : C.bg};font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.04em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          ${esc(label)}
        </a>
      </td>
    </tr>
  </table>`;

/** Código de uso único (convites) */
const codeBox = (code) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${C.card2};border:1px solid ${C.border};border-radius:10px;margin:0 0 24px;">
    <tr>
      <td style="padding:20px;text-align:center;">
        <p style="margin:0 0 6px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Ou use o código no app</p>
        <p style="margin:0;color:${C.text1};font-size:32px;font-weight:800;letter-spacing:0.25em;font-family:'Courier New',Courier,monospace;">${esc(code)}</p>
        <p style="margin:6px 0 0;color:${C.text4};font-size:11px;">Válido por 48 horas</p>
      </td>
    </tr>
  </table>`;

/** Divisor */
const divider = () => `<tr><td style="padding:8px 0;"><div style="height:1px;background:${C.border};"></div></td></tr>`;

/** Badge inline */
const badge = (text, { color = C.text2, bg = C.card2 } = {}) =>
  `<span style="display:inline-block;background:${bg};border:1px solid ${C.border};border-radius:99px;padding:3px 10px;color:${color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${esc(text)}</span>`;

/** Lista de features/bullets */
const featureList = (items) =>
  items
    .map(
      ({ icon, title, desc }) => `
      <tr>
        <td style="padding:0 0 16px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="36" valign="top" style="padding-top:2px;">
                <div style="width:28px;height:28px;background:${C.card2};border:1px solid ${C.border};border-radius:7px;text-align:center;line-height:28px;font-size:14px;">${icon}</div>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0 0 2px;color:${C.text1};font-size:13px;font-weight:600;">${esc(title)}</p>
                <p style="margin:0;color:${C.text3};font-size:12px;line-height:1.5;">${esc(desc)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

// ── Wrapper principal ─────────────────────────────────────────────────────────

/**
 * buildEmail({ preheader, overline, headline, sub, body, footerExtra, unsubUrl })
 * → string HTML completa do e-mail
 *
 * @param {object} opts
 * @param {string} opts.preheader     Texto oculto de previsão (inbox preview)
 * @param {string} [opts.overline]    Label ALL CAPS acima do headline (ex: "NOVO CADASTRO")
 * @param {string} opts.headline      Título principal
 * @param {string} [opts.sub]         Subtítulo abaixo do headline
 * @param {string} opts.body          HTML do corpo (dentro do card branco)
 * @param {string} [opts.footerExtra] HTML extra no rodapé (ex: "Você recebe porque...")
 * @param {string} [opts.unsubUrl]    URL de descadastro (opcional)
 */
function buildEmail({ preheader = "", overline = "", headline, sub = "", body, footerExtra = "", unsubUrl = "" }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${esc(headline)} — Sibanki</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};padding:32px 16px 48px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- ── Logo bar ────────────────────────────────────────────────── -->
          <tr>
            <td style="padding:0 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    ${LOGO_SVG}
                    <span style="vertical-align:middle;margin-left:10px;color:${C.text1};font-size:15px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:-0.01em;">Sibanki</span>
                  </td>
                  <td style="text-align:right;">
                    <span style="color:${C.text4};font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">Financial OS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Headline card ───────────────────────────────────────────── -->
          <tr>
            <td style="background:${C.card};border:1px solid ${C.border};border-radius:14px 14px 0 0;padding:32px 36px 28px;">
              ${overline ? `<p style="margin:0 0 10px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${esc(overline)}</p>` : ""}
              <h1 style="margin:0 0 8px;color:${C.text1};font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.25;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${headline}</h1>
              ${sub ? `<p style="margin:0;color:${C.text2};font-size:14px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${sub}</p>` : ""}
            </td>
          </tr>

          <!-- ── Body ────────────────────────────────────────────────────── -->
          <tr>
            <td style="background:${C.card};border-left:1px solid ${C.border};border-right:1px solid ${C.border};border-bottom:1px solid ${C.border};border-radius:0 0 14px 14px;padding:28px 36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              ${body}
            </td>
          </tr>

          <!-- ── Spacer ───────────────────────────────────────────────────── -->
          <tr><td style="height:24px;"></td></tr>

          <!-- ── Footer ──────────────────────────────────────────────────── -->
          <tr>
            <td style="padding:0;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              ${footerExtra ? `<p style="margin:0 0 12px;color:${C.text4};font-size:12px;line-height:1.6;">${footerExtra}</p>` : ""}
              <p style="margin:0 0 8px;">
                <a href="https://sibanki.com.br" style="color:${C.text4};font-size:12px;text-decoration:none;">sibanki.com.br</a>
                <span style="color:${C.text4};font-size:12px;"> · </span>
                <a href="mailto:contato@sibanki.com.br" style="color:${C.text4};font-size:12px;text-decoration:none;">contato@sibanki.com.br</a>
                ${unsubUrl ? `<span style="color:${C.text4};font-size:12px;"> · </span><a href="${esc(unsubUrl)}" style="color:${C.text4};font-size:12px;text-decoration:none;">cancelar e-mails</a>` : ""}
              </p>
              <p style="margin:0;color:${C.text4};font-size:11px;">© ${new Date().getFullYear()} Sibanki — Financial OS Brasileiro</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { esc, fmtBRL, C, buildEmail, row, kpi, btn, codeBox, divider, badge, featureList };
