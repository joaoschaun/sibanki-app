# CLAUDE.md — Memória Permanente do Sibanki

> ⚠️ **REGRAS OBRIGATÓRIAS PARA O ASSISTENTE:**
> 1. **LEIA ESTE ARQUIVO COMPLETO** antes de qualquer outra ação em cada sessão.
> 2. **ATUALIZE ESTE ARQUIVO** ao final de cada sessão — histórico, backlog, inventário.
> 3. Este arquivo é a **única fonte de verdade** do projeto. Em caso de conflito, ele prevalece.
> 4. O skill `sibanki` em `.claude/skills/sibanki/SKILL.md` reforça essas regras automaticamente.
>
> **IMPORTANTE:** Para o inventário completo e detalhado (1001 linhas), leia também:
> `docs/INVENTARIO-COMPLETO-SISTEMA.md`
>
> **Status atual (04/04/2026):** React SPA é a PRODUÇÃO. Cutover legado→React concluído.
> 39/39 testes Playwright passando. 22/22 health checks verdes. 48 Cloud Functions ativas.

---

## 📌 O QUE É O SIBANKI

Sibanki é um **Financial OS brasileiro** — não é um app de controle de gastos, é um sistema operacional financeiro. A proposta é que o usuário enxergue a realidade financeira com clareza e tome decisões soberanas.

**Três conceitos-chave que diferenciam o produto:**
- **Ld (Dias de Liberdade):** Quantos dias o usuário consegue viver com o patrimônio líquido atual sem renda
- **Sg (Spread Gap):** Diferença entre taxa média de investimentos e custo médio de dívidas
- **Sv (Sovereignty Score):** Score 0–100 por transação indicando se o gasto aumenta ou diminui a soberania financeira

**Stack principal:** React 18 + TypeScript + Vite + TailwindCSS v4 + Firebase (Firestore + Hosting + Functions)

**Design system:** Pierre Finance — fundo `#0a0a0a`, cards `#111111`, monochromático, ALL CAPS nos labels, sem botões coloridos, fonte Inter

**URLs:**
- Produção (React SPA): https://virtus-financeiro-cd7bd.web.app
- Staging: https://staging-13a0b.web.app
- Admin: https://virtus-financeiro-cd7bd.web.app/admin/
- Health-check API: https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/api/health
- Firebase Project: `virtus-financeiro-cd7bd`

---

## 🗂️ ESTRUTURA DE DIRETÓRIOS

