/**
 * Template e-mail de convite Consórcio Amigos - Sibanki
 * Variáveis: nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, linkConvite
 */
function getConsorcioInviteEmailHtml(nomeAdmin, nomeGrupo, valorParcela, numParticipantes, boloMensal, prazo, linkConvite) {
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmtBRL = (v) => Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const n = esc(nomeAdmin);
  const g = esc(nomeGrupo);
  const link = esc(linkConvite);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Você foi convidado para um Consórcio - Sibanki</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0f1e;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#F59E0B 0%,#EF4444 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
    <img src="https://storage.googleapis.com/app-tess-ai-platform-assets-prod/assets/uploads/313663a4-caf3-472e-813b-9d2995f8297f.png" width="64" height="64" alt="Sibanki" style="border-radius:12px;margin:0 auto 16px;display:block;">
    <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Você foi convidado! 🤝</h1>
    <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:15px;">${n} criou um grupo de consórcio para você</p>
  </td></tr>
  <!-- Banner grupo -->
  <tr><td style="background:#1a1f2e;padding:28px 40px;">
    <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:14px;padding:24px;">
      <p style="color:#F59E0B;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Grupo de Consórcio</p>
      <h2 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 20px;">${g}</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;padding:0 8px 0 0;">
            <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:14px;">
              <p style="color:rgba(255,255,255,.5);font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin:0 0 4px;">Sua contribuição</p>
              <p style="color:#F59E0B;font-size:22px;font-weight:700;margin:0;">R$ ${fmtBRL(valorParcela)}<small style="font-size:13px;color:rgba(245,158,11,.6)">/mês</small></p>
            </div>
          </td>
          <td style="text-align:center;padding:0 8px;">
            <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:14px;">
              <p style="color:rgba(255,255,255,.5);font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin:0 0 4px;">Bolo mensal</p>
              <p style="color:#fff;font-size:22px;font-weight:700;margin:0;">R$ ${fmtBRL(boloMensal)}</p>
            </div>
          </td>
          <td style="text-align:center;padding:0 0 0 8px;">
            <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:14px;">
              <p style="color:rgba(255,255,255,.5);font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin:0 0 4px;">Participantes</p>
              <p style="color:#fff;font-size:22px;font-weight:700;margin:0;">${numParticipantes} <small style="font-size:13px;color:rgba(255,255,255,.4)">por ${prazo} meses</small></p>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </td></tr>
  <!-- Como funciona -->
  <tr><td style="background:#0d1b2a;padding:32px 40px;">
    <h3 style="color:#fff;font-size:18px;font-weight:600;margin:0 0 20px;">Como funciona o consórcio? 🎯</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:0 0 16px;">
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:32px;height:32px;background:rgba(245,158,11,.15);border-radius:8px;text-align:center;line-height:32px;font-size:16px;flex-shrink:0;">💰</div>
          <div style="padding-left:12px;"><p style="color:#fff;font-weight:600;margin:0 0 2px;">Todos contribuem todo mês</p><p style="color:#90A4AE;font-size:13px;margin:0;">Cada participante paga R$ ${fmtBRL(valorParcela)} mensalmente. Sem banco, sem juros.</p></div>
        </div>
      </td></tr>
      <tr><td style="padding:0 0 16px;">
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:32px;height:32px;background:rgba(79,140,255,.15);border-radius:8px;text-align:center;line-height:32px;font-size:16px;flex-shrink:0;">🎲</div>
          <div style="padding-left:12px;"><p style="color:#fff;font-weight:600;margin:0 0 2px;">Sorteio mensal transparente</p><p style="color:#90A4AE;font-size:13px;margin:0;">Todo mês, um participante é sorteado e recebe o bolo de R$ ${fmtBRL(boloMensal)}. O sorteio é auditável e público.</p></div>
        </div>
      </td></tr>
      <tr><td>
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:32px;height:32px;background:rgba(16,185,129,.15);border-radius:8px;text-align:center;line-height:32px;font-size:16px;flex-shrink:0;">🏆</div>
          <div style="padding-left:12px;"><p style="color:#fff;font-weight:600;margin:0 0 2px;">Todo mundo recebe ao final</p><p style="color:#90A4AE;font-size:13px;margin:0;">Em ${prazo} meses, cada um terá recebido o bolo uma vez. Total guardado: R$ ${fmtBRL(boloMensal)} por pessoa.</p></div>
        </div>
      </td></tr>
    </table>
  </td></tr>
  <!-- CTA -->
  <tr><td style="background:#1a1f2e;padding:36px 40px;text-align:center;border-radius:0 0 16px 16px;">
    <p style="color:#90A4AE;font-size:15px;margin:0 0 24px;">O grupo já está configurado. Clique abaixo para ver os detalhes, confirmar sua participação e acompanhar tudo pelo Sibanki — de graça.</p>
    <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#F59E0B,#EF4444);color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:-.3px;">Ver meu grupo →</a>
    <p style="color:#546E7A;font-size:12px;margin:24px 0 0;">Sibanki — Controle Financeiro Inteligente com IA<br>Você está recebendo porque ${n} te incluiu no grupo "${g}"</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = { getConsorcioInviteEmailHtml };
