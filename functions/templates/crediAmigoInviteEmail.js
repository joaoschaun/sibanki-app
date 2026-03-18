/**
 * Template e-mail de convite Credi Amigo - Sibanki
 * Variáveis: nomeCredor, nomeDev, valor, parcelas, valorParcela, linkConvite, tipo (emprestou/devia)
 */
function getCrediAmigoInviteEmailHtml(nomeCredor, nomeDev, valor, parcelas, valorParcela, linkConvite, tipoCredor) {
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmtBRL = (v) => Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const nc = esc(nomeCredor);
  const nd = esc(nomeDev || 'você');
  const link = esc(linkConvite);
  // tipoCredor = true: nc emprestou para nd. false: nd emprestou para nc
  const titulo = tipoCredor
    ? `${nc} registrou um empréstimo para você`
    : `${nc} registrou que você emprestou dinheiro`;
  const sub = tipoCredor
    ? `${nc} emprestou R$ ${fmtBRL(valor)} para você e está acompanhando no Sibanki`
    : `${nc} registrou que você tem R$ ${fmtBRL(valor)} a receber`;
  const badge = tipoCredor ? '🏦 Você deve' : '💸 Você tem a receber';
  const badgeBg = tipoCredor ? 'rgba(239,68,68,.12)' : 'rgba(16,185,129,.12)';
  const badgeColor = tipoCredor ? '#EF4444' : '#10B981';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acordo registrado no Sibanki</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0f1e;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#4F8CFF 0%,#7C3AED 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
    <img src="https://storage.googleapis.com/app-tess-ai-platform-assets-prod/assets/uploads/313663a4-caf3-472e-813b-9d2995f8297f.png" width="64" height="64" alt="Sibanki" style="border-radius:12px;margin:0 auto 16px;display:block;">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">${titulo}</h1>
    <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px;">${sub}</p>
  </td></tr>
  <!-- Acordo card -->
  <tr><td style="background:#1a1f2e;padding:28px 40px;">
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:24px;">
      <div style="display:inline-block;background:${badgeBg};color:${badgeColor};padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;margin-bottom:16px;">${badge}</div>
      <div style="text-align:center;margin:8px 0 24px;">
        <p style="color:${badgeColor};font-size:36px;font-weight:800;margin:0;">R$ ${fmtBRL(valor)}</p>
        ${parcelas > 1 ? `<p style="color:#90A4AE;font-size:14px;margin:4px 0 0;">${parcelas}x de R$ ${fmtBRL(valorParcela)}/mês</p>` : `<p style="color:#90A4AE;font-size:14px;margin:4px 0 0;">Pagamento único</p>`}
      </div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,.06);margin:0 0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="color:#90A4AE;font-size:13px;">Registrado por</td>
          <td style="color:#fff;font-size:13px;font-weight:600;text-align:right;">${nc}</td>
        </tr>
        ${parcelas > 1 ? `<tr><td style="color:#90A4AE;font-size:13px;padding-top:8px;">Parcelas</td><td style="color:#fff;font-size:13px;font-weight:600;text-align:right;padding-top:8px;">${parcelas}x</td></tr>` : ''}
        <tr><td style="color:#90A4AE;font-size:13px;padding-top:8px;">Plataforma</td><td style="color:#4F8CFF;font-size:13px;font-weight:600;text-align:right;padding-top:8px;">Sibanki Credi Amigo</td></tr>
      </table>
    </div>
  </td></tr>
  <!-- Por que criar conta -->
  <tr><td style="background:#0d1b2a;padding:28px 40px;">
    <h3 style="color:#fff;font-size:17px;font-weight:600;margin:0 0 18px;">Por que criar sua conta? 🤔</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:0 0 14px;">
        <div style="display:flex;gap:12px;">
          <span style="padding-left:0;color:#4F8CFF;font-size:18px;">✓</span>
          <div style="padding-left:8px;"><p style="color:#fff;font-weight:600;margin:0 0 2px;font-size:14px;">Acompanhe o acordo em tempo real</p><p style="color:#90A4AE;font-size:13px;margin:0;">Veja parcelas pagas, pendentes e histórico completo.</p></div>
        </div>
      </td></tr>
      <tr><td style="padding:0 0 14px;">
        <div style="display:flex;gap:12px;">
          <span style="color:#4F8CFF;font-size:18px;">✓</span>
          <div style="padding-left:8px;"><p style="color:#fff;font-weight:600;margin:0 0 2px;font-size:14px;">Receba lembretes de vencimento</p><p style="color:#90A4AE;font-size:13px;margin:0;">Nunca perca uma data de pagamento.</p></div>
        </div>
      </td></tr>
      <tr><td>
        <div style="display:flex;gap:12px;">
          <span style="color:#4F8CFF;font-size:18px;">✓</span>
          <div style="padding-left:8px;"><p style="color:#fff;font-weight:600;margin:0 0 2px;font-size:14px;">Controle financeiro completo — de graça</p><p style="color:#90A4AE;font-size:13px;margin:0;">Dashboard, metas, investimentos, IA financeira e muito mais.</p></div>
        </div>
      </td></tr>
    </table>
  </td></tr>
  <!-- CTA -->
  <tr><td style="background:#1a1f2e;padding:36px 40px;text-align:center;border-radius:0 0 16px 16px;">
    <p style="color:#90A4AE;font-size:14px;margin:0 0 24px;">Crie sua conta gratuita e acesse o acordo registrado por ${nc}. Leva menos de 1 minuto.</p>
    <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#4F8CFF,#7C3AED);color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;">Ver meu acordo →</a>
    <p style="color:#546E7A;font-size:12px;margin:24px 0 0;">Sibanki — Controle Financeiro Inteligente com IA<br>Você está recebendo porque ${nc} registrou um acordo com você.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = { getCrediAmigoInviteEmailHtml };
