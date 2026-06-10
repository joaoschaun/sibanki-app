---
pipeline_version: "1.0"
status: COMPLETED
task_id: "20260607-009"
priority: "high"
created_at: "2026-06-07T21:20:00-03:00"
updated_at: "2026-06-08T09:25:00-03:00"
assigned_to: "Claude Cowork"
---

# 🔄 Sibanki AI Pipeline — Fila de Tarefas

---

## 📋 TAREFA ATUAL

### Tarefa `20260607-009` — Região Cloud Functions, Lançamentos por IA e Investimentos Inteligentes 🔄

- **Status:** `WAITING_CURSOR`
- **Prioridade:** Alta
- **Atribuída a:** Cursor
- **Criada em:** 2026-06-07T21:20:00-03:00
- **Descrição:** Executar o plano de implementação aprovado para alinhar as regiões das Cloud Functions, aprimorar o fluxo de lançamentos por IA com seleção de contas, e implementar investimentos inteligentes com quantidade/preço de compra e autocomplete de ticker.
- **Plano de Referência:** [implementation_plan.md](file:///C:/Users/jscha/.gemini/antigravity-ide/brain/47c1bdb1-59b3-42da-9f9b-38cffa022d5a/implementation_plan.md)
- **Checklist de Tarefas:** [task.md](file:///C:/Users/jscha/.gemini/antigravity-ide/brain/47c1bdb1-59b3-42da-9f9b-38cffa022d5a/task.md)

---

## ✅ RESULTADO (Claude Cowork — 08/06/2026)

**Stream 1 — Regiões Cloud Functions (frontend)**
- `OpenFinanceConnect.tsx`: substituído `functions` (fnsUS) por `fnsBR` nas 3 chamadas Pluggy (`pluggyCreateConnectToken`, `registrarOpenBanking`, `pluggySyncAccounts`). AppContext já usava `fnsBR` desde sessão anterior.
- Callsites de IA/BRAPI ficam em `fnsUS` (correto per arquitetura).

**Stream 2 — Conta no modal de confirmação IA**
- `Transactions.tsx`: adicionado estado `aiAccount`; preenchido com `entry.account` extraído pela IA; dropdown `<select>` no modal de confirmação (OCR/Voz) permite ajustar a conta antes de confirmar; `confirmAiEntry` aplica a conta selecionada.

**Stream 3 — Investimentos inteligentes**
- `brapi.ts`: adicionada função `searchB3Tickers(query)` via callable `brapiSearch`.
- `Growth.tsx`: estados `formQtd`, `formPrecoCompra`, `tickerSuggestions`; autocomplete com debounce 350ms para tipos RV (Ações/FIIs/ETFs); seleção de ticker busca preço atual e preenche `formPrecoCompra`; campos qtd × preço → atualiza valor automaticamente; qtd/precoCompra salvos no Firestore; listagem exibe "X cotas · R$ Y/un".

**tsc --noEmit**: zero erros. **118/118 Vitest**: passando.

---

## ✅ VERIFICAÇÃO DO ANTIGRAVITY

### Tarefa `20260414-008` — Resultado: APROVADO ✅

**Verificado em:** 2026-04-14T15:00:00-03:00

**O que foi verificado:**

- `functions/services/sentinel/cardSuggestionService.js` — criado corretamente. Contém `determineIntents`, `getDaysUntilClose`, `scoreCard` e `suggestBestCardForLocation`. Lógica isolada no backend, `module.exports` correto. Score mínimo de 4 para evitar ruído implementado conforme spec.

- `functions/services/sentinel/sentinelaGeoService.js` — import do `cardSuggestionService` presente na linha 8. Assinatura de `runSentinelaGeo` atualizada para `(lat, lng, snapshot = {}, sendFn = null, cards = [])`. Append do bloco `💳 *Sugestão Tática*` com `daysToClose` e `reason` implementado corretamente. Guard `if (message && bestCardInfo)` evita append em cenários sem alerta.

- `functions/index.js` — `sentinelaGeoCheck` lê `users/{uid}.cards` direto do Firestore antes de chamar `runSentinelaGeo`. Variável `cards` passa array vazio como fallback. Nenhum dado sensível exposto no payload do cliente. `userSnap.exists` verificado antes de `data()`.

- Todos os critérios de aceitação atendidos:
  - [x] `cardSuggestionService.js` isolado no backend
  - [x] Cards lidos em tempo real no Firestore sem trafegar pelo cliente
  - [x] Append com `daysToClose` e razão do benefício
  - [x] `tsc --noEmit` exit 0 (reportado pelo Cursor)
  - [x] Deploy não realizado (aguardando João)

**Próximos passos sugeridos:**
1. **[PENDENTE HUMANO]** Deploy: `firebase deploy --only "functions:sentinelaGeoCheck,functions:aplicarRecorrentesDoMes"`
2. Testar manualmente o Sentinela Geo com coordenadas de um shopping ou supermercado (e agora aeroportos e postos de gasolina) + cartão com `cardBenefits` cadastrado.
3. Tarefa de backlog: wire `validators.ts` ao `persistUserData.ts` — `CONCLUÍDA` (já verificado que o `modifyUserDoc` usa as validações).
4. Considerar adicionar `airport`, `gas_station` ao `determineIntents` — `CONCLUÍDA` (adicionado na sessão do Antigravity).

O pipeline técnico encontra-se limpo. Nenhuma pendência técnica crítica em aberto no momento.

---

## 📜 HISTÓRICO DE TAREFAS

| task_id | data | resumo | status final |
|---------|------|--------|-------------|
| 20260413-005 | 14/04/2026 | TS cleanup — 28 erros eliminados, tsc exit 0 | ✅ COMPLETED |
| 20260414-006 | 14/04/2026 | Cloud Function recorrentes | ✅ COMPLETED |
| 20260414-007 | 14/04/2026 | CreditObligation CRUD - modal de cadastro, lista, marking | ✅ COMPLETED |
| 20260414-008 | 14/04/2026 | Sentinela Geo com sugestão tática de cartão por cenário + ciclo | ✅ COMPLETED |
| 20260607-009 | 08/06/2026 | Regiões CF frontend, conta no modal IA, investimentos inteligentes (qtd/preço/autocomplete) | ✅ COMPLETED |