# Meta-análise: o que a auditoria sênior NÃO pegou

> Gerado em 26/04/2026, ao final da execução das fases 1+2 de remediação.
> Contraponto honesto à `AUDITORIA_SENIOR_SIBANKI.docx`.
>
> A auditoria original tem 38 achados em 4 áreas (release, segurança,
> arquitetura, convivência IA). Foi feita lendo arquivos estruturais +
> alguns serviços críticos + greps. **Não rodou o código, não cobriu
> a maior parte das Cloud Functions, não cobriu a maior parte do front.**
> Este documento lista as zonas cegas, ranqueadas por risco residual.

---

## 1. O que a auditoria assume que não foi verificado

A auditoria é estática (apenas leitura). Tudo abaixo seria pegável apenas
**executando** o código:

| Suposição implícita | Como verificar | Risco se errado |
|---|---|---|
| `npm run build` passa | Rodar localmente | Build quebrado em prod já hoje |
| `npx tsc --noEmit` passa | Rodar localmente | Type errors mascarados |
| `npm run test:unit` passa | Rodar localmente | Testes apontam regressão silenciosa |
| `firebase functions:secrets:access *` mostra os 7 secrets críticos | João rodar | SEG-02/SEG-04 ativos AGORA em prod |
| Os 50+ callables já em produção respondem | Executar `pre-cutover-check.mjs` | Função zumbi, custo de cold start desnecessário |
| Multi-tenant rollout: usuários ativos têm `tenantId` claim | Query no Firestore Auth | Multi-tenant quebrado para parte da base |

**Recomendação:** próxima sessão de auditoria começa rodando os 6 comandos acima.

---

## 2. Cloud Functions: 50+ exports, ~5 auditadas

A auditoria foi à fundo em: `affiliateWebhookService`, `creditarCashbackSibCoin`,
`adminAuth`, `whatsappWebhook` (header), `valoresAReceberApi`. Total: **5 de
~50** exports cobertos a sério.

### Não auditadas — alta exposição

| Função | Risco que pode estar lá |
|---|---|
| `stripeWebhook` | Validação de signature (`stripe.webhooks.constructEvent`)? Se faltar, atacante forja eventos de pagamento. |
| `createCheckout` / `createPortal` / `getUserPlan` | Validação de `priceId`/`plan` recebido do cliente — se aceitar qualquer ID, usuário compra plano fake. |
| `pluggyCreateConnectToken` / `pluggySyncAccounts` | Rate limit? Um usuário pode estourar custo Pluggy chamando em loop. |
| `chatApi` / `chatStreamApi` / `proactiveInsightApi` | **Token limit por usuário** — sem isso, atacante drena créditos Gemini/Groq/Claude. Custo direto. |
| `triggerSibcoinEvent` / `adminCreditSibcoin` | Anti-abuse: usuário consegue disparar evento múltiplas vezes seguidas? Idempotência por evento? |
| `sendFamilyInviteEmail` / `sendConsorcioInvite` / `sendCrediAmigoInvite` / `sendWhatsAppInviteFamilia` | Spam: rate limit por uid? Atacante usa para spam de e-mail/WhatsApp em massa. |
| `aiCategorizeCsv` | Tamanho máx de CSV? Custo Gemini explode com upload grande. |
| `briefingIa` | Mesmo: prompt size, rate limit. |
| `ocrToEntry` / `visionToEntryApi` / `sttToEntry` / `assistantEntryCaptureApi` | Tamanho máx de imagem/áudio. Cost overrun via upload abusivo. |
| `webhookLomadee` / `webhookMonetizze` / `webhookParceiro` | Já corrigidos (SEG-02), mas não auditei o resto do fluxo (atribuição via `mdasc`, idempotência). |
| `telegramWebhook` | Verificação de origem? Token inválido = qualquer um envia comandos. |
| `sentinelaGeoCheck` | Precisão de geolocation, privacidade do dado armazenado. |
| `dailyPushAlerts` / `sendPushNotification` | Quem pode enviar push para outro usuário? Auth no `sendPushNotification` é admin? Não verifiquei. |
| `weeklySummary` (e-mail) / `weeklyReport` (WA) / `dailyNews` (Telegram) | Volume real de envios, custo Resend/WhatsApp/Telegram. |
| `processarFiliadosDiario` | Lógica de antifraude do programa de afiliados. |
| `aplicarRecorrentesDoMes` / `aplicarRecorrentesManual` | Idempotência mensal. Se rodar 2x no dia 1, duplica recorrentes do usuário. |

