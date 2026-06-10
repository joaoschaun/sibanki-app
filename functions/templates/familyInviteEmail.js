/**
 * Template — Convite Modo Família / Casal
 * Pierre Finance identity via emailBase.js
 */
const { esc, buildEmail, btn, codeBox, featureList, C } = require("./emailBase");

function getFamilyInviteEmailHtml(nomeConvidador, linkAceite, codigoConvite, nomeConvidado) {
  const n  = esc(nomeConvidador || "Seu parceiro(a)");
  const nc = esc(nomeConvidado  || "");
  const link = String(linkAceite || "");
  const code = String(codigoConvite || "");

  const features = [
    { icon: "📊", title: "Dashboard do casal",       desc: "Visão consolidada de receitas, despesas e patrimônio juntos." },
    { icon: "🎯", title: "Metas compartilhadas",      desc: "Criem objetivos juntos e acompanhem o progresso em tempo real." },
    { icon: "💬", title: "IA para o casal",           desc: "Insights baseados nos dados financeiros de ambos." },
    { icon: "🔒", title: "Privacidade individual",    desc: "Cada um mantém sua conta — você decide o que compartilha." },
  ];

  const body = `
    <p style="margin:0 0 20px;color:${C.text2};font-size:14px;line-height:1.7;">
      ${nc ? `<strong style="color:${C.text1};">${nc}</strong>, ` : ""}<strong style="color:${C.text1};">${n}</strong> quer gerenciar as finanças junto com você no Sibanki.
    </p>

    <p style="margin:0 0 16px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Modo Família inclui</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${featureList(features)}
    </table>

    <div style="height:1px;background:rgba(255,255,255,0.06);margin:0 0 24px;"></div>

    ${btn("Aceitar convite", link)}

    <div style="height:20px;"></div>

    ${codeBox(code)}

    <p style="margin:0;color:${C.text4};font-size:12px;line-height:1.6;">
      Se você não esperava este convite, ignore este e-mail com segurança.
    </p>`;

  return buildEmail({
    preheader: `${n} te convidou para gerenciar as finanças juntos no Sibanki.`,
    overline: "Convite — Modo Família",
    headline: `${n} te enviou um convite`,
    sub: "Gerencie as finanças juntos com visão completa e privacidade individual.",
    body,
    footerExtra: `Você está recebendo porque ${n} te enviou um convite no Sibanki.`,
  });
}

module.exports = { getFamilyInviteEmailHtml };
