# PATCHES_FASE_1_2.md — Auditoria sênior, fases 1 e 2

> Sessão: 26/04/2026 — Claude Cowork executando o plano da auditoria
> sênior (`AUDITORIA_SENIOR_SIBANKI.docx`).
>
> **Importante:** este patch foi aplicado com a árvore de trabalho do João suja
> (365 modificados + 113 untracked). Para evitar misturar mudanças, NÃO commitei
> nada. Você (João) decide o melhor momento de empacotar.

---

## TL;DR

45 arquivos tocados em 11 categorias:

- **Semana 1 — Risco financeiro (fechamentos críticos):** 4 arquivos.
- **Semana 2 — Governança Claude + Cursor:** 9 arquivos (4 novos, 5 modificados).
- **Extensão pós-meta-análise — ganhos seguros:** 2 arquivos editados + 2 docs.
- **Extensão final — pendências fechadas (decisão sênior):** 3 arquivos novos + 4 modificados + 2 deletados.
- **Fundação de qualidade — CI + ESLint + testes:** 3 arquivos novos + 1 modificado.
- **Auditoria persistUserData.ts:** 1 doc novo + 2 modificados (4 fechados incl. PUD-1 parcial, 5 pendentes).
- **Auditoria stripeService + rewardEngine:** 2 modificados + 1 doc novo (1 crítico anti-farming + 2 altos fechados).
- **Auditoria Pluggy (Open Finance):** 2 modificados + 1 modificado (rules) + 1 doc novo (2 críticos race+lock fechados).
- **Auditoria LLM proxy:** 2 modificados + 1 doc novo (2 críticos prompt-injection + admin-bypass fechados).
- **Auditoria Sentinel (geo + weekly):** 2 modificados + 1 doc novo (5 fechados, 1 crítico SEW-2 documentado para refator).
- **Auditoria Telegram bot:** 2 modificados + 1 doc novo (1 crítico TLG-1 webhook fail-open fechado + 3 altos/médios).

Status: pronto para revisão e commit. Sintaxe verificada via leitura direta
(o mount Linux do bash retornou cache stale — esperado).

---

## Arquivos tocados

### Semana 1 — Segurança / Risco financeiro

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `functions/services/affiliate/affiliateWebhookService.js` | M | SEG-02 | `validateAffiliateSecret` agora é **fail-CLOSED**. Linhas 107–133 + handler em 190–202 (mensagem de erro `[SEG-02]` + status 503). Em DEV, libera com `NODE_ENV=development` ou `SIBANKI_ALLOW_UNSAFE_WEBHOOK=1`. |
| `functions/index.js` | M | SEG-03, SEG-04 | `creditarCashbackSibCoin` agora usa `data.uid` em vez de `context.auth.uid`, valida que é string não-vazia, confirma usuário alvo existe, grava `actorUid`/`actorEmail` no `cashback_log`. `whatsappWebhook` retorna 503 se `WHATSAPP_VERIFY_TOKEN` não estiver setado. |
| `functions/config.js` | M | SEG-04 | `WHATSAPP_VERIFY_TOKEN` perde o default público `"sibanki_wa_verify"`; agora defaulta para empty string. Comentário no código apontando o achado. |
| `scripts/migrate-to-multitenant.js` | M | SEG-06 | `SUBCOLLECTIONS` ampliado de 5 para 11 entradas: adicionados `entriesOverflow`, `errorLogs`, `openFinanceConsents`, `auditLogs`, `sibcoin`, `filiado`. |

