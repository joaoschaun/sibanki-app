# ASAAS — CHECKLIST DE ATIVAÇÃO DO BILLING (substituto do Stripe)

> Contexto (10/06/2026): a ativação da conta Stripe travou no representante
> legal BR. O billing migrou para **Asaas** (aceita conta PF/CPF, Pix + cartão
> + boleto recorrente). O Stripe continua no código como fallback
> (`VITE_BILLING_PROVIDER=stripe`).

## O que já está no código (branch `audit/analise-360`)

- `functions/services/billing/asaasService.js`:
  - **Catálogo server-side** (cliente nunca manda valor): Pro R$ 19,90/178,80 ·
    Família R$ 29,90/274,80.
  - `createAsaasCheckout` (callable): garante customer (usa o CPF do
    `cadastroCompleto`), cria assinatura `billingType: UNDEFINED` (o usuário
    escolhe Pix/cartão/boleto na fatura hospedada do Asaas) e devolve a
    `invoiceUrl` da primeira cobrança (vencimento D+2).
  - `cancelAsaasSubscription` (callable): cancela e volta para `gratuito`.
  - `asaasWebhook` (onRequest): valida `asaas-access-token` **fail-closed**,
    idempotência por evento (`asaas_webhook_events/`),
    `PAYMENT_CONFIRMED/RECEIVED` → ativa plano; `PAYMENT_REFUNDED/CHARGEBACK`
    → revoga; `PAYMENT_OVERDUE` → loga (carência a definir).
- `Settings.tsx`: seletor de 4 planos chama Asaas por padrão
  (`VITE_BILLING_PROVIDER=asaas` em `.env.production`); botão de cancelar.
- `firestore.rules`: cliente não altera `plan`, `planProvider`,
  `asaasCustomerId`, `asaasSubscriptionId`, `asaasPendingPlan`.

## Passos operacionais (João)

### 1. Criar a conta Asaas (~10 min, aceita CPF)
- https://www.asaas.com → criar conta → completar verificação de identidade.
- Recomendado: começar pelo **Sandbox** (https://sandbox.asaas.com) para testar
  o fluxo inteiro sem dinheiro real.

### 2. Pegar a API key
- Painel → Configurações → Integrações → **API Key**.
- Sandbox e produção têm chaves diferentes.

### 3. Configurar secrets nas Functions
```bash
firebase functions:secrets:set ASAAS_API_KEY        # cole a chave
firebase functions:secrets:set ASAAS_WEBHOOK_TOKEN  # invente um token forte (ex.: openssl rand -hex 24)
# produção: definir também ASAAS_ENV=production (sandbox é o default do código)
```

### 4. Cadastrar o webhook no painel Asaas
- Configurações → Integrações → **Webhooks** → novo webhook:
  - URL: `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/asaasWebhook`
  - Token de autenticação: o MESMO valor de `ASAAS_WEBHOOK_TOKEN`
  - Eventos: **Cobranças** (PAYMENT_CONFIRMED, PAYMENT_RECEIVED,
    PAYMENT_OVERDUE, PAYMENT_REFUNDED, PAYMENT_CHARGEBACK_REQUESTED)
  - Fila: sequencial, e-mail de aviso em caso de falha.

### 5. Deploy
```bash
firebase deploy --only functions:createAsaasCheckout,functions:cancelAsaasSubscription,functions:asaasWebhook
firebase deploy --only firestore:rules
npm run deploy:app
```

### 6. Teste ponta a ponta (sandbox)
1. Conta nova no app → completar cadastro (CPF) → Configurações → "Pro mensal".
2. Na fatura Asaas: pagar com Pix de teste do sandbox.
3. Conferir `users/{uid}.plan === 'pro'` e `planProvider === 'asaas'`.
4. Conferir desbloqueio (Open Finance, PDF) e contador de IA sumindo.
5. "Cancelar assinatura" → `plan` volta a `gratuito`.

## Decisões pendentes (produto)
- **Trial:** o fluxo Asaas atual cobra na 1ª fatura (D+2), sem 30 dias grátis.
  Se quiser trial, opções: cupom, ou `nextDueDate` +30 dias com plano ativado
  só após pagamento (sem acesso no trial), ou ativar plano na criação da
  assinatura (trial real, mas abusável sem cartão). Decidir antes do launch.
- **Inadimplência:** hoje `PAYMENT_OVERDUE` só loga. Definir carência (ex.:
  5 dias) e rotina scheduled de downgrade.
- **Taxas Asaas** (conferir no painel): Pix ~1,49% · cartão ~2,9%+R$0,60 —
  melhor que o Stripe BR (3,4%+R$0,60) para o tíquete de R$ 19,90.
