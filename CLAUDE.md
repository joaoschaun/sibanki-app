# CLAUDE.md — Memória Permanente do Sibanki

> ⚠️ **GOVERNANÇA IA — leia primeiro:**
> 1. **`AGENTS.md`** (raiz) — fonte única de verdade para regras universais
>    de qualquer agente de IA (convenções, branches, matriz de responsabilidade,
>    limites duros). Em caso de conflito, AGENTS.md tem precedência sobre este arquivo.
> 2. **`CLAUDE.md`** (este arquivo) — contexto pinned do produto + histórico
>    de sessão. Leia também antes de qualquer ação.
> 3. **`docs/INVENTARIO-COMPLETO-SISTEMA.md`** (1001 linhas) — inventário detalhado.
>    Leia quando for mexer em módulo já existente.
> 4. **`docs/TASK_QUEUE.md`** — fila de tarefas (pipeline Antigravity ↔ Cursor ↔ Cowork).
> 5. **`docs/CHANGELOG.md`** — changelog incremental por sessão. Histórico novo
>    vai PARA LÁ, não acumula mais aqui.
>
> **REGRAS OBRIGATÓRIAS PARA O ASSISTENTE (Claude Cowork especificamente):**
> 1. Leia AGENTS.md + este arquivo + INVENTARIO antes de mexer em módulo já existente.
> 2. Histórico de sessão: usar `docs/CHANGELOG.md`, não acumular mais neste arquivo.
> 3. Decisões arquiteturais permanentes podem ser documentadas aqui (seção
>    "Status atual"); detalhe operacional vai para CHANGELOG.
> 4. O skill `sibanki` em `.claude/skills/sibanki/SKILL.md` reforça essas regras.
>
> **Status atual (13/04/2026):** React SPA é a PRODUÇÃO. Cutover legado→React concluído.
> 35/35 testes Playwright (`npm run test:react-smoke`: PWA + setup auth `storageState` + login isolado + 24 rotas). 22/22 health checks verdes. 52 Cloud Functions ativas (inclui `valoresAReceberApi`).
> **Feature flags:** Todas liberadas para todos os planos (fase de construção).
> **Sidebar:** 13 itens (4 principal + 7 secundário "Mais" + 2 rodapé, inclui **Loja**). Botão flutuante "Consultor IA" em todas as páginas.
> **Hub conta (estilo Pierre):** `AccountSummaryStrip` (plano + Open Finance + link `#open-finance`) e `FeedbackCallout` em `/perfil` e `/configuracoes`. Redirects: `/settings`, `/dashboard/settings` → `/configuracoes`; `/my-account` → `/perfil`.
> **Qualidade de dados:** `validators.ts` + `logging.ts` criados. Firestore rules com schema validation. Cloud Functions com timeouts corretos (chatApi 300s/512MB, pluggySyncAccounts 540s/1GB). Memory leak BRAPI rate map corrigido.
> **TypeScript (13/04/2026):** `npx tsc --noEmit` sem erros no app (`useTenant.d.ts`, tipagem Recharts Tooltip, union SibCoin alinhada em `useSibcoin` + `userData`).
> **Recorrentes (14/04/2026):** implementadas `aplicarRecorrentesDoMes` (scheduled mensal) e `aplicarRecorrentesManual` (callable `southamerica-east1`) + botão **Aplicar agora** em `Recurring.tsx` (sem deploy nesta sessão).
> **Hub de Crédito (14/04/2026):** CRUD manual de `CreditObligation` em `/credito/visao-geral` (modal adicionar, lista de obrigações abertas, ação “marcar como paga” e destaque de atraso por vencimento).
> **Sentinela Geo (14/04/2026):** recomendação tática de cartão no backend (`cardSuggestionService`) integrada ao `runSentinelaGeo` e `sentinelaGeoCheck` via leitura de `users/{uid}.cards`; alerta agora inclui cartão sugerido + prazo até fechamento + razão do benefício.
> **Onboarding:** `RegistrationWizard` expandido para 6 etapas — inclui Open Finance (Pluggy) e consulta BCB Valores a Receber no cadastro.
> **Persistência (16/04/2026):** `updateUserDoc` em `persistUserData.ts` com debounce/idempotência em memória (1,5s, payload idêntico) + `payloadSignature` à prova de referência circular — task pipeline `20260416-012`.
> **Identidade Visual / Loading (16/04/2026):** `AppLoadingScreen` com vídeo (`public/assets/loading-video.mp4`), logos dark/light (`/assets/logo-dark.png`, `/assets/logo-light.png`) no `Sidebar`/`Header` e favicon `./favicon.png` via `public/index.html` e `public/manifest.json` — task pipeline `20260416-013`.

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
│   │   ├── IntelligenceContext.tsx  Cálculos Ld/Sg/Sv/financialProfile
│   │   └── ConsultantSessionContext.tsx  Sessão do chat do Assistente (drawer + /consultor-ia)
│   ├── hooks/
│   │   ├── useAuth.ts              onAuthStateChanged (1 listener)
│   │   ├── useFinancialData.ts     2 onSnapshot (users/{uid} + entriesOverflow)
│   │   ├── useSibcoin.ts           Cloud Functions para rewards
│   │   ├── useCommunityFeed.ts     onSnapshot(community, limit 50)
│   │   ├── useDashboardMode.ts     Estado local (localStorage)
│   │   ├── useFeatureFlags.ts      Gating por plano (TUDO LIBERADO — fase construção)
│   │   ├── useLanguage.ts          i18n state
│   │   ├── usePushNotifications.ts FCM token + permission
│   │   ├── useTheme.ts             light/dark (localStorage)
│   │   ├── useSentinelaGeo.ts      Geolocation + Cloud Function
│   │   ├── useSuggestiveMode.ts    Modo de insights proativos
│   │   └── useTenant.ts            Resolve branding por domínio
│   ├── pages/                  32 páginas (todas lazy-loaded)
│   ├── components/
│   │   ├── dashboards/         Raio-X temáticos (ETF, renda fixa, cripto) + shared gauge/checklist
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
│   │   ├── brapi.ts            B3, cripto, inflação (IPCA) via Cloud Functions
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
│   ├── index.js                ~50 exports — TODAS as funções aqui
│   ├── config.js               Variáveis de ambiente (lê .env local + firebase config prod)
│   ├── logger.js               Log estruturado com severidade + timer()
│   ├── services/
│   │   ├── admin/adminAuth.js  validateAdminAccess, revokeAdminAccess
│   │   ├── billing/            Stripe: checkout, portal, webhook
│   │   ├── assistant/          assistantOrchestrator (chat) + entryCaptureOrchestrator (voz/imagem)
│   │   ├── llm/                Gemini/Groq/Claude/OpenAI + claudeProxy + CSV categorizer
│   │   ├── market/             BRAPI + renda fixa (BCB/Tesouro)
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
│   ├── react-smoke-auth.setup.cjs  Login único → grava `playwright/.auth/react-smoke-user.json`
│   ├── react-smoke.spec.cjs       Smoke rotas + login sem storage (credenciais TEST_EMAIL/TEST_SENHA)
│   └── lighthouse-audit.spec.cjs  PWA/performance (projeto react-smoke-pwa)
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
| `/` | — | Redireciona para `/consultor-ia` (entrada padrão: Assistente; aba **Visão** = painel com KPIs e atalhos) |
| `/dashboard` | Dashboard.tsx | Painel principal: widgets, gráficos, Ld/Sg |
| `/lancamentos` | Transactions.tsx | CRUD de receitas/despesas + filtros + Sovereignty Score inline |
| `/recorrentes` | Recurring.tsx | Gerenciar assinaturas e lançamentos recorrentes |
| `/contas` | Accounts.tsx | Contas bancárias e saldos |
| `/cartoes` | → redirect para `/credito/cartoes` | Compatibilidade de URL |
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
| `/credito` | → redirect para `/credito/visao-geral` | Entrada do módulo Crédito |
| `/credito/visao-geral` | CreditHub.tsx | Hub de crédito (visão consolidada) |
| `/credito/cartoes` | Cards.tsx | Submódulo operacional de cartões e faturas |
| `/credito/emprestimos` | CreditHub.tsx | Submódulo de empréstimos (aba dedicada) |
| `/credito/plano` | CreditHub.tsx | Submódulo plano de ação |
| `/credito/oportunidades` | CreditHub.tsx | Submódulo oportunidades de crédito |
| `/credito/educacao` | CreditHub.tsx | Submódulo educação de crédito |
| `/cripto` | Cripto.tsx | Gestão de criptomoedas |
| `/loja` | Loja.tsx | Loja: ofertas Lomadee ao vivo (`affiliateStoreCatalogApi`) + resgate SibCoin; link na sidebar **Mais** |
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
- **Header.tsx** — Logo + **Painel \| Assistente** (`AppModeToggle`: Assistente abre drawer; Painel fecha drawer e sai de `/consultor-ia`) + tema + notificações + avatar (Perfil / Relatórios / Conquistas / Calendário / **Feedback** / Sair)
- **Sidebar.tsx** — Nav responsiva (13 itens: 4 principal + 7 "Mais" inclui `/loja` + 2 rodapé); mobile: drawer overlay; desktop: inline colapsável
- **FloatingConsultantButton** (em App.tsx) — Abre drawer do assistente nas demais rotas; **oculto em `/consultor-ia`** (painel já na sidebar + toggle do header). Drawer: `ConsultantDrawer.tsx`; contexto: `ConsultantSessionContext.tsx`

