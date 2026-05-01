# Pendências da auditoria que exigem decisão de produto

> Gerado em 26/04/2026 ao final da extensão da sessão de execução.
>
> Achados da auditoria que não fechei sozinho porque mexem em comportamento
> visível ao usuário ou exigem mudança de schema. Cada item tem opções claras
> e a recomendação que daria como dev sênior — você decide.

---

## Como ler

| Campo | Significado |
|---|---|
| **ID** | Identificador do achado (`SEG-*`, `SOV-*`, `ARQ-*`). |
| **Onde** | Arquivo:linha que demonstra o problema. |
| **O que está errado** | Comportamento atual mostrável ao usuário. |
| **Opções** | Caminhos viáveis, com prós/contras. |
| **Recomendação** | O que eu (Claude Cowork) faria se a decisão fosse minha. |
| **Custo aprox.** | Esforço estimado para fechar. |

---

## SOV-1 — Saldo negativo (cheque especial) tratado como zero

**Onde:** `src/utils/sovereigntyEngine.ts:127-130` (`calculateDaysOfFreedom`).

**O que está errado:**
```ts
const accountLiquidity = Object.entries(accountBalances).reduce((sum, [name, bal]) => {
  if (accountMeta[name]?.incluirNaSoma === false) return sum;
  return sum + Math.max(0, Number(bal) || 0);   // ← negativo vira 0
}, 0);
```
Usuário com -R$500 no Itaú vê liquidez idêntica à de quem tem R$0. Ld inflado.
Para usuário endividado (boa parte da base de Sibanki), esconde realidade.

**Opções:**
1. **Subtrair saldo negativo da liquidez total** — solução matemática mais correta. Ld cai. Pode chocar usuário no primeiro acesso.
2. **Mostrar Ld separado de "Dívidas Imediatas"** — duas KPIs distintas. Mais didático, mais código.
3. **Manter zero, mas exibir alerta visual** — UX intermediária. Não muda número, marca como "atenção".

**Recomendação:** opção **(1)** — subtrair. O produto vende soberania financeira, e esconder cheque especial é o oposto disso. Implementação:
```ts
return sum + (Number(bal) || 0); // SEM Math.max
```
**Custo:** 2 linhas + 2 testes Vitest + texto na UI explicando o número (release notes "agora seu Ld considera saldo negativo"). 1h.

---

## SOV-2 — Heurístico de unidade da taxa em `CreditObligation`

**Onde:** `src/utils/sovereigntyEngine.ts:254-255`.

**O que está errado:**
```ts
const raw = Number(ob.interestRate) || 0;
const monthlyRate = raw > 1 ? raw / 100 : raw > 0.3 ? raw / 12 : raw;
```
O código tenta adivinhar se `interestRate` está em % a.m., a.a. decimal, ou a.m. decimal. Em vários ranges válidos (ex: 0,5% a.m. ↔ 50% a.a.) ele escolhe errado, errando o cálculo por ~10x.

**Opções:**
1. **Adicionar campo `interestRateUnit: 'monthly_pct' | 'annual_pct' | 'monthly_decimal' | 'annual_decimal'`** ao `CreditObligation` + migração + UI. Mais correto, requer schema.
2. **Padronizar UM formato em toda a base** (ex: sempre `% a.m.`) e migrar dados existentes. Menos campos, exige migração.
3. **Manter heurístico mas validar com regras explícitas e log warning** quando ambíguo. Ruim a longo prazo.

**Recomendação:** opção **(2)** — fixar `% a.m.` (compatível com como o BC mostra rotativo no Brasil) e migrar. Atualizar formulário de cadastro de obligation para ser explícito ("% ao mês"). **Custo:** ~4h (campo, validação, migração, formulário, testes).

---

## SOV-3-liquidez — Tesouro/CDB classificados como líquido D+30

**Onde:** `src/utils/sovereigntyEngine.ts:137`.

**O que está errado:**
```ts
const liquidTypes = ['cdb', 'tesouro selic', 'lci', 'lca', 'fundo di',
                     'poupança', 'fundos di', 'renda fixa'];
```
"renda fixa" e "tesouro selic" cobrem títulos longos (Tesouro IPCA+ 2035, CDB de 5 anos) que NÃO são líquidos D+30 — vender antecipado pode dar prejuízo.

**Opções:**
1. **Adicionar campo `vencimento: string | null` ao `Investment`** e classificar como líquido apenas se `vencimento` ≤ D+30 ou ausente.
2. **Restringir a lista a tipos comprovadamente D+0** ('Tesouro Selic', 'CDB Liquidez Diária', 'Poupança', 'Fundo DI'). Remover "renda fixa" genérico, "lci", "lca".
3. **Marcar liquidez parcial** (ex: 50% do valor de Tesouro IPCA+ longo).