```
virtus-financeiro/
├── src/                        React app (TypeScript)
│   ├── App.tsx                 Router principal (29+ rotas lazy-loaded)
│   ├── firebase.ts             Firebase config + exports (auth, db, functions, storage)
│   ├── index.css               Design tokens (CSS vars: --si-bg, --si-card, etc.)
│   ├── main.tsx                Entry point React
│   ├── context/
│   │   ├── AppContext.tsx       ÚNICO listener Firestore — dados + auth
│   │   └── IntelligenceContext.tsx  Cálculos Ld/Sg/Sv/financialProfile
│   ├── hooks/
│   │   ├── useAuth.ts              onAuthStateChanged (1 listener)
│   │   ├── useFinancialData.ts     2 onSnapshot (users/{uid} + entriesOverflow)
│   │   ├── useSibcoin.ts           Cloud Functions para rewards
│   │   ├── useCommunityFeed.ts     onSnapshot(community, limit 50)
│   │   ├── useDashboardMode.ts     Estado local (localStorage)
│   │   ├── useFeatureFlags.ts      Gating por plano (pro/free)
│   │   ├── useLanguage.ts          i18n state
│   │   ├── usePushNotifications.ts FCM token + permission
│   │   ├── useTheme.ts             light/dark (localStorage)
│   │   ├── useSentinelaGeo.ts      Geolocation + Cloud Function
│   │   ├── useSuggestiveMode.ts    Modo de insights proativos
│   │   └── useTenant.ts            Resolve branding por domínio
│   ├── pages/                  32 páginas (todas lazy-loaded)
│   ├── components/
│   │   ├── layout/             Header, Sidebar
│   │   ├── ui/                 Todos os componentes reutilizáveis
│   │   │   ├── EmptyState.tsx       Empty states elegantes
│   │   │   ├── PageTransition.tsx   Animações de entrada
│   │   │   ├── ErrorBoundary.tsx    Captura erros + retry/home
│   │   │   ├── InstallPrompt.tsx    PWA install + push prompt
│   │   │   ├── SpotlightTour.tsx    Tour guiado
│   │   │   ├── ComingSoonBadge.tsx  Badge "Em breve"
│   │   │   └── ComingSoonOverlay.tsx Overlay demo
│   │   ├── onboarding/
│   │   │   └── RegistrationWizard.tsx Wizard 7 passos
│   │   └── charts/             Gráficos Recharts
│   ├── services/
│   │   ├── persistUserData.ts  753 linhas — CRUD Firestore (entries, cards, goals, etc.)
│   │   ├── brapi.ts            Cotações via Cloud Function
│   │   ├── platformEvents.ts   Telemetria (fire-and-forget)
│   │   ├── saveFeedback.ts     Salva em /feedbacks Firestore
│   │   └── community.ts        Posts da comunidade
│   ├── utils/
│   │   ├── sovereigntyEngine.ts  Cálculos Ld, Sg, Sv (funções puras)
│   │   ├── decisionEngine.ts     Análise à-vista vs parcelado
│   │   ├── generateReportPdf.ts  PDF (dynamic import — nunca estático)
│   │   └── i18n.ts              Strings de tradução
│   └── types/
│       ├── userData.ts          Entry, Card, Goal, Investment, Account, Budget, Recurrent
│       ├── modules.ts           SibCoin, OpenFinance, CreditHub, etc.
│       ├── platform.ts          FinancialProfile, HealthLevel, JourneyStage
│       └── openFinance.ts       Pluggy types
├── functions/                  Cloud Functions (Node.js 22 + Express)
│   ├── index.js                48 exports — TODAS as funções aqui
│   ├── config.js               Variáveis de ambiente (lê .env local + firebase config prod)
│   ├── logger.js               Log estruturado com severidade + timer()
│   ├── services/
│   │   ├── admin/adminAuth.js  validateAdminAccess, revokeAdminAccess
│   │   ├── billing/            Stripe: checkout, portal, webhook
│   │   ├── llm/                Gemini/Groq/Claude/OpenAI + claudeProxy + CSV categorizer
│   │   ├── market/             BRAPI: ações, cripto, inflação
│   │   ├── news/               Agregador: GNews + NewsData + RSS
│   │   ├── pluggy/             Open Finance: token + sync
│   │   ├── push/pushService.js Push FCM: sendPush + dailyAlerts
│   │   ├── sentinel/           Fraude geolocation + alertas semanais
│   │   ├── sibcoin/            Sistema de rewards completo
│   │   ├── tenant/             API multi-tenant
│   │   ├── user/               Ciclo de vida do usuário
│   │   ├── whatsapp/           Meta Cloud API
│   │   └── entryWizard.js      Wizard multi-turn WhatsApp
├── public/                     App legado (fallback/rollback)
│   ├── app/                    App legado JS/HTML
│   ├── admin/index.html        Admin panel (vanilla JS + Firebase compat)
│   ├── manifest.json           PWA manifest
│   ├── firebase-messaging-sw.js FCM background notifications
│   ├── sw.js                   Service Worker (cache offline)
│   ├── icon-192.svg            PWA icon
│   ├── icon-512.svg            PWA icon
│   └── doc-investidor/         Docs para investidores
├── dist/                       Build Vite → PRODUÇÃO (hosting:app)
├── scripts/
│   ├── prepare-dist.mjs        Copia PWA assets para dist/ antes de deploy
│   ├── pre-cutover-check.mjs   22 checks de saúde (front + back)
│   └── generate-icons.mjs      Gera ícones SVG do PWA
├── tests/
│   ├── react-smoke.spec.cjs    39 testes Playwright (login, módulos, features)
│   └── lighthouse-audit.spec.cjs PWA/performance checks
├── docs/
│   ├── INVENTARIO-COMPLETO-SISTEMA.md  Inventário detalhado (1000+ linhas)
│   ├── CRONOGRAMA-CUTOVER.md           Plano e status do cutover
│   ├── CONFIGURACAO-PRODUCAO.md        Variáveis de ambiente produção
│   └── API-MULTITENANT.md              Documentação API multi-tenant
├── CLAUDE.md                   Este arquivo
├── firebase.json               Hosting targets, headers, rewrites
├── .firebaserc                 Targets: app, staging, legado, admin
├── firestore.rules             RBAC multi-tenant
├── storage.rules               Avatars: owner write, any-auth read
├── vite.config.ts              Code splitting, manualChunks
├── package.json                Scripts de build/deploy
└── playwright.config.cjs       E2E tests
```