### UI Components
- **SovereigntyHero** — Hero card com Ld em destaque, grid de métricas, CTAs
- **SpreadGapCard** — Análise Spread Gap com bar comparativa yield vs debt
- **SovereigntyBadge** — Badge inline score/verdict por transação
- **FeedbackModal** — Modal com categorias (sugestão/crítica/erro), salva em `/feedbacks` Firestore
- **FeedbackCallout** — Botão que abre o mesmo fluxo do `FeedbackModal` (também em Perfil e Configurações)
- **AccountSummaryStrip** — Faixa com plano, estado Open Finance e atalho para Configurações (`#open-finance`)
- **InsightDoDia** — Card com insight do Sentinela Geo
- ~~**BriefingModal**~~ — removido (briefing no Assistente; `/` → Painel)
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

## ☁️ CLOUD FUNCTIONS (51 total — functions/index.js)

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
| `chatApi` | onCall | Chat com IA usando contexto financeiro completo (fallback: Gemini→Groq→OpenAI→Claude→DeepSeek) |
| `proactiveInsightApi` | onCall | Gera insights proativos financeiros |
| `briefingIa` | onCall | Insight curto pós-login |
| `aiCategorizeCsv` | onCall | Categoriza transações de CSV via Gemini Flash |
| `assistantEntryCaptureApi` | onCall | Voz ou imagem → rascunho de lançamento (`entry_draft`); consultor usa este callable |
| `visionToEntryApi` | onCall | Imagem → JSON de lançamento (Gemini Vision); delega a `entryCaptureOrchestrator` |
| `sttToEntry` | onCall | Áudio → transcrição + extração de lançamento; delega a `entryCaptureOrchestrator` |

### Market Data (BRAPI + Renda Fixa)
| Função | Tipo | O que faz |
|--------|------|-----------|
| `brapiQuote` | onCall | Cotação individual de ação |
| `brapiMulti` | onCall | Cotações múltiplas |
| `brapiSearch` | onCall | Busca de empresas/tickers |
| `brapiCrypto` | onCall | Cotações de cripto |
| `brapiInflation` | onCall | IPCA atual |
| `fixedIncomeCatalogApi` | onCall | Catálogo de renda fixa (Selic/IPCA BCB + títulos Tesouro via CSV fallback) |

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
```typescript
try {
  // operação crítica
} catch (e) {
  // tratar e registrar erro
}
```

---

## 🆕 ATUALIZAÇÃO DE SESSÃO (08/04/2026)

### Consultor IA / Inteligência (hotfixes em produção)
- **Barra do chat ajustada** (`ConsultantChat.tsx`): câmera, microfone e enviar ficam visíveis juntos (em vez de alternar por estado de input).
- **Fallback de resposta no frontend** (`ConsultantSessionContext.tsx`): se o stream (`chatStreamApi`) terminar sem texto, o app chama `chatApi` automaticamente para evitar bolha vazia.
- **Histórico limpo para o modelo** (`ConsultantSessionContext.tsx`): histórico recente enviado sem HTML (`<br>`, `<strong>`), reduzindo ruído e melhorando coerência.
- **Prompt de streaming corrigido** (`functions/services/llm/llmService.js`): remove duplicação de contexto no `systemInstruction`; `fullPrompt` passa a ser a única fonte do conteúdo estratégico.
- **Prompt soberano respeitado no fallback** (`llmService.js`): `generateAnalysis()` passa a reconhecer prompt completo do Arquiteto Soberano e não re-empacota com prompt genérico.
- **Roteamento de intenção de mercado reforçado** (`functions/services/llm/marketIntentService.js`):
  - novos sinais para `analysisMode: "raio_x"`
  - fallback regex para ticker B3, cripto, inflação e renda fixa
  - suporte explícito a `fixed_income`.
- **Injeção de mercado compactada** (`functions/index.js`): payload BRAPI resumido antes de entrar no prompt (evita estouro de contexto e melhora estabilidade).
- **Diretivas de Raio-X por classe** (`functions/index.js`): instruções específicas para **ações**, **ETF/FII**, **cripto** e **renda fixa** no prompt final.

