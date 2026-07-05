# Auditoria: `functions/services/sibcoin/rewardEngine.js`

> Gerada em 26/04/2026. Cobre 356 linhas — motor de SibCoin (off-chain ledger).
> SibCoin = moeda interna que dá desconto na loja, atalho para plano Pro, etc.
> 1 SC ≈ R$ 0,10. Bug aqui = perda direta de receita.

---

## O que está BEM

- ✅ `runTransaction` em `processEvent` e `adminCreditSibcoin` — atomicidade
  do read-modify-write garantida.
- ✅ Idempotência via `sibcoinMissionsCompleted` map — `isMissionCompleted`
  bloqueia recrédito.
- ✅ `adminCreditSibcoin` valida `auth?.token?.admin` (custom claim).
- ✅ `triggerSibcoinEvent` valida `eventType` contra `VALID_EVENTS` allowlist.
- ✅ Tier calculado de `sibcoinEarned` (lifetime), não `sibcoinBalance` —
  spending NÃO downgrada o tier (correto).

---

## Achados

### REW-4 — Farming livre de missões "once" (CRÍTICO) — FECHADO

**Antes:** `triggerSibcoinEvent` aceitava qualquer evento da allowlist
e creditava SibCoin sem verificar se o estado do usuário condiz.

Atacante autenticado podia chamar:
```ts
httpsCallable('triggerSibcoinEvent')({ eventType: 'open_finance_connected' });
// sem ter Open Finance conectado, ganha 200 SC instantaneamente.
```

**Total farmable em uma sessão:**
| Evento | Recompensa |
|---|---|
| `entry_added` | 50 |
| `goal_created` | 100 |
| `open_finance_connected` | 200 |
| `investment_added` | 150 |
| `budget_created` | 75 |
| `profile_completed` | 100 |
| `dda_boleto_detected` | 80 |
| **Total** | **755 SC ≈ R$ 75** |

Em escala: 1.000 atacantes = R$ 75.000 emitidos falsamente. Loja interna
aceita SC para descontos = drena orçamento direto.

**Fix aplicado:** nova função `isEventStateValid(eventType, userData)` checa
o estado real ANTES de creditar:

| Evento | Validação |
|---|---|
| `entry_added` | `entries.length > 0` |
| `goal_created` | `goals.length > 0` |
| `open_finance_connected` | `openBankingAtivo === true OR openFinanceStatus === 'ativo' OR openFinanceSyncedAt` |
| `investment_added` | `investments.length > 0` |
| `budget_created` | `Object.keys(budgets).length > 0` |
| `profile_completed` | `name && whatsappPhone && objetivoFinanceiro` |
| `dda_boleto_detected` | `boletosDDA.length > 0` |
| `login_streak`, `referral_signup` | sem validação retroativa (rate limit natural por frequência) |

A validação roda DENTRO da `runTransaction`, lendo `userData` do snapshot.

---

### REW-2 — `enforceAppCheck: false` hardcoded (ALTO) — FECHADO

**Antes:** linhas 252, 285, 316 tinham `enforceAppCheck: false` hardcoded
nos 3 callables (`triggerSibcoinEvent`, `getSibcoinMissions`, `adminCreditSibcoin`).

Cliente forjado fora do Sibanki podia chamar — segurança dependia só do
ID token do Auth.

**Fix aplicado:** `enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true'`.
Mesma família dos outros callables (chatApi). Default OFF, mas honra env
quando configurada em prod.

---

### REW-5 — `sibcoinHistory` armazenado como array com slice(0, 50) (MÉDIO) — PENDÊNCIA

**Onde:** linhas 240, 344.

```js
sibcoinHistory: [...newTransactions, ...currentHistory].slice(0, 50),
```

A 51ª transação para fora. Para auditoria contábil/LGPD, isso é ruim —
o usuário tem direito a ver TODO o histórico de transações de moeda.

**Fix recomendado:** mover `sibcoinHistory` para subcoleção
`users/{uid}/sibcoin/{txId}` (que JÁ EXISTE para o cashback de afiliado).
Mantém o array só com últimas 5 para UI rápida.

**Custo:** ~3h (mexe em SibcoinWidget, backend write, regras Firestore).

---

### REW-6 — IDs de transação com `Date.now()` (BAIXO) — PENDÊNCIA

**Onde:** linhas 213, 336.

```js
id: `${uid}_${mission.id}_${Date.now()}`,
id: `admin_${targetUid}_${Date.now()}`,
```

Em concorrência (2 missions completam no mesmo ms), IDs colidem. Como
`history` é array e indexamos por posição, não há erro funcional, mas
analytics de transação ficam com IDs duplicados.

**Fix:** trocar por `crypto.randomUUID()` ou `${Date.now()}_${Math.random().toString(36).slice(2,8)}`.

---

### REW-7 — Sem rate limit por uid (BAIXO) — PENDÊNCIA

`triggerSibcoinEvent` pode ser chamado milhares de vezes/segundo. Idempotência
de "once" missions limita o ganho real, mas o stress test do Firestore
pode subir custos. Mesma família do SEG-12 (rate limit chatApi).

**Fix:** estender `chatRateLimiter` para um genérico `enforceUidQuota` e
plug aqui também.

---

## Resumo

| ID | Severidade | Status |
|---|---|---|
| REW-4 | CRÍTICO | ✅ Fechado nesta sessão |
| REW-2 | ALTO | ✅ Fechado nesta sessão |
| REW-5 | MÉDIO | Pendência |
| REW-6 | BAIXO | Pendência |
| REW-7 | BAIXO | Pendência |

**Risco residual:** REW-5 é o mais relevante para compliance LGPD (direito
de acesso ao histórico). REW-6 e REW-7 são polish.

---

## Recomendações de produto

1. **Auditar SC já creditados antes de fix-deploy:** se este farming foi
   explorado em produção, há usuários com saldo "fake". Antes de deployar
   o fix, rodar query no Firestore para identificar usuários com:
   - `sibcoinEarned > 100` E `entries.length === 0`
   - `sibcoinMissionsCompleted.mission_open_finance` SET E
     `openBankingAtivo !== true`
   etc. Estornar SibCoin desses usuários.

2. **Considerar deploy faseado:** o fix REW-4 vai começar a rejeitar
   chamadas legítimas se o front-end estiver disparando eventos antes
   do estado estar gravado. Validar fluxo do `RegistrationWizard` e do
   `OpenFinanceConnect` para garantir que a escrita do estado no Firestore
   acontece ANTES do `triggerSibcoinEvent`.

3. **Considerar tornar `processEvent` server-side only:** o ideal é que
   o front-end NUNCA chame `triggerSibcoinEvent` diretamente. Os eventos
   deveriam ser disparados por:
   - Triggers Firestore (`onCreate(users/{uid}/entries/{id})`).
   - Webhook handlers (`registrarOpenBanking` → emite evento).
   - Cloud Functions de domínio.

   Isso seria a fix definitiva para REW-4 — atacante não tem como falsificar
   um trigger do Firestore. Refator de meio porte (~6h).