---

## 🧭 ROTAS (App.tsx — todas lazy-loaded com ErrorBoundary)

| Path | Componente | O que faz |
|------|-----------|-----------|
| `/` | Home.tsx | Tela inicial com briefing contextual + ações rápidas |
| `/dashboard` | Dashboard.tsx | Painel principal: widgets, gráficos, Ld/Sg |
| `/lancamentos` | Transactions.tsx | CRUD de receitas/despesas + filtros + Sovereignty Score inline |
| `/recorrentes` | Recurring.tsx | Gerenciar assinaturas e lançamentos recorrentes |
| `/contas` | Accounts.tsx | Contas bancárias e saldos |
| `/cartoes` | Cards.tsx | Cartões, faturas, compras parceladas |
| `/planejamento` | Planning.tsx | Metas financeiras (goals) |
| `/orcamento` | Budget.tsx | Orçamento por categoria |
| `/crescimento` | Growth.tsx | Investimentos + análise B3 + perfil de investidor |
| `/ferramentas` | Tools.tsx | Calculadoras financeiras |
| `/social` | Social.tsx | Feed comunitário + bookmarks |
| `/consultor-ia` | Consultant.tsx | Chat IA com contexto financeiro completo |
| `/educacao` | Education.tsx | Conteúdo educativo |
| `/perfil` | Profile.tsx | Editar dados pessoais e perfil de investidor |
| `/configuracoes` | Settings.tsx | Backup/import, Open Finance, preferências, plano |
| `/relatorios` | Reports.tsx | Gerar PDF de relatórios financeiros |
| `/calendario` | Calendar.tsx | Visão por data de receitas/despesas |
| `/conquistas` | Achievements.tsx | Badges e marcos desbloqueados |
| `/credito` | CreditHub.tsx | Hub de crédito: cartões, empréstimos, estratégia de quitação |
| `/cripto` | Cripto.tsx | Gestão de criptomoedas |
| `/loja` | Loja.tsx | SibCoin store |
| `/meu-cpf` | MeuCpf.tsx | Monitoramento CPF (Ação 10) |
| `/meus-boletos` | MeusBoletos.tsx | Boletos DDA (Ação 11) |
| `/sibcoin` | Sibcoin.tsx | Dashboard SibCoin + missões |
| `/solucoes/credito` | SolucaoCredito.tsx | Parceiros de crédito |
| `/solucoes/consorcio` | SolucaoConsorcio.tsx | Produtos de consórcio |
| `/solucoes/seguro` | SolucaoSeguro.tsx | Produtos de seguros |
| `/solucoes/investimentos` | SolucaoInvestimentosParceiros.tsx | Parceiros de investimento |
| `*` | NotFound.tsx | 404 |
| `/transactions` | → redirect para `/lancamentos` | Compatibilidade de URL |

---

## 🧠 CONTEXTS (A ARQUITETURA DE DADOS)

### AppContext (`src/context/AppContext.tsx`)
**Responsabilidade:** "O que o usuário TEM" — única fonte de verdade para dados e auth.

**Abre 2 listeners Firestore (e só 2):**
1. `onSnapshot(doc(db, 'users', uid))` → dados principais do usuário
2. `onSnapshot(collection(db, 'users', uid, 'entriesOverflow'))` → lançamentos arquivados

**O que expõe:**
```typescript
{
  // Auth
  user: User | null
  authLoading: boolean
  // Dados financeiros
  data: UserData | null
  loading: boolean
  entries: Entry[]           // lançamentos
  accounts: Account[]        // contas bancárias
  accountBalances: Record<string, number>
  accountMeta: Record<string, AccountMeta>
  cards: Card[]              // cartões de crédito
  goals: Goal[]              // metas
  budgets: Budget[]          // orçamentos
  recurrents: Recurrent[]    // recorrentes
  investments: Investment[]  // investimentos
  investorProfile: InvestorProfile | null
  // Open Finance
  hasOpenFinance: boolean
  openFinanceSyncedAt: string | null
  openFinanceCreditBills: CreditBill[]
  isSyncing: boolean
  dataFreshness: 'none' | 'fresh' | 'stale'
  // SibCoin
  sibcoinBalance: number
  sibcoinMissionsCompleted: string[]
  score: number              // Sovereignty Score geral
  // Actions
  refreshData: () => void
  syncOpenFinance: () => Promise<void>
}
```