### Deploys realizados nesta sessão
- `npm run deploy:app` (hosting React em `hosting:app`)
- `firebase deploy --only functions:chatApi,functions:chatStreamApi`
- Ambiente: `virtus-financeiro-cd7bd` (`https://virtus-financeiro-cd7bd.web.app`)

### Refatoração de qualidade (assistente determinístico)
- Novo módulo: `functions/services/assistant/assistantOrchestrator.js`
  - Pipeline centralizado: intenção -> resolução de ativo -> fetch de mercado -> composição de prompt -> guardrail de classe -> resposta.
  - `chatApi` e `chatStreamApi` agora delegam para o orquestrador (reduz duplicação e regressões cruzadas).
- Mantida compatibilidade com:
  - fallback stream -> resposta completa
  - lock de classe (ações/ETF/FII/cripto/renda fixa)
  - autocorreção de ticker com busca BRAPI

### Orquestrador de captura (voz + visão → lançamento)
- **`functions/services/assistant/entryCaptureOrchestrator.js`**: mesmo contrato `analysisMode: entry_draft` para STT e Gemini Vision; textos de confirmação gerados no backend.
- **`assistantEntryCaptureApi`**: `{ kind: 'voice'|'vision', ... }` — o drawer/página do consultor chama só esta função para microfone e foto.
- **`sttToEntry`** / **`visionToEntryApi`**: mantidos para retrocompatibilidade; implementação unificada no orquestrador.

**Deploy:** após merge, `firebase deploy --only functions:assistantEntryCaptureApi,functions:sttToEntry,functions:visionToEntryApi` (e hosting se alterar só o front).

### Hotfix Raio-X ETF (09/04/2026)
- **Bug raiz identificado:** cache do `callLLM` por prefixo de 120 chars causava colisão no classificador de intenção (ex.: após DEBB11, mensagem `btc` herdava resposta em cache). Corrigido com chave SHA-256 do prompt completo em `functions/services/llm/llmService.js`.
- **Padrão ETFBrasil aplicado ao Raio-X de ETF:** `assistantOrchestrator.js` passa a gerar saída determinística para ETFs em `analysisMode=raio_x` (estrutura do ativo, preço/faixas, liquidez, custo, benchmark e ação recomendada), evitando resposta genérica “dados limitados”.
- **Teste de sequência validado:** BTC → BOVA11 com payload correto em ambos e sem vazamento de contexto.
- **Deploy realizado:** `firebase deploy --only "functions:chatApi,functions:chatStreamApi"`.

### Módulo inicial de renda fixa com dados reais (09/04/2026)
- **Novo serviço:** `functions/services/market/fixedIncomeService.js`
  - Busca Selic/IPCA no Banco Central (SGS 432 e 433).
  - Integra Tesouro Direto com fallback para Tesouro Transparente (CKAN CSV oficial) quando o endpoint primário estiver indisponível.
  - Normaliza catálogo com `indicators`, `tesouro.titles`, `syntheticProducts` e `status` por fonte.
- **Nova função callable:** `fixedIncomeCatalogApi` em `functions/index.js`.
- **Consultor IA:** `assistantOrchestrator.js` usa o catálogo de renda fixa para `intent=fixed_income|inflation` e gera resposta determinística com Selic, IPCA e benchmarks CDB/LCI/LCA.
- **Simulação no card (09/04/2026):** `ConsultantChat.tsx` — seção **Simular meu caso** com prazo (meses → dias), tabela regressiva de IR no CDB (22,5% / 20% / 17,5% / 15%), LCI/LCA isentos, líquido e real estimados no cliente a partir de `indicators` + fração CDI do `id` do produto sintético.

### Entrada padrão Assistente + deploy (09/04/2026)
- **`/` e `/login`** redirecionam para **`/consultor-ia`** (sem toggle em Configurações). Aba **Visão** no consultor = `ConsultantVisionPanel` (KPIs/atalhos).
- **Deploy produção:** `npm run syntax-check` + `npm run deploy:app` → `hosting:app` em https://virtus-financeiro-cd7bd.web.app

### UX Assistente (09/04/2026)
- Briefing OF **stale:** botão **Atualizar agora** (`syncOpenFinance`) + link **ver →** Configurações; `BriefingItem.action === 'sync_open_finance'` em `briefingDay.ts`.
- **Sobre este módulo:** contraste (`text-si-2` / `strong` si-1). **Composer:** label “Sua mensagem”, área com borda/foco; ícones câmera/mic com `ring` no hover.
- Página **Consultant:** subtítulo explicando **Conversa** vs **Visão**.
- **Navegação Painel:** FAB “Ir ao painel” **removido em `/consultor-ia`**; botão duplicado “Abrir painel” no briefing trocado por texto discreto — painel fica na **sidebar** e no **toggle Painel | Assistente** do header.

### Fixes fluxo de dados + análise profunda (10/04/2026)
- **Fix 1:** `useFinancialData.ts` — `entriesOverflow` agora usa `query(col, orderBy('date','desc'), limit(1000))`. Evita download ilimitado para usuários com muito histórico bancário via Open Finance.
- **Fix 2:** Novo hook `src/hooks/useMarketRates.ts` — busca CDI/Selic/IPCA reais via `fixedIncomeCatalogApi` com cache localStorage de 24h e fallback automático. `IntelligenceContext` passa a usar `cdiMonthly` dinâmico no cálculo do Spread Gap (Sg).
- **Fix 3:** `useFinancialData.ts` — score agora loga divergência em DEV (`console.warn`) quando server score e local score diferem por mais de 5 pontos. Prioridade do server score documentada explicitamente.
- **Fix 4:** `AppContext.tsx` — optimistic entries implementadas: `addOptimisticEntry(entry)` retorna tempId, `removeOptimisticEntry(tempId)` reverte. `entries` exposto pelo contexto já inclui otimistas. Auto-limpeza via `useEffect` quando Firestore confirma a escrita.
- **Novo skill:** `.claude/skills/sibanki/SKILL.md` — garante leitura e atualização do CLAUDE.md em toda sessão.
- **Novos docs:** `docs/FLUXO-DE-DADOS.md` (mapa das 4 camadas), `docs/AUDITORIA-PROFUNDA.md` (10 problemas críticos identificados).
- **Deploy:** `npm run deploy:app` → https://virtus-financeiro-cd7bd.web.app

