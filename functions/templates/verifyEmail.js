/**
 * Template HTML do e-mail de verificação de conta - Sibanki (Resend)
 * Variáveis: linkVerificacao
 * Mesmo estilo visual do convite família.
 */
function getVerifyEmailHtml(linkVerificacao) {
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const link = esc(linkVerificacao);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu e-mail - Sibanki</title>
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
              <p style="color:#BFDBFE; margin:6px 0 0; font-size:14px; letter-spacing:1px; text-transform:uppercase;">Controle Financeiro Inteligente</p>
            </td>
          </tr>
          <tr>
            <td style="background:#0d1b2a; padding:40px;">
              <h2 style="color:#ffffff; margin:0 0 16px; font-size:22px; font-weight:600;">Confirme seu e-mail ✉️</h2>
              <p style="color:#90A4AE; font-size:15px; line-height:1.7; margin:0 0 24px;">Você criou uma conta no Sibanki. Clique no botão abaixo para ativar sua conta e começar a usar o app.</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${link}" style="display:inline-block; background: linear-gradient(135deg, #4F8CFF, #7C3AED); color:#ffffff; text-decoration:none; font-size:17px; font-weight:700; padding:18px 48px; border-radius:10px; letter-spacing:0.3px;">Confirmar e-mail</a>
                  </td>
                </tr>
              </table>
              <p style="color:#546E7A; font-size:13px; line-height:1.6; margin:0 0 16px;">Se o botão não funcionar, copie e cole este link no navegador:</p>
              <p style="color:#4FC3F7; font-size:12px; word-break:break-all; margin:0;">${link}</p>
              <p style="color:#37474F; font-size:12px; margin:24px 0 0;">Se você não criou esta conta, ignore este e-mail.</p>
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

module.exports = { getVerifyEmailHtml };
