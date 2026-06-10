/**
 * Template — Boas-vindas (onboarding pós-cadastro)
 * Pierre Finance identity via emailBase.js
 */
const { esc, buildEmail, btn, featureList, C } = require("./emailBase");

function getWelcomeEmailHtml(nome, appUrl) {
  const n = esc(nome || "");
  const url = esc(appUrl || "https://virtus-financeiro-cd7bd.web.app");

  const features = [
    { icon: "💬", title: "Consultor IA 24h",        desc: "Faça qualquer pergunta financeira. A IA conhece todos os seus dados." },
    { icon: "📊", title: "Dias de Liberdade (Ld)",   desc: "Saiba exatamente quantos dias você consegue viver sem renda." },
    { icon: "⚡", title: "Spread Gap (Sg)",           desc: "Veja se seus investimentos rendem mais do que suas dívidas custam." },
    { icon: "🏦", title: "Open Finance",              desc: "Conecte seus bancos e tenha visão completa sem digitar nada." },
    { icon: "🏪", title: "Loja com cashback",         desc: "Compre em lojas parceiras e ganhe SibCoin de volta." },
  ];

  const body = `
    <p style="margin:0 0 24px;color:${C.text2};font-size:14px;line-height:1.7;">
      ${n ? `${n}, sua` : "Sua"} conta está ativa. O Sibanki é um Financial OS — não apenas um app de controle de gastos, mas um sistema que coloca você no comando da sua soberania financeira.
    </p>

    <p style="margin:0 0 16px;color:${C.text3};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">O que você tem agora</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${featureList(features)}
    </table>

    <div style="height:1px;background:rgba(255,255,255,0.06);margin:0 0 24px;"></div>

    <p style="margin:0 0 20px;color:${C.text2};font-size:13px;line-height:1.7;">
      Comece conectando seus bancos via Open Finance — leva menos de 2 minutos e você já enxerga o quadro completo.
    </p>

    ${btn("Abrir o Sibanki", url)}

    <p style="margin:20px 0 0;color:${C.text4};font-size:12px;line-height:1.6;text-align:center;">
      Tem dúvidas? Responda este e-mail — lemos tudo.
    </p>`;

  return buildEmail({
    preheader: "Sua conta está ativa. Comece a construir sua soberania financeira.",
    overline: "Bem-vindo ao Sibanki",
    headline: n ? `Olá, ${n}.` : "Conta ativada.",
    sub: "Seu Financial OS está pronto.",
    body,
    footerExtra: "Você está recebendo porque criou uma conta no Sibanki.",
  });
}

module.exports = { getWelcomeEmailHtml };