### Afiliados + cashback unificado (10/04/2026)
- **Config de ambiente** expandida em `functions/config.js`: `LOMADEE_APP_TOKEN`, `LOMADEE_SOURCE_ID`, `LOMADEE_WEBHOOK_SECRET`, `MONETIZZE_API_KEY`, `MONETIZZE_TOKEN`, `MONETIZZE_WEBHOOK_SECRET`, `CASHBACK_CONVERSION_RATE`, `CASHBACK_RELEASE_DAYS`.
- **Webhook parceiro** refeito em `functions/index.js` com normalização de payload (Lomadee/Monetizze/generic), validação de secret por parceiro, idempotência e ledger em `affiliate_transactions`.
- **Novos endpoints HTTP:** `webhookLomadee` e `webhookMonetizze` (core compartilhado com `webhookParceiro`).
- **Crédito de moeda**: quando status normalizado = `approved`, registra em `users/{uid}/sibcoin`, atualiza `users/{uid}/filiado/dados` e grava log em `cashback_log`.
- **Guia prático:** `docs/AFILIADOS-WEBHOOKS-CASHBACK.md` com payloads exemplo (`curl`), `reference` com `uid`, `*_PRODUCT_MAP` e troubleshooting.
- **Homologação:** `docs/HOMOLOGACAO-AFILIADOS-CASHBACK.md` inclui os mesmos 5 testes em **PowerShell** (`$BASE`, `$UID`, helper `Post-AffiliateWebhook`).
- **Cashback vs comissão:** `docs/CASHBACK-SIBCOIN-NEGOCIO.md` — tabela por `produtoId`, custo em R$/1k vendas, tetos sugeridos e notas para loja genérica Lomadee.

### Auditoria profunda + hardening de qualidade (10/04/2026 — sessão 2)

#### Cloud Functions — timeouts corrigidos
- **`chatApiOptions`** em `functions/index.js`: de `{}` para `{ timeoutSeconds: 300, memory: '512MB', ...enforceAppCheck }`. Afeta `chatApi`, `chatStreamApi`, `proactiveInsightApi`.
- **`pluggySyncAccounts`**: de `functions.https.onCall` para `functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onCall`. Evita timeout em syncs bancários longos.

#### Memory leak BRAPI rate map
- `brapiRateCheck` em `functions/index.js`: entradas no `_brapiRateMap` agora têm `cleanupTimer` (`setTimeout` de `BRAPI_RATE_WINDOW + 1000ms`) que limpa a entrada automaticamente. Antes acumulava indefinidamente.

#### Novos serviços de qualidade no frontend
- **`src/services/validators.ts`** (novo): validação centralizada para `Entry`, `Card`, `CardPurchase`, `Goal`, `Investment`, `Recurrent`, `Account`. Funções puras que retornam `{ ok, errors[] }`. Previne gravação de dados malformados no Firestore.
- **`src/services/logging.ts`** (novo): logging centralizado de erros para `users/{uid}/errorLogs`. Fire-and-forget, rate-limited (10/min), sanitizado (sem dados financeiros). Exporta `logClientError`, `logClientWarn`, `withErrorLogging`.

#### Firestore rules — schema validation
- **`isValidEntry(data)`**: verifica `desc` (string, 1–200 chars), `value` (number, 0–1B), `date` (string, 10 chars ISO), `type` (enum receita/despesa/transferencia).
- **`isValidUserData(data)`**: verifica `plan` (enum), `openFinanceStatus` (enum), `finScore` (0–100), `sibcoinBalance` (≥0).
- Aplicado a `entriesOverflow` (create/update) e `users/{userId}` (create/update).
- Nova regra `users/{userId}/errorLogs`: append-only (create OK, update/delete = false).

#### Deploy realizado
- `firebase deploy --only "functions:chatApi,functions:chatStreamApi,functions:proactiveInsightApi,functions:pluggySyncAccounts"` ✅
- `firebase deploy --only firestore:rules` ✅
- `firebase deploy --only hosting:app` → https://virtus-financeiro-cd7bd.web.app ✅

### Loja ao vivo — Lomadee + Monetizze (11/04/2026)

#### Problema resolvido: Lomadee API
- **`functions/services/affiliate/lomadeeCatalogService.js`** reescrito:
  - URL corrigida de `api-beta.lomadee.com.br/affiliate/brands` → `api.lomadee.com/v3/{token}/advertiser/_all`
  - `LOMADEE_SOURCE_ID` agora passado como `?sourceId=` em todas as requisições (rastreamento correto)
  - Novo endpoint de deeplink: `GET /v3/{token}/deeplink/create?sourceId=…&url=…` — gera URLs rastreáveis por advertiser em paralelo com timeout de 10s
  - Fallback silencioso: se deeplink falhar, usa URL direta do advertiser
  - Cache do catálogo: 5 min (era 90s); cache de deeplinks: 1h
  - `normalizeBrand` → `normalizeAdvertiser` com suporte a múltiplos campos de comissão e logo

#### Loja.tsx — abas completadas
- **Aba "Resgatar SibCoin"**: grid de rewards com cards, estado `canAfford`, modal de confirmação com botão Confirmar/Cancelar, barra de progresso de saldo.
- **Aba "Histórico"**: KPIs (saldo/resgatados/tier/multiplicador) + lista de transações do `sibcoinHistory` (últimas 50, ordem decrescente), empty state.
- **Aba "Redes"**: cards por rede afiliada com contagem de lojas + seção "Como funciona" (5 passos).

#### Click tracking implementado
- `affiliateStore.ts`: nova função `trackAffiliateClick(offer)` — chama `registrarCliqueSolucao` fire-and-forget antes de redirecionar.
- `Loja.tsx`: `openAffiliateLink` atualizado para receber `offer` (não só URL) e chamar `trackAffiliateClick` automaticamente. Todos os botões "Ir" e "Ativar" rastreados.

#### Webhooks Monetizze — URLs para configurar no painel
- **Lomadee:** `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/webhookLomadee`
- **Monetizze:** `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/webhookMonetizze`
- **Genérico:** `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/webhookParceiro`

#### Deploy realizado
- `firebase deploy --only "functions:affiliateStoreCatalogApi,functions:registrarCliqueSolucao,functions:webhookLomadee,functions:webhookMonetizze,functions:webhookParceiro"` ✅
- `npm run build && firebase deploy --only hosting:app` ✅ → https://virtus-financeiro-cd7bd.web.app

#### Loja em “demonstração” — região (10/04/2026)
- **Causa:** `affiliateStoreCatalogApi` deployada em **`southamerica-east1`**, mas o app chamava com **`getFunctions(app)`** (default **`us-central1`**) → URL da callable errada → erro → fallback **demo** em `Loja.tsx`.
- **Correção correta:** manter a função em **`southamerica-east1`** (escolha válida por latência/região BR) e alinhar o cliente: `getFunctions(app, 'southamerica-east1')` em `affiliateStore.ts` **só** para `affiliateStoreCatalogApi`; `registrarCliqueSolucao` segue em `us-central1` com `functions` padrão.

### Loja — correções de DNS e cascata de endpoints (12/04/2026)

#### Problema DNS resolvido
- `affiliateStoreCatalogApi` movida de **`us-central1`** → **`southamerica-east1`**: domínio `api-beta.lomadee.com.br` agora resolve corretamente (confirmado via logs: antes ENOTFOUND, depois HTTP 404 → problema passou a ser o path, não DNS).
- `affiliateStore.ts` atualizado: usa `getFunctions(app, 'southamerica-east1')` para `affiliateStoreCatalogApi`.
- Detecção de erros DNS em `lomadeeCatalogService.js` expandida: inclui `EAI_AGAIN`, `ETIMEDOUT`, `ECONNRESET`.

