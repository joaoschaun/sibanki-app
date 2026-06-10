/**
 * Template — Verificação de e-mail
 * Pierre Finance identity via emailBase.js
 */
const { esc, buildEmail, btn, C } = require("./emailBase");

function getVerifyEmailHtml(linkVerificacao) {
  const link = String(linkVerificacao || "");

  const body = `
    <p style="margin:0 0 24px;color:${C.text2};font-size:14px;line-height:1.7;">
      Para ativar sua conta e começar a usar o Sibanki, confirme que este e-mail é seu.
    </p>

    ${btn("Confirmar e-mail", link)}

    <p style="margin:24px 0 0;color:${C.text3};font-size:12px;line-height:1.6;">
      Se o botão não funcionar, copie e cole o link abaixo no navegador:
    </p>
    <p style="margin:6px 0 0;word-break:break-all;">
      <a href="${esc(link)}" style="color:${C.blue};font-size:12px;text-decoration:none;">${esc(link)}</a>
    </p>

    <div style="height:1px;background:rgba(255,255,255,0.06);margin:24px 0;"></div>

    <p style="margin:0;color:${C.text4};font-size:12px;line-height:1.6;">
      Se você não criou uma conta no Sibanki, ignore este e-mail com segurança.
    </p>`;

  return buildEmail({
    preheader: "Confirme seu e-mail para ativar sua conta no Sibanki.",
    overline: "Confirmação de conta",
    headline: "Confirme seu e-mail",
    sub: "Um clique para ativar sua conta e começar.",
    body,
  });
}

module.exports = { getVerifyEmailHtml };