**Recomendação:** auditoria sênior #2 deve cobrir ESTE conjunto, com leitura de
cada arquivo de service e teste de input malformado.

---

## 3. Frontend: ~150 arquivos em `src/`, ~5 lidos a sério

A auditoria viu: `App.tsx` (top), `firebase.ts`, `AppContext.tsx` (head 100
linhas). Tudo o resto foi via Grep contagem (`as any`, `console.*`).

### Hotspots não lidos

| Arquivo | Tamanho aprox | Por que importa |
|---|---|---|
| `src/services/persistUserData.ts` | 753 linhas | Faz **TODA** a escrita do app no Firestore. Se há bug aqui, é onde o dinheiro vaza. |
| `src/pages/Cards.tsx` | 1253 linhas | Operacional de cartões + benefícios + faturas. Crash silencioso reportado em audit. |
| `src/pages/Dashboard.tsx` | ? | Primeira tela após login — toda regressão visível aqui. |
| `src/pages/Consultant.tsx` | ? | Chat com IA, contexto financeiro injetado, áudio/visão. Surface enorme. |
| `src/pages/Loja.tsx` | ? | Catálogo Lomadee + checkout. Tracking de afiliado depende daqui. |
| `src/pages/Settings.tsx` | ? | Open Finance + plano + backup/import. Sensível. |
| `src/pages/RelatorioIR.tsx` | ? | Imposto de renda — exportar dados fiscais sensíveis. LGPD. |
| `src/utils/sovereigntyEngine.ts` | ? | **IP do produto**. Cálculo Ld/Sg/Sv. Bug aqui = todo dashboard mostra número errado. |
| `src/utils/decisionEngine.ts` | ? | À-vista vs parcelado. Mesma criticidade. |
| `src/components/onboarding/RegistrationWizard.tsx` | ? | Coleta CPF + valoresAReceber + Open Finance. LGPD entry point. |
| `src/components/import/ImportEntries.tsx` | ? | CSV upload + Gemini categorização. Validação de input externo. |
| `src/components/openFinance/OpenFinanceConnect.tsx` | ? | Pluggy widget. Consent flow. |

**Recomendação:** auditoria do `persistUserData.ts` + `sovereigntyEngine.ts` +
`decisionEngine.ts` é o ROI mais alto — pega bug em IP do produto.

---

## 4. Firestore rules: cobertas só nas partes óbvias

A auditoria leu as 213 linhas mas:

### Subcoleções mencionadas no código mas não verificadas em rules

- `users/{uid}/sibcoin/*` — usado em `creditarCashback`, `affiliateWebhookService`. Cai no wildcard `{subCollection}/{docId}` (linha 99-101) **sem schema validation**.
- `users/{uid}/filiado/dados` — idem.
- Coleções **globais** sem regras explícitas auditadas:
  - `community` (Social.tsx)
  - `lomadee_clicks`
  - `lomadee_conversions_unattributed`
  - `affiliate_transactions`
  - `cashback_log`
  - `whatsappCodes`
  - `consorcio_invites`
  - `sol_cliques_global`
  - `feedbacks` (FeedbackModal)

A regra catch-all `match /{document=**} { allow read, write: if false; }` (linha
209-211) protege contra escrita em coleção desconhecida — bom. **Mas:**
qualquer coleção criada por Cloud Function (Admin SDK bypassa rules) que
queira ser lida pelo cliente precisa de regra explícita. Se algum dia o cliente
quiser ler `feedbacks` (admin panel), vai falhar silenciosamente.

### Wildcard subcoleção

```
match /{subCollection}/{docId} {
  allow read, create, update, delete: if canWriteTenantData(tenantId, userId);
}
```

Linhas 99-101 da `firestore.rules`. Permite ao usuário criar **qualquer**
subcoleção no caminho `tenants/{tenantId}/users/{userId}/<x>/`. Sem schema
validation. Permite floods de subcoleções "lixo" + escrita arbitrária.

**Recomendação:** trocar wildcard por allowlist explícita das subcoleções
conhecidas; tudo o mais nega.

---

## 5. Storage rules: 16 linhas, só avatares

```
match /avatars/{fileName} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
    && fileName.matches('^' + request.auth.uid + '_.*');
}
match /{allPaths=**} {
  allow read, write: if false;
}
```

