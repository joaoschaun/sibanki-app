/**
 * Template — Convite Consórcio Amigos
 * Pierre Finance identity via emailBase.js
 */
const { esc, fmtBRL, buildEmail, btn, kpi, row, C } = require("./emailBase");

function getConsorcioInviteEmailHtml(nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, linkConvite) {
  const n    = esc(nomeAdmin  || "");
  const g    = esc(nomeGrupo  || "");
  const link = String(linkConvite || "");

  const steps = [
    { icon: "💰", label: "Todos contribuem mensalmente",    desc: `Cada participante paga R$ ${fmtBRL(valorParcela)}/mês. Sem banco, sem juros.` },
    { icon: "🎲", label: "Sorteio mensal transparente",     desc: `Um participante recebe o bolo de R$ ${fmtBRL(boloMensal)}. Auditável e público.` },
    { icon: "🏆", label: "Todo mundo recebe ao final",      desc: `Em ${prazo} meses, cada um terá recebido o bolo uma vez.` },
  ];

  const stepsHtml = steps.map(({ icon, label, desc }) => `
    <tr>
      <td style="padding:0 0 14px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="32" valign="top" style="padding-top:1px;">
              <div style="width:28px;height:28px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:7px;text-align:center;line-height:28px;font-size:13px;">${icon}</div>
            </td>
            <td style="padding-left:12px;">
              <p style="margin:0 0 2px;color:${C.text1};font-size:13px;font-weight:600;">${esc(label)}</p>
              <p style="margin:0;color:${C.text3};font-size:12px;line-height:1.5;">${esc(desc)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join("");

  const body = `
    <!-- Detalhes do grupo -->
    <p style="margin:0 0 6px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Grupo</p>
    <p style="margin:0 0 20px;color:${C.text1};font-size:20px;font-weight:700;letter-spacing:-0.01em;">${g}</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${row("Sua contribuição",   `R$ ${fmtBRL(valorParcela)}/mês`)}
      ${row("Bolo mensal",        `R$ ${fmtBRL(boloMensal)}`)}
      ${row("Participantes",      `${numParticipantes} pessoas`)}
      ${row("Prazo",              `${prazo} meses`, { borderBottom: false })}
    </table>

    <div style="height:1px;background:rgba(255,255,255,0.06);margin:0 0 24px;"></div>

    <!-- Como funciona -->
    <p style="margin:0 0 14px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Como funciona</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${stepsHtml}
    </table>

    ${btn("Ver meu grupo", link)}

    <p style="margin:20px 0 0;color:${C.text4};font-size:12px;line-height:1.6;text-align:center;">
      O grupo já está configurado. Gratuito para participar.
    </p>`;

  return buildEmail({
    preheader: `${n} te adicionou ao grupo de consórcio "${g}" no Sibanki.`,
    overline: "Convite — Consórcio Amigos",
    headline: `Você foi adicionado ao grupo "${g}"`,
    sub: `${n} criou um consórcio entre amigos e incluiu você.`,
    body,
    footerExtra: `Você está recebendo porque ${n} te incluiu no grupo "${g}".`,
  });
}

module.exports = { getConsorcioInviteEmailHtml };