**Auto-sync:** Se `dataFreshness === 'stale'` e não sincronizou hoje, dispara `syncOpenFinance()` automaticamente.

---

### IntelligenceContext (`src/context/IntelligenceContext.tsx`)
**Responsabilidade:** "O que significa" — transforma dados em inteligência financeira.

**Não abre listeners Firestore.** Recebe dados do AppContext e computa.

**Memoização em 3 níveis:**
```typescript
freedom = useMemo(() => calculateFreedom(entries, investments, balances), [entries, investments, balances])
spread  = useMemo(() => calculateSpread(investments, cards, creditAccounts), [investments, cards, creditAccounts])
state   = useMemo(() => computeFinancialState(financialProfile, freedom, spread), [financialProfile, freedom, spread])
```

**O que expõe:**
```typescript
{
  freedom: FreedomResult       // { days: number, tier: string, label: string }
  spread: SpreadGapResult      // { spreadGap: number, yieldRate: number, debtRate: number, verdict: SpreadVerdict }
  financialProfile: FinancialProfile
  healthLevel: FinancialHealthLevel  // 'saudavel' | 'atencao' | 'pressao' | 'critico'
  journeyStage: JourneyStage
  creditObligations: CreditObligation[]
  creditAccounts: CreditAccount[]
  creditSnapshot: CreditSnapshot
  catTotals: Record<string, number>
}
```

---

## ⚙️ SOVEREIGNTY ENGINE (`src/utils/sovereigntyEngine.ts`)

### calculateFreedom(entries, investments, balances) → FreedomResult
**Ld = Dias de Liberdade**
```
Ld = Patrimônio Líquido / Burn Rate Diário
Patrimônio Líquido = soma de saldos de contas + soma de investimentos atuais
Burn Rate Diário = média de despesas/dia dos últimos 90 dias
```

**Tiers de Liberdade:**
- 0–30 dias: "Frágil" (rose)
- 31–90 dias: "Em Construção" (amber)
- 91–180 dias: "Resiliente" (blue)
- 181–365 dias: "Soberano" (emerald)
- 365+ dias: "Inabalável" (violet)

---

### calculateSpread(investments, cards, creditAccounts) → SpreadGapResult
**Sg = Spread Gap**
```
Sg = Taxa Média de Investimentos (a.m.) - Custo Médio de Dívidas (a.m.)
Vazamento Mensal = |Sg| × (total de dívidas) se Sg < 0
```

**Verdicts:**
- `Sg > 2%`: "Alavancagem Inteligente" (emerald)
- `0% ≤ Sg ≤ 2%`: "Zona Neutra" (gray)
- `-2% ≤ Sg < 0%`: "Ineficiência Moderada" (amber)
- `Sg < -2%`: "Dreno Crítico" (rose)

---

### calculateSovereigntyScore(entry, context) → SvResult
**Sv = Sovereignty Score por transação**
```
Score base: 50 pontos
+/- baseado em: categoria, liquidez, burn rate, forma de pagamento, timing
```

**Verdicts por score:**
- 80–100: "Soberano" (verde)
- 60–79: "Consciente" (azul)
- 40–59: "Atenção" (laranja)
- 0–39: "Auto-Sabotagem" (vermelho)

---

## 🏛️ COMPONENTES PRINCIPAIS

### Layout
- **Header.tsx** — Logo + tema toggle + notificações + avatar dropdown (Perfil / Relatórios / Conquistas / Calendário / **Feedback** / Sair)
- **Sidebar.tsx** — Nav responsiva; mobile: drawer overlay; desktop: inline colapsável

### UI Components
- **SovereigntyHero** — Hero card com Ld em destaque, grid de métricas, CTAs
- **SpreadGapCard** — Análise Spread Gap com bar comparativa yield vs debt
- **SovereigntyBadge** — Badge inline score/verdict por transação
- **FeedbackModal** — Modal com categorias (sugestão/crítica/erro), salva em `/feedbacks` Firestore
- **InsightDoDia** — Card com insight do Sentinela Geo
- **BriefingModal** — Modal de onboarding (persistido em localStorage)
- **ErrorBoundary** — Fallback por rota
- **Modal** — Modal genérico reutilizável
- **OnboardingTour** — Tour guiado para novos usuários
- **CoachSetup** — Ativação de coach IA
- **OpenFinanceConnect** — Widget conectar/desconectar Open Finance
- **SibcoinWidget** — Dashboard SibCoin + missões
- **SibcoinMissionBanner** — Banner missão em destaque
- **SibcoinToastContainer** — Toasts de recompensas
- **InvestmentInsights** — Recomendações por perfil de investidor
- **EntryForm** — Formulário de lançamento (date/type/desc/category/value/account)
- **TransferForm** — Formulário de transferência entre contas