**Riscos não verificados:**
- Tamanho máximo do upload (sem limite no rule = imagem de 100MB possível).
- MIME type validation (sem `request.resource.contentType.matches('image/.*')`).
- Quem precisa de upload em outros paths futuramente vai bater nesta regra restritiva — então é bom para hoje, ruim para amanhã.

---

## 6. Dependências e supply chain

A auditoria mencionou versões mas não rodou `npm audit`.

**Não auditado:**
- `npm audit` no front e em functions (vulnerabilidades CVE conhecidas).
- `firebase-functions ^4.5.0` é geração antiga; v6 tem features de segurança
  novas (App Check enforcement, etc.).
- `pluggy-sdk ^0.83.0` — Pluggy SDK pode ter breaking changes em versões mais novas.
- `tesseract.js ^7.0.0` — pesado (~30MB binário). Por que está em functions/?
- `node-fetch ^2.7.0` — ainda em v2, v3 é ESM-only e Node 18+ tem fetch nativo.
- `react-pluggy-connect ^2.12.0` — bridge. Última versão?

**Recomendação:** rodar `npm audit --production` em ambos. Resultado vai gerar
mais achados que toda a Seção 2 da auditoria.

---

## 7. Performance & observabilidade

Apontado parcialmente (REL-07 sobre bundle, mas baseado em CLAUDE.md, não em medição).

**Não medido:**
- Tamanho real do bundle pós-`vite build` (vendor-firebase ~500KB é estimativa).
- Tempo de cold start de cada Cloud Function (custa em latência percebida).
- Memory peak de `pluggySyncAccounts` (1GB alocado é caro — está usando?).
- Logs estruturados: `logEvent`/`logError` levam PII? Cashflow values em log = problema.
- Sentry / Crashlytics ou equivalente — existe? Se não, todo crash do front é invisível.
- Métricas de Firebase Cloud Functions (invocações/dia, erros/dia, p95 latency).

---

## 8. Compliance: LGPD, BCB Open Finance, fiscal

Mencionei superficialmente (SEG-10 sobre `valoresAReceberApi`). Mas:

- **LGPD direito de exclusão:** existe Cloud Function que apaga TODOS os dados
  de um usuário (Firestore + Storage + Auth)? Não verifiquei. Sem isso, projeto
  está fora de compliance.
- **LGPD consent log:** `openFinanceConsents` existe (subcollection
  append-only) — bom. Mas não verifiquei se o consentimento granular do BCB
  (escopo: investments vs accounts vs transactions) está sendo armazenado.
- **Dados fiscais:** `RelatorioIR.tsx` exporta. Como esses dados saem do
  cliente (CSV? PDF? E-mail?). Onde são armazenados se entregues por e-mail?
- **Retention:** quanto tempo guardamos dados de transação? Sem política,
  Firestore guarda forever (custo + risco).
- **Logs de auditoria:** existe `auditLogs` por usuário (subcollection
  append-only) — bom. Mas o que é gravado lá hoje? Se está vazio, é só
  arquitetura promissora.

---

## 9. Race conditions e concorrência

`creditarCashbackSibCoin` (corrigida nesta sessão) usa pattern query-then-write:

```js
const existing = await db.collection('users').doc(uid)
  .collection('sibcoin').where('contratoId', '==', contratoId).limit(1).get();
if (!existing.empty) return { /* já creditado */ };
// ... batch.set() ... batch.commit()
```

Entre o `get()` e o `commit()`, outra invocação concorrente pode estar fazendo
o mesmo. **Resultado:** crédito duplicado em cenário de high frequency.
Não é cenário comum (admin manual), mas o padrão se repete em outros
callables que NÃO foram auditados (provavelmente em `sibcoin/rewardEngine.js`,
em `webhookParceiro`, em `aplicarRecorrentesDoMes`).

A solução genérica é `db.runTransaction(...)`. Não verifiquei quantos callables
deveriam usar transação e não usam.

---

## 10. Pipeline TASK_QUEUE.md / watcher

Apontado como AI-02 (frágil) na auditoria, mas só superficialmente.

**Não auditado:**
- `scripts/task-watcher.mjs` real — tem race entre detecção do flag e atualização?
- Comportamento se 2 IAs editam `TASK_QUEUE.md` simultaneamente.
- Se watcher cair (terminal fechado), há jeito de detectar?
- Backup do estado do pipeline (TASK_QUEUE.md) tem versão? Em git?

---

## 11. Admin panel (vanilla JS em `public/admin/`)

A auditoria leu `adminAuth.js` (server) mas NÃO leu `public/admin/index.html`.

