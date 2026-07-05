# Auditoria: Sentinel (Geo + Weekly)

> Gerada em 26/04/2026. Cobre `functions/services/sentinel/sentinelaGeoService.js`
> (~340 linhas) e `functions/services/sentinel/sentinelaWeeklyService.js`
> (~390 linhas).
>
> Sentinel processa PII (geolocation, WhatsApp phone) e dispara mensagens
> proativas. LGPD-relevante.

---

## Achados

### SEW-2 — `calcDaysOfFreedom`/`calcSpreadGap` duplicados de sovereigntyEngine.ts (CRÍTICO) — PENDÊNCIA

**Onde:** `sentinelaWeeklyService.js:19-59`. Fórmulas simplificadas duplicam
`src/utils/sovereigntyEngine.ts`. **Resultados divergem.**

Exemplo concreto: o fix SOV-1 (saldo negativo subtrai) já foi aplicado no
front-end. **Mas no `sentinelaWeeklyService` ainda usa `Object.values().reduce`
sem subtrair negativos** — usuário endividado vê Ld inflado no WhatsApp
semanal e Ld real (menor) no dashboard.

Outros pontos divergentes:
- Engine considera `monthlyPassiveIncome` (juros + dividendos); o backend não.
- Engine restringe lista de tipos líquidos D+30; o backend usa `inv.liquido !== false` (campo que nem existe).
- Engine usa CDI dinâmico via `useMarketRates`; backend tem `CDI_MONTHLY = 0.0107` hardcoded.

**Fix correto:** portar `sovereigntyEngine` para `functions/utils/sovereignty.js`
(versão CommonJS) e reusar em ambos os lados. Refator de meio porte (~3h).

**Risco:** mensagem semanal entrega número que contradiz dashboard, minando
confiança no produto.

---

### SEN-1 — Fetch Overpass sem timeout (ALTO) — FECHADO

**Antes:** `queryOverpass` (linha 36) sem `signal`. Overpass API gratuita é
lenta em horário de pico — Cloud Function podia pendurar até 540s.

**Fix aplicado:** `AbortSignal.timeout(12_000)` + validação prévia de
coordenadas via novo `isValidCoord(lat, lng)` (lat ∈ [-90, 90], lng ∈ [-180, 180]).

---

### SEN-2 — Coordenadas sem validação (MÉDIO) — FECHADO

**Antes:** `lat`/`lng` passavam direto para o template Overpass. Valores
inválidos (NaN, fora de range) custavam round-trip e poluíam logs.

**Fix aplicado:** `isValidCoord` na entrada do `queryOverpass`. Lança erro
explícito antes do fetch.

---

### SEW-1 — Filtro `type !== "transferencia"` é dead code (ALTO) — FECHADO

**Antes:** `sentinelaWeeklyService.js:31`.
```js
.filter((e) => e.type === "despesa" && (e.date || "") >= cutoff && e.type !== "transferencia")
```
Cláusula `e.type !== "transferencia"` é redundante (já filtrou por `=== "despesa"`).
Mas o **bug real** é que entries com `e.isTransfer === true` (TransferForm grava
`type: "despesa"`, `isTransfer: true`) **passavam** — inflando burn rate e
deflacionando Ld.

**Fix aplicado:** filtro corrigido para `e.isTransfer !== true`.

---

### SEW-3 — Query `where(..., "!=", "")` ignora campo undefined (ALTO) — FECHADO

**Antes:** `.where("whatsappPhone", "!=", "")` no Firestore.

Usuários antigos cujo doc foi criado antes do campo existir não casam (Firestore
`!=` exige existência do campo). Sentinel semanal não cobria esses usuários.

**Fix aplicado:** trocado para `where("whatsappPhone", ">", "")` + filtro
defensivo pós-get exigindo string com `≥ 8 chars`.

---

### SEW-5 — `phone.slice(-4)` em logs (MÉDIO) — FECHADO