### Charts (Recharts)
- **BalanceAreaChart** — Receita/despesa últimos 6 meses (AreaChart)
- **ExpensesPieChart** — Gastos por categoria (PieChart)
- **BudgetBarChart** — Orçamento vs gasto por categoria (BarChart)
- **PortfolioChart** — Alocação de investimentos por tipo (PieChart)
- **ProventosBarChart** — Histórico de proventos (BarChart)
- **FinancialBarChart** — Receita vs despesa mensal (BarChart)
- **chartConfig.ts** — Cores, tooltip, grid, axis compartilhados

---

## ☁️ CLOUD FUNCTIONS (48 total — functions/index.js)

### Core & Auth
| Função | Tipo | O que faz |
|--------|------|-----------|
| `api` | onRequest (Express) | API REST multi-tenant (`/api/v1/tenants`) |
| `onUserCreated` | Auth trigger | Inicializa usuário no Firestore |
| `validateAdminAccess` | onCall | Valida email admin no servidor, seta Custom Claim `admin:true` |
| `revokeAdminAccess` | onCall (admin) | Remove Custom Claim de admin |
| `callClaude` | onCall (admin) | Proxy para Anthropic API (nunca chamada direta do browser) |

### IA & Consultor
| Função | Tipo | O que faz |
|--------|------|-----------|
| `chatApi` | onCall | Chat com IA usando contexto financeiro completo (fallback: Gemini→Groq→OpenAI→Claude) |
| `proactiveInsightApi` | onCall | Gera insights proativos financeiros |
| `briefingIa` | onCall | Insight curto pós-login |
| `aiCategorizeCsv` | onCall | Categoriza transações de CSV via Gemini Flash |

### Market Data (BRAPI)
| Função | Tipo | O que faz |
|--------|------|-----------|
| `brapiQuote` | onCall | Cotação individual de ação |
| `brapiMulti` | onCall | Cotações múltiplas |
| `brapiSearch` | onCall | Busca de empresas/tickers |
| `brapiCrypto` | onCall | Cotações de cripto |
| `brapiInflation` | onCall | IPCA atual |

### Billing (Stripe)
| Função | Tipo | O que faz |
|--------|------|-----------|
| `createCheckout` | onCall | Cria sessão de pagamento |
| `createPortal` | onCall | Abre portal de gerenciamento de plano |
| `getUserPlan` | onCall | Retorna plano ativo |
| `stripeWebhook` | onRequest | Webhook Stripe (Bearer token) |

### SibCoin & Rewards
| Função | Tipo | O que faz |
|--------|------|-----------|
| `triggerSibcoinEvent` | onCall | Aciona evento de recompensa (login, meta, lançamento, etc.) |
| `getSibcoinMissions` | onCall | Lista missões ativas do usuário |
| `adminCreditSibcoin` | onCall (admin) | Credita SibCoins manualmente |
| `processarFiliadosDiario` | pubsub (24h) | Valida indicados e credita recompensas |

### Open Finance (Pluggy)
| Função | Tipo | O que faz |
|--------|------|-----------|
| `pluggyCreateConnectToken` | onCall | Cria token para conectar banco |
| `pluggySyncAccounts` | onCall | Sincroniza contas e transações |
| `registrarOpenBanking` | onCall | Registra consentimento |

### Comunicação
| Função | Tipo | O que faz |
|--------|------|-----------|
| `whatsappWebhook` | onRequest | Webhook Meta Cloud API + wizard financeiro multi-turn |
| `generateWhatsAppCode` | onCall | Gera código 6 dígitos para vincular WA |
| `telegramWebhook` | trigger | Bot Telegram |
| `checkPriceAlerts` | scheduled (24h) | Alertas de preço de ativos |
| `dailyNews` | scheduled (diário) | Envia notícias para Telegram |
| `weeklyReport` | scheduled (semanal) | Relatório semanal WhatsApp/Telegram |
| `sendFamilyInviteEmail` | onCall | Convite família via Resend |
| `sendVerificationEmail` | onCall | Reenvio de verificação |
| `weeklySummary` | pubsub (seg 8h BRT) | Email resumo semanal |