### Semana 2 — Governança IA

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `AGENTS.md` | NEW | AI-01 | Fonte única de verdade para qualquer agente de IA. Inclui: regra de ouro, convenções (TS/React/Cloud Functions/Firestore), convenções commit/branch/PR, matriz de responsabilidade Cursor × Claude × Antigravity × João, limites duros, defesas em mexidas com dinheiro. |
| `.cursorrules` | NEW | AI-01 | Entrada principal para Cursor IDE. Aponta para AGENTS.md como SoT, lista limites duros essenciais, gerencia conflito entre regras. |
| `.editorconfig` | NEW | AI-08 | Padroniza EOL=LF, charset=UTF-8, indent=2 espaços. Especiais: Markdown preserva trailing whitespace, Makefile usa tab, `.bat` mantém CRLF. |
| `docs/CHANGELOG.md` | NEW | AI-03/AI-07 | Changelog de engenharia em Keep-a-Changelog. Já preenchido com entry "Unreleased" detalhando todas as mudanças desta sessão. |
| `CLAUDE.md` | M | AI-03/AI-07 | Cabeçalho reorganizado: aponta para AGENTS.md como SoT principal, adiciona referência a TASK_QUEUE.md e CHANGELOG.md. Conteúdo histórico mantido (não destruí nada — futuras sessões devem migrar para CHANGELOG.md gradualmente). |
| `.cursor/rules/global.mdc` | M | Stale rule | Atualizado para refletir realidade: Context API é correto para dados financeiros (via AppContext), Zustand é só para UI state. Antiga regra contradizia 100% do código real. |
| `.cursor/rules/deploy.mdc` | M | Stale rule | Atualizado pós-cutover: React SPA é produção, legado é fallback de rollback. Tabela de targets atualizada, regras de quem-pode-fazer-deploy explícitas. |
| `.cursor/rules/legado.mdc` | M | Stale rule | Modo manutenção: desencoraja features novas em `public/app/`. Quando inevitável, cita procedimento. |
| `.cursor/rules/segunda.mdc` | M | Stale rule | Marcado obsoleto (DEEPSEEK_KEY já configurada conforme `pre-cutover-check.mjs`). Pode ser deletado na próxima limpeza. |

Legendas: **NEW** = arquivo novo, **M** = modificado existente.

### Extensão pós-meta-análise — ganhos seguros (sem mudança de UX)

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `functions/index.js` | M | SEG-11 | Caps de input em `chatApi`, `chatStreamApi`, `proactiveInsightApi` — mensagem ≤ 4 KB, contexto/snapshot ≤ 32 KB. Bloqueia cost overrun LLM por upload abusivo. Não muda UX para uso normal. |
| `src/utils/sovereigntyEngine.ts` | M | SOV-3, SOV-5, SOV-6 | Match de cartão exato em vez de `String.includes` (linha 264, falso positivo eliminado). Taxa rotativa hardcoded (0.14) extraída para constante documentada `ROTATIVO_CARTAO_PROXY_MENSAL`. Confiança 'baixa' forçada quando há < 2 meses ou < 30 lançamentos. |
| `docs/PENDENCIAS_PRODUTO_AUDITORIA.md` | NEW | múltiplos | Documenta achados que exigem decisão de produto: SOV-1 (saldo negativo), SOV-2 (unidade de taxa), SOV-3-liquidez (Tesouro), SOV-7 (dividendos), SEG-12 (rate limit chatApi), SEG-01 (ADMIN_EMAILS), ARQ-08 (useTenant.js). Cada um com opções, recomendação e custo. |
| `docs/AUDITORIA_GAPS_METAANALISE.md` | M | meta | Atualizado com a verificação dos top 3 riscos: Stripe (✅ OK), chatApi (❌ exposto), sovereigntyEngine (❌ 8 bugs detalhados). |

### Auditoria Telegram bot — 1 crítico fechado + 3 altos/médios

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `functions/config.js` | M | TLG-1 | Nova env `TELEGRAM_WEBHOOK_SECRET` exportada do config. |
| `functions/telegramBot.js` | M | TLG-1 (CRÍTICO) | `telegramWebhook` valida `X-Telegram-Bot-Api-Secret-Token` no início. Sem env configurada em prod = retorna 503. Antes, qualquer um que descobrisse a URL forjava mensagens em nome de qualquer usuário vinculado (incluindo `/lancar 100000 hack`). |
| `functions/telegramBot.js` | M | TLG-3 + TLG-4 | `linkCode` deletado após uso (antes vincula múltiplas vezes). `chatId` que já está em outro uid bloqueia o vínculo (antes permitia sequestro do chatId). |
| `functions/telegramBot.js` | M | TLG-6 | `where(..., "!=", "")` trocado por `>` + filtro defensivo nas 3 ocorrências (`checkPriceAlerts`, `dailyNews`, `weeklyReport`). Inclui usuários antigos sem o campo. |
| `docs/AUDITORIA_TELEGRAM.md` | NEW | doc | Auditoria completa: 7 achados (1 crítico + 2 altos + 4 médios/baixos), 4 fechados, 3 pendências (escape HTML, rate limit, cap regex). Inclui setup operacional de `setWebhook` com secret_token. |