**Antes:** `logEvent("sentinelaWeekly_user", { ..., phone: phone.slice(-4) })`.

Mesmo 4 dígitos finais são PII parcial. LGPD recomenda evitar.

**Fix aplicado:** removido. Log mantém `hasPhone: true` apenas.

---

### SEW-4 — Sem rate limit per-WhatsApp na blast semanal (MÉDIO) — PENDÊNCIA

**Onde:** `runSentinelaWeekly` envia em batches de 10 com `setTimeout(1000)`
entre batches. Para base 5k+ usuários, isso são 500 batches × 1s = 8min
mínimo. Meta WhatsApp Cloud API tem rate limits que podem ser estourados
em pico.

**Fix recomendado:** usar fila tipada (Pub/Sub) com worker rate-limited
(ex: 80 mensagens/segundo) em vez de loop síncrono.

**Custo:** ~4h (Pub/Sub setup).

---

### SEW-6 — `CDI_MONTHLY = 0.0107` hardcoded (BAIXO) — PENDÊNCIA

**Onde:** linha 17. Valor fixo defasa naturalmente. Já existe
`fixedIncomeService.getFixedIncomeCatalog()` que pega Selic atual do BCB.

**Fix:** importar e usar valor real ao iniciar a sync semanal.

**Custo:** 30min.

---

### SEN-3 — Geolocation enviada para Overpass sem audit trail (LGPD) (MÉDIO) — PENDÊNCIA

**Onde:** `sentinelaGeoService.js`. As coordenadas saem para `overpass-api.de`
(servidor terceiro). Não logamos consentimento nem o evento em
`auditLogs/{uid}/`.

**Fix recomendado:** ao chamar `runSentinelaGeo`, gravar:
```js
auditLogs.add({
  uid, action: 'sentinela_geo_query',
  // sem lat/lng exatos no log — só cidade/UF inferidos do CEP do usuário
  scenario: result.scenario, at: serverTimestamp()
});
```

**Custo:** 1h.

---

### SEN-4 — `detectScenario` ordem fixa pode confundir locais multi-categoria (BAIXO) — PENDÊNCIA

**Onde:** `sentinelaGeoService.js:55-87`. Ordem hardcoded: concessionária →
shopping → eletrônicos → joalheria → ... Em mall que tem concessionária
dentro, marca como `car_dealer`.

**Fix:** scoring por número de matches em vez de "primeiro match ganha".

**Custo:** 1h.

---

## Resumo

| ID | Severidade | Status |
|---|---|---|
| SEW-2 | CRÍTICO | Pendência (refator: portar sovereigntyEngine para backend) |
| SEN-1 | ALTO | ✅ Fechado |
| SEW-1 | ALTO | ✅ Fechado |
| SEW-3 | ALTO | ✅ Fechado |
| SEN-2 | MÉDIO | ✅ Fechado |
| SEW-5 | MÉDIO | ✅ Fechado |
| SEW-4 | MÉDIO | Pendência (Pub/Sub queue) |
| SEN-3 | MÉDIO | Pendência (LGPD audit log) |
| SEW-6 | BAIXO | Pendência (CDI dinâmico) |
| SEN-4 | BAIXO | Pendência (scoring) |

**Risco residual mais alto: SEW-2.** Usuário pode reportar "Ld no WhatsApp não bate
com o do app" — se isso vazar como bug, queima credibilidade. Recomendo fechar
na próxima sessão antes de qualquer growth de WhatsApp.

---

## Recomendação operacional

1. Antes de deployar SEW-1, considerar que usuários hoje recebem Ld inflado
   pela inclusão de transfers — depois do fix, **valor cai**. Comunicar via
   release note ou mensagem inline.

2. SEW-3 vai começar a incluir usuários antigos no envio. Verificar se
   há usuários com `whatsappPhone` definido mas que NÃO querem receber
   (campo de opt-out pode estar faltando) antes de scheduler virar.