#### lomadeeCatalogService.js reescrito (arquivo estava truncado — bug de sessão anterior)
- Cascata de 3 tentativas antes de cair em demo:
  1. `GET /affiliate/products` com `x-api-key` header → catálogo de produtos (requer ativação no painel Lomadee)
  2. `GET /affiliate/brands` com `x-api-key` header → anunciantes/marcas
  3. `GET /v3/{token}/store/_all` (e fallbacks `program/_all`, `advertiser/_all`) → lojas v3
- `normalizeProduct` e `normalizeAdvertiser` separados e completos.
- `module.exports = { getCatalog }` correto.

#### Pendência operacional
- **Ativar módulo `/affiliate/products` no painel Lomadee:** acessar painel → Meus aplicativos → solicitar acesso ao Catálogo de Produtos. Sem isso, a cascata cai em `/affiliate/brands` (poucos anunciantes).

### Onboarding expandido + BCB Valores a Receber (13/04/2026)

#### Contexto
Pivot do foco da Loja para o coração do produto. O onboarding coletava poucos dados e não conectava bancos — usuários chegavam sem dados financeiros, o Ld ficava em zero e o app parecia vazio.

#### RegistrationWizard — 6 etapas (era 4)
- **Novo step 4 "Conectar Bancos"**: embeds `OpenFinanceConnect` inline no wizard. Usuário conecta via Pluggy diretamente no onboarding; flag `openBankingConectadoNoOnboarding: true` salva no Firestore. Botão "Pular" disponível.
- **Novo step 5 "Dinheiro Esquecido"**: ao chegar neste step, o app chama automaticamente `valoresAReceberApi` com o CPF informado no step 0. Mostra:
  - Loading: "Consultando Banco Central…"
  - Encontrou: card verde com instituições + botão "Resgatar no Banco Central" (link para valoresareceber.bcb.gov.br)
  - Não encontrou: card neutro ("Nenhum valor encontrado")
  - API indisponível: card âmbar com link manual
- Validação de CPF com algoritmo completo (módulo 11) integrada ao step identidade.
- Lookup de CEP via ViaCEP auto-preenche estado/cidade no step contato.

#### OpenFinanceConnect — nova prop `onConnected`
- Adicionada prop `onConnected?: () => void` ao componente.
- Chamada após sync Pluggy bem-sucedido (`pluggySyncAccounts` sem erro) → wizard marca `bankConnected = true`.
- Retro-compatível: prop é opcional, componentes existentes não precisam mudar.

#### Nova Cloud Function `valoresAReceberApi`
- `functions/index.js` — callable `us-central1`
- Recebe `{ cpf: string }` do usuário autenticado
- Tenta dois endpoints BCB em cascata: `/api/v1/cpf/{cpf}` e `/api/v1/cliente/{cpf}`
- Se `available.length > 0`: persiste `users/{uid}.valoresAReceber` com `hasValues, institutions, total, checkedAt, claimUrl`
- Retorna `{ hasValues, count, institutions, claimUrl, source: 'bcb' }` ou `{ hasValues: null, error }`

#### Deploy realizado (13/04/2026)
- `firebase deploy --only functions:valoresAReceberApi` ✅ → `us-central1`
- `npm run build && node scripts/prepare-dist.mjs && firebase deploy --only hosting:app` ✅ → https://virtus-financeiro-cd7bd.web.app

### Crédito como módulo pai (13/04/2026)

- **Arquitetura de rotas ajustada (Fase 1):**
  - `/credito` → redirect para `/credito/visao-geral`
  - Novas subrotas: `/credito/cartoes`, `/credito/emprestimos`, `/credito/plano`, `/credito/oportunidades`, `/credito/educacao`
  - `/cartoes` agora é alias compatível e redireciona para `/credito/cartoes`
- **Sidebar:** item secundário mudou de **Cartões** para **Crédito** (`/credito`), consolidando o domínio no menu.
- **CreditHub:** abas passam a sincronizar com URL (deep-link por submódulo), mantendo o estado de navegação coerente.
- **Objetivo:** reduzir sobreposição entre `Cards.tsx` e `CreditHub.tsx` e preparar a migração gradual para “Crédito” como domínio principal.

### Crédito — Fase 2 (13/04/2026)

- Novo componente compartilhado: `src/components/credit/CreditModuleTabs.tsx`.
  - Navegação única dos submódulos (`/credito/visao-geral`, `/credito/cartoes`, `/credito/emprestimos`, `/credito/plano`, `/credito/oportunidades`, `/credito/educacao`).
  - Reutilizado em `CreditHub.tsx` e `Cards.tsx`.
- `CreditHub.tsx`:
  - remove dependência de estado interno para tabs;
  - aba ativa passa a ser derivada da rota atual;
  - bloco duplicado de “Cartões” removido (agora responsabilidade da rota `/credito/cartoes`).
- `Cards.tsx`:
  - incorpora `CreditModuleTabs` no topo;
  - título ajustado para “Crédito · Cartões” reforçando hierarquia de domínio.

### Crédito — Fase 3 (13/04/2026)

- `Cards.tsx` foi reduzido ao escopo operacional de cartões/faturas.
  - blocos longos de macrovisão e “crédito estruturado” foram removidos desta tela para evitar duplicação com o Hub;
  - adicionado bloco compacto **Resumo de crédito** com indicadores-chave e links para:
    - `/credito/visao-geral`
    - `/credito/emprestimos`
    - `/consultor-ia`
- Resultado: separação mais nítida entre:
  - **Hub de Crédito** (visão estratégica/consolidada)
  - **Crédito · Cartões** (execução operacional do dia a dia)

### Crédito — Fase 4 (13/04/2026)

- Novo arquivo compartilhado: `src/components/credit/CreditVisuals.tsx`
  - `pressurePillClasses(level)` para badges de pressão;
  - `pressurePanelClasses(level)` + `pressureLabel(level)` para painéis de status;
  - `CreditKpiGrid` para cards de métricas reutilizáveis.
- `CreditHub.tsx` e `Cards.tsx` passaram a usar os mesmos visuais de pressão/KPI (consistência total de UI).
- Correção de navegação no Hub: botão “Ver detalhes” agora navega para `/credito/cartoes` (sem estado local de aba).

### Crédito — Fase 5 (13/04/2026)

- Novo módulo de seções: `src/components/credit/CreditHubSections.tsx`
  - `CreditOverviewSection`
  - `CreditLoansSection`
  - `UtilBar` interno para barras de utilização.
- `CreditHub.tsx` foi simplificado:
  - remove blocos grandes de JSX das abas “Visão Geral” e “Empréstimos”;
  - passa a orquestrar seções por composição de componentes.
