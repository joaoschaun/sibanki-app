## Visão rápida das Functions do Sibanki

Este arquivo documenta os principais pontos de configuração e o modelo de dados usado pelas Cloud Functions.

---

## Variáveis de ambiente importantes

Todas são lidas via `process.env` (e centralizadas em `config.js`). Em desenvolvimento, podem vir de um `.env`, e em produção devem ser configuradas no Firebase.

- **Stripe / Assinaturas**
  - `STRIPE_SECRET` **(obrigatória)**: chave secreta da API Stripe (secret key).
  - `STRIPE_WEBHOOK_SECRET` (recomendável): segredo do webhook de eventos Stripe.

- **Telegram / Bot**
  - `TELEGRAM_TOKEN` **(obrigatória para o bot)**: token do bot do Telegram gerado pelo @BotFather.

- **WhatsApp / Bot (previsto)**
  - Previsto: bot no WhatsApp com o mesmo conceito do Telegram (lançar gastos, saldo, alertas), via WhatsApp Business API (BSP). Variáveis a definir quando da implementação.

- **Gemini / IA**
  - `GEMINI_KEY` **(obrigatória para IA)**: chave da API do Gemini (`generativelanguage.googleapis.com`).

- **BRAPI / Dados de mercado**
  - `BRAPI_TOKEN` **(recomendável)**: token de acesso à API BRAPI. Sem o token, algumas chamadas podem falhar ou ser limitadas.

- **Notícias**
  - `GNEWS_KEY`: chave da GNews API, usada em `getNews` e `getDailyBriefing`.
  - `NEWSDATA_KEY`: chave da NewsData.io API, usada em `getNews`.
  - `NEWS_API_KEY`: chave da NewsAPI.org, usada pelo comando `/noticias` do bot do Telegram.

---

## Modelo de dados no Firestore

### Coleção `users`

Documento por usuário (`users/{uid}`), com campos principais:

- **Identificação / conta**
  - `name`: nome do usuário (opcional, usado em mensagens do bot).

- **Stripe / Assinaturas**
  - `stripeCustomerId`: ID do cliente no Stripe.
  - `plan`: plano atual (`"free"`, `"pro"`, `"familia"`, etc.).
  - `subscriptionId`: ID da assinatura no Stripe.
  - `subscriptionStatus`: status da assinatura (`"active"`, `"trialing"`, `"past_due"`, `"canceled"`, etc.).
  - `currentPeriodEnd`: ISO string com fim do período atual.
  - `trialEnd`: ISO string com fim do período de teste, se houver.
  - `cancelAtPeriodEnd`: booleano; se `true`, será cancelada no fim do período.
  - `lastPayment`: ISO string da data do último pagamento (atualizado em `invoice.paid`).

- **Telegram / Bot**
  - `telegramChatId`: ID do chat do Telegram (quando vinculado).
  - `telegramUsername`: username do Telegram (se existir).
  - `telegramLinkedAt`: ISO string com data/hora da vinculação.
  - `telegramPrefs` (opcional): preferências de notificações do bot (ex.: recebimento de notícias, relatórios).
  - O código de vinculação é armazenado na coleção **`telegramCodes`** (documento com ID = código, válido 10 min); o bot consulta essa coleção no `/start CODIGO`.

- **Investimentos / Carteira**
  - `investments`: array de objetos, cada um representando um investimento. Campos típicos:
    - `nome` / `name`: nome do ativo.
    - `tipo`: classe do ativo (ex.: `"Ações"`, `"FIIs"`, `"Renda fixa"`, etc.).
    - `valor`: valor investido total.
    - `currentValue` / `atual`: valor atual (se não existir, assume `valor`).

- **Lançamentos financeiros**
  - `entries`: array de lançamentos simples, usados pelo resumo mensal e análises. Campos típicos:
    - `id`: número baseado em `Date.now()` (timestamp).
    - `date`: data no formato `YYYY-MM-DD`.
    - `type`: `"income"` ou `"expense"`.
    - `value`: valor numérico (duas casas).
    - `desc`: descrição textual.
    - `cat`: categoria (ex.: `"Salario"`, `"Outros"`, etc.).
    - `source`: origem (ex.: `"telegram"`).

- **Contas e saldos**
  - `accounts`: array de nomes de contas (ex.: `["Nubank", "Itaú", "Carteira"]`).
  - `accountBalances`: objeto com saldos por conta, ex.:
    - `{ "Nubank": 1200.50, "Itaú": 300.00 }`.

- **Alertas de preço**
  - `priceAlerts`: array de objetos de alerta, usados pelo job `checkPriceAlerts`. Campos:
    - `ticker`: símbolo do ativo (ex.: `"PETR4"`).
    - `condition`: string `">"` ou `"<"`.
    - `price`: valor de gatilho.
    - `created`: ISO string com data/hora de criação.

---

## Coleção `cache`

Usada para reduzir chamadas a APIs externas e melhorar performance.

- **Documento `cache/news_{category}`**
  - Ex.: `news_all`, `news_mercado`, `news_economia`, etc.
  - Campos:
    - `articles`: array de notícias já normalizadas.
    - `updatedAt`: `serverTimestamp` da última atualização.
    - `count`: quantidade de artigos armazenados.
  - TTL lógico: ~30 minutos (checado em código por diferença de tempo).

- **Documento `cache/daily_briefing`**
  - Contém o resumo diário montado por `getDailyBriefing`:
    - `date`: data formatada (pt-BR).
    - `updatedAt`: `serverTimestamp` da última atualização.
    - `market`: objeto com dados do Ibovespa e resumo de mercado.
    - `topGainers`, `topLosers`: arrays com principais altas e baixas.
    - `indices`: dados de índices (`^BVSP`, `^DJI`, `^GSPC`, `^IXIC`).
    - `crypto`: informações básicas de BTC/BRL.
    - `news`: lista curta de notícias destacadas.

---

## Referência rápida das funções principais

Este arquivo não substitui a leitura do código, mas serve como mapa mental:

- **Stripe / Assinaturas**: `createCheckout`, `createPortal`, `getUserPlan`, `stripeWebhook`.
- **BRAPI / Mercado**: `brapiQuote`, `brapiMulti`, `brapiSearch`, `brapiCrypto`, `brapiInflation`.
- **Notícias**: `getNews`, `getDailyBriefing`.
- **Telegram Bot** (em `telegramBot.js`): vinculação via `/start CODIGO` (código em `telegramCodes`); lançamento em **linguagem natural** (ex.: "compras no mercado 350 reais"); comandos `/carteira`, `/cotacao`, `/rentabilidade`, `/analise`, `/resumo`, `/saldo`, `/noticias`, `/alerta`, `/lancar`, `/desconectar`; jobs `checkPriceAlerts`, `dailyNews`, `weeklyReport`.