**Riscos:**
- Vanilla JS + Firebase compat SDK v9.23.0 — versão antiga, vulnerável a CVEs?
- Custom claims via Cloud Function = bom. Mas o cliente do admin está fazendo
  validação adequada antes de exibir UI sensível?
- Brand Intelligence + Redes Sociais IA: usa `callClaudeProxy` (server). Se o
  proxy não tem rate limit, atacante autenticado como admin drena créditos
  Anthropic.
- Admin pode editar Feature Flags, Plano, Status — escreve em coleções Firestore?
  As rules da auditoria não cobrem.

---

## 12. Coisas que descobri SÓ executando o plano

Esta sessão revelou achados que a auditoria não pegou:

| Descoberta | Severidade | Por que a auditoria errou |
|---|---|---|
| `.cursor/rules/` JÁ EXISTE com 11 regras (audit dizia que não existia) | Médio | Não fiz Glob das hidden dirs antes de afirmar ausência. |
| `.cursor/rules/global.mdc` contradiz 100% do código real (diz "evite Context API") | Alto | Cursor lendo essa regra é desinformado. Audit não comparou regras escritas com código. |
| `.cursor/rules/deploy.mdc` ainda diz que produção é o legado | Alto | Cutover já feito, regra defasada. Cursor pode tentar deploy errado. |
| Working tree do João tem 365 modificados + 113 untracked | — | Não é problema da auditoria, mas é estado vivo que invalida várias suposições da auditoria. |
| `CHANGELOG.md` raiz já existe (também modificado) | Baixo | Cria conflito com o `docs/CHANGELOG.md` que criei. |
| `docs/SESSION_HANDOFF.md` é estado vivo entre IAs | Médio | Audit citou mas não auditou conteúdo nem se está sendo respeitado. |
| `npm install` recente fez `node_modules/.vite-temp/` poluir o working tree | Baixo | Audit citou genericamente; é mais comum do que parece. |

---

## 13. Surface area completamente não tocada

Coisas que nem mereceram olhar:

- **`functions/telegramBot.js`** — `exports.telegramWebhook`, `checkPriceAlerts`, `dailyNews`, `weeklyReport`. Bot inteiro.
- **`public/app/`** — código legado JS/HTML, ~~deveria estar em manutenção~~ ainda recebe deploy via `hosting:legado`.
- **`public/admin/`** — admin panel completo.
- **`public/doc-investidor/`** — documentação para investidores.
- **`tests/`** — Playwright E2E. 35 testes. Auditoria só listou nomes.
- **`functions/services/news/`** — newsService.js (multi-source aggregator).
- **`functions/services/whatsapp/`** — wizard, command handler, notifications.
- **`functions/services/sentinel/`** — sentinelaGeoService, weeklyService, alerts.
- **`functions/services/sibcoin/rewardEngine.js`** — motor inteiro de SibCoin não auditado.
- **`functions/services/billing/stripeService.js`** — Stripe inteiro não auditado.
- **`functions/services/llm/`** — sovereignSystemPrompt, brazilianFinanceKnowledge, llmService, marketIntentService, csvCategorizerService, claudeProxy, sttService, ocrService.
- **`functions/services/email/weeklySummaryEmailService.js`**.
- **`functions/services/filiado/filiadoService.js`**.
- **`functions/services/recorrentes/recorrentesService.js`**.
- **`functions/services/pluggy/`** — pluggyService, pluggySyncService, syncOpenFinanceExtras, entryOverflow, openFinanceResourceCatalog.
- **`functions/services/tenant/`** — tenantService, tenantRoutes (API multi-tenant).
- **`functions/services/user/userService.js`** — `onUserCreated` trigger.
- **`functions/services/market/`** — brapiService, brapiRateLimiter, fixedIncomeService.
- **`functions/services/affiliate/lomadeeCatalogService.js`** — só auditei o webhook, não o catálogo.

**Estimativa:** auditoria cobriu **~10% da superfície real**. O número de achados
(38) escala provavelmente para **300+** se rodar análise estática completa.

---

## 14. Ranking final de risco residual (pós fase 1+2)

> "O que eu mais temo que esteja escondido nas zonas cegas." Atualizado em
> 26/04/2026 após verificação dos 3 primeiros riscos.

### Top 3 verificados