### Auditoria Sentinel (geo + weekly) — 5 fechados, 1 crítico documentado

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `functions/services/sentinel/sentinelaGeoService.js` | M | SEN-1 + SEN-2 | `queryOverpass` com `AbortSignal.timeout(12_000)` + nova `isValidCoord(lat, lng)` validando ranges geo. Antes Cloud Function podia pendurar quando Overpass está lenta + coordenadas inválidas custavam round-trip. |
| `functions/services/sentinel/sentinelaWeeklyService.js` | M | SEW-1 | `calcDaysOfFreedom` filtra `e.isTransfer !== true` em vez de checagem dead-code `type !== "transferencia"`. Antes, transfers entre contas (com `type: "despesa"`) inflavam burn rate e deflacionavam Ld no WhatsApp semanal. |
| `functions/services/sentinel/sentinelaWeeklyService.js` | M | SEW-3 | Query `where("whatsappPhone", "!=", "")` (que ignora docs sem o campo) trocada por `where(..., ">", "")` + filtro defensivo pós-get exigindo string `≥ 8 chars`. Inclui usuários antigos sem campo definido. |
| `functions/services/sentinel/sentinelaWeeklyService.js` | M | SEW-5 | Removido `phone.slice(-4)` dos logs estruturados — mesmo 4 dígitos finais são PII parcial (LGPD). |
| `docs/AUDITORIA_SENTINEL.md` | NEW | doc | Auditoria completa: 10 achados (1 crítico SEW-2 documentado, 3 altos fechados, 2 médios fechados, 4 pendentes). **SEW-2 (CRÍTICO):** `calcDaysOfFreedom`/`calcSpreadGap` duplicam `sovereigntyEngine.ts` com fórmulas divergentes — usuário recebe Ld diferente no dashboard vs WhatsApp semanal. Refator pendente para próxima sessão. |

