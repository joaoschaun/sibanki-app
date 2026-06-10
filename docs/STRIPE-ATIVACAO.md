# STRIPE — CHECKLIST DE ATIVAÇÃO DO BILLING (Ação #1 da Análise 360)

> Estado em 10/06/2026: o código está pronto (checkout, portal, webhook, allowlist
> de priceId, gating por plano, limite de IA no gratuito). O que falta é 100%
> operacional e só o João pode fazer — passos abaixo.

## O que mudou no código (branch `audit/analise-360`)

1. **Plano não é mais autoeditável.** O toggle "Gratuito/Pro" em Configurações foi
   removido. O plano efetivo vem de `users/{uid}.plan`, gravado apenas pelo webhook
   Stripe (Admin SDK). `firestore.rules` agora bloqueia o cliente de alterar
   `plan` e `stripeCustomerId`.
2. **`useFeatureFlags` confia só em `data.plan`.** Features Pro (Open Finance,
   relatório PDF, voz/foto, WhatsApp, briefing IA) ficam de fato fechadas para free.
3. **Limite de IA no gratuito**: 40 mensagens/mês (env `FREE_AI_MESSAGES_PER_MONTH`),
   server-side em `chatApi`/`chatStreamApi` (`usageLimitService`).
4. **Configurações** ganhou botão "Assinar Sibanki Pro" (createCheckout) e
   "Gerenciar assinatura" (createPortal). O botão de assinar fica desabilitado até
   o priceId ser configurado.

## Passos operacionais — atualização 10/06/2026

### 1. ✅ Produtos/preços criados (27/02/2026) e mapeados (10/06/2026)

| priceId | Plano | Valor |
|---|---|---|
| `price_1T5Fp1Hy6wEjpvXYYPVNuBXT` | Pro mensal | R$ 19,90/mês |
| `price_1T5FqIHy6wEjpvXYjp0CNt9p` | Pro anual | R$ 178,80/ano |
| `price_1T5FreHy6wEjpvXYxDii3kQ9` | Família mensal | R$ 29,90/mês |
| `price_1T5FsWHy6wEjpvXY6y3uvbDA` | Família anual | R$ 274,80/ano |

> ⚠️ **Modo TEST.** A `STRIPE_SECRET` em `functions/.env` é `sk_test` e estes
> priceIds são do ambiente de teste — perfeito para validar o fluxo ponta a
> ponta com cartão `4242…`. Para cobrar de verdade: ativar o modo live no
> Stripe, recriar os 4 preços no live, e sobrescrever via
> `STRIPE_PRICE_TO_PLAN` (secret) + `.env.production` — sem mexer em código.

### 2. ✅ Mapa priceId → plano
Defaults hardcoded em `stripeService.js` (allowlist SEG-Stripe-1 agora é
fail-closed); env `STRIPE_PRICE_TO_PLAN` sobrescreve para o modo live.

### 3. ✅ priceIds no front
`.env.production` na raiz com os 4 `VITE_STRIPE_PRICE_*`. Configurações exibe
os 4 planos (Pro/Família × mensal/anual) com checkout direto.

### 4. Webhook Stripe
- Dashboard → Developers → Webhooks → endpoint:
  `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/stripeWebhook`
- Eventos: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`
- Copiar signing secret → `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`

### 5. Deploy
```bash
firebase deploy --only functions:createCheckout,functions:createPortal,functions:getUserPlan,functions:stripeWebhook,functions:chatApi,functions:chatStreamApi
firebase deploy --only firestore:rules
npm run deploy:app
```

### 6. Teste ponta a ponta (modo teste do Stripe primeiro)
1. Conta nova → Configurações → "Assinar Sibanki Pro" → cartão de teste `4242 4242 4242 4242`.
2. Confirmar que `users/{uid}.plan` virou `pro` após o webhook.
3. Confirmar que Open Finance/PDF desbloquearam e o contador de IA sumiu.
4. Cancelar no portal → confirmar downgrade para `gratuito`.

## Decisões de pricing pendentes (produto)
- Valor do Pro mensal/anual e do Família.
- Teto do gratuito (default atual: 40 mensagens IA/mês; 1 conexão OF já é
  gating de feature, não de quantidade).
- Trial: o checkout está com `trial_period_days: 30` hardcoded em
  `stripeService.js` — confirmar se 30 dias é a intenção.