- Benefício: menor acoplamento e manutenção mais simples das seções do Hub sem impactar a tela operacional de cartões.

### Crédito — Fase 6 (13/04/2026)

- `CreditHubSections.tsx` expandido com:
  - `CreditPlanSection`
  - `CreditOpportunitiesSection`
- `CreditHub.tsx` deixa de conter blocos extensos de JSX para “Plano” e “Oportunidades”, passando a montar via componentes.
- Resultado: `CreditHub.tsx` mais enxuto e com melhor separação de responsabilidades por seção.

### Crédito — Fase 7 (13/04/2026)

- `CreditHubSections.tsx` ganhou `CreditEducationSection`.
- `CreditHub.tsx` remove bloco local de Educação (carrossel + glossário) e passa a compor a aba via `CreditEducationSection`.
- Com isso, todas as abas principais do Hub (`Visão Geral`, `Empréstimos`, `Plano`, `Oportunidades`, `Educação`) já estão em seções/componentes dedicados.

### Crédito — Fase 8 (13/04/2026)

- Novo arquivo `src/constants/creditHub.ts` para centralizar conteúdo/config:
  - `CREDIT_EDUCATION_CARDS`
  - `CREDIT_GLOSSARY_TERMS`
  - `buildCreditPlanItems(...)`
  - `buildCreditOpportunities(...)`
- `CreditHub.tsx` passa a consumir essas constantes/builders, ficando menos acoplado a texto/labels.
- `CreditEducationSection` agora recebe `glossaryTerms` por props (antes hardcoded no componente).

### Crédito — Fase 9 (13/04/2026)

- Testes unitários adicionados para proteger regras de conteúdo/contexto do Hub de Crédito:
  - Arquivo: `src/constants/creditHub.test.ts`
  - Cobertura:
    - presença mínima de cards de educação e glossário;
    - `buildCreditPlanItems(...)` gera 4 blocos na ordem esperada (`alert`, `reneg`, `clock`, `check`);
    - `buildCreditOpportunities('critico')` não exibe “Aumento de limite”;
    - `buildCreditOpportunities('controlado')` exibe “Seguro prestamista”.
- Ferramenta de teste adicionada: `vitest` (devDependency).
- Script novo: `npm run test:unit` (`vitest run src/constants/creditHub.test.ts`).
- Execução validada: `npm run test:unit -- src/constants/creditHub.test.ts` ✅ (4/4 testes).

### Crédito — Fase 10 (13/04/2026)

- **Benefícios de cartão (MVP)** adicionados ao domínio:
  - novo tipo `CardBenefits` em `src/types/userData.ts`;
  - `Card` agora aceita `cardBenefits` (sala VIP, seguros, proteção de compra, garantia estendida, concierge, pontos, cashback e notas).
- **Persistência**: `updateCard(...)` em `src/services/persistUserData.ts` passou a aceitar atualização de `cardBenefits`.
- **Crédito · Cartões (`src/pages/Cards.tsx`)**:
  - novo botão **Benefícios** em cada cartão;
  - modal dedicado para editar benefícios manualmente;
  - atalho “Sugerir benefícios pela bandeira” (regras iniciais por Visa/Mastercard/Amex/Elo);
  - chips de resumo exibidos no card (ex.: Sala VIP, Seguro viagem, Pontos, Cashback).
- **Hub de Crédito (`/credito/visao-geral`)**:
  - `CreditOverviewSection` recebe `benefitsSummary`;
  - novo bloco “Benefícios de cartões” com contadores (cartões com benefícios, com sala VIP, com proteção/seguro).

### Crédito — Fase 11 (13/04/2026)

- **Consultor IA agora considera benefícios dos cartões** no resumo estratégico enviado ao backend (`src/context/ConsultantSessionContext.tsx`):
  - novo helper `buildCardBenefitsSnapshot(cards)` inclui:
    - quantidade de cartões com benefícios preenchidos;
    - total com sala VIP;
    - total com proteções/seguros;
    - cartão com maior cashback informado.
- Objetivo: permitir recomendações mais contextuais (ex.: qual cartão usar por benefício, quando priorizar sala VIP/cashback/seguros) sem depender só de limite/fatura.

### Consultor — Bloco “Sugestão de cartão” (13/04/2026)

- **`src/utils/suggestBestCardForPurchase.ts`**: heurística local (texto do usuário + `cardBenefits`) — palavras-chave de viagem, online, refeições, eletrônicos; pontuação por cashback e benefícios; retorna `null` se não houver gatilho ou cartão com benefícios.
- **`src/components/consultant/CardPurchaseHint.tsx`**: card visual no thread do chat após a resposta da IA, com link para `/credito/cartoes`.
- **`ConsultantChatMessage.cardPurchaseSuggestion`**: preenchido ao concluir `handleSend` com sucesso em `ConsultantSessionContext.tsx`.

### Crédito — Catálogo de benefícios (referência) (13/04/2026)

- **`src/constants/cardBenefitsCatalog.ts`**: perfis típicos por bandeira (Visa, Mastercard, Elo, Amex, Hipercard, Outros) em níveis (básico → topo); textos de referência + dicas de rede VIP/pontos; **cashback não é fixado** (usuário informa).
- **`Cards.tsx` (modal Benefícios)**: seletor de perfil + **Aplicar perfil**; botão **Sugestão rápida (perfil intermediário)**; edição manual marca `source: manual`; perfil aplicado do catálogo salva com `source: catalog` quando ainda marcado como vindo do catálogo.

---

## 🏪 PLANO LOJA 2.0 — CHECKOUT NATIVO + EXPANSÃO DE CATÁLOGO

> Status: **Planejado** — nenhum código desta seção existe ainda.

### Visão
Transformar a Loja de vitrine de afiliados (usuário sai do app) em **canal de compra nativo** onde o usuário paga sem sair do Sibanki. Toda compra feita dentro do app entra automaticamente nos lançamentos financeiros com categoria, valor e Sv calculados antes da confirmação. Nenhum banco ou app financeiro brasileiro faz isso hoje.

### Arquitetura de Pagamento (sem licença do Banco Central)

**Facilitador escolhido: Pagar.me Marketplace (Stone) ou Mercado Pago Marketplace**
- Eles são a instituição de pagamento regulada; o Sibanki é apenas a plataforma de distribuição.
- Split automático configurado no painel do facilitador: X% vai para o lojista parceiro, Y% vai para o Sibanki como comissão de marketplace.
- Nenhum dinheiro fica em conta do Sibanki — fluxo direto facilitador → lojista.