### Push Notifications
| Função | Tipo | O que faz |
|--------|------|-----------|
| `dailyPushAlerts` | pubsub (09:00 BRT) | Alertas de orçamento (80%/100%) e faturas vencendo (0-3 dias) |
| `sendPushNotification` | onCall | Envio de push manual (self ou admin→user) |

### Sentinel & Fraude
| Função | Tipo | O que faz |
|--------|------|-----------|
| `sentinelaGeoCheck` | onCall | Valida login com geolocalização (detecta comportamento anômalo) |
| `sentinelaWeekly` | pubsub (seg 11h UTC) | Alertas semanais de segurança |

### Affiliate & Parceiros
| Função | Tipo | O que faz |
|--------|------|-----------|
| `webhookParceiro` | onRequest | Webhook affiliate |
| `registrarCliqueSolucao` | onCall | Registra clique em produto parceiro |
| `creditarCashbackSibCoin` | onCall | Cashback em SibCoins por parceiro |

### Invites Sociais
`sendWhatsAppInviteFamilia`, `sendConsorcioInvite`, `sendCrediAmigoInvite`, `sendWhatsAppInviteConsorcioCallable`, `sendWhatsAppInviteCrediAmigoCallable`

---

## 🗃️ DATA MODEL (Firestore)

### Estrutura Principal (legado React app)
```
/users/{uid}
  ├── entries[]             Lançamentos financeiros
  ├── accounts[]            Contas bancárias
  ├── accountBalances{}     Saldos por conta
  ├── accountMeta{}         Metadados de contas
  ├── cards[]               Cartões de crédito
  ├── goals[]               Metas financeiras
  ├── budgets[]             Orçamentos por categoria
  ├── recurrents[]          Lançamentos recorrentes
  ├── investments[]         Investimentos
  ├── investorProfile       Perfil de investidor
  ├── achievements[]        Badges desbloqueados
  ├── sibcoinBalance        Saldo SibCoin
  ├── sibcoinMissionsCompleted[]
  ├── openFinanceStatus     Status Pluggy
  ├── openFinanceSyncedAt   Timestamp última sync
  ├── avatarURL             URL da foto de perfil
  └── plan                  'gratuito' | 'pro' | 'familia'
  /entriesOverflow/{id}     Lançamentos arquivados (subcollection)
  /openFinanceConsents/{id} Consentimentos OF (append-only)
  /auditLogs/{id}           Logs de auditoria (imutável)

/feedbacks/{id}
  ├── uid, userName, userEmail
  ├── category: 'sugestao' | 'critica' | 'erro'
  ├── title, description
  ├── page (URL onde foi enviado)
  ├── status: 'novo' | 'em-analise' | 'resolvido'
  └── createdAt: serverTimestamp
```

### Estrutura Multi-tenant (novo)
```
/tenants/{tenantId}
  ├── meta/             slug, domínio, plano, branding
  ├── config/           configurações
  ├── categories/       categorias customizadas
  ├── invites/          convites
  ├── audit/            auditoria imutável
  └── users/{uid}/      dados por usuário no tenant
/tenantPublic/{tenantKey}  índice público (leitura livre)
```

---

## 🔐 SEGURANÇA

### Firestore Rules — Padrão RBAC multi-tenant
- `isAuthed()`: usuário autenticado
- `isSuperAdmin()`: verifica `request.auth.token.role === 'superAdmin'`
- `isOwner(userId)`: `request.auth.uid === userId`
- `sameTenant(tenantId)`: valida que o uid pertence ao tenant
- `isTenantAdmin()`: admin dentro do tenant

### Admin Panel — Custom Claims (implementado 2026-04-04)
- **ANTES:** `ADMIN_EMAILS` hardcoded no JS do cliente ❌
- **AGORA:** Cloud Function `validateAdminAccess` valida no servidor, seta `{ admin: true }` como Custom Claim
- Cliente chama função → força refresh do ID token → verifica `token.claims.admin === true`

### Anthropic API — Proxy via Cloud Function (implementado 2026-04-04)
- **ANTES:** chamadas diretas a `api.anthropic.com` no browser ❌
- **AGORA:** `callClaude` Cloud Function proxy. A API key nunca aparece no cliente
- Admin usa `callClaudeProxy(prompt, systemPrompt, maxTokens)` → function → Anthropic