**Recomendação:** opção **(2)** primeiro (rápido, conservador), depois **(1)** quando schema permitir. Conservador é defensável: melhor mostrar Ld menor e estar certo do que mostrar Ld maior e quebrar a confiança do usuário. **Custo:** opção (2) = 10min; opção (1) = ~2h com migração.

---

## SOV-7 — Renda passiva ignora dividendos de ações/FIIs

**Onde:** `src/utils/sovereigntyEngine.ts:175`.

**O que está errado:**
```ts
const monthlyPassiveIncome = liquidInvestments * investmentYieldMonthly;
```
Considera apenas rendimento de investimentos LÍQUIDOS (CDB, Tesouro, etc.). Dividendos mensais de FIIs e JCP de ações ficam fora — sub-estimando renda passiva real, especialmente para usuários com FIIs (que são populares no Sibanki target).

**Opções:**
1. **Adicionar `proventosMensais?: number` em `Investment`** (preenchido manualmente ou via BRAPI). Somar quando presente. Schema change.
2. **Estimativa por classe de ativo** — se `tipo` contém "fii" → 0,7% a.m. médio; "ação dividendos" → 0,5% a.m. Sem novo campo, mas inferência genérica.
3. **Manter como está e documentar limitação** no card "Renda Passiva".

**Recomendação:** **(1)** + **(3)** combinados. Adicionar campo opcional, popular via BRAPI se disponível, fallback para estimativa, e UI deixa claro que é estimativa. **Custo:** ~3h.

---

## SEG-12 — chatApi/chatStreamApi sem rate limit por uid

**Onde:** `functions/index.js:651` (chatApi), `:676` (chatStreamApi).

**O que falta:** caps de input já adicionados nesta sessão (SEG-11), mas ainda falta:
1. Quota diária por uid (ex: máx 200 turnos/dia para plano gratuito, 1000 para Pro).
2. Rate limit por uid (ex: máx 20 turnos/min).
3. App Check enforcement (`enforceAppCheck` é opt-in via env).

**Opções de armazenamento de quota:**
1. **Firestore** (`users/{uid}/quotas/chat-daily`) — simples, lento (read+write por turno).
2. **Realtime DB** counter — mais rápido, mais 1 dependência.
3. **Memcache via Cloud Functions externa** (ex: Redis Lite) — caro, complexo.

**Recomendação:** Firestore para o MVP. Plano gratuito = 200/dia, Pro = ilimitado (com fair use). App Check ON em produção (definir `ENFORCE_APP_CHECK=true` via secrets). **Custo:** ~4-6h.

---

## SEG-01 (relembrando) — `ADMIN_EMAILS` hardcoded

**Onde:** `functions/services/admin/adminAuth.js:20`.

Original do audit. Decisão de produto:
1. **Migrar para Firestore** `admins/{email}` collection com Cloud Function gerenciando.
2. **Migrar para Firebase Custom Claims sem lista** — admin é quem TEM o claim; gerenciar via Cloud Function.
3. **Manter mas extrair para `functions/.env`** como `ADMIN_EMAILS=a,b,c`. Mais simples, ainda manual no deploy.

**Recomendação:** **(2)**. Custom claim já é fonte de verdade no resto do sistema. Lista só atrasa.
**Custo:** ~2h.

---

## ARQ-08 — `useTenant.js` em projeto TypeScript estrito

**Onde:** `src/hooks/useTenant.js` (+ `.d.ts` shadow).

Conversão direta de `.js` → `.ts`. Decisão é trivial mas requer leitura do código atual e tipagem dos retornos. Pendente porque não foi escopo da fase 1+2.
**Custo:** ~30min.

---

## Sumário priorizado

| ID | Custo | Risco se NÃO fizer | Recomendação |
|---|---|---|---|
| SEG-12 (rate limit chatApi) | 4-6h | Cost overrun LLM | **Fazer próxima sessão** |
| SOV-1 (saldo negativo) | 1h | Ld enganoso para endividados | **Fazer próxima sessão** |
| SOV-3-liquidez (opção 2) | 10min | Ld ignora horizonte de Tesouro | **Fazer próxima sessão** |
| SEG-01 (ADMIN_EMAILS) | 2h | Friction operacional, secret no git | **Fazer próxima sessão** |
| SOV-2 (unidade taxa) | 4h | Cálculo de spread errado em casos | Fila — exige migração de dados |
| SOV-7 (dividendos) | 3h | Sub-estima renda passiva | Fila |
| ARQ-08 (useTenant) | 30min | Ruído em type-check | Fila |

---

## Política

Quando você decidir um caminho para qualquer um desses, registre no
`docs/CHANGELOG.md` na sessão "Decisões de produto" antes de implementar.
Mudança de schema (SOV-2, SOV-7) precisa também de migração com dry-run
e backup do Firestore antes de execute.
