# Análise de Fluxos do Sistema Sibanki

> Documento gerado em 04/04/2026 — análise profunda de todos os fluxos do sistema.

---

## Índice

1. [Fluxo de Autenticação](#1-fluxo-de-autenticação)
2. [Fluxo de Dados (Firestore ↔ UI)](#2-fluxo-de-dados)
3. [Fluxo de Navegação e Rotas](#3-fluxo-de-navegação-e-rotas)
4. [Fluxos de Integração](#4-fluxos-de-integração)
5. [Fluxos de Negócio](#5-fluxos-de-negócio)
6. [Problemas Identificados](#6-problemas-identificados)
7. [Plano de Ação Recomendado](#7-plano-de-ação-recomendado)

---

## 1. Fluxo de Autenticação

### Cadeia completa

```
main.tsx
  └─ TenantProvider (1ª vez)
       └─ App.tsx
            └─ TenantProvider (2ª vez — REDUNDANTE)
                 └─ AppProvider
                      └─ useAuth() → onAuthStateChanged (1 listener único)
                      └─ useFinancialData(uid) → 2× onSnapshot
                           └─ IntelligenceProvider
                                └─ BrowserRouter
                                     └─ AuthenticatedShell
                                          ├─ authLoading? → spinner
                                          ├─ !user? → <Login />
                                          └─ user? → Sidebar + Header + <Routes>
```

### Login (passo a passo)

1. Usuário entra credenciais em `<Login />`
2. `signInWithEmailAndPassword` ou `signInWithPopup` (Google)
3. Firebase Auth dispara `onAuthStateChanged`
4. `useAuth` atualiza `user` e `loading: false`
5. `AppProvider` propaga no contexto
6. `AuthenticatedShell` re-renderiza → `user` existe → mostra rotas
7. `useFinancialData` inicia 2 listeners Firestore
8. Dados chegam → UI renderiza Dashboard

### Logout

1. `signOut()` chamado em qualquer componente
2. `onAuthStateChanged` → `user = null`
3. `useFinancialData` limpa dados e remove listeners
4. `AuthenticatedShell` → `!user` → renderiza `<Login />`

### Diagrama

```
┌──────────┐   credentials   ┌──────────────┐   onAuthStateChanged   ┌───────────┐
│  Login   │ ───────────────→│ Firebase Auth │ ─────────────────────→│  useAuth  │
│  Page    │                 └──────────────┘                        │  hook     │
└──────────┘                                                         └─────┬─────┘
                                                                           │
                                                                    user state
                                                                           │
                                                                    ┌──────▼──────┐
                                                                    │ AppProvider  │
                                                                    │  (context)   │
                                                                    └──────┬──────┘
                                                                           │
                                                              ┌────────────┼────────────┐
                                                              │            │            │
                                                        ┌─────▼────┐ ┌────▼────┐ ┌─────▼──────┐
                                                        │Financial │ │Intelli- │ │ Rotas      │
                                                        │Data hook │ │gence    │ │ (lazy)     │
                                                        └──────────┘ └─────────┘ └────────────┘
```

---

## 2. Fluxo de Dados

### Leitura (Firestore → UI)

| Listener | Caminho Firestore | Dados | Condição |
|----------|-------------------|-------|----------|
| Doc principal | `users/{uid}` | Entries (inline), accounts, cards, goals, investments, budgets, settings, etc. | Sempre ativo quando logado |
| Subcoleção | `users/{uid}/entriesOverflow` | Entries Pluggy arquivadas (> 2800 no doc) | Sempre ativo quando logado |

**Merge para a UI:**
```
entriesInline = data?.entries ?? []
overflowEntries = subcoleção (com entryLocation: 'overflow')
entries = mergeInlineAndOverflowEntries(inline, overflow)
         → dedup por pluggyTransactionId (inline prevalece)
         → manuais + pluggyMerged, ordenado por data desc
```

### Escrita (UI → Firestore)

Todas as operações passam por `updateUserDoc` (`setDoc` com merge):

```
UI action → persistUserData.ts → getDoc (se precisa recalcular score)
                                → merge em memória
                                → calculateFinScore
                                → setDoc(ref, payload, { merge: true })
                                → onSnapshot dispara → UI atualiza
```

**Campos que disparam recálculo de `finScore`:**
- `entries`, `goals`, `budgets`, `accountBalances`, `accountMeta`, `creditSnapshot`

### Modelo de dados no Firestore

```
users/{uid}                          ← documento único (~flat)
├── entries: Entry[]                 ← array no documento (até 2800)
├── accounts: Account[]
├── cards: Card[]
├── goals: Goal[]
├── investments: Investment[]
├── recurrents: Recurrent[]
├── budgets: Record<string, Budget>
├── orcamentosByMonth: Record
├── accountBalances: Record
├── accountMeta: Record
├── achievements: Record
├── sibcoinBalance: number
├── sibcoinTier: string
├── sibcoinHistory: array
├── openFinance: object
├── creditSnapshot: object
├── creditAccounts: array
├── creditObligations: array
├── settings: object
├── fcmTokens: string[]
├── notificacoesPush: boolean
├── finScore: object
└── ... (50+ campos)

users/{uid}/entriesOverflow/{docId}  ← subcoleção (Pluggy arquivados)
└── Entry (com entryLocation: 'overflow', archivedAt)
```

### Limite de 1MB do Firestore

| Proteção | Onde | Mecanismo |
|----------|------|-----------|
| Contagem | Backend `entryOverflow.js` | Se entries > 2800, arquiva Pluggy antigos em subcoleção |
| Cap de sync | Backend `pluggySyncService.js` | Máx 1500 transações por sync |
| Heurística | Nenhum | Não há validação genérica por bytes no cliente |

---

## 3. Fluxo de Navegação e Rotas

### Proteção de rotas

- **Gate global único**: `AuthenticatedShell` verifica `user` no contexto
- **Sem rotas públicas nomeadas**: não há `/login` como rota explícita
- **Todas as 32 páginas**: lazy-loaded com `React.lazy()` + `Suspense`
- **ErrorBoundary**: envolve cada rota individualmente

### Fluxo de navegação

```
/ (Home)
├── /dashboard
├── /lancamentos (+ redirect de /transactions)
├── /contas
├── /cartoes
├── /orcamento
├── /recorrentes
├── /metas
├── /relatorios
├── /consultor
├── /ferramentas
├── /configuracoes
├── /perfil
├── /social
├── /sibcoin
├── /conquistas
├── /calendario
├── /crescimento
├── /educacao
├── /cripto (demo)
├── /meu-cpf (demo)
├── /meus-boletos (demo)
├── /credito (demo)
├── /loja
├── /solucao/* (parceiros)
└── * → NotFound
```

### Onboarding (primeiro acesso)

```
Login → AuthenticatedShell
  → Verifica cadastro incompleto?
    → SIM → RegistrationWizard (7 passos: perfil, renda, metas, etc.)
    → NÃO → SpotlightTour (se não completado)
              → InstallPrompt (PWA + Push, com delay de 10s)
                → Dashboard
```

---

## 4. Fluxos de Integração

### 4.1 IA / LLM (multi-provider com fallback)

```
Frontend                    Cloud Function              Provedores
────────                    ──────────────              ──────────
httpsCallable('chatApi')  → chatApi (onCall)          → Cadeia de fallback:
                            ├─ buildConsultantPrompt()   task "fast": Gemini → Groq → DeepSeek → OpenAI → Claude
                            ├─ retrieveRelevantChunks()  task "smart": Groq → OpenAI → DeepSeek → Gemini → Claude
                            └─ generateAnalysis()
                                                       Mecanismos:
                                                       • Cache em memória (1h, ~500 entradas)
                                                       • Contador de erros por provedor (máx 3)
                                                       • Reset horário
                                                       • Timeouts: 12-15s por chamada
                                                       • Fallback textual se todos falharem
```

### 4.2 OCR (foto → lançamento)

```
Transactions.tsx                Cloud Function              Serviços
────────────────                ──────────────              ────────
input[type=file]              → ocrToEntry (onCall)      → Google Vision API
  → base64                      ├─ ocrService.extractText()   (fallback: Tesseract.js)
                                └─ llmService.extractEntry() → LLM parse
                                   retorna: { entry }
                              ←
Mostra modal de confirmação
  → addEntry()
  → triggerSibcoinEvent('entry_added')
```

### 4.3 STT (voz → lançamento)

```
Transactions.tsx                Cloud Function              Serviços
────────────────                ──────────────              ────────
MediaRecorder (webm)          → sttToEntry (onCall)      → Groq Whisper
  → base64                      ├─ sttService.transcribe()    (fallback: Google STT)
                                └─ llmService.extractEntry() → LLM parse
                                   retorna: { entry }
                              ←
Mostra modal de confirmação
  → addEntry()
  → triggerSibcoinEvent('entry_added')
```

### 4.4 Push Notifications

```
ATIVAÇÃO:
Settings.tsx → usePushNotifications → Notification.requestPermission
  → getToken(messaging, { vapidKey }) → updateDoc(fcmTokens: arrayUnion)

ENVIO DIÁRIO (09:00 BRT):
dailyPushAlerts (scheduled)
  → query users onde notificacoesPush == true
  → por usuário:
      ├─ checkBudgetAlerts (80%/100% do orçamento)
      └─ checkDueCards (vencimento 0-3 dias)
  → sendPush → admin.messaging().send por token
  → tokens inválidos → arrayRemove automático

ENVIO MANUAL:
sendPushNotification (onCall)
  → auth obrigatória
  → admin pode enviar para outros users
  → sendPush → FCM

BACKGROUND:
firebase-messaging-sw.js → onBackgroundMessage → notificationclick → navigate
```

### 4.5 Open Finance (Pluggy)

```
Frontend                       Cloud Functions              Pluggy API
────────                       ──────────────              ──────────
Configurações/Dashboard
  → pluggyCreateConnectToken  → createConnectToken()     → Pluggy SDK
    (abre widget Pluggy)
  → pluggySyncAccounts        → syncAccountsToUser()     → getAccounts/Transactions
    (sync manual)                ├─ cap 1500 tx/sync
                                 └─ entryOverflow.js
                                    (se > 2800: arquiva)
                              ←
  → onSnapshot (tempo real)
```

### 4.6 Sentinela (Geofencing)

```
Dashboard.tsx                   Cloud Function              APIs externas
─────────────                   ──────────────              ──────────────
useSentinelaGeo(snapshot)     → sentinelaGeoCheck (onCall) → Overpass API (OSM)
  → navigator.geolocation       ├─ detectScenario(tags)      → classifica local
  → debounce 5 min              └─ buildGeoAlert()           → template WA
                                 → (opcional) whatsappService → Meta Cloud API
                              ←
  → exibe alerta no Dashboard

SEMANAL (seg 11:00 UTC):
sentinelaWeekly (scheduled)
  → runSentinelaWeekly()
  → por usuário: Ld/Sg + resumo
  → whatsappService → Meta Cloud API
```

### 4.7 Gamificação (SibCoin)

```
Qualquer ação do usuário          Cloud Function                 Firestore
─────────────────────             ──────────────                 ─────────
triggerWithToast('entry_added') → triggerSibcoinEvent (onCall)  → transação Firestore:
                                   ├─ valida eventType             ├─ atualiza saldo
                                   ├─ processEvent()               ├─ registra histórico
                                   └─ checkMissions()              └─ atualiza missões
                                ←
  → toast "🪙 +X SibCoins!"
  → UI atualiza via onSnapshot

Eventos: entry_added, goal_created, open_finance_connected,
         login_streak, budget_created, achievement_unlocked, etc.
```

### 4.8 Billing (Stripe)

```
Frontend                       Cloud Functions              Stripe
────────                       ──────────────              ──────
Loja / Upgrade
  → createCheckout (onCall)   → Stripe Checkout Session    → Stripe hosted page
    (redirect para Stripe)

  → createPortal (onCall)     → Stripe Customer Portal     → Portal hosted

Stripe
  → stripeWebhook (HTTP)     → validação assinatura
                                ├─ checkout.session.completed  → atualiza Firestore
                                ├─ subscription.updated/deleted
                                ├─ invoice.paid
                                └─ invoice.payment_failed
```

### 4.9 WhatsApp / Telegram

```
WHATSAPP:
Meta Cloud API → whatsappWebhook (HTTP) → parseMessage
  → entryWizard (wizard multi-turn) → addEntry via Firestore
  → respostas: whatsappService.sendMessage()

TELEGRAM:
Telegram Bot API → telegramWebhook (HTTP) → comandos
  Scheduled: checkPriceAlerts (15 min), dailyNews (09:00), weeklyReport (seg 08:00)
```

### 4.10 Importação CSV/OFX/Texto

```
Transactions.tsx → ImportEntries.tsx
  → arquivo ≤5MB → readAsText
    ├─ .ofx/.qfx → parseOFX (tags STMTTRN, débitos apenas)
    ├─ .csv → parseCSV (detecta separador, colunas)
    └─ texto colado → parseText (regex data+valor)

  → opcional: aiCategorizeCsv (Cloud Function, primeiros 50 itens)

  → confirmImport:
      ├─ loop addEntry por item selecionado
      ├─ tag 'importado'
      └─ triggerSibcoinEvent('entry_added') uma vez
```

---

## 5. Fluxos de Negócio

### 5.1 Motor Soberano (Sovereignty Engine)

| Métrica | Fórmula | Faixas |
|---------|---------|--------|
| **Ld** (Dias de Liberdade) | `liquidez_total / dailyBurnRate` | <30 Frágil, <180 Construção, <365 Resiliente, <3650 Soberano, ≥3650 Inabalável |
| **Sg** (Spread Gap) | `rendimento_médio_investimentos - custo_médio_dívidas` (% a.m.) | >2% Otimizado, >0.5% Saudável, >-0.5% Apertado, ≤-0.5% Perigoso |
| **Sv** (Score de Soberania) | `100 - (penalidade_liquidez × mult_categoria + orçamento + impulso)` | ≥80 Soberano, ≥50 Consciente, ≥25 Atenção, <25 Auto-sabotagem |

```
Ld detalhado:
  liquidez = Σ saldos (incluirNaSoma != false) + Σ investimentos líquidos
  despesas3m = entries[type=despesa, !transfer, !pendente, últimos 90 dias]
  média_mensal = despesas3m / meses_distintos
  renda_passiva = investimentos_líquidos × 1% a.m.
  burn_líquido = max(0, média_mensal - renda_passiva)
  dias = liquidez / (burn_líquido / 30)
```

### 5.2 Motor de Decisão (Decision Engine)

Quatro análises independentes:

| Função | Entrada | Saída |
|--------|---------|-------|
| `analyzeInstallmentDecision` | valor, parcelas, desconto, Ld, Sg | À vista vs parcelado + narrativa |
| `analyzeDebtPayoffStrategy` | dívidas | Avalanche vs bola de neve |
| `analyzeFgtsAmortization` | saldo FGTS, taxa financiamento | Vale amortizar? |
| `analyzeEmergencyReserve` | renda, dependentes, tipo emprego | Meses necessários de reserva |

### 5.3 Fluxo Completo: Novo Lançamento

```
1. Usuário cria lançamento (manual/OCR/STT/import)
2. addEntry → loadInlineEntries → append → updateUserDoc
3. updateUserDoc:
   ├─ getDoc (estado atual)
   ├─ merge em memória
   ├─ calculateFinScore (recalcula score)
   └─ setDoc (merge: true)
4. onSnapshot dispara:
   ├─ useFinancialData atualiza dados
   ├─ AppContext propaga
   ├─ IntelligenceContext recalcula Ld/Sg
   └─ Páginas re-renderizam
5. triggerSibcoinEvent('entry_added'):
   ├─ Cloud Function em transação
   ├─ Atualiza saldo/missões
   └─ onSnapshot → UI mostra toast
```

### 5.4 Agendamentos Ativos

| Função | Horário | Timezone | O que faz |
|--------|---------|----------|-----------|
| `dailyPushAlerts` | 09:00 | America/Sao_Paulo | Alertas orçamento + faturas |
| `dailyNews` (Telegram) | 09:00 | (default UTC?) | Notícias financeiras |
| `checkPriceAlerts` | cada 15 min | — | Alertas de preço (Telegram) |
| `weeklySummary` | seg 08:00 | America/Sao_Paulo | E-mail semanal (Resend) |
| `sentinelaWeekly` | seg 11:00 | UTC (~08:00 BRT) | Relatório WhatsApp |
| `weeklyReport` (Telegram) | seg 08:00 | — | Relatório Telegram |
| `processarFiliadosDiario` | cada 24h | — | Afiliados pendentes |

---

## 6. Problemas Identificados

> **Atualização 04/04/2026:** Todos os problemas críticos (C1-C4) e os importantes I1, I2, I4, I5, I7, I8 foram **corrigidos**.

### 🔴 Críticos (Segurança / Integridade) — ✅ TODOS RESOLVIDOS

| # | Problema | Onde | Risco | Impacto |
|---|---------|------|-------|---------|
| C1 | ~~`creditarCashbackSibCoin` sem verificação admin~~ | `functions/index.js` | ✅ Adicionado check `admin`/`superadmin` via customClaims | Resolvido |
| C2 | ~~Stripe webhook sem `STRIPE_WEBHOOK_SECRET`~~ | `stripeService.js` | ✅ Agora rejeita requests se secret não configurado (HTTP 500) | Resolvido |
| C3 | ~~Race condition em escritas concorrentes~~ | `persistUserData.ts` | ✅ Usa `runTransaction` para operações que recalculam finScore | Resolvido |
| C4 | ~~BRAPI callables sem rate limit~~ | `functions/index.js` | ✅ Rate limit 30 req/min por uid com janela de 60s | Resolvido |

### 🟡 Importantes (Inconsistências / Funcionalidade)

| # | Problema | Onde | Impacto |
|---|---------|------|---------|
| I1 | ~~TenantProvider duplicado~~ | `App.tsx` | ✅ Removido duplicação; mantido apenas em `main.tsx` |
| I2 | ~~Cálculo Sv em Transactions.tsx difere do Ld global~~ | `Transactions.tsx` | ✅ Agora usa `useIntelligence().freedom` (mesmo engine global) |
| I3 | **`impulseStreakCount` sempre 0** em Transactions | `Transactions.tsx` | Motor de impulso do engine nunca ativado |
| I4 | ~~Feature flags `ocr_foto` / `stt_voz` não aplicadas~~ | `Transactions.tsx` | ✅ Botões OCR/STT agora condicionados por `useFeatureFlags` |
| I5 | ~~Erro de overflow na subcoleção silencioso~~ | `useFinancialData.ts` | ✅ Erro agora propagado para estado `error` com mensagem |
| I6 | **OFX importa apenas débitos** — créditos ignorados | `ImportEntries.tsx` | Receitas não entram por importação OFX |
| I7 | ~~Import CSV sem deduplicação~~ | `ImportEntries.tsx` | ✅ Deduplicação por hash (data+desc+valor); UI mostra "X duplicados ignorados" |
| I8 | ~~`adminAuth` não exportado em `index.js`~~ | `functions/index.js` | ✅ `validateAdminAccess` e `revokeAdminAccess` agora exportados |
| I9 | **Região inconsistente**: SibCoin em `southamerica-east1`, Sentinela em `us-central1` | Vários | Latência variável; config de chamada precisa estar alinhada |

### 🟢 Menores (UX / Manutenibilidade)

| # | Problema | Onde | Impacto |
|---|---------|------|---------|
| M1 | Sem rota `/login` explícita — URL pode mostrar path interno quando deslogado | `App.tsx` | UX: URL confusa |
| M2 | `useReferral()` chamado antes dos early returns no shell | `App.tsx` | Pode executar lógica desnecessária quando deslogado |
| M3 | `loading` do overflow não unificado com loading principal | `useFinancialData.ts` | Possível flash de dados incompletos |
| M4 | `financialAnalysis.ts` referenciado na documentação mas não existe | `src/utils/` | Doc desatualizada |
| M5 | Toast SibCoin possivelmente inconsistente com payload real | `useSibcoin.ts` | Toast pode não mostrar missão completada |

---

## 7. Plano de Ação Recomendado

### Prioridade 1 — Segurança (resolver antes de escalar)

| # | Ação | Complexidade |
|---|------|-------------|
| C1 | Adicionar check `context.auth.token.admin` em `creditarCashbackSibCoin` | Baixa |
| C2 | Tornar `STRIPE_WEBHOOK_SECRET` obrigatório (lançar erro se ausente) | Baixa |
| C3 | Usar `runTransaction` no Firestore para operações de append em `entries` | Média |
| C4 | Implementar rate limit por uid nos callables BRAPI (throttle 60 req/min) | Média |

### Prioridade 2 — Consistência de Dados

| # | Ação | Complexidade |
|---|------|-------------|
| I1 | Remover `TenantProvider` duplicado (manter apenas em `App.tsx`) | Baixa |
| I2 | Unificar cálculo de burn rate — usar `calculateDaysOfFreedom` em Transactions | Média |
| I5 | Propagar erro de overflow para estado `error` com mensagem amigável | Baixa |
| I7 | Implementar deduplicação por hash (data + valor + descrição) na importação | Média |
| I8 | Verificar e exportar `adminAuth`/`claudeProxy` em `index.js` | Baixa |

### Prioridade 3 — Features Incompletas

| # | Ação | Complexidade |
|---|------|-------------|
| I3 | Implementar tracking de `impulseStreakCount` (gastos consecutivos na mesma categoria) | Média |
| I4 | Aplicar `useFeatureFlags` nos botões OCR/STT em Transactions | Baixa |
| I6 | Incluir créditos no parser OFX | Baixa |
| I9 | Alinhar todas as Cloud Functions para mesma região ou documentar decisão | Média |

### Prioridade 4 — UX

| # | Ação | Complexidade |
|---|------|-------------|
| M1 | Adicionar rota `/login` explícita com redirect pós-login | Baixa |
| M2 | Mover `useReferral()` para depois do guard de auth | Baixa |
| M3 | Unificar loading com flag `overflowLoading` | Baixa |
| M5 | Alinhar interface de toast com payload real de `triggerSibcoinEvent` | Baixa |

---

## Apêndice: Mapa de Dependências entre Módulos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│                                                                        │
│  ┌─────────┐    ┌───────────────┐    ┌──────────────────┐              │
│  │  Login   │───→│  useAuth      │───→│  AppProvider     │              │
│  └─────────┘    └───────────────┘    │  (contexto)      │              │
│                                       │  ├─ Financial    │              │
│                                       │  ├─ OpenFinance  │              │
│                                       │  └─ SibCoin      │              │
│                                       └────────┬─────────┘              │
│                                                │                        │
│                                       ┌────────▼─────────┐              │
│                                       │ Intelligence     │              │
│                                       │ Provider         │              │
│                                       │ ├─ Ld (Freedom)  │              │
│                                       │ ├─ Sg (Spread)   │              │
│                                       │ └─ Actions       │              │
│                                       └────────┬─────────┘              │
│                                                │                        │
│         ┌──────────────────────────────────────┼──────────────┐         │
│         │                    │                 │              │         │
│    ┌────▼────┐    ┌─────────▼──────┐  ┌───────▼──┐  ┌───────▼──┐     │
│    │Dashboard│    │Transactions    │  │Consultant│  │ Settings │     │
│    │Ld/Sg/Sv │    │OCR/STT/Import  │  │Chat IA   │  │Push/OF   │     │
│    │Sentinela│    │SibCoin events  │  │Decision  │  │Flags     │     │
│    │Charts   │    │Feature flags   │  │Engine    │  │Backup    │     │
│    └────┬────┘    └───────┬────────┘  └────┬─────┘  └────┬─────┘     │
│         │                 │                │              │            │
└─────────┼─────────────────┼────────────────┼──────────────┼────────────┘
          │                 │                │              │
          ▼                 ▼                ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLOUD FUNCTIONS                               │
│                                                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ chatApi  │ │ ocrToEnt │ │ sttToEnt │ │ push     │ │ sentinela│    │
│  │ briefing │ │          │ │          │ │ Alerts   │ │ Geo/Week │    │
│  │ insight  │ │          │ │          │ │          │ │          │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │
│       │             │            │             │            │           │
│       ▼             ▼            ▼             ▼            ▼           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              SERVIÇOS EXTERNOS                                   │  │
│  │  Gemini · Groq · DeepSeek · OpenAI · Claude (LLM)               │  │
│  │  Google Vision · Tesseract (OCR) · Groq Whisper (STT)            │  │
│  │  FCM (Push) · Overpass (Geo) · Meta WA · Telegram                │  │
│  │  Pluggy (Open Finance) · Stripe (Billing) · BRAPI (Market)       │  │
│  │  Resend (Email) · GNews/NewsData (News)                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

*Documento de referência para decisões arquiteturais. Manter atualizado ao resolver os problemas listados.*