**Fluxo de pagamento no crédito:**
1. Usuário seleciona produto na Loja → tela de checkout abre dentro do app.
2. SDK JS do Pagar.me/MP **tokeniza o cartão no browser** (dados nunca chegam nos nossos servidores — PCI-compliant).
3. Cloud Function `createOrder` recebe token + produtoId + userId → chama API do facilitador → confirma split.
4. Webhook de confirmação → credita SibCoin de cashback + cria lançamento automático em `entries` do usuário.
5. Sv calculado em tempo real antes do usuário confirmar (“Este gasto reduz seus Dias de Liberdade em X dias”).

**Fluxo Pix:**
- Mesmo fluxo, porém a Cloud Function gera um QR Code Pix via API do facilitador.
- Usuário paga no próprio app bancário, webhook confirma, lançamento criado automaticamente.

**SibCoin como desconto:**
- Antes de confirmar, o usuário pode aplicar SibCoins como desconto (ex: 500 SC = R$ 5,00 de desconto).
- Desconto deduzido do valor enviado ao facilitador; SibCoins consumidos registrados em `sibcoinHistory`.

### Cloud Functions necessárias

| Função | Tipo | O que faz |
|--------|------|-----------|
| `createOrder` | onCall | Cria pedido: tokeniza, chama facilitador, salva em `orders/{orderId}` |
| `confirmOrderWebhook` | onRequest | Webhook do facilitador: confirma pagamento, cria lançamento, credita SibCoin |
| `cancelOrder` | onCall | Cancela pedido pendente; estorna SibCoins se aplicado |
| `getOrderHistory` | onCall | Lista pedidos do usuário em `users/{uid}/orders` |

### Estrutura Firestore

```
/orders/{orderId}
  ├── uid, productId, merchantId, network
  ├── amount, currency (BRL)
  ├── sibcoinApplied, sibcoinDiscount
  ├── paymentMethod: 'credit_card' | 'pix'
  ├── status: 'pending' | 'confirmed' | 'cancelled' | 'refunded'
  ├── facilitator: 'pagarme' | 'mercadopago'
  ├── externalOrderId (ID no facilitador)
  ├── entryId (lançamento criado no Firestore após confirmação)
  └── createdAt, confirmedAt
```

### Expansão de catálogo — Redes a integrar

| Rede | Tipo | Prioridade | Observação |
|------|------|-----------|------------|
| Lomadee `/affiliate/products` | Produtos físicos | 🔴 Alta | Requer ativação no painel (task operacional) |
| **Awin** | Físicos + digitais | 🔴 Alta | API REST bem documentada, centenas de anunciantes BR |
| **B2W Afiliados** (Americanas/Submarino) | Físicos | 🟡 Média | Direto dos maiores varejistas BR |
| **Magalu Afiliados** | Físicos | 🟡 Média | API própria, grande catálogo |
| **Hotmart** | Infoprodutos/cursos | 🟡 Média | Complementa o catálogo físico |
| **Eduzz** | Infoprodutos | 🟢 Baixa | Similar ao Hotmart |
| Monetizze | Infoprodutos | ✅ Já integrado (webhook) | Adicionar catálogo |

### Recomendações contextuais (diferencial Sibanki)

A Loja deve usar os dados do `IntelligenceContext` para personalizar o catálogo:
- Se `catTotals['Eletrônicos'] > 500` → destacar ofertas de eletrônicos com cashback.
- Se `spread < 0` (dívida cara) → destacar portabilidade de crédito nas Soluções.
- Se `freedom.days > 180` → destacar investimentos e cursos financeiros.
- Componente `LojaContextualBanner` na aba principal da Loja mostrando “Você gasta R$X/mês em Y — veja ofertas com cashback”.

### Parceiros piloto para checkout nativo
Selecionar 2-3 lojistas com API própria para o primeiro checkout nativo:
- Farmácia (Droga Raia, Ultrafarma — APIs abertas)
- Livraria (Amazon BR via Associates API)
- Supermercado (Rappi API para pedidos)

---

## 🎯 PRÓXIMAS PRIORIDADES (13/04/2026)

### 🔴 CRÍTICO — resolver agora

1. **Ativar `/affiliate/products` no painel Lomadee**
   - Acesso: painel.lomadee.com → Meus Aplicativos → Catálogo de Produtos
   - Sem isso a Loja mostra poucos anunciantes (o endpoint products retorna 404 sem ativação)
   - **Não é código — é tarefa operacional do João**

2. **Verificar se `lomadeeCatalogService.js` reescrito está retornando dados reais**
   - Após ativação da Lomadee, testar no app se a cascata `products → brands → v3` retorna conteúdo
   - Checar logs no Firebase Console → Functions → `affiliateStoreCatalogApi`

3. **Wire `validators.ts` ao `persistUserData.ts`** — os validadores existem mas não estão sendo chamados antes das escritas no Firestore

4. **Recorrentes automáticos** — ✅ implementado no código (`aplicarRecorrentesDoMes` + `aplicarRecorrentesManual` + botão no front); pendente apenas deploy/validação em produção

### 🟡 PRÓXIMO SPRINT — Core do produto

5. **Race condition em `updateUserDoc`** — implementar `requestId` + idempotência para evitar escritas duplicadas em reconexões
6. **Error handling em `Cards.tsx`** (1253 linhas, crashes silenciosos) — wrappers try/catch + `logClientError`
7. **Integrar Awin** — `awinCatalogService.js` com `AWIN_PUBLISHER_ID` + `AWIN_API_KEY`
8. **Recomendações contextuais na Loja** — `LojaContextualBanner.tsx` usando `catTotals` do `IntelligenceContext`

### 🟢 MÉDIO PRAZO — Loja 2.0 e crescimento

9. **Checkout nativo Fase 1 (Pix)** — Cloud Function `createOrder` + `confirmOrderWebhook` + integração Pagar.me
10. **Checkout nativo Fase 2 (Crédito)** — SDK de tokenização Pagar.me no React + fluxo completo
11. **Sv pré-compra** — mostrar impacto da compra nos Dias de Liberdade antes do usuário confirmar
12. **Lançamento automático pós-compra** — compras na Loja entram automaticamente em `entries`
13. **Testes Playwright para Loja e Onboarding** — adicionar rotas `/loja` e fluxo de cadastro nos smoke tests
- **Nota:** o TLD `.com.br` da Lomadee não obriga a região da Cloud Function; o que importa é **mesma região** entre deploy da callable e `getFunctions` no front.
### AI Pipeline Claude↔Cursor implementado (13/04/2026)

#### Arquitetura
Sistema de orquestração assíncrona entre Claude (Cowork) e Cursor para desenvolvimento paralelo com verificação automática.

