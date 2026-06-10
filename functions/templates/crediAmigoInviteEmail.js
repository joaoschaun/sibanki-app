/**
 * Template — Convite Credi Amigo (empréstimo entre amigos)
 * Pierre Finance identity via emailBase.js
 */
const { esc, fmtBRL, buildEmail, btn, row, C } = require("./emailBase");

function getCrediAmigoInviteEmailHtml(nomeCredor, nomeDev, valor, parcelas, valorParcela, linkConvite, tipoCredor) {
  const nc   = esc(nomeCredor || "");
  const nd   = esc(nomeDev    || "você");
  const link = String(linkConvite || "");

  // tipoCredor = true → nc emprestou para nd (nd deve)
  // tipoCredor = false → nd emprestou para nc (nd tem a receber)
  const deveOuRecebe = tipoCredor ? "VOCÊ DEVE" : "VOCÊ TEM A RECEBER";
  const deveColor    = tipoCredor ? C.red : C.green;
  const overline     = tipoCredor ? "Acordo registrado — dívida" : "Acordo registrado — crédito";
  const headline     = tipoCredor
    ? `${nc} registrou um empréstimo para você`
    : `${nc} registrou que você tem a receber`;
  const sub = tipoCredor
    ? `${nc} emprestou dinheiro para você e está acompanhando no Sibanki.`
    : `${nc} registrou que você tem um valor a receber — acompanhe aqui.`;

  const features = [
    "Acompanhe parcelas pagas e pendentes",
    "Receba lembretes antes do vencimento",
    "Histórico completo e transparente",
  ];

  const featuresHtml = features.map(f => `
    <tr>
      <td style="padding:0 0 10px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="20" style="color:${C.text1};font-size:13px;">✓</td>
            <td style="color:${C.text2};font-size:13px;padding-left:6px;">${esc(f)}</td>
          </tr>
        </table>
      </td>
    </tr>`).join("");

  const body = `
    <!-- Valor em destaque -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 4px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">${deveOuRecebe}</p>
          <p style="margin:0;color:${deveColor};font-size:36px;font-weight:800;letter-spacing:-0.02em;">R$ ${fmtBRL(valor)}</p>
          ${Number(parcelas) > 1
            ? `<p style="margin:6px 0 0;color:${C.text3};font-size:13px;">${parcelas}x de R$ ${fmtBRL(valorParcela)}/mês</p>`
            : `<p style="margin:6px 0 0;color:${C.text3};font-size:13px;">Pagamento único</p>`}
        </td>
      </tr>
    </table>

    <!-- Dados do acordo -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${row("Registrado por", nc)}
      ${row("Plataforma",     "Sibanki Credi Amigo")}
      ${Number(parcelas) > 1 ? row("Parcelas", `${parcelas}x`) : ""}
      ${row("Status", "Aguardando confirmação", { borderBottom: false, color: C.amber })}
    </table>

    <div style="height:1px;background:rgba(255,255,255,0.06);margin:0 0 24px;"></div>

    <!-- Por que criar conta -->
    <p style="margin:0 0 14px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Por que criar sua conta</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${featuresHtml}
    </table>

    ${btn("Ver meu acordo", link)}

    <p style="margin:20px 0 0;color:${C.text4};font-size:12px;line-height:1.6;text-align:center;">
      Leva menos de 1 minuto. Conta gratuita.
    </p>`;

  return buildEmail({
    preheader: tipoCredor
      ? `${nc} registrou que emprestou R$ ${fmtBRL(valor)} para você.`
      : `${nc} registrou que você tem R$ ${fmtBRL(valor)} a receber.`,
    overline,
    headline,
    sub,
    body,
    footerExtra: `Você está recebendo porque ${nc} registrou um acordo com você no Sibanki.`,
  });
}

module.exports = { getCrediAmigoInviteEmailHtml };
