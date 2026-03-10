/**
 * Template HTML do e-mail de convite Modo Família - Sibanki
 * Variáveis: nomeConvidador, linkAceite, codigoConvite
 * Identidade: Sibanki - emojis e cores atualizadas
 */
function getFamilyInviteEmailHtml(nomeConvidador, linkAceite, codigoConvite) {
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const n = esc(nomeConvidador);
  const link = esc(linkAceite);
  const code = esc(codigoConvite);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite Modo Família - Sibanki</title>
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
              <p style="color:#BFDBFE; margin:6px 0 0; font-size:14px; letter-spacing:1px; text-transform:uppercase;">Controle Financeiro Inteligente com IA</p>
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #EC4899 0%, #F97316 100%); padding:20px 40px; text-align:center;">
              <p style="margin:0; color:#ffffff; font-size:16px;">👪 <strong>${n}</strong> te convidou para o <strong>Modo Família</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background:#0d1b2a; padding:40px;">
              <h2 style="color:#ffffff; margin:0 0 16px; font-size:22px; font-weight:600;">Olá! Você recebeu um convite especial 🎉</h2>
              <p style="color:#90A4AE; font-size:15px; line-height:1.7; margin:0 0 32px;"><strong style="color:#ffffff;">${n}</strong> quer gerenciar as finanças junto com você no Sibanki — o app financeiro mais completo do Brasil. 💰</p>
              <hr style="border:none; border-top:1px solid #1A237E; margin:0 0 32px;">
              <h3 style="color:#4FC3F7; margin:0 0 16px; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:1.5px;">O que é o Sibanki?</h3>
              <p style="color:#90A4AE; font-size:15px; line-height:1.7; margin:0 0 24px;">O Sibanki é uma plataforma financeira completa que une <strong style="color:#fff;">controle de gastos, investimentos com análise fundamentalista, inteligência artificial como consultor pessoal 24h</strong> e comunidade — tudo em um único aplicativo. Mais de <strong style="color:#fff;">15 módulos</strong> para você ter controle total do seu dinheiro. 📊</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
                <tr>
                  <td width="48%" style="background:#0a1628; border:1px solid #1A237E; border-radius:10px; padding:16px; vertical-align:top;">
                    <p style="margin:0 0 6px; font-size:20px;">🤖</p>
                    <p style="margin:0 0 4px; color:#fff; font-size:13px; font-weight:600;">IA Consultora 24h</p>
                    <p style="margin:0; color:#546E7A; font-size:12px; line-height:1.5;">Google Gemini analisa seus dados e dá recomendações personalizadas</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#0a1628; border:1px solid #1A237E; border-radius:10px; padding:16px; vertical-align:top;">
                    <p style="margin:0 0 6px; font-size:20px;">📈</p>
                    <p style="margin:0 0 4px; color:#fff; font-size:13px; font-weight:600;">Investimentos</p>
                    <p style="margin:0; color:#546E7A; font-size:12px; line-height:1.5;">Carteira, análise B3, dividendos e simuladores completos</p>
                  </td>
                </tr>
                <tr><td colspan="3" height="12"></td></tr>
                <tr>
                  <td width="48%" style="background:#0a1628; border:1px solid #1A237E; border-radius:10px; padding:16px; vertical-align:top;">
                    <p style="margin:0 0 6px; font-size:20px;">🎯</p>
                    <p style="margin:0 0 4px; color:#fff; font-size:13px; font-weight:600;">Metas Financeiras</p>
                    <p style="margin:0; color:#546E7A; font-size:12px; line-height:1.5;">Defina objetivos e acompanhe o progresso com sugestões da IA</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#0a1628; border:1px solid #1A237E; border-radius:10px; padding:16px; vertical-align:top;">
                    <p style="margin:0 0 6px; font-size:20px;">🏆</p>
                    <p style="margin:0 0 4px; color:#fff; font-size:13px; font-weight:600;">Gamificação</p>
                    <p style="margin:0; color:#546E7A; font-size:12px; line-height:1.5;">XP, badges e conquistas que desbloqueiam descontos reais</p>
                  </td>
                </tr>
              </table>
              <hr style="border:none; border-top:1px solid #1A237E; margin:0 0 32px;">
              <h3 style="color:#4FC3F7; margin:0 0 16px; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:1.5px;">👪 O Modo Família</h3>
              <p style="color:#90A4AE; font-size:15px; line-height:1.7; margin:0 0 20px;">O Modo Família do Sibanki foi criado para casais e famílias que querem ter <strong style="color:#fff;">visão completa das finanças juntos</strong>, sem abrir mão da privacidade individual.</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
                <tr><td style="padding:10px 0; border-bottom:1px solid #0d2137;"><p style="margin:0; color:#CFD8DC; font-size:14px;">💰 <strong style="color:#fff;">Dashboard do casal</strong> — visão consolidada de receitas, despesas e patrimônio juntos</p></td></tr>
                <tr><td style="padding:10px 0; border-bottom:1px solid #0d2137;"><p style="margin:0; color:#CFD8DC; font-size:14px;">🎯 <strong style="color:#fff;">Metas compartilhadas</strong> — criem objetivos juntos e acompanhem o progresso em tempo real</p></td></tr>
                <tr><td style="padding:10px 0; border-bottom:1px solid #0d2137;"><p style="margin:0; color:#CFD8DC; font-size:14px;">📊 <strong style="color:#fff;">Orçamento familiar</strong> — planejamento por categoria com alertas inteligentes para o casal</p></td></tr>
                <tr><td style="padding:10px 0; border-bottom:1px solid #0d2137;"><p style="margin:0; color:#CFD8DC; font-size:14px;">🤖 <strong style="color:#fff;">IA para o casal</strong> — insights personalizados baseados nos dados financeiros de ambos</p></td></tr>
                <tr><td style="padding:10px 0;"><p style="margin:0; color:#CFD8DC; font-size:14px;">👶 <strong style="color:#fff;">Mesadas para filhos</strong> — gerencie mesadas, missões e educação financeira das crianças</p></td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${link}" style="display:inline-block; background: linear-gradient(135deg, #22C55E, #16A34A); color:#ffffff; text-decoration:none; font-size:17px; font-weight:700; padding:18px 48px; border-radius:10px; letter-spacing:0.3px;">✅ Aceitar Convite e Entrar</a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#0a1628; border:1px solid #1A237E; border-radius:10px; padding:20px; text-align:center;">
                    <p style="margin:0 0 8px; color:#90A4AE; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Ou abra o app e use o código:</p>
                    <p style="margin:0 0 8px; color:#ffffff; font-size:32px; font-weight:700; letter-spacing:8px; font-family: monospace;">${code}</p>
                    <p style="margin:0; color:#546E7A; font-size:11px;">⏱ Válido por 48 horas · 🔐 Dados protegidos</p>
                  </td>
                </tr>
              </table>
              <p style="color:#37474F; font-size:12px; text-align:center; margin:0; line-height:1.6;">Se você não esperava este convite, pode ignorar este email com segurança.<br>Seus dados estão protegidos com criptografia Firebase (Google Cloud).</p>
            </td>
          </tr>
          <tr>
            <td style="background:#060d1a; border-radius:0 0 16px 16px; padding:24px 40px; text-align:center;">
              <img src="https://storage.googleapis.com/app-tess-ai-platform-assets-prod/assets/uploads/313663a4-caf3-472e-813b-9d2995f8297f.png" width="32" height="32" alt="Sibanki" style="border-radius:6px; margin:0 auto 12px; display:block;">
              <p style="margin:0 0 8px; color:#546E7A; font-size:12px;">© 2026 Sibanki · Suas finanças no controle. Com IA. 💰🤖</p>
              <p style="margin:0; font-size:12px;"><a href="https://www.sibanki.com.br" style="color:#4FC3F7; text-decoration:none;">www.sibanki.com.br</a> &nbsp;·&nbsp; <a href="mailto:contato@sibanki.com.br" style="color:#4FC3F7; text-decoration:none;">contato@sibanki.com.br</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { getFamilyInviteEmailHtml };