**Fluxo completo:**
```
Claude escreve tarefa → TASK_QUEUE.md (status: WAITING_CURSOR)
  ↓ task-watcher detecta
  ↓ Notificação Windows + Cursor abre automaticamente
Cursor lê .cursor/rules/pipeline.mdc + executa tarefa
  ↓ Cursor atualiza TASK_QUEUE.md (status: CURSOR_DONE)
  ↓ task-watcher detecta → cria .pipeline/verification_needed.flag
Cowork scheduled task (a cada 5 min) detecta flag
  ↓ Lê tarefa + resultado do Cursor
  ↓ Verifica implementação contra critérios de aceitação
  ↓ Atualiza TASK_QUEUE.md: COMPLETED ou NEEDS_REVISION
  ↓ Deleta flag
Se NEEDS_REVISION: task-watcher notifica Cursor novamente → loop
```

**Arquivos criados:**
- `docs/TASK_QUEUE.md` — fila de tarefas com frontmatter YAML estruturado
- `.cursor/rules/pipeline.mdc` — regra Cursor (`alwaysApply: true`) que lê a fila automaticamente
- `scripts/task-watcher.mjs` — watcher Node.js (sem dependências npm extras)
- `scripts/start-pipeline.bat` — launcher one-click
- `.pipeline/` — diretório de estado temporário (no `.gitignore`)
- Tarefa agendada Cowork `sibanki-pipeline-verify` — roda a cada 5 minutos

**Status possíveis do TASK_QUEUE.md:**
`IDLE` → `WAITING_CURSOR` → `CURSOR_IN_PROGRESS` → `CURSOR_DONE` → `CLAUDE_REVIEWING` → `COMPLETED` (ou `NEEDS_REVISION` → volta para Cursor)

**Como usar:**
1. Rodar `scripts/start-pipeline.bat` (deixar janela aberta — o watcher fica em background)
2. Claude escreve tarefa no `docs/TASK_QUEUE.md` (status: WAITING_CURSOR)
3. Notificação aparece + Cursor abre automaticamente
4. Cursor executa e marca CURSOR_DONE
5. Em até 5 minutos, Claude verifica e fecha o loop

**Como escrever uma tarefa (Claude deve fazer assim):**
Editar o frontmatter do `docs/TASK_QUEUE.md`:
```yaml
---
pipeline_version: "1.0"
status: WAITING_CURSOR
task_id: "YYYYMMDD-NNN"
priority: "alta|media|baixa"
created_at: "ISO timestamp"
updated_at: "ISO timestamp"
assigned_to: "cursor"
---
```
E preencher as seções: **Descrição**, **Contexto / Arquivos relevantes**, **Critérios de aceitação**, **Notas para o Cursor**.

### Análise do sibanki.com.br + quick wins (11/06/2026)

**Contexto:** análise completa do domínio público `sibanki.com.br` (Cloudflare na frente do Firebase Hosting) sob três lentes: comercial, usuário e dev. Relatórios/screenshots em `analise-sibanki/` (não versionado).

**Achados principais (ainda abertos):**
- 🔴 **Sem landing page pública** — toda rota deslogada cai no login; funil de aquisição inexistente (maior alavanca comercial pendente).
- `/sitemap.xml` cai no rewrite do SPA (soft-404); robots.txt é o gerenciado da Cloudflare; título estático único em todas as rotas.
- Health check: tudo verde exceto `monetizzeToken: missing`.

**Correções aplicadas (branch `claude/brave-chebyshev-3d8df8`, rebased em `audit/analise-360` — commit `d45c08c`):**
- **`firebase.json`**: headers de HTML com `source: "**"` em vez de `"**/*.html"` — no Firebase Hosting o match é contra o **path da requisição**, não o arquivo do rewrite; CSP/no-cache **nunca eram aplicados** nas rotas do SPA (produção servia `max-age=3600` default → risco de tela branca pós-deploy). Adicionados `frame-ancestors`, `X-Frame-Options: SAMEORIGIN` (DENY quebraria self-framing previsto no frame-src), `Referrer-Policy`, `nosniff`. Vale para targets `app` e `staging`. **Requer deploy de hosting para valer.**
- **`useMarketRates.ts`**: gate de auth via `onAuthStateChanged` — antes toda visita anônima gerava 401 + invocação paga de `fixedIncomeCatalogApi`.
- **`Login.tsx`**: "senha bancaria" → "senha bancária".
- **`index.html`**: OG/Twitter tags (preview WhatsApp) + splash estático pulsante dentro de `#root` (mata a tela preta de ~5s da 1ª visita; React substitui ao montar).
- **`scripts/generate-og-image.mjs`** gera `public/og-image.png` (1200×630); `prepare-dist.mjs` copia para `dist/`. `scripts/verify-splash.mjs` valida o splash com JS bloqueado.
- Validado: `tsc --noEmit` OK, `npm run build` OK, splash verificado por screenshot. **Sem deploy nesta sessão.**

---

## Design System — Primitivos Pierre (rebase sobre audit/analise-360 · 14/06/2026)

### Achado critico de branch
O `main` (25/abr) estava **obsoleto e sem buildar**: `App.tsx`/`Accounts.tsx`/`Cards.tsx` importavam 12 modulos inexistentes nele. A linha real do produto e a **`audit/analise-360`** (12/jun, 60 commits a frente). Trabalho de DS foi rebaseado sobre ela.

### Entregue
- **`src/utils/cn.ts`** — helper `cn` unico (clsx+tailwind-merge).
- **`src/constants/sovereigntyScale.ts`** — fonte unica de cor/label Ld (`FREEDOM_TIERS`) e Sv (`SV_TIERS`/`getSvTier`); `SovereigntyHero` e `SovereigntyBadge` consomem.
- **Primitivos** `src/components/ui/`: `Button` (+`buttonClasses`; **primary = botao branco** alinhado ao CTA da audit; secondary/ghost/danger), `Card` (+`CardHeader`), `Badge`, `Field`/`Input`/`Select`. Barrel `primitives.ts`.
- **Telas existentes NAO migradas** (decisao 14/06): para nao desviar do design em producao, as migracoes cosmeticas (`EmptyState`/`FeedbackCallout`/`NotFound`/`ErrorBoundary` + icone do Modal) foram revertidas ao pixel exato da producao. Primitivos ficam como ferramenta para telas NOVAS (com revisao visual). `SovereigntyHero`/`Badge` refatorados para a escala central = pixel-identico. Modal mantem so focus-trap (a11y, sem efeito visual).
- **`Modal`** — merge: prop `size` (da audit) + focus trap + icone lucide `X` + `title: ReactNode`.
- **`.si-label`** util em `index.css`.
- **Ratchet** `src/constants/designSystem.guard.test.ts` (vitest, gate de deploy): proibe crescer botao colorido solido. Baseline **29** (audit ja fez varredura de cor; era 164 no main morto).

### Conflitos resolvidos a favor da audit
`creditSnapshot.ts` (audit ja tinha fallback dueDay superior), `AccountCard.tsx` (cn local exportado), `Login.tsx` (brand surface redesenhada).

### Verificacao pos-rebase
`tsc --noEmit`: **0 erros**. `vitest`: **128/128**. `vite build`: **OK** (antes quebrado). Sem deploy/push nesta sessao.
