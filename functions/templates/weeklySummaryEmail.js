/**
 * Template HTML do e-mail de resumo semanal - Sibanki (Resend)
 * Variáveis: nome, receitaTotal, despesaTotal, saldoSemana, topCategorias, periodoInicio, periodoFim, appUrl
 * Estilo alinhado aos outros e-mails (verifyEmail, familyInvite).
 */
function getWeeklySummaryEmailHtml(nome, receitaTotal, despesaTotal, topCategorias, periodoInicio, periodoFim, appUrl) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const n = esc(nome || "Usuário");
  const fmt = (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rec = fmt(receitaTotal ?? 0);
  const desp = fmt(despesaTotal ?? 0);
  const saldo = (Number(receitaTotal ?? 0) - Number(despesaTotal ?? 0));
  const saldoStr = fmt(saldo);
  const inicio = esc(periodoInicio ?? "");
  const fim = esc(periodoFim ?? "");
  const url = esc(appUrl || "https://virtus-financeiro-cd7bd.web.app/app");

  const categoriasHtml = Array.isArray(topCategorias) && topCategorias.length > 0
    ? topCategorias
        .slice(0, 5)
        .map(
          (c) =>
            `<tr><td style="padding:8px 0; border-bottom:1px solid #1A237E;"><span style="color:#CFD8DC;">${esc(c.name)}</span></td><td style="padding:8px 0; border-bottom:1px solid #1A237E; text-align:right; font-weight:600; color:#F59E0B;">R$ ${fmt(c.value)}</td></tr>`
        )
        .join("")
    : "<tr><td colspan=\"2\" style=\"padding:12px 0; color:#546E7A; font-size:14px;\">Nenhuma despesa por categoria na semana.</td></tr>";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu resumo da semana — Sibanki</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0f1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0f1e; padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #4F8CFF 0%, #7C3AED 100%); border-radius:16px 16px 0 0; padding:36px 40px; text-align:center;">
              <img src="https://storage.googleapis.com/app-tess-ai-platform-assets-prod/assets/uploads/313663a4-caf3-472e-813b-9d2995f8297f.png" width="64" height="64" alt="Sibanki" style="border-radius:12px; margin:0 auto 16px; display:block;">
              <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700; letter-spacing:-0.5px;">Sibanki</h1>
              <p style="color:#BFDBFE; margin:6px 0 0; font-size:14px; letter-spacing:1px; text-transform:uppercase;">Resumo da semana</p>
            </td>
          </tr>
          <tr>
            <td style="background:#0d1b2a; padding:40px;">
              <h2 style="color:#ffffff; margin:0 0 8px; font-size:22px; font-weight:600;">Olá, ${n}! 👋</h2>
              <p style="color:#90A4AE; font-size:14px; margin:0 0 24px;">Resumo financeiro de <strong style="color:#fff;">${inicio}</strong> a <strong style="color:#fff;">${fim}</strong>.</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628; border:1px solid #1A237E; border-radius:12px; margin-bottom:24px;">
                <tr><td style="padding:16px 20px; border-bottom:1px solid #1A237E;"><span style="color:#90A4AE;">Receitas</span></td><td style="padding:16px 20px; border-bottom:1px solid #1A237E; text-align:right; font-weight:700; color:#22C55E;">R$ ${rec}</td></tr>
                <tr><td style="padding:16px 20px; border-bottom:1px solid #1A237E;"><span style="color:#90A4AE;">Despesas</span></td><td style="padding:16px 20px; border-bottom:1px solid #1A237E; text-align:right; font-weight:700; color:#F59E0B;">R$ ${desp}</td></tr>
                <tr><td style="padding:16px 20px;"><span style="color:#90A4AE;">Saldo da semana</span></td><td style="padding:16px 20px; text-align:right; font-weight:700; color:${saldo >= 0 ? "#22C55E" : "#EF4444"};">R$ ${saldoStr}</td></tr>
              </table>
              <h3 style="color:#4FC3F7; margin:0 0 12px; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:1.5px;">Top categorias de despesa</h3>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628; border:1px solid #1A237E; border-radius:10px; margin-bottom:24px;">
                ${categoriasHtml}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${url}" style="display:inline-block; background: linear-gradient(135deg, #4F8CFF, #7C3AED); color:#ffffff; text-decoration:none; font-size:16px; font-weight:700; padding:14px 36px; border-radius:10px;">Abrir Sibanki</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#060d1a; border-radius:0 0 16px 16px; padding:24px 40px; text-align:center;">
              <p style="margin:0; color:#546E7A; font-size:12px;">© Sibanki · Suas finanças no controle.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { getWeeklySummaryEmailHtml };