| # | Risco original | Status após verificação |
|---|---|---|
| 1 | Stripe webhook signature | ✅ **DESCARTADO** — `stripeService.handleStripeWebhook` (linhas 126-137) faz `stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET)` corretamente. Fail-closed quando secret ausente. **Risco invalidado.** |
| 2 | Token/cost limit em `chatApi` | ❌ **CONFIRMADO** — `chatApi` (linha 651) e `chatStreamApi` (linha 676) não têm: (a) cap de tamanho na mensagem/contexto, (b) rate limit por uid, (c) quota diária, (d) App Check (`enforceAppCheck` é opt-in via env, default OFF). Atacante autenticado drena Gemini/Groq/Claude. |
| 3 | Bug numérico em `sovereigntyEngine.ts` | ❌ **CONFIRMADO** — leitura completa identificou 8 bugs (ver Seção 14.1 abaixo). Os principais afetam usuários endividados e usuários novos. |

### 14.1 — sovereigntyEngine.ts: bugs identificados

> Lido na íntegra (445 linhas). Bugs em ordem de severidade.

**Bugs ALTOS (afetam números visíveis ao usuário):**

1. **Saldo negativo tratado como zero** (linha 127-130): `Math.max(0, Number(bal) || 0)` ignora cheque especial usado. Usuário com -R$500 vê Ld inflado como se saldo fosse 0. Para a base endividada do produto, esconde realidade.
2. **Heurístico de unidade da taxa em `calculateSpreadGap`** (linha 254-255): `raw > 1 ? raw/100 : raw > 0.3 ? raw/12 : raw` quebra em ranges válidos. Exemplo: `raw = 0.5` pode ser 0,5% a.m. (correto) OU 50% a.a. — código sempre escolhe o segundo, errando por ~10x. Falta campo explícito `interestRateUnit` em `CreditObligation`.

**Bugs MÉDIOS:**

3. **Liquidez D+30 inclui Tesouro/CDB de prazo fixo** (linha 137): `liquidTypes` casa qualquer "renda fixa", "tesouro selic", "lci", "lca". Tesouro IPCA+ longo pode dar prejuízo na venda antecipada — não é líquido.
4. **Burn rate sub-estimado para usuário novo** (linha 168-172): se há 1 mês de dados, `distinctMonths=1` e gasto vira "média mensal". Usuário recém-cadastrado vê Ld otimista.
5. **Match de cartão por `String.includes()`** (linha 264-266): `card.name="Mastercard"` casa com qualquer obligation que mencione "mastercard". Falso positivo torna fatura invisível para o cálculo de spread.

**Bugs BAIXOS:**

6. **Taxa rotativa hardcoded 14% a.m.** (linha 268). Bancos cobram 9-18%. Pode super/sub-estimar drenagem.
7. **Renda passiva ignora dividendos de ações/FIIs** (linha 175). Só conta rendimento de "investimentos líquidos" — sub-estima renda passiva real.
8. **`taxaAnual` sem unidade explícita** em `Investment` (linha 236-238). Mesma classe de problema do bug #2.

### Ranking residual atualizado

1. ⚠️ **chatApi/chatStreamApi sem cap nem rate limit** — confirmado, exploitável.
2. ⚠️ **8 bugs em `sovereigntyEngine.ts`** — confirmados, afetam números mostrados.
3. ❓ **Race condition em `aplicarRecorrentesDoMes`** — recorrentesService não auditado; risco de duplicação mensal.
4. ❓ **`persistUserData.ts` 753 linhas** — escrita central do Firestore não auditada.
5. ❓ **App Check ausente em callables sensíveis** — confirmado opt-in via env (`ENFORCE_APP_CHECK=true`), provavelmente desligado em prod. Verificar.
6. ❓ **Subcoleções globais sem regras Firestore** — wildcard permite escrita arbitrária por usuário autenticado.
7. ❓ **LGPD direito de exclusão** — não auditado, provavelmente não implementado.
8. ❓ **Pluggy sync com possível duplicação** — não auditado.
9. ✅ **Stripe webhook signature** — verificado, OK.

---

## 15. O que fazer com este documento

- Próxima sessão de auditoria: começar por #1 do ranking (Stripe webhook).
- Criar issues no GitHub para cada item da Seção 13 (surface não auditada).
- A cada PR de feature nova, exigir que o dev (humano ou IA) auditie o caminho
  completo: callable → service → Firestore → audit log.
- Re-auditar este projeto a cada 90 dias enquanto a base de usuários crescer.

A regra é simples: **auditoria estática nunca é completa**. Esta foi
boa o suficiente para fechar 4 críticos urgentes e organizar a governança IA.
Não é boa o suficiente para considerar o projeto seguro.
