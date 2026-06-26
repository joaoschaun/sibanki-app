# Inventário Completo do Sistema Sibanki / Virtus Financeiro

> Gerado em 04/04/2026 — Documentação exaustiva de cada módulo, função, integração e feature.
> Objetivo: servir de base para orquestrar tudo de forma eficiente, limpa e completa.

---

## Sumário

1. [Arquitetura Geral](#1-arquitetura-geral)
2. [Motores de Inteligência (Engines)](#2-motores-de-inteligência-engines)
3. [Hooks Customizados](#3-hooks-customizados)
4. [Serviços Frontend](#4-serviços-frontend)
5. [Contextos e State Management](#5-contextos-e-state-management)
6. [Componentes UI](#6-componentes-ui)
7. [Páginas React](#7-páginas-react)
8. [Cloud Functions — Backend Completo](#8-cloud-functions--backend-completo)
9. [Sentinela — Geofencing Financeiro](#9-sentinela--geofencing-financeiro)
10. [SibCoin — Gamificação](#10-sibcoin--gamificação)
11. [Open Finance (Pluggy)](#11-open-finance-pluggy)
12. [Multi-Tenant SaaS](#12-multi-tenant-saas)
13. [App Legado (Produção)](#13-app-legado-produção)
14. [Painel Admin](#14-painel-admin)
15. [Integrações Externas](#15-integrações-externas)
16. [Mapa de Coleções Firestore](#16-mapa-de-coleções-firestore)
17. [Tipos TypeScript (Contratos)](#17-tipos-typescript-contratos)
18. [Features Parciais e Desconexas](#18-features-parciais-e-desconexas)
19. [Features Exclusivas do Legado](#19-features-exclusivas-do-legado)
20. [Resumo Quantitativo](#20-resumo-quantitativo)

---

## 1. Arquitetura Geral

```
┌────────────────────────────────────────────────────────────┐
│                      FRONTENDS                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Legado (Prod)│  │ React (Stage)│  │ Admin Panel      │   │
│  │ public/app/  │  │ src/ → dist/ │  │ public/admin/    │   │
│  │ 450+ funções │  │ 32 páginas   │  │ 9 módulos        │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
├────────────────────────────────────────────────────────────┤
│                   CLOUD FUNCTIONS (47)                      │
│  33 Callable · 6 HTTP · 6 Scheduled · 1 Trigger · 7 REST   │
├────────────────────────────────────────────────────────────┤
│  IA: Gemini/Claude/Groq/DeepSeek/OpenAI · OCR · STT        │
│  Open Finance: Pluggy (contas/transações/cartões/invest/    │
│    empréstimos/identidade/faturas/consentimentos)            │
│  Sentinela: GPS + Overpass + WhatsApp · Semanal              │
│  SibCoin: 9 missões · 4 tiers · Loja · Bridge Polygon       │
│  Multi-Tenant: Express API · JWT · Roles · Branding          │
│  Billing: Stripe · Resend · WhatsApp · Telegram              │
│  Mercado: BRAPI (B3/crypto/inflação) · CoinGecko             │
│  Social: Credi Amigo · Consórcio Amigos · Comunidade         │
├────────────────────────────────────────────────────────────┤
│                      FIREBASE                               │
│  Firestore · Auth · Storage · Hosting · App Check            │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Motores de Inteligência (Engines)

### 2.1 Motor de Soberania (`sovereigntyEngine.ts`)

**`calculateDaysOfFreedom()`** — Quantos dias o usuário sobrevive sem renda
- Liquidez = saldo das contas (excluindo `incluirNaSoma: false`) + investimentos líquidos (CDB, Tesouro Selic, LCI, LCA, Fundo DI, Poupança)
- Burn rate = média de despesas dos últimos 3 meses / 30
- Renda passiva = investimentos líquidos × taxa mensal (default 1%)
- Dias = liquidez / (burn rate líquido − renda passiva)
- Confiança: ≥70% entries verificados OF → "alta", ≥30% → "média", <30% → "baixa"
- Status: frágil (<30d), em-construção (30-179d), resiliente (180-364d), soberano (1-10a), inabalável (≥10a)

**`calculateSpreadGap()`** — Rendimento vs custo de dívida
- Rendimento ponderado dos investimentos (usa taxaAnual se declarada, senão CDI×0.9)
- Custo ponderado das dívidas (creditObligations + faturas de cartão com rotativo 14% a.m.)
- Spread = rendimento − custo
- Vazamento mensal = |spread| × totalDebt (se negativo)
- Veredicto: alavancagem-inteligente (>0.5%), zona-neutra (±0.5%), ineficiência-moderada (−0.5 a −2%), dreno-crítico (<−2%)

**`calculateSovereigntyScore()`** — Score por transação (Sv 0-100)
- Penalidade por liquidez (0-50 pontos baseado em % do gasto vs liquidez)
- Multiplicador de categoria (essencial=0.3×, investimento=0×, lazer/luxo=1.4×, outros=1×)
- Penalidade por orçamento estourado (+15)
- Penalidade por reincidência (impulseStreak × 5, max 20)
- Dias perdidos = valor / burn rate diário
- Custo de oportunidade 10 anos = valor × (1.008)^120

**`buildSovereigntySnapshot()`** — Orquestra freedom + spread + gera promptContext para LLM

### 2.2 Motor de Decisão (`decisionEngine.ts`)

**`analyzeInstallmentDecision()`** — À vista vs parcelado
- Calcula ganho se investir o valor (CDI) vs custo do desconto perdido
- 5 regras encadeadas: reserva crítica → sem cash → pressão elevada → desconto > rendimento → neutro
- Narrativa estilo Wall Street + Estoicismo para cada veredicto

**`analyzeDebtPayoffStrategy()`** — Avalanche vs bola de neve
- Avalanche: maior taxa primeiro (padrão)
- Bola de neve: se ≥3 dívidas pequenas (<R$500)
- Calcula meses para quitar cada dívida e economia de juros

**`analyzeFgtsAmortization()`** — Amortizar financiamento com FGTS
- Compara rendimento FGTS (3.5% a.a.) vs taxa do financiamento
- Calcula nova parcela (Price), economia mensal e breakeven
- Vale a pena se taxa financiamento > 5.25% a.a. (quase sempre no BR)

**`analyzeEmergencyReserve()`** — Meses de reserva recomendados
- CLT=3, aposentado=4, MEI/PJ=6, autônomo=8 (+2 se dependentes)

### 2.3 Perfil Financeiro (`financialProfile.ts`)

**`buildFinancialProfile()`** — Perfil consolidado do usuário
- **Cashflow**: receita/despesa/saldo/taxa de poupança do mês
- **Liquidez**: saldo disponível (contas com incluirNaSoma)
- **Orçamentos**: categorias rastreadas, quantas estouraram
- **Metas**: total, completas, próximas de completar (≥70%)
- **Investimentos**: total aplicado, valor atual, tem carteira
- **Crédito**: via `buildCreditSnapshot()`
- **Health Level**: crítico/pressão/atenção/saudável
- **Journey Stage**: primeiros-passos/organizando-base/pressionado/estabilizando/pronto-para-crescer
- **Top Signals**: até 5 sinais descritivos
- **Next Best Actions**: até 3 ações recomendadas (mapeadas para rotas)

### 2.4 Credit Snapshot (`creditSnapshot.ts`)

**`buildCreditSnapshot()`** — Indicadores de pressão de crédito
- Consolida cartões, creditAccounts, creditObligations, recorrentes tipo dívida
- Calcula: limite total, uso, disponível, utilização %, compromisso mensal, vencendo em 7 dias
- Pressure Level: controlado/atenção/elevado/crítico
- Merge com snapshot persistido (nunca retrocede)

### 2.5 FinScore (`calculateScore.ts`)

**`calculateFinScore()`** — Score 0-100 em 6 componentes
| Componente | Max | Critério top |
|---|---|---|
| Taxa de poupança | 30 | ≥20% |
| Reserva de emergência | 20 | ≥6 meses |
| Aderência orçamento | 15 | 0% estourado |
| Pressão de crédito | 15 | Controlado |
| Progresso metas | 10 | 100% média |
| Consistência entries | 10 | ≥12 em 30d |

### 2.6 Contexto do Consultor (`consultantContext.ts`)

**`buildFinancialContextString()`** — String completa para o LLM
- 9 blocos: cashflow, top categorias, metas, contas com saldo projetado, investimentos, orçamentos, cartões, recorrentes, soberania (via `buildSovereigntySnapshot`)

### 2.7 Persona IA — Arquiteto Soberano (`sovereignSystemPrompt.js`)

- Identidade: leal à liberdade financeira, Wall Street + Estoicismo
- 8 regras invioláveis (nunca sugerir risco sem reserva, comparar com CDI, etc.)
- Árvore de decisão à vista vs parcelado (4 passos)
- Regras do mercado brasileiro (tributação, consórcio, FGTS, cartão)
- Formato: 300-500 palavras, emojis moderados
- Base RAG: 13 chunks de conhecimento financeiro brasileiro

---

## 3. Hooks Customizados (11)

| Hook | Estado | Efeitos | Callbacks | O que faz |
|---|---|---|---|---|
| `useAuth` | 2 (user, loading) | 1 | 0 | Firebase Auth state listener |
| `useFinancialData` | 4 (data, overflow, loading, error) | 2 snapshots + 2 memos | 0 | Real-time Firestore + merge inline/overflow + FinScore |
| `useTheme` | 1 (theme) | 1 persist | 1 toggle | Tema claro/escuro (localStorage + data-theme) |
| `useLanguage` | 1 (language) | 1 persist | 0 | Idioma pt-BR/en-US (localStorage + html lang) |
| `useDashboardMode` | 1 (mode) | 1 persist | 0 | Dashboard padrão vs caixa (localStorage) |
| `useSuggestiveMode` | 1 (suggestive) | 1 persist | 2 (toggle, set) | IA proativa vs silenciosa (localStorage) |
| `useSentinelaGeo` | 1 state + 1 ref | 0 | 2 (check, reset) | GPS → Overpass → cenário → alerta → WhatsApp |
| `useSibcoin` | 4 (loading, missionsLoading, missions, lastEvent) | 1 auto-fetch | 2 (triggerEvent, fetchMissions) | Gamificação: saldo, tier, missões, eventos |
| `useSibcoinToast` | 0 (store singleton) | 0 | 1 (triggerWithToast) | Toasts de missão completa (4s auto-dismiss) |
| `useCommunityFeed` | 3 (posts, loading, error) | 1 snapshot | 0 | Feed comunidade real-time (50 posts) |
| `usePushNotifications` | 4 (permission, token, loading, error) | 1 SW registration | 1 requestPermission | Notificações Push: registro de sw, geração de token FCM e gravação no Firestore |


---

## 4. Serviços Frontend (5)

### `persistUserData.ts` (754 linhas — arquivo central)

Todas as operações CRUD do Firestore:

| Função | O que faz |
|---|---|
| `updateUserDoc(uid, payload)` | Merge + recalcula finScore se campos financeiros mudaram |
| `addEntry` / `updateEntry` / `deleteEntry` | CRUD entries (inline + overflow com Pluggy) |
| `addTransfer` | Cria 2 entries (despesa + receita) com `isTransfer: true` |
| `addAccount` / `deleteAccount` / `renameAccount` / `updateAccountBalance` / `updateAccountMeta` | CRUD contas (rename atualiza entries inline + overflow) |
| `addCard` / `updateCard` / `deleteCard` | CRUD cartões |
| `addCardPurchase` / `deleteCardPurchase` / `importCardPurchases` | Compras com parcelas + billingMonth + entries vinculados |
| `getBillingMonth(card, date)` | Calcula mês de faturamento baseado no dia de fechamento |
| `addGoal` / `updateGoal` / `deleteGoal` | CRUD metas (id via crypto.randomUUID) |
| `addInvestment` / `updateInvestment` / `deleteInvestment` | CRUD investimentos |
| `addRecurrent` / `deleteRecurrent` | CRUD recorrentes |
| `generateEntriesFromRecurrents` | Gera entries do mês (tags rc_*, frequências: mensal/semanal/quinzenal/bimestral/trimestral/semestral/anual) |
| `updateBudgets` / `updateCommProfile` / `setCommBookmarks` | Orçamentos e comunidade |
| `setCreditAccounts` / `setCreditObligations` / `setCreditSnapshot` | Dados de crédito |
| `resetUserData` | Zera tudo (deleta overflow, preserva nome/email) |

### `platformEvents.ts`
- `trackPlatformEvent(name, payload)` — Telemetria via CF, payload sanitizado, nunca quebra UX

### `saveFeedback.ts`
- `saveFeedback(payload)` — Grava em `feedbacks/` com serverTimestamp

### `brapi.ts`
- `fetchB3Quote(ticker)` — Cotação B3 via CF proxy (preço, variação, DY, P/E, setor)

### `community.ts`
- `addCommunityPost()` — Post na coleção `community`
- `toggleCommunityLike()` — Like/unlike via arrayUnion/arrayRemove

---

## 5. Contextos e State Management

### `AppContext.tsx` (Provider central)
- Combina `useAuth` + `useFinancialData` + `buildFinancialProfile`
- **Efeitos automáticos**:
  - SibCoin: dispara `open_finance_connected` quando OF ativa (1x por uid)
  - Auto-sync Pluggy: se dados stale >6h, sincroniza automaticamente (1x/dia)
  - Login streak: dispara `login_streak` SibCoin (1x/dia)
- Expõe: `syncOpenFinance()`, `dataFreshness`, `verifiedEntries`, `manualEntries`, `financialProfile`

### `IntelligenceContext.tsx`
- Calcula `calculateDaysOfFreedom` + `calculateSpreadGap` como memos
- Expõe: `freedom`, `spread`, `healthLevel`, `journeyStage`, `nextBestActions`, `isReady`

### `useUiStore` (Zustand)
- `sidebarCollapsed`, `activeSection`, `toggleSidebar`

---

## 6. Componentes UI (26)

### Em Uso Ativo (20)

| Componente | Onde | Destaques |
|---|---|---|
| `Header` | App shell | Avatar dropdown (6 itens), tema, feedback, notificações, logout |
| `Sidebar` | App shell | 14 itens em 3 seções, accordion "Mais", collapse animado |
| `Modal` | 9 páginas | Escape, click-fora, scroll lock |
| `SovereigntyHero` | Dashboard | Saudação, Ld (dias de liberdade), Sg (spread), variações, glow por tier |
| `SpreadGapCard` | Dashboard | Barras comparativas rendimento vs juros, vazamento mensal, CTA |
| `InvestmentInsights` | Growth | Raio X: rentabilidade, renda passiva, FIRE barra, alinhamento de perfil |
| `InsightDoDia` | Dashboard | Modo Gemini (API) ou legado (heurísticas), cache diário, suggestiveMode |
| `CoachSetup` | Dashboard | Checklist 6 passos, barra de progresso, dismiss |
| `SovereigntyBadge` | Transactions | Badge Sv por transação, popup com custo 10 anos |
| `BriefingModal` | App shell | Resumo diário ao logar (receita/despesa/saldo/insight) |
| `OnboardingTour` | App shell | 15 passos com emojis, progress bar, CTAs |
| `FeedbackModal` | Header | 3 categorias, título, descrição, envio para Firestore |
| `OpenFinanceConnect` | Settings | Widget Pluggy, sandbox automático, sync pós-conexão |
| `EntryForm` | Transactions | Receita/despesa com RecurrenceModal interno (7 frequências) |
| `TransferForm` | Transactions | Formulário entre contas com validação |
| `SibcoinWidget` | Dashboard | Saldo, tier, progresso, missões expansíveis |
| `SibcoinToastContainer` | App shell | Pilha de toasts com slideIn animation, aria-live |
| `SibcoinMissionBanner` | 7 páginas | Banner contextual da próxima missão por eventType |
| `ErrorBoundary` | Todas as rotas | Captura erros, fallback customizável |

### Órfãos — Prontos mas Não Usados (6)

| Componente | Funcionalidade | Potencial |
|---|---|---|
| `ProventosBarChart` | Barras de proventos (verde) | Para Growth/Investments |
| `PortfolioChart` | Pizza donut alocação | Para Growth/Dashboard |
| `BudgetBarChart` | Barras horizontais orçamento | Para Budget |
| `BalanceAreaChart` | Área de saldo com gradiente + linha zero | Para Reports/Dashboard |
| `ExpensesPieChart` | Pizza despesas com labels % | Para Reports |
| `FinancialBarChart` | Barras receita vs despesa | Para Reports/Dashboard |

---

## 7. Páginas React (32)

### Índice de Complexidade

| Página | Estados | Modais | Handlers | Contextos | Status |
|---|---|---|---|---|---|
| Home | 1 | 0 | 0 | App+Intelligence | ✅ |
| Dashboard | 2 | 0 | 0 | App+Intelligence+Sentinela+DashMode | ✅ |
| Transactions | 8+reducer | 3 | 6 | App+SibcoinToast | ✅ |
| Accounts | 16 | 6 | 5 | App | ✅ |
| Cards | ~20 | 6 | 6 | App | ✅ |
| Recurring | 10 | 2 | 3 | App | ✅ |
| Planning | 8 | 3 | 3 | App+SibcoinToast | ✅ |
| Budget | 5 | 1 | 2 | App+SibcoinToast | ✅ |
| Growth | ~20 | 4 | 6 | App+SibcoinToast | ✅ |
| Tools | 1 | 0 | 1 | Nenhum | ✅ |
| Consultant | 6 | 0 | 3 | App | ✅ |
| Reports | 4 | 0 | 0 | App | ✅ (botão IA fake) |
| Calendar | 3 | 1 | 3 | App | ✅ |
| Achievements | 0 | 0 | 0 | App | ✅ (persistência?) |
| Profile | ~15 | 0 | 5 | App+SibcoinToast | ✅ |
| Settings | 8 | 1 | ~8 | App+Theme+Lang+DashMode+Suggestive | ✅ |
| Social | 8 | 1 | 4 | App+CommunityFeed | ⚠️ Parcial |
| Education | 4 | 0 | 1 | Nenhum | ⚠️ Parcial |
| CreditHub | 2 | 0 | 0 | App | ⚠️ CTAs mortos |
| Cripto | 6 | 0 | 2 | App | ⚠️ Demo |
| MeuCpf | 2 | 0 | 0 | App | ⚠️ Demo |
| MeusBoletos | 3 | 0 | 0 | App+SibcoinToast | ⚠️ Demo |
| Loja | 4 | 1 | 2 | SibCoin | ⚠️ Resgate local |
| Sibcoin | 1 | 0 | 0 | SibCoin | ✅ |
| Login | 9 | 0 | 4 | Nenhum | ✅ |
| NotFound | 0 | 0 | 0 | Nenhum | ✅ |
| 4× Solutions | 0 | 0 | 0 | Nenhum | 📋 Placeholder |

---

## 8. Cloud Functions — Backend Completo (48 funções)

### Callable (33)

| Função | Área | Descrição |
|---|---|---|
| `chatApi` | IA | Chat consultor (Gemini→Groq→DeepSeek→OpenAI→Claude + RAG + persona) |
| `proactiveInsightApi` | IA | Insight proativo do dia (JSON estruturado) |
| `briefingIa` | IA | Insight pós-login com fallback local |
| `callClaude` | IA | Proxy Anthropic Claude (admin-only opcional, model: opus-4.6) |
| `aiCategorizeCsv` | IA (v2) | Categorização CSV em lote (max 50, 17 categorias canônicas) |
| `brapiQuote/Multi/Search/Crypto/Inflation` | Mercado | Proxy BRAPI (5 endpoints) |
| `pluggyCreateConnectToken` | OF | Token para widget Pluggy |
| `pluggySyncAccounts` | OF | Sync completa (contas/trans/cartões/invest/empréstimos/extras) |
| `registrarOpenBanking` | OF | Marca flag no Firestore |
| `createCheckout/Portal` | Billing | Checkout e portal Stripe |
| `getUserPlan` | Billing | Consulta plano |
| `generateWhatsAppCode` | WhatsApp | Código 6 dígitos (TTL 10min) |
| `sendWhatsApp*` | WhatsApp | 4 funções de convite (família/consórcio/crediAmigo) |
| `sendFamilyInviteEmail` | E-mail | Convite família (Resend + WhatsApp) |
| `sendVerificationEmail` | E-mail | Verificação (Resend) |
| `sendConsorcioInvite` | Social | Convite consórcio (Resend + WhatsApp) |
| `sendCrediAmigoInvite` | Social | Convite credi amigo (Resend) |
| `trackPlatformEvent` | Analytics | Telemetria (allowlist 6 eventos) |
| `triggerSibcoinEvent` | SibCoin (v2) | Evento gamificação transacional |
| `getSibcoinMissions` | SibCoin (v2) | Lista missões com progresso |
| `adminCreditSibcoin` | SibCoin (v2) | Crédito admin (claim required) |
| `creditarCashbackSibCoin` | Parceiros | Cashback (idempotente por contratoId) |
| `registrarCliqueSolucao` | Parceiros | Analytics de clique |
| `sentinelaGeoCheck` | Sentinela | GPS → cenário → alerta → WhatsApp |
| `validateAdminAccess/revokeAdminAccess` | Admin | Custom Claims |

### HTTP/Webhooks (7)

| Função | Descrição |
|---|---|
| `api` (Express) | REST Multi-Tenant: 7 rotas em /api/v1/tenants |
| `chatStreamApi` | Chat consultor com streaming (Gemini) — CORS sem App Check |
| `whatsappWebhook` | Bot completo: vinculação, saldo, resumo, metas, wizard, IA |
| `stripeWebhook` | Eventos de pagamento |
| `telegramWebhook` | Bot: cotação, saldo, lançar, IA, alertas, notícias |
| `getNews` | Notícias agregadas (GNews/NewsData/RSS) |
| `getDailyBriefing` | Briefing diário mercado |
| `webhookParceiro` | Webhook externo (secret header) |


### Scheduled (6)

| Função | Frequência | Descrição |
|---|---|---|
| `weeklySummary` | Seg 08:00 BRT | E-mail resumo semanal (Resend) |
| `processarFiliadosDiario` | 24h | Programa filiado: SibCoins por ativação/OF/Pro |
| `sentinelaWeekly` | Seg 08:00 BRT | Relatório semanal WhatsApp (Ld, Sg, orçamento) |
| `checkPriceAlerts` | 15min (horário comercial) | Alertas de preço Telegram |
| `dailyNews` | 09:00 BRT | Notícias Telegram |
| `weeklyReport` | Seg 08:00 BRT | Resumo semanal Telegram |

### Serviços Backend (16+)

| Serviço | Arquivos | Destaques |
|---|---|---|
| **LLM Multi-Provider** | llmService, claudeProxy, csvCategorizer, brazilianFinanceKnowledge, sovereignSystemPrompt | 5 provedores com circuit breaker, cache 1h, RAG, persona |
| **OCR** | ocrService | Vision + Tesseract (NÃO exposto como CF) |
| **STT** | sttService | Groq Whisper + Google Speech (NÃO exposto como CF) |
| **WhatsApp** | whatsappService, whatsappNotifications | Bot completo, wizard multi-turn, consultor IA com memória 30min |
| **Pluggy** | pluggyService, pluggySyncService, syncOFExtras, entryOverflow | Pipeline completo: sync 90 dias, dedup, overflow >2800 |
| **Sentinela** | sentinelaGeoService, sentinelaWeeklyService | GPS (10 cenários) + Semanal (Ld/Sg/orçamento) |
| **SibCoin** | rewardEngine | 9 missões, 4 tiers, transação atômica |
| **Tenant** | tenantService, tenantRoutes | CRUD, resolução por host/slug, cache 5min |
| **User** | userService | Criação, convites, migração legado |
| **Admin** | adminAuth | Custom Claims por e-mail |
| **Billing** | stripeService | Checkout, portal, webhook |
| **Market** | brapiService | 5 endpoints BRAPI |
| **News** | newsService | Agregação multi-fonte com cache Firestore |
| **Entry Wizard** | entryWizard | Máquina de estados para lançamento guiado |
| **Telegram** | telegramBot | Bot completo com 10+ comandos |

---

## 9. Sentinela — Geofencing Financeiro

### 9.1 Sentinela GPS (tempo real)

**Pipeline:** Celular → GPS → Overpass API (OSM) → Cenário → Mensagem personalizada → WhatsApp

**10 cenários financeiros:**

| Cenário | Template de alerta |
|---|---|
| 🚗 Concessionária | CET, CDC bancário, carro como passivo, Ld impacto |
| 🛍 Shopping | Protocolo anti-impulso 72h, "mais liberdade ou tira?" |
| 📱 Eletrônicos | Simulador à vista vs parcelado, Ld por R$1000 |
| 💍 Joalheria | Juros embutidos, luxo consciente vs no limite |
| 🛒 Supermercado | Orçamento Alimentação gasto/limite, lista fechada |
| 🏦 Banco | Perguntas pro gerente (CET, portabilidade), "decide em casa" |
| 💊 Farmácia | Genérico −70%, Farmácia Popular, manipulação |
| 🍽 Restaurante | 15-25% do orçamento familiar, orçamento Alimentação |
| 👕 Roupas | Moda rápida = passivo, regra "só compra se doou" |
| 🛋 Móveis | 30% margem para desconto à vista, parcelado 24x |

Cada mensagem inclui **Ld** (Dias de Liberdade) e **Sg** (Spread Gap) do usuário.

### 9.2 Sentinela Semanal (proativo)

**Toda segunda-feira por WhatsApp:**
1. Ld com semáforo (🟢≥365, 🔵≥180, 🟡≥90, 🔴<90)
2. Sg com veredicto (positivo ou vazamento mensal)
3. Top 3 categorias acima do orçamento
4. Ação prioritária personalizada da semana
5. Processamento em lotes de 10 com pausa 1s (rate limit WhatsApp)

---

## 10. SibCoin — Gamificação

### Missões (9)

| Missão | Evento | Frequência | Recompensa |
|---|---|---|---|
| Primeiro Lançamento | entry_added | once | 50 SC |
| Primeiro Objetivo | goal_created | once | 100 SC |
| Open Finance | open_finance_connected | once | 200 SC |
| Primeiro Investimento | investment_added | once | 150 SC |
| Semana Financeira (5 entries) | entry_added | weekly | 30 SC |
| Check-in Diário | login_streak | daily | 10 SC |
| Orçamento Definido | budget_created | once | 75 SC |
| Perfil Completo | profile_completed | once | 100 SC |
| Primeiro Boleto DDA | dda_boleto_detected | once | 80 SC |

### Tiers
| Tier | Threshold | Cor |
|---|---|---|
| Bronze | 0 SC | #cd7f32 |
| Prata | 500 SC | #c0c0c0 |
| Ouro | 2.000 SC | #ffd700 |
| Diamante | 10.000 SC | #b9f2ff |

### Ecosistema
- **Widget** no Dashboard (saldo, tier, progresso, missões)
- **Banners** contextuais em 7 páginas
- **Toasts** animados ao completar missão
- **Loja** com cashback multiplicado por tier
- **Programa de Filiados**: indicados pendentes → SibCoins por ativação/OF/Pro
- **Cashback parceiros**: emp_pessoal 2%, emp_fgts 1.5%, emp_veiculo 2.5%, seg_celular/vida 3%, cons_imovel 1%
- **Bridge Polygon**: mencionado como "em breve" (blockchain)

---

## 11. Open Finance (Pluggy)

### Pipeline de Sync (`pluggySyncAccounts`)
1. Lê itemIds conectados do usuário
2. Busca todas as contas → `accounts[]`, `accountBalances{}`, `accountMeta{}`
3. Busca transações 90 dias → dedup por `pluggyTransactionId` → `entries[]`
4. Se >2.800 entries → arquiva em `entriesOverflow/pg_{id}`
5. Busca cartões crédito → `cards[]`
6. Busca investimentos → `investments[]`
7. Busca empréstimos → `creditAccounts[]` + `creditObligations[]`
8. Sync extras: identidade (mascarada), faturas cartão, consentimentos
9. Recalcula `creditSnapshot` e `finScore`
10. Grava tudo com merge

### Dados Disponíveis
| Recurso | Status | Campos |
|---|---|---|
| Contas e saldos | ✅ Synced | nome, tipo, saldo, banco |
| Transações (90d) | ✅ Synced | desc, valor, data, categoria |
| Cartões de crédito | ✅ Synced | nome, limite, fatura |
| Investimentos | ✅ Synced | nome, tipo, valor, taxa |
| Empréstimos | ✅ Synced | saldo devedor, parcelas, taxa |
| Identidade | ✅ Synced | nome, documentos mascarados |
| Faturas cartão | ✅ Synced | vencimento, total, mínimo |
| Consentimentos | ✅ Synced | contagem por item |

---

## 12. Multi-Tenant SaaS

### Infraestrutura
- **API REST**: 7 rotas Express com JWT + roles
- **Middleware**: `requireAuth` → `requireSuperAdmin/TenantAdmin/SameTenant`
- **Resolução**: por host (domínio customizado) ou slug
- **Cache**: TTL 5 minutos
- **Planos**: starter (100 users), growth (1.000), enterprise (∞)
- **Frontend**: `TenantProvider` com CSS vars, favicon, title por tenant
- **Firestore Rules**: isolamento completo por tenant

### Fluxo
1. Superadmin cria tenant via POST /api/v1/tenants
2. Tenant recebe config default + 8 categorias
3. Custom Claims setadas no Firebase Auth (tenantId + role)
4. Convites com código hex 8 chars (TTL 72h)
5. Migração de usuário legado: copia dados + subcoleções

---

## 13. App Legado (Produção)

`public/app/app.js` — **450+ funções globais** em 37 áreas:

| Área | Funções chave |
|---|---|
| Auth | doLogin, doReg, doGoogle, doOut, doForgotPassword, checkAuthInviteHash |
| Onboarding | sibOnbRenderBanks, CEP via ViaCEP, validação CPF |
| Wizard Cadastro | sibCadShow/Save/Render (5 etapas: nome→CPF→telefone→perfil→objetivos) |
| Persistência | loadData, saveData, applyDocFromServer, resetAllDataAndRestart |
| Dashboard | renderDashboard, initWidgets (drag & drop), checkFirstSteps |
| Lançamentos | addLanc, editLanc, deleteLanc, filterLanc, transferencia |
| Cartões | addCard, editCard, deleteCard, addFatura, importFatura |
| Investimentos | addInvestimento, B3 análise (FIIs/ETFs/BDRs), proventos, perfil |
| Metas | addMeta, updateMeta, deleteMeta |
| Orçamento | initOrcamento, saveOrcamento |
| Calendário | renderCalendar, navigateMonth |
| Recorrentes | procRc (gera entries do mês), addRecorrente |
| Consultor IA | chatIA, showIA, hideIA, FAB, voz (?voice=/?siba=) |
| Relatórios | renderRelatorio, exportPDF |
| Perfil | loadPerfilData, savePerfilDados, avatar, segurança |
| Família | initCasal, syncCasal, financasFilhos |
| Credi Amigo | initCrediAmigo, addEmprestimo |
| Consórcio | initConsorcioAmigos, criarGrupo, sorteio |
| Comunidade | initComunidade, addPost, toggleLike |
| Score | calcFinScore, getLevel, renderScoreDetail |
| Notificações | showNotifs, analyzeWithIA, clearNotifs |
| Feature Flags | SIBANKI_FEATURES, hasFeature, requireFeature, upsell |
| Filiados | gerarCodigoFiliado, getNivelFiliado, initFiliado |
| Flash Banners | renderFlashBanners, dismissBanner |
| Tour | initTour, showTourStep, spotlight |
| i18n | data-i18n + i18n.js |
| Tema | toggleTheme (dark/light) |
| Educação | trilhas, calculadoras, conquistas |
| Ferramentas | 8 simuladores |

---

## 14. Painel Admin

9 módulos em `public/admin/index.html`:

| Módulo | Funcionalidades |
|---|---|
| Dashboard | KPIs, gráficos cadastros/planos, alertas, status features, changelog |
| Métricas | DAU, uso por módulo, cohort D1/D7/D30 |
| Usuários | Busca por e-mail, tabela com plano e datas |
| Feature Flags | Grid flags, salvar, adicionar custom |
| Planos & Billing | MRR, funil, alterar plano por e-mail |
| Feedbacks | KPIs, filtros, tabela, detalhe, mudança de status |
| Redes Sociais IA | Gerador por plataforma (IG/LinkedIn/X/YouTube) com Claude |
| Calendário Conteúdo | Grade mensal, gerar mês com IA, estratégia editorial |
| Brand Intelligence | KPIs, concorrentes, insights Claude, gaps conteúdo |

---

## 15. Integrações Externas (18)

| Integração | Onde | Status |
|---|---|---|
| Google Gemini (Flash) | LLM principal, Telegram | ✅ Ativo |
| Anthropic Claude (Haiku+Opus) | LLM fallback, admin | ✅ Ativo |
| Groq (Llama 3.3 70B) | LLM fallback, STT | ✅ Ativo |
| DeepSeek | LLM fallback | ⚠️ Key pendente prod |
| OpenAI (GPT-4o-mini) | LLM fallback | ✅ Ativo |
| Pluggy (Open Finance) | Sync completa | ✅ Ativo |
| BRAPI | Cotações B3/crypto/inflação | ✅ Ativo |
| CoinGecko | Preços crypto (frontend) | ✅ Ativo |
| Meta WhatsApp Cloud API | Bot + notificações | ✅ Ativo |
| Telegram Bot API | Bot completo | ✅ Ativo |
| Stripe | Assinaturas Pro | ✅ Ativo |
| Resend | E-mails transacionais | ✅ Ativo |
| OpenStreetMap Overpass | Sentinela GPS | ✅ Ativo |
| GNews / NewsData / NewsAPI | Notícias | ✅ Ativo |
| Google Vision | OCR comprovantes | 🔧 Implementado, NÃO exposto |
| Google Speech-to-Text | Transcrição áudio | 🔧 Implementado, NÃO exposto |
| ViaCEP | Endereço por CEP (legado) | ✅ Ativo (legado) |
| Firebase App Check | Proteção endpoints | ✅ Opcional |

---

## 16. Mapa de Coleções Firestore

| Coleção | Uso principal |
|---|---|
| `users/{uid}` | Documento principal: entries, accounts, cards, goals, investments, budgets, recurrents, crédito, SibCoin, OF, CPF, DDA |
| `users/{uid}/entriesOverflow/` | Entries Pluggy arquivados (>2.800) |
| `users/{uid}/platform_events/` | Telemetria de uso |
| `users/{uid}/sibcoin/` | Transações SibCoin |
| `users/{uid}/filiado/dados` | Programa filiado |
| `users/{uid}/indicados/` | Indicados do programa filiado |
| `users/{uid}/consorcio_grupos/` | Grupos de consórcio |
| `users/{uid}/crediamigo/` | Empréstimos Credi Amigo |
| `users/{uid}/ddaBoletos/` | Boletos DDA |
| `whatsappCodes/{code}` | Códigos de vinculação WhatsApp (TTL 10min) |
| `community/` | Posts da comunidade |
| `feedbacks/` | Feedbacks dos usuários |
| `invites/` | Convites família |
| `consorcio_invites/` | Convites consórcio |
| `crediamigo_invites/` | Convites credi amigo |
| `platform_events/` | Cópia global de telemetria |
| `cashback_log/` | Log de cashback parceiros |
| `sol_cliques_global/` | Analytics de cliques em soluções |
| `config/filiado` | Config programa filiado |
| `tenants/{id}` | Dados do tenant (nome, plano, branding, features) |
| `tenants/{id}/users/{uid}` | Usuários do tenant |
| `tenants/{id}/invites/{code}` | Convites do tenant |
| `tenants/{id}/config/default` | Config default do tenant |
| `tenants/{id}/categories/` | Categorias do tenant |

---

## 17. Tipos TypeScript (Contratos)

### Tipos Core (`userData.ts`)
- `UserData` (documento completo), `Entry`, `Card`, `CardPurchase`, `Goal`, `Investment`, `Recurrent`
- `CreditAccount`, `CreditObligation`, `CreditSnapshot`, `InvestorProfile`
- `CommProfile`, `CommPost`, `CpfMonitoringSnapshot`, `DdaBoleto`
- `SibcoinTransaction`, `SibcoinEventType` (16 eventos)

### Tipos Plataforma (`platform.ts`)
- `FinancialHealthLevel`, `CreditPressureLevel`, `JourneyStage`, `PlatformEventName`
- `FinancialProfileInput`, `ConsolidatedFinancialProfile`

### Tipos Expansão (`modules.ts`)
- **Cripto**: CryptoAsset, CryptoHolding, CryptoTrade, CryptoStakingPosition, CryptoIREvent, CryptoPortfolioSnapshot
- **Loja**: StoreProduct, AffiliateClick, StoreOrder
- **CPF**: CpfMonitorEvent, CpfNegativacao, CpfConsulta, CpfBehavioralScore
- **DDA**: DdaBoletoParsed, DdaSyncLog, DdaAlertConfig, DdaInsight
- **SibCoin**: SibcoinMission, MissionProgress
- **Parceiros**: PartnerOffer

### Tipos Open Finance (`openFinance.ts`)
- `OpenFinanceIdentitySnapshot`, `OpenFinanceCreditBill`, `OpenFinanceConsentItemSummary`

---

## 18. Features Parciais e Desconexas

### ✅ Corrigidos (Fase 0 — 04/04/2026)

| Feature | Correção | Arquivo |
|---|---|---|
| Botão IA nos Relatórios | Agora chama `chatApi` com contexto financeiro real | Reports.tsx |
| Checkboxes e-mail/alertas | Conectados a estado + persistem via `handleSaveIntegrations` | Settings.tsx |
| Resgate na Loja SibCoin | Debita `sibcoinBalance`, registra em `sibcoinHistory` via Firestore | Loja.tsx |
| Conquistas (Achievements) | Auto-persistem novas badges via `updateUserDoc` | Achievements.tsx |
| Sentinela Weekly | Reescrito para ler documento flat `users/{uid}` (era subcoleções inexistentes) | sentinelaWeeklyService.js |
| 3 gráficos órfãos (PortfolioChart, ProventosBarChart, BudgetBarChart) | Plugados em Growth e Budget | Growth.tsx, Budget.tsx |
| ~76 scripts órfãos na raiz (.py/.cjs) | Removidos | — |
| .gitignore | Adicionado `dist/`, `test-results/`, `playwright-report/` | .gitignore |

### ⚠️ Backend pronto mas NÃO exposto

| Feature | Implementação | Potencial |
|---|---|---|
| OCR de comprovantes | ocrService.js (Vision + Tesseract) | Fotografar recibo → lançamento automático |
| Speech-to-Text | sttService.js (Groq Whisper + Google Speech) | "Gastei 50 reais no mercado" → entry |

### ⚠️ Módulos Demo (UI rica, sem integração real)

| Módulo | O que funciona | O que é demo |
|---|---|---|
| Cripto | Preços CoinGecko ao vivo | Carteira, trade, staking, RWA |
| MeuCpf | Score ring visual | Negativações, consultas, proteção |
| MeusBoletos | Banner SibCoin | Central DDA, alertas, agendamento |
| CreditHub | Visão geral com dados reais | CTAs "Pagar", "Simular", "Negociar" |

### 🔧 Código órfão remanescente

| Item | Descrição |
|---|---|
| Placeholder.tsx | Página genérica — rotas já apontam para páginas completas |
| Sidebar props (email/score) | Recebidos mas prefixados com _ |

### 📋 Decisão sobre módulos demo

**Recomendação:** Manter os 4 módulos demo (Cripto, MeuCpf, MeusBoletos, CreditHub) pois já possuem UI completa e agregam valor visual/engajamento. Cada um deve ser marcado com badge "Em breve" nos CTAs falsos, evitando frustração do usuário.

| Módulo | Ação recomendada | Prioridade |
|---|---|---|
| Cripto | Manter — preços reais CoinGecko. Marcar carteira/trade como "em breve" | Baixa |
| MeuCpf | Manter visual. Integrar com API de score real quando disponível | Média |
| MeusBoletos | Manter. Integrar com DDA/Open Finance quando disponível | Média |
| CreditHub | Manter — já usa dados reais. Remover CTAs que não funcionam | Alta |

---

## 19. Features Exclusivas do Legado (Não Migradas)

| Feature | Impacto | Complexidade |
|---|---|---|
| Wizard cadastro completo (CPF/ViaCEP/renda/objetivos) | 🔴 Alto | Média |
| Feature Flags com upsell (SIBANKI_FEATURES) | 🔴 Alto | Média |
| Programa de Filiados (códigos, níveis, SibCoins) | 🔴 Alto | Alta |
| Consultor IA com voz (?voice=/?siba=) | 🟡 Médio | Média |
| Flash banners dinâmicos | 🟡 Médio | Baixa |
| Dashboard drag & drop | 🟡 Médio | Alta |
| Notificações com análise IA | 🟡 Médio | Média |
| i18n completo (data-i18n) | 🟡 Médio | Alta |
| Credi Amigo (produto social) | 🟡 Médio | Alta |
| Consórcio entre Amigos | 🟡 Médio | Alta |
| Finanças dos Filhos | 🟡 Médio | Média |
| Convite por hash (auth) | 🟢 Baixo | Baixa |

---

## 20. Resumo Quantitativo

| Métrica | Quantidade |
|---|---|
| Páginas React (legado) | 32 |
| Componentes UI | 34 (31 ativos + 3 órfãos) |
| Hooks customizados | 14 |
| Serviços frontend | 5 |
| Engines/utilitários | 10 |
| Tipos/interfaces | 70+ |
| Páginas React | 36 |
| Cloud Functions | 49 |
| Serviços backend | 16+ |
| Integrações externas | 18 |
| Coleções Firestore | 24+ |
| Funções do legado | 450+ |
| Módulos do legado | 22+ abas |
| Módulos admin | 9 |
| Missões SibCoin | 9 |
| Cenários Sentinela | 10 |
| Provedores LLM | 5 (com circuit breaker) |
| Features parciais/demo | 4 demo + 2 backend não exposto (6 corrigidas na Fase 0) |
| Features não migradas | 1 (Tour por módulo — refinamento) |
| Testes CI | GitHub Actions + ~91% cobertura backend |

---

## Próximo Passo

### ✅ Fase 0 concluída (04/04/2026)
- Features fake corrigidas (Reports IA, Settings checkboxes, Loja SibCoin, Achievements)
- Sentinela Weekly alinhado ao modelo flat Firestore
- 76 scripts órfãos removidos, .gitignore atualizado
- 3 gráficos plugados (PortfolioChart, ProventosBarChart, BudgetBarChart)

### ✅ Fase 1 concluída (04/04/2026)
- **OCR exposto** — `ocrToEntry` Cloud Function (foto → lançamento via Google Vision / Tesseract + LLM)
- **STT exposto** — `sttToEntry` Cloud Function (áudio → lançamento via Groq Whisper / Google Speech + LLM)
- Bug corrigido no `sttService.js` (dupla chamada ao provedor removida)
- **3 gráficos plugados no Dashboard** — `ExpensesPieChart`, `FinancialBarChart`, `BalanceAreaChart`
- Imports inline de Recharts removidos do Dashboard em favor dos componentes dedicados
- **Wizard de Cadastro** migrado para React (`src/components/onboarding/RegistrationWizard.tsx`)
  - 4 etapas: Identidade (CPF validado), Contato (CEP via ViaCEP), Financeiro, Objetivos
  - Salva em Firestore como `cadastroCompleto` + sincroniza `displayName`
  - Aparece automaticamente para usuários sem cadastro completo
- **Feature Flags** migrado para React (`src/hooks/useFeatureFlags.ts`)
  - 11 features configuradas com plano mínimo e override remoto via Firestore
  - `hasFeature(key)` e `requireFeature(key)` com info de upsell
  - Inclui novas features: `ocr_foto`, `stt_voz`

### ✅ Fase 2 concluída (04/04/2026)
- **OCR/STT integrados no frontend** — botões "Foto" e "Voz" em Transactions
  - Foto: seleção de imagem → `ocrToEntry` → modal de confirmação → lançamento salvo
  - Voz: gravação via MediaRecorder → `sttToEntry` → modal de confirmação → lançamento salvo
  - Modal de pré-visualização mostra texto extraído/transcrição + dados parseados pela IA
- **SpotlightTour** criado (`src/components/ui/SpotlightTour.tsx`)
  - Overlay SVG com máscara para destaque do elemento
  - Tooltip posicionado automaticamente (acima/abaixo do spotlight)
  - Reposicionamento contínuo (200ms tick + resize)
  - Persistência de conclusão por módulo via Firestore (`tourModulos`)
  - 6 passos globais definidos + `data-tour` attributes na Sidebar e Header
- **Programa de Filiados** migrado para React (`src/pages/Filiados.tsx`)
  - Gate por plano (Pro/Família)
  - Geração automática de código de 6 caracteres
  - Link de indicação com cópia e compartilhamento via WhatsApp
  - 4 níveis (Iniciante → Parceiro → Embaixador → Elite) com multiplicadores
  - 3 tipos de recompensa (Ativação, Open Finance, Pro) com multiplicador aplicado
  - Lista de indicados com filtro por status
  - Dados em subcoleção `filiado/dados` + `indicados/{uid}`
  - Rota `/filiados` registrada + link na Sidebar
- **Imports não usados limpos** do Header (Download, Eye) e Dashboard (Shield)
- **Decisão sobre módulos demo** documentada: manter todos com badge "em breve" nos CTAs falsos

### ✅ Fase 3 concluída (04/04/2026)
- **Sistema de Referral** implementado (`src/hooks/useReferral.ts`)
  - `captureRefParam()` captura `?ref=CODIGO` da URL e salva no localStorage
  - `useReferral()` vincula o referral após login: atualiza `refCode`, `refFiliadoUid`, `refRegistradoEm` no Firestore e incrementa `totalIndicados` do filiado
  - Integrado no App.tsx (executado no carregamento + hook no AuthenticatedShell)
- **SpotlightTour integrado** no App.tsx
  - Tour global com 6 passos dispara automaticamente para novos usuários
  - Persistência via Firestore (`tourModulos.global`)
- **CTAs demo marcados com "Em breve"** em 4 páginas
  - Cripto: overlay `ComingSoonOverlay` em Carteira, Trade, Staking, RWA
  - MeuCpf: overlay em Negativações, Consultas, Proteção
  - MeusBoletos: overlay em Agendamento, Inteligência
  - CreditHub: badge `ComingSoonBadge` em "Pagar fatura", "Simular antecipação", "Renegociar", "Simular portabilidade", e action buttons do Plano de Ação
  - Componentes reutilizáveis criados: `ComingSoonBadge` e `ComingSoonOverlay`
- **Importação CSV/OFX** migrada para React (`src/components/import/ImportEntries.tsx`)
  - Suporte a 3 formatos: CSV (auto-detect separador, Nubank/Inter/C6/BTG), OFX/QFX, texto colado
  - Auto-detecção de categoria por regex (11 regras de keywords)
  - Preview com tabela, seleção individual, edição de categoria por item
  - Drag-and-drop de arquivo + input file
  - Confirmação com contagem e valor total
  - Botão "Importar" integrado no header de Transactions
  - Limite de 5MB por arquivo, feedback de sucesso

### ✅ Fase 4 concluída (04/04/2026)
- **Feature Flags integrados** nas páginas:
  - Consultor IA: gate por `ia_consultor` com tela de upsell para plano free bloqueado
  - Reports: botão PDF protegido por `relatorio_pdf`, desabilitado com ícone de cadeado para free
- **IA Categorizer integrado** na importação CSV/OFX
  - Botão "IA Categorizar" usa a Cloud Function `aiCategorizeCsv` (Gemini Flash batch)
  - Processa até 50 itens por chamada, atualiza categorias no preview inline
- **Backup/restore JSON** já funcional no Settings (verificado e confirmado)
  - Export: todas as coleções (entries, investments, goals, budgets, categories, accounts, recurrents, cards)
  - Import: merge com dados existentes + feedback detalhado
- **Processamento de referral no backend** já funcional (`processarFiliadosDiario`)
  - Bug corrigido em `emitirSibCoin`: agora lê nível real do filiado (era hardcoded nível 0)
  - 3 critérios verificados diariamente: ativação (30d+5 lançamentos), Open Banking, assinatura Pro
  - Crédito de SibCoins com multiplicador por nível + atualização de nível automática

### ✅ Fase 5 concluída (04/04/2026)
- **Build de produção** passou sem erros (51 chunks, 10.14s, 2706 módulos)
  - CSS: 100 kB (gzip 15 kB)
  - JS total: ~2.3 MB (gzip ~700 kB) com code splitting eficiente
  - Vendor chunks separados: react (163 kB), charts (413 kB), firebase (497 kB), pdf (625 kB)
- **Testes Playwright** criados para React staging (`tests/react-smoke.spec.js`)
  - Login e redirecionamento para Home
  - 24 rotas validadas individualmente (sem erros JS críticos)
  - Testes de features Fase 0-4: gráficos Dashboard, botões OCR/STT/Importar, Filiados, Cripto "Em breve", Backup JSON
  - Projeto `react-smoke` adicionado ao `playwright.config.cjs` (baseURL: staging)
- **Layout / responsivo (mobile ~320px):** projeto `react-smoke-mobile-layout` (preset Pixel 5) + `tests/react-smoke-mobile-layout.spec.cjs` — valida ausência de overflow horizontal no `documentElement` em rotas críticas; `#root { overflow-x: clip }` em `src/index.css` como barreira global (scroll horizontal intencional permanece em filhos, ex.: abas do Hub de Crédito).
- **Cronograma de cutover** documentado (`docs/CRONOGRAMA-CUTOVER.md`)
  - Fase A: Staging validado (Semana 1)
  - Fase B: Beta controlado 5-10 usuários (Semana 2)
  - Fase C: Cutover parcial — React como padrão, legado em `/app-legado/` (Semana 3)
  - Fase D: Desligamento do legado (Semana 5+)
  - Plano de rollback e tabela de riscos/mitigações
- **API Multi-Tenant documentada** (`docs/API-MULTITENANT.md`)
  - 8 endpoints: Create, Resolve, Get, Branding, Features, Add User, Consume Invite, Stats
  - Modelo de autenticação JWT com custom claims (tenantId, role)
  - 3 roles: user, admin, superadmin
  - 3 planos: starter (100), growth (1000), enterprise (ilimitado)
  - Cache em memória com TTL 5 min
  - Migração de usuário legado documentada
  - Modelo Firestore completo

### ✅ Fase 6 concluída (04/04/2026)
- **Deploy staging realizado** — React live em https://staging-13a0b.web.app
  - Build: 2708 módulos, 53 chunks, 100 kB CSS + ~2.3 MB JS (gzip ~700 kB)
  - Dois deploys: inicial + re-deploy com polimentos UX
- **Componente `EmptyState`** criado (`src/components/ui/EmptyState.tsx`)
  - Reutilizável: ícone, título, descrição, ação (link ou callback)
  - Aplicado em: Accounts, Planning, Cards, Recurring (4 páginas)
  - Substitui textos genéricos por empty states visuais com CTA
- **Componente `PageTransition`** criado (`src/components/ui/PageTransition.tsx`)
  - Animação fade-in + slide-up ao entrar na página
  - `StaggerItem` para animação escalonada de listas
  - Aplicado em: Dashboard, Transactions
- **Animações CSS nativas** adicionadas ao `index.css`
  - `@keyframes si-fade-in`, `si-slide-up`, `si-slide-up-sm`
  - Classes: `.animate-in`, `.fade-in`, `.slide-in-from-bottom-*`, `.duration-*`
- **Responsividade mobile refinada** via media query `max-width: 639px`
  - Redução de tamanhos de título (3xl→1.5rem, 2xl→1.25rem)
  - Padding e gaps reduzidos para telas pequenas
- **Logger estruturado** melhorado (`functions/logger.js`)
  - Severity levels compatíveis com Google Cloud Logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - Novo: `logWarn()`, `logCritical()`, `timer()` para métricas de latência
  - `timer()` aplicado em: `chatApi`, `ocrToEntry`, `sttToEntry`
  - Logs incluem `durationMs` automático para rastreamento de performance
  - Stack traces truncados (5 linhas) para reduzir ruído

### ✅ Fase 7 concluída (04/04/2026)
- **Cloud Functions deployed** — 44 funções atualizadas/criadas em produção
  - 4 novas: `ocrToEntry`, `sttToEntry`, `sentinelaGeoCheck`, `sentinelaWeekly`
  - 6 obsoletas removidas: `callClaude`, `dailySentinelBot`, `extractEntryApi`, `revokeAdminAccess`, `triggerSentinelAlert`, `validateAdminAccess`
  - Logging com `timer()` ativo em `chatApi`, `ocrToEntry`, `sttToEntry`
- **PWA completa** — app instalável em mobile e desktop
  - `manifest.json` atualizado com categorias, lang, scope
  - Ícones SVG gerados (192px, 512px) — "S" azul com ponto verde
  - `index.html` com meta tags: `theme-color`, `apple-mobile-web-app-capable`, `apple-touch-icon`
  - Service Worker (`public/sw.js`):
    - Cache shell: `/`, `/manifest.json`, ícones
    - Estratégia cache-first para `/assets/` (bundles JS/CSS)
    - Network-first com fallback offline para navegação
    - Auto-cleanup de caches antigos no `activate`
  - Registro condicional em `main.tsx` (`import.meta.env.PROD`)
- **Staging re-deployed** — https://staging-13a0b.web.app com PWA ativa
- **Lints verificados** — sem erros novos introduzidos (apenas warnings pré-existentes de inline CSS)

### ✅ Fase 8 concluída (04/04/2026)
- **Testes Playwright** — 39 testes criados e executados:
  - 30 testes de smoke (24 rotas + login + features) — skipped sem credenciais, estrutura validada
  - 9 testes PWA/performance — **todos passaram** (manifest, ícones, SW, meta tags, load <5s, sem erros JS)
  - Teste renomeado para `.cjs` (compatibilidade com `"type": "module"`)
  - Projeto `react-smoke` atualizado para incluir `lighthouse-audit.spec.cjs`
- **Acessibilidade corrigida**:
  - Dashboard: `title="Fechar alerta"` no botão de reset do Sentinela
  - Transactions: `htmlFor`/`id` pareados em 5 elementos (3 selects + 2 date inputs)
- **Notificações push (FCM)** integradas:
  - Hook `usePushNotifications.ts` criado:
    - Verifica suporte do navegador e status de permissão
    - Solicita permissão e obtém token FCM via lazy import
    - Salva token em Firestore (`fcmTokens` array + `notificacoesPush` flag)
    - Tratamento de erro e estados de loading
  - UI em Settings → Notificações: botão "Ativar" / badge "Ativo" / "Não suportado"
  - FCM carregado via dynamic import para não impactar bundle principal
- **Staging re-deployed** — https://staging-13a0b.web.app com todas as melhorias

### ✅ Fase 9 concluída (04/04/2026)
- **Cloud Functions de push** — 2 novas funções deployadas:
  - `dailyPushAlerts` (scheduled, todo dia 09:00 BRT):
    - Busca todos os usuários com `notificacoesPush: true`
    - Verifica orçamentos: alerta em 80% (warning) e 100% (estourado) por categoria
    - Verifica faturas de cartão: alerta quando faltam 0-3 dias para vencimento
    - Limpa tokens FCM inválidos automaticamente
  - `sendPushNotification` (callable):
    - Permite envio de push para o próprio usuário ou outro (admin/superadmin)
    - Validação de permissões via customClaims
  - Serviço modular em `functions/services/push/pushService.js`
- **Firebase Messaging Service Worker** — `public/firebase-messaging-sw.js`:
  - Registra handler para notificações em background
  - Exibe notificação nativa com ícone, badge e ação "Abrir"
  - Click na notificação navega para URL específica (ex.: `/orcamento`, `/cartoes`)
- **Onboarding PWA + Push** — componente `InstallPrompt.tsx`:
  - Prompt de instalação PWA via `beforeinstallprompt` (com dismiss persistente)
  - Prompt de ativação de push após 10s (quando permissão é "default")
  - UI moderna com cards flutuantes, animação slide-in, posição bottom-right
  - Ambos os prompts são dismissíveis e armazenam estado no localStorage
  - Integrado globalmente em `App.tsx` para todos os usuários logados
- **Staging re-deployed** — https://staging-13a0b.web.app com push + install prompt
- **48 Cloud Functions** no projeto (46 1st Gen + 2 2nd Gen em southamerica-east1)

### ✅ Fase 10 concluída (04/04/2026)
- **Documentação de produção** — `docs/CONFIGURACAO-PRODUCAO.md`:
  - Instruções exatas para configurar DEEPSEEK_KEY, VAPID_KEY, credenciais de teste
  - Status de todas as integrações (Stripe, Resend, WhatsApp, Pluggy, etc.)
- **Health-check endpoint** — `GET /api/health`:
  - Verifica Firestore, Firebase Auth, e todas as API keys configuradas
  - Retorna JSON com status `ok` ou `degraded` + detalhes por serviço
  - IAM configurado para acesso público (allUsers invoker)
  - Integrado ao Express principal (`functions/index.js`)
- **Script de pré-cutover** — `scripts/pre-cutover-check.mjs`:
  - 21 checks automáticos (13 frontend + 8 backend)
  - Frontend: HTML, React root, manifest, PWA meta tags, SW, FCM SW, ícones
  - Backend: health endpoint, Firestore, Auth, Gemini, Stripe, WhatsApp, Pluggy, DeepSeek
  - Resend tratado como warning (opcional)
  - Exit code 0 = pronto para cutover; 1 = correções necessárias
  - **Resultado atual: 21/21 ✅ — Sistema PRONTO para cutover**
- **ErrorBoundary melhorado** — `src/components/ui/ErrorBoundary.tsx`:
  - UI com ícone AlertTriangle, mensagens claras
  - Botão "Tentar novamente" + botão "Início" como fallback
  - Detecção de erros repetidos (>= 3x): esconde retry, sugere voltar ao início
  - Envia erro para analytics via `platformEvents.trackEvent`
- **Cronograma de cutover atualizado** — `docs/CRONOGRAMA-CUTOVER.md`:
  - Pré-requisitos atualizados (21 items, 18 ✅ + 3 manuais)
  - Fase A expandida com script de prontidão + testes de push/PWA
  - Riscos atualizados com mitigações novas (ErrorBoundary, health-check, tokens)
- **Staging re-deployed** — https://staging-13a0b.web.app

### ✅ Validação com credenciais reais (04/04/2026)
- **VAPID_KEY configurada** — `.env` com `VITE_VAPID_KEY`, staging re-deployed
- **RESEND_API_KEY configurada** — adicionada ao `functions/.env`, functions re-deployed
- **Health-check 22/22** — `node scripts/pre-cutover-check.mjs` retorna 100% verde
- **Playwright 39/39 testes passaram** com credenciais reais:
  - 9 PWA/Performance (manifest, SW, ícones, meta tags, load <5s, sem erros JS)
  - 1 Login (Firebase Auth funcional)
  - 24 Rotas (todas carregam sem erros JS críticos em nenhuma das 24 páginas)
  - 5 Features (Dashboard gráficos, Lançamentos OCR/STT/Importar, Filiados, Cripto, Settings backup)
- Testes ajustados para lidar com overlays (RegistrationWizard + SpotlightTour) e Firebase real-time

### ✅ CUTOVER EXECUTADO (04/04/2026) — Legado → React em Produção

**O React SPA é agora a aplicação de produção.**

- **`firebase.json` atualizado:**
  - Target `app` → `dist/` (React SPA) — **PRODUÇÃO**
  - Target `legado` → `public/` (app legado) — fallback/rollback
  - Target `staging` → `dist/` (staging separado)
  - Cache headers otimizados: `immutable` para JS/CSS assets
- **`.firebaserc` atualizado** — novo target `legado` registrado em `sibanki-legado`
- **`package.json` scripts:**
  - `deploy:app` agora faz `build + prepare-dist + deploy hosting:app`
  - `deploy:legado` novo script para deploy do fallback legado
- **`scripts/prepare-dist.mjs` criado:**
  - Copia `manifest.json`, `firebase-messaging-sw.js`, `sw.js`, ícones SVG para `dist/`
  - Remove `dist/app/` (legado não entra no bundle React)
- **`firebase.json.bak`** — backup do arquivo original para rollback se necessário
- **Verificação pós-deploy: 22/22 checks ✅** em `https://virtus-financeiro-cd7bd.web.app`
- **Rollback disponível:**
  ```bash
  copy firebase.json.bak firebase.json
  firebase deploy --only hosting:app
  ```

### ✅ Features Comportamentais (04/04/2026)
- **Arredondamento de Troco (Round-up)**:
  - Cada despesa arredonda automaticamente para cima (R$1, R$5 ou R$10)
  - Diferença acumulada num "cofre de investimento"
  - Widget no Dashboard mostrando saldo + últimas operações
  - Toggle on/off no Settings com escolha do valor de arredondamento
  - Botão "Investir em meta" transfere cofre para qualquer Goal
  - Tipos: `RoundUpConfig`, `RoundUpEntry` em `userData.ts`
  - Lógica integrada no `addEntry()` de `persistUserData.ts`
- **Quarentena de Compras**:
  - Usuário registra intenção de compra → período de reflexão de 48h
  - Após expirar, decide: "Comprar" (vira despesa) ou "Desisti" (valor vai pro cofre)
  - Página completa `/quarentena` com cards em andamento + histórico
  - Total economizado por desistências mostrado em destaque
  - Se desistir com round-up ativo, valor é adicionado ao cofre
  - Tipos: `QuarentenaItem` em `userData.ts`
  - Funções: `addQuarentena`, `resolveQuarentena`, `deleteQuarentena`
- **Finanças dos Filhos**:
  - Perfis por filho com emoji, nome, idade, mesada configurável (semanal/quinzenal/mensal)
  - Sistema de tarefas com recompensas em R$ + SibCoins
  - Ao completar tarefa: saldo + sibcoinBalance do filho incrementados + histórico
  - Pagamento de mesada manual com registro no histórico
  - Página completa `/filhos` com cards por filho, tarefas pendentes/completas
  - Tipos: `Filho`, `FilhoTarefa`, `FilhoTransacao` em `userData.ts`
  - Funções: `addFilho`, `updateFilho`, `deleteFilho`, `addTarefaFilho`, `completarTarefaFilho`, `pagarMesada`
  - Rotas registradas no `App.tsx`, links na Sidebar
- **Cache BRAPI em 2 camadas**:
  - Backend: cache em memória compartilhado entre usuários (TTL: 2min cotações, 1min cripto, 30min busca, 6h inflação)
  - Frontend: cache local por ticker com TTL de 2min
  - Máximo 500 entradas no backend, 100 no frontend (evita memory leak)

### Próximos passos
1. **Monitorar erros** — acompanhar Cloud Functions logs e feedback de usuários por 7 dias
2. **Criar site legado de fallback** — `firebase hosting:sites:create sibanki-legado` + `npm run deploy:legado`
3. **Desligar legado** — após 30 dias sem problemas, arquivar `public/app/` (ver `docs/CRONOGRAMA-CUTOVER.md` Fase D)