### .env e Secrets
- `functions/.env` está no `.gitignore` e **nunca foi commitado**
- **`functions.config()` foi removido completamente** em 2026-04-04 (API descontinuada pelo Firebase)
- Todas as variáveis agora lidas exclusivamente de `process.env`
- Em dev: editar `functions/.env`
- Em produção: usar `firebase functions:secrets:set NOME_DA_VAR` (Secret Manager) ou `firebase apphosting:secrets:set`

**Todas as chaves necessárias:**
```
BRAPI_TOKEN          # BRAPI mercado financeiro
GEMINI_KEY           # Google Gemini
GROQ_KEY             # Groq LLM
OPENAI_KEY           # OpenAI
CLAUDE_KEY           # Anthropic Claude
GOOGLE_CLOUD_KEY     # Vision OCR + Speech STT
STRIPE_SECRET        # Stripe pagamentos
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY       # E-mails transacionais
WHATSAPP_TOKEN       # Meta Cloud API
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
TELEGRAM_TOKEN
NEWS_API_KEY
GNEWS_KEY
NEWSDATA_KEY
PLUGGY_CLIENT_ID     # Open Finance
PLUGGY_CLIENT_SECRET
```

**Comandos para configurar prod:**
```bash
firebase functions:secrets:set BRAPI_TOKEN
firebase functions:secrets:set GEMINI_KEY
# ... um por um, Firebase vai pedir o valor via stdin
```

---

## 🖥️ ADMIN PANEL (`public/admin/index.html`)

Vanilla HTML/JS com Firebase compat SDK v9.23.0. Design: dark theme com CSS variables.

**9 Seções:**
1. **Dashboard** — KPIs, gráficos cadastros/planos, alertas, atividade recente, status features, changelog
2. **Métricas & Dados** — DAU, uso por módulo, análise de cohort (D1/D7/D30)
3. **Usuários** — Tabela buscável, planos, datas, ações
4. **Feature Flags** — Ativar/desativar features por plano (salvo no Firestore)
5. **Planos & Billing** — MRR, funil de conversão, gerenciar plano por usuário
6. **Feedbacks** *(novo)* — KPIs (total/novo/análise/resolvido), tabela com filtros, modal de detalhe com gestão de status
7. **Redes Sociais IA** — Gerador de conteúdo por plataforma usando Claude proxy
8. **Calendário de Conteúdo** — Planejamento editorial com IA
9. **Brand Intelligence** — Análise de concorrentes, insights de marketing, gaps de conteúdo

**Auth:** Custom Claims via `validateAdminAccess` Cloud Function (não mais ADMIN_EMAILS no cliente)

---

## 🎮 SIBCOIN — SISTEMA DE REWARDS

**O que é:** Moeda interna gamificada que recompensa comportamentos financeiros saudáveis.

**Tiers:**
- Bronze (0–499 SC)
- Prata (500–1.499 SC)
- Ouro (1.500–4.999 SC)
- Platina (5.000–9.999 SC)
- Diamante (10.000+ SC)

**Eventos que geram SibCoins (via `triggerSibcoinEvent`):**
- `login_diario` — login diário
- `lancamento_adicionado` — novo lançamento
- `meta_criada` — nova meta
- `meta_concluida` — meta atingida
- `open_finance_conectado` — conectou Open Finance
- `perfil_investidor_completo` — completou perfil
- `backup_realizado` — fez backup
- `consultor_usado` — usou o consultor IA
- `streak_semanal` — 7 dias consecutivos de uso

**Deduplicação:** flags em localStorage previnem eventos duplicados na mesma sessão.

**Cloud Functions:** `triggerSibcoinEvent`, `getSibcoinMissions`, `adminCreditSibcoin`, `processarFiliadosDiario`

---

## 🔌 OPEN FINANCE (Pluggy)

**O que é:** Conexão com contas bancárias reais do usuário via Pluggy API.

**Fluxo:**
1. Usuário clica em "Conectar banco" → `pluggyCreateConnectToken` gera token
2. Widget Pluggy abre (react-pluggy-connect)
3. Usuário autentica no banco
4. `pluggySyncAccounts` sincroniza transações e saldos
5. Dados enriquecem os lançamentos com `source: 'open-finance'`