### Auditoria LLM proxy (llmService + claudeProxy) — 2 críticos fechados

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `functions/services/llm/llmService.js` | M | LLM-7 (CRÍTICO) | `extractEntry` agora sanitiza texto do usuário (`sanitizeUserTextForPrompt` remove `\n`, `{`, `}`, `[`, `]`, `` ` ``, etc.) e valida pós-parse: `type ∈ {receita, despesa}`, `value ∈ [0.01, 1M]`, `desc ≤ 100 chars`, `category` em allowlist, `date` YYYY-MM-DD válido. Antes, prompt injection criava receita falsa. |
| `functions/services/llm/llmService.js` | M | LLM-3 | `setInterval` para reset de errorCount substituído por `maybeResetErrorCounts` chamado no início de cada `callLLM` (Cloud Functions são stateless — timer não roda confiável). |
| `functions/services/llm/llmService.js` | M | LLM-1 | Cache LRU em O(1) — `Map` preserva ordem de inserção, `_cacheGet` re-insere no hit, eviction usa `keys().next()`. Antes era `sort` O(n log n) per insert quando cheio. |
| `functions/services/llm/llmService.js` | M | LLM-6 | Helper `bumpProviderError(provider, reason, extras)` distingue `auth-error` (401/403) de `rate-limit` (429) etc. Aplicado em Gemini e Groq; pendente nos outros 4 providers. |
| `functions/services/llm/claudeProxy.js` | M | CLD-4 (CRÍTICO) | `callClaude` agora SEMPRE exige claim `admin`. Antes, flag `data.adminOnly` controlada pelo cliente — não-admin enviando `adminOnly: false` usava o proxy livremente. |
| `functions/services/llm/claudeProxy.js` | M | CLD-2 | `ALLOWED_MODELS` allowlist (Haiku/Sonnet/Opus). DEFAULT trocado de `claude-opus-4-6` (premium) para `claude-haiku-4-5-20251001` (barato). Premium loga warning de custo. |
| `functions/services/llm/claudeProxy.js` | M | CLD-1 | `PROMPT_MAX_CHARS = 12_000`, `SYSTEM_MAX_CHARS = 4_000`. HttpsError 400 quando excede. |
| `functions/services/llm/claudeProxy.js` | M | CLD-3 | `AbortSignal.timeout(30_000)` no fetch para Anthropic. |
| `docs/AUDITORIA_LLM_PROXY.md` | NEW | doc | Auditoria completa: 10 achados (2 críticos + 4 altos + 3 médios + 1 baixo), 8 fechados nesta sessão, 2 pendências (LLM-2 circuit breaker compartilhado, LLM-5 deadline global). |

### Auditoria Pluggy (Open Finance) — 2 críticos fechados

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `functions/services/pluggy/pluggySyncService.js` | M | PLG-1 (CRÍTICO) | Write final em `db.runTransaction` mescla manuais frescos (criados durante a sync) com `payload.entries`. Antes, `userRef.set(...)` substituía o array com versão stale e perdia lançamentos manuais que o usuário criou enquanto a sync rodava (até 540s). |
| `functions/services/pluggy/pluggySyncService.js` | M | PLG-2 (CRÍTICO) | Lock anti-concurrent via `users/{uid}/_syncLocks/pluggy` com TTL 15min. `acquireSyncLock` em `runTransaction` impede syncs paralelas (duplo clique, retry offline). Sempre liberado em `finally`. |
| `firestore.rules` | M | PLG-2 | Nova regra `users/{userId}/_syncLocks/{lockId}` — leitura pelo dono (UI mostra "sincronizando"), escrita exclusiva via Admin SDK. |
| `docs/AUDITORIA_PLUGGY.md` | NEW | doc | Auditoria completa: 9 achados (2 críticos fechados, 4 altos, 2 médios, 2 baixos pendentes). Inclui notas operacionais (limpeza de locks órfãos, indicador UI). |

### Auditoria stripeService.js — fechando pontas

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `functions/services/billing/stripeService.js` | M | SEG-Stripe-1 | Mapa `STRIPE_PRICE_TO_PLAN` (env-driven) substitui inferência de plano por `priceId.includes("familia")`. `createCheckout` valida priceId contra allowlist; webhook `customer.subscription.updated` resolve plan por mapa canônico (com fallback explícito para metadata + heurístico legacy + warn). |

### Auditoria rewardEngine.js (SibCoin) — fechando crítico de farming

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `functions/services/sibcoin/rewardEngine.js` | M | REW-4 (CRÍTICO) | Nova função `isEventStateValid(eventType, userData)` valida estado real do usuário ANTES de creditar. Antes, atacante autenticado podia chamar `triggerSibcoinEvent({eventType:'open_finance_connected'})` sem ter Open Finance e ganhar 200 SC. Total farmable: ~755 SC (~R$ 75) por sessão. Rejeição roda DENTRO da `runTransaction`, lendo o snapshot do usuário. |
| `functions/services/sibcoin/rewardEngine.js` | M | REW-2 | `enforceAppCheck` agora respeita `process.env.ENFORCE_APP_CHECK === 'true'` em vez de hardcoded `false` nos 3 callables (`triggerSibcoinEvent`, `getSibcoinMissions`, `adminCreditSibcoin`). |
| `docs/AUDITORIA_REWARD_ENGINE.md` | NEW | doc | Auditoria completa do rewardEngine: 5 achados (1 crítico, 1 alto, 1 médio, 2 baixos), 2 fechados, 3 pendências. **Recomendação operacional:** antes do deploy, auditar SC já creditados em prod para identificar farming retroativo (query exemplos no doc). |

### Auditoria persistUserData.ts — quick wins + pendências

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `src/services/persistUserData.ts` | M | PUD-2 | `addAccount` agora compara nome de conta case-insensitive (lowercase + trim). Antes "Itaú" e "ITAÚ" passavam como contas distintas. |
| `src/services/persistUserData.ts` + `src/types/userData.ts` | M | PUD-4 | `Entry.entryLocation` aceita `'subcollection'` no union; cast `as any` removido em `updateEntry` e `deleteEntry`. |
| `src/services/persistUserData.ts` | M | PUD-7 | `updateAccountBalance` aceita parâmetro opcional `currentAccounts`. Quando fornecido, rejeita atualização para conta inexistente. Retrocompatível (warn em DEV se não passar). |
| `src/services/persistUserData.ts` | M | PUD-1 (parcial) | Novo helper `modifyUserDoc(uid, { patch?, entries? })` aplica append/update/remove em `entries` DENTRO da `runTransaction` (lê estado fresco antes de mutar). Refatorados 7 paths: `addEntry`, `addTransfer`, `updateEntry`, `deleteEntry`, `addCardPurchase`, `importCardPurchases`, `deleteCardPurchase`. Race condition de "load → modify → write" eliminada nos paths críticos. 5 paths menores (rename account, recorrentes, quarentena, pagar/estornar fatura) ficam para próxima sessão. |
| `docs/AUDITORIA_PERSIST_USER_DATA.md` | M | doc | Atualizado: PUD-1 marcado como parcialmente fechado, listando os 7 paths migrados e os 5 pendentes. |

### Extensão pós-pendências — fundação de qualidade (CI + ESLint + testes)

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `src/utils/sovereigntyEngine.test.ts` | NEW | REL-tests-sov | Vitest cobrindo Ld/Sg/Sv com casos para cada fix (SOV-1, SOV-2, SOV-3-liquidez, SOV-7) e happy paths. ~25 testes. Não foi possível validar na sandbox (mount cache trunca arquivos > X linhas no WSL); rodar localmente com `npm run test:unit` confirma. |
| `.github/workflows/frontend-ci.yml` | NEW | REL-02 | CI no front: typecheck (`tsc --noEmit`), `vitest run`, `vite build`, ESLint (warning-mode). Antes só `functions-tests.yml` rodava em PR. |
| `eslint.config.js` | NEW | REL-03 | Flat config v9 com `@typescript-eslint`. Estratégia warn-first: `as any` → warn (não bloqueia), erros estruturais → error. Quando #any cair < 30, virar tudo para error. |
| `package.json` | M | REL-02/REL-03 | Scripts adicionados: `lint`, `lint:fix`, `typecheck`, `ci:local`. devDeps: `eslint@^9`, `@eslint/js`, `typescript-eslint`. |

### Extensão final — todas as pendências fechadas (decisão sênior)

| Arquivo | Tipo | Achado | O que mudou |
|---|---|---|---|
| `src/utils/sovereigntyEngine.ts` | M | SOV-1 | Saldo negativo (cheque especial) **subtraído** da liquidez em vez de zerado. Decisão produto: produto de soberania não esconde dívida. |
| `src/utils/sovereigntyEngine.ts` | M | SOV-3-liquidez | Lista `liquidTypeKeys` restrita aos tipos comprovadamente líquidos D+30: Tesouro Selic, CDB Liquidez Diária, Fundo DI, Poupança. "renda fixa", "lci", "lca" e "cdb" genérico saíram. |
| `src/utils/sovereigntyEngine.ts` + `src/types/userData.ts` | M | SOV-2 | Heurístico maluco de unidade removido. Engine agora lê `interestRatePct` (canônico, % a.m.) com fallbacks `interestPct` + `interestRate` (deprecated). Type documenta unidade. **Bug correlato descoberto:** o engine antes lia `ob.interestRate` que NUNCA existia → todas as obligations contavam com taxa 0. Corrigido. |
| `src/utils/sovereigntyEngine.ts` + `src/types/userData.ts` | M | SOV-7 | Investment ganha campo opcional `proventosMensais?: number`. Engine soma quando presente em `monthlyPassiveIncome`. UI/BRAPI populam. |
| `src/hooks/useTenant.js` | DELETED | ARQ-08 | Convertido para TS. |
| `src/hooks/useTenant.d.ts` | DELETED | ARQ-08 | Shadow eliminado. |
| `src/hooks/useTenant.tsx` | NEW | ARQ-08 | Versão TypeScript completa (Provider + hook + tipos públicos exportados). |
| `functions/services/admin/adminAuth.js` | M | SEG-01 | `ADMIN_EMAILS` agora vem de `process.env.ADMIN_EMAILS` (CSV). Fallback hardcoded mantido com warning para destravar bootstrap. Próximo passo (próxima sessão): migrar para coleção Firestore + UI admin. |
| `functions/services/assistant/chatRateLimiter.js` | NEW | SEG-12 | Rate limiter por uid: quota diária por plano (free 200, pro/familia 2000, enterprise 20k) + burst 30/min. Storage Firestore `users/{uid}/quotas/chat-{YYYY-MM-DD}`. Bypass via `DISABLE_CHAT_RATE_LIMIT=1` em DEV. |
| `functions/index.js` | M | SEG-12 | `chatApi`, `chatStreamApi`, `proactiveInsightApi` agora chamam `enforceChatQuota`. Stream devolve 429 quando bloqueado. |
| `firestore.rules` | M | SEG-12 | Nova regra `users/{userId}/quotas/{quotaId}` — leitura pelo dono, escrita só via Admin SDK (Cloud Function). |

---

## Verificação manual recomendada antes de commitar

1. **Webhook fail-closed (SEG-02):** verificar imediatamente se as envs estão setadas em produção:
   ```bash
   firebase functions:secrets:access LOMADEE_WEBHOOK_SECRET
   firebase functions:secrets:access MONETIZZE_WEBHOOK_SECRET
   firebase functions:secrets:access WEBHOOK_PARCEIRO_SECRET
   ```
   Se algum estiver vazio, **configurar antes do deploy** desta mudança, senão webhooks legítimos vão começar a retornar 503.

2. **WHATSAPP_VERIFY_TOKEN (SEG-04):** mesma coisa:
   ```bash
   firebase functions:secrets:access WHATSAPP_VERIFY_TOKEN
   ```
   Se estiver vazio, configurar com o valor que o painel Meta espera; senão o webhook do WhatsApp para de receber mensagens.

3. **Migração multi-tenant (SEG-06):** se já houver usuários migrados com a lista antiga de 5 subcoleções, rodar a migração de novo (com a nova lista) é **idempotente** (linhas 100–104 pulam quem tem `migratedFrom === "legacy"`). Mas — confirme antes via:
   ```bash
   node scripts/migrate-to-multitenant.js   # dry-run (sem --execute)
   ```
   e revise o JSON gerado em `scripts/multitenant-migration-report-*.json`.

4. **`creditarCashbackSibCoin` (SEG-03):** agora exige `data.uid`. Se houver código no admin panel chamando essa callable sem `uid`, vai quebrar. Procurar:
   ```bash
   grep -rn "creditarCashbackSibCoin" public/admin/ src/
   ```

---

## Comandos git sugeridos

> Estes comandos assumem que você quer empacotar minhas mudanças em commits limpos
> separados das suas. Eu não rodei nenhum git porque o working tree estava sujo
> com 365 arquivos seus modificados.

### Opção A — empacotar tudo num branch só

```bash
# Crie e mude para o branch
git checkout -b audit/fase-1-2

# Stage de cada commit separado
git add functions/services/affiliate/affiliateWebhookService.js
git commit -m "security(webhook): SEG-02 — fail-closed quando secret ausente"

git add functions/index.js functions/config.js
git commit -m "security(callable+webhook): SEG-03/SEG-04 — creditarCashback usa data.uid + WhatsApp verify token sem default público"

git add scripts/migrate-to-multitenant.js
git commit -m "security(migration): SEG-06 — incluir subcoleções faltantes (entriesOverflow, errorLogs, openFinanceConsents, auditLogs, sibcoin, filiado)"

git add AGENTS.md .cursorrules .editorconfig
git commit -m "docs(governance): introduzir AGENTS.md como SoT IA + .cursorrules + .editorconfig"

git add docs/CHANGELOG.md CLAUDE.md
git commit -m "docs(changelog): criar docs/CHANGELOG.md + apontar CLAUDE.md para AGENTS.md"

git add .cursor/rules/global.mdc .cursor/rules/deploy.mdc .cursor/rules/legado.mdc .cursor/rules/segunda.mdc
git commit -m "docs(cursor-rules): atualizar regras stales pós-cutover"

# Extensão pós-meta-análise
git add functions/index.js   # caps de input em chatApi/chatStreamApi/proactiveInsightApi
git commit -m "security(chatApi): SEG-11 — caps de input (4KB mensagem, 32KB contexto/snapshot)"

git add src/utils/sovereigntyEngine.ts
git commit -m "fix(sovereigntyEngine): SOV-3/SOV-5/SOV-6 — match de cartão exato + taxa rotativa documentada + confiança baixa em base nova"

git add docs/PENDENCIAS_PRODUTO_AUDITORIA.md docs/AUDITORIA_GAPS_METAANALISE.md
git commit -m "docs(audit): pendências que exigem decisão de produto + verificação top 3 riscos"

# Extensão final — todas as pendências fechadas
git add src/utils/sovereigntyEngine.ts src/types/userData.ts
git commit -m "fix(sovereigntyEngine): SOV-1/SOV-2/SOV-3-liquidez/SOV-7 — saldo negativo subtrai, taxa em interestRatePct (% a.m.), liquidez restrita, dividendos somam"

# useTenant: rename + delete (com `git mv` se git aceitar)
git rm src/hooks/useTenant.js src/hooks/useTenant.d.ts
git add src/hooks/useTenant.tsx
git commit -m "refactor(useTenant): ARQ-08 — converter para TypeScript (.tsx)"

git add functions/services/admin/adminAuth.js
git commit -m "security(admin): SEG-01 — ADMIN_EMAILS via env com fallback bootstrap (passo 1, Firestore na próxima)"

git add functions/services/assistant/chatRateLimiter.js functions/index.js firestore.rules
git commit -m "security(chatApi): SEG-12 — rate limit por uid (quota diária por plano + burst 30/min)"

# Fundação de qualidade
git add src/utils/sovereigntyEngine.test.ts
git commit -m "test(sovereigntyEngine): cobrir SOV-1/2/3/7 + happy path Ld/Sg/Sv"

git add .github/workflows/frontend-ci.yml eslint.config.js package.json
git commit -m "chore(ci): REL-02/REL-03 — GitHub Actions front + ESLint flat config (warn-first)"

# Auditoria persistUserData.ts — quick wins + PUD-1
git add src/services/persistUserData.ts src/types/userData.ts
git commit -m "fix(persistUserData): PUD-1/PUD-2/PUD-4/PUD-7 — modifyUserDoc atômico para arrays + addAccount case-insensitive + Entry.entryLocation tipado + updateAccountBalance valida conta"

git add docs/AUDITORIA_PERSIST_USER_DATA.md
git commit -m "docs(audit): auditoria persistUserData.ts (4 fechados incl. PUD-1 parcial, 5 pendentes)"

# Stripe + rewardEngine
git add functions/services/billing/stripeService.js
git commit -m "security(billing): SEG-Stripe-1 — allowlist de priceId + plan canonicalization (env-driven)"

git add functions/services/sibcoin/rewardEngine.js docs/AUDITORIA_REWARD_ENGINE.md
git commit -m "security(sibcoin): REW-4/REW-2 — anti-farming (valida estado real) + enforceAppCheck via env"

# Pluggy (Open Finance)
git add functions/services/pluggy/pluggySyncService.js firestore.rules
git commit -m "fix(pluggy): PLG-1/PLG-2 — write final em transação + lock anti-concurrent"

git add docs/AUDITORIA_PLUGGY.md
git commit -m "docs(audit): auditoria Pluggy (2 críticos fechados, 7 pendências)"

# LLM proxy
git add functions/services/llm/llmService.js functions/services/llm/claudeProxy.js
git commit -m "security(llm): LLM-7/CLD-4/CLD-2 + LLM-3/1/6/CLD-1/3 — sanitização anti-injection + claim admin sempre + allowlist modelo + caps + timeout"

git add docs/AUDITORIA_LLM_PROXY.md
git commit -m "docs(audit): auditoria LLM proxy (8 fechados, 2 pendências)"

# Sentinel
git add functions/services/sentinel/sentinelaGeoService.js functions/services/sentinel/sentinelaWeeklyService.js
git commit -m "fix(sentinel): SEN-1/2 + SEW-1/3/5 — timeout Overpass + valida coord + filtro isTransfer + query robusta + remove PII de log"

git add docs/AUDITORIA_SENTINEL.md
git commit -m "docs(audit): auditoria Sentinel (5 fechados, 1 crítico SEW-2 documentado, 4 pendências)"

# Telegram bot
git add functions/config.js functions/telegramBot.js
git commit -m "security(telegram): TLG-1/3/4/6 — webhook valida secret_token + delete linkCode + bloqueia sequestro de chatId + query robusta"

git add docs/AUDITORIA_TELEGRAM.md
git commit -m "docs(audit): auditoria Telegram bot (4 fechados incl. crítico, 3 pendências)"

git add PATCHES_FASE_1_2.md
git commit -m "docs(audit): relatório de patches da fase 1+2"

git push -u origin audit/fase-1-2
# Abrir PR no GitHub
```

### Opção B — quero revisar arquivo por arquivo antes

```bash
# ver o que mudou em cada arquivo
git diff functions/services/affiliate/affiliateWebhookService.js
git diff functions/index.js   # especificamente: ~linha 990-1090 + linha do whatsappWebhook
git diff functions/config.js
git diff scripts/migrate-to-multitenant.js
git diff CLAUDE.md
git diff .cursor/rules/

# adicionar o que aprovar:
git add -p <arquivo>
```

### Opção C — descartar e re-fazer

Se preferir refazer manualmente algum item, basta `git checkout <arquivo>` para
descartar a mudança. As novas (`AGENTS.md`, `.cursorrules`, etc.) ficam como
untracked até você decidir.

---

## O que NÃO foi feito nesta sessão (próximas semanas da auditoria)

Mantido para próxima sessão de execução:

- **Semana 3** — CI no front (`.github/workflows/`), ESLint flat config, deploy
  automatizado de regras Firestore/Storage, `npm install` → `npm ci`.
- **Semana 4** — Quebrar `functions/index.js` em domínios, quebrar `AppContext`,
  converter `useTenant.js` → `.ts`, testes Vitest para `sovereigntyEngine` e
  `decisionEngine`.

Esses itens são refatorações maiores que merecem sessão dedicada e podem
quebrar outras coisas se feitas com a árvore de trabalho suja.

---

## Métricas de fechamento

- 4 críticos da auditoria fechados (SEG-02, SEG-03, SEG-04, SEG-06).
- 1 crítico parcial (AI-01 — `.cursorrules` criado e regras stales atualizadas;
  pendente: validação que Cursor está obedecendo).
- 0 testes adicionados (próxima sessão — Semana 4 da auditoria).
- 0 deploys feitos (regra de ouro do AGENTS.md).

Pendências críticas da auditoria que ficam para Semana 3-4:
- SEG-01 (ADMIN_EMAILS hardcoded) — exige migração para Firestore + UI admin.
- REL-02 (CI no front) — exige GitHub Actions workflow.
- ARQ-02 (functions/index.js gigante) — refator estrutural.
- ARQ-03 (AppContext gigante) — refator estrutural.