**`dataFreshness`:** 'none' | 'fresh' (< 6h) | 'stale' (> 6h)
**Auto-sync:** AppContext detecta stale + não sincronizou hoje → chama `syncOpenFinance()` automaticamente

---

## 🚀 DEPLOY WORKFLOW

```bash
# 1. Build React
npm run build                        # → dist/

# 2. Copiar para public/ (preserva admin/, docs/, etc.)
Copy-Item dist\assets\* public\assets\ -Recurse -Force
Copy-Item dist\index.html public\index.html -Force

# 3. Deploy produção (React SPA)
npm run deploy:app       # build + prepare-dist + hosting:app → dist/

# 4. Deploy legado (fallback/rollback)
npm run deploy:legado    # syntax-check + hosting:legado → public/

# 5. Deploy somente staging
npm run deploy:staging

# 6. Deploy Cloud Functions (seletivo)
firebase deploy --only functions:nomeDaFuncao,functions:outra

# 7. Deploy todas as functions
firebase deploy --only functions

# 8. Deploy Firestore rules
firebase deploy --only firestore:rules

# Scripts npm
npm run dev                          # Dev server
npm run build                        # Build prod (Vite → dist/)
npm run deploy:app                   # Build + prepare-dist + produção
npm run deploy:staging               # Build + staging
npm run deploy:legado                # Syntax-check + legado (fallback)
```

**IMPORTANTE:** Desde abril/2026, `hosting:app` serve de `dist/` (React SPA).
O legado (`public/`) está em `hosting:legado` como fallback.
O script `scripts/prepare-dist.mjs` copia manifest, SW, e ícones PWA para `dist/`.

---

## 🎨 DESIGN SYSTEM (Pierre Finance)

### CSS Variables (`src/index.css`)
```css
--si-bg: #0a0a0a          /* fundo geral */
--si-card: #111111         /* cards */
--si-border: rgba(255,255,255,0.06)
--si-border-md: rgba(255,255,255,0.10)
--si-over-1 … --si-over-4  /* hover states */
--si-1 … --si-5            /* escala de cinzas de texto */
```

### Regras de estilo
- **Textos de label:** SEMPRE `text-[10px] font-bold tracking-[0.18em] uppercase`
- **Botões:** neutros — `bg-si-over-2 hover:bg-si-over-3 border border-si-border`
- **Sem gradientes coloridos** (removidos em 2026-04-04)
- **Sem botões coloridos** (apenas neutros + rose para ações destrutivas)
- **Font:** Inter apenas, `letter-spacing: -0.01em`
- **Responsivo:** `lg:` breakpoint para desktop. Mobile: padding `p-4`, gap `gap-6`

### Sidebar responsiva (App.tsx)
- **Mobile (< lg):** drawer overlay com backdrop
- **Desktop (≥ lg):** inline colapsável
- **Toggle lógica:**
  ```typescript
  if (window.innerWidth < 1024) setMobileOpen(v => !v)
  else toggleSidebar()
  ```

---

## 📦 BUNDLE (Vite)

Chunks separados (`vite.config.ts`):
```
vendor-react     react + react-dom + react-router-dom     ~163KB gz
vendor-firebase  firebase/app + auth + firestore + fns    ~497KB gz
vendor-charts    recharts                                  ~409KB gz
vendor-pdf       jspdf + jspdf-autotable + html2canvas    ~625KB gz (lazy)
vendor-ui        lucide-react + clsx + tailwind-merge     ~73KB gz
```

**PDF:** Dynamic import — só carrega quando usuário clica em "Gerar PDF":
```typescript
const { generateReportPdf } = await import('../utils/generateReportPdf');
```

---

## 🔧 PATTERNS E CONVENÇÕES

### Firestore — padrão de escrita
```typescript
import { db } from '../firebase';
import { doc, collection, setDoc, updateDoc } from 'firebase/firestore';
// Sempre usar uid do contexto, nunca hardcoded
const ref = doc(db, 'users', uid);
```

### Cloud Functions — padrão de chamada
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
const fns = getFunctions(undefined, 'southamerica-east1'); // região BR
const fn = httpsCallable<InputType, OutputType>(fns, 'nomeDaFuncao');
const result = await fn(payload);
```

**ATENÇÃO:** Região hardcoded em 7 locais. Centralizar em `firebase.ts` quando refatorar.

### Error handling — padrão nos handlers
```typesc