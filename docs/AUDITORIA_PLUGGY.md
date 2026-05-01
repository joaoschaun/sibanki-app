# Auditoria: Pluggy (Open Finance)

> Gerada em 26/04/2026. Cobre `functions/services/pluggy/pluggyService.js` (49
> linhas) e `functions/services/pluggy/pluggySyncService.js` (~600 linhas com fixes).
>
> Pluggy puxa contas, transações, cartões, investimentos e empréstimos reais do
> usuário. Tempo de execução: até 540s. Memória: 1GB. Ou seja: **muita coisa
> pode dar errado em silêncio.**

---

## Achados

### PLG-1 — Race condition entre `userRef.get()` e `userRef.set()` (CRÍTICO) — FECHADO

**Onde:** `pluggySyncService.js`. Antes:
1. Linha 331: `const snap = await userRef.get();` lê estado.
2. Linhas 360–500: dezenas de modificações em arrays locais (entries, accounts,
   cards, investments, creditAccounts, creditObligations).
3. Linha 544: `await userRef.set(payload, { merge: true });` escreve TUDO.

**Entre as linhas 331 e 544 podem passar minutos.** Com 90 dias de lookback,
N contas, paginação Pluggy. Se o usuário adicionar um lançamento manual no
front (via `addEntry`) durante esse intervalo, o lançamento **é PERDIDO** —
o `payload.entries` foi montado a partir do snapshot inicial e substitui o
estado atualizado.

**Fix aplicado:** write final agora roda em `db.runTransaction`:
- Re-lê `entries` do Firestore.
- Identifica manuais novos (sem `pluggyTransactionId`) que não estavam no
  snapshot inicial.
- Mescla `[novosManuais, ...payload.entries]` antes de escrever.
- Outros campos (accounts, balances, cards) seguem com `merge: true` — race
  é teórica mas rara para esses (usuário não cria conta manual em paralelo a sync).

---

### PLG-2 — Sem lock anti-concurrent (CRÍTICO) — FECHADO

**Onde:** `pluggySyncService.js`. Sem proteção: duplo clique em "Sincronizar"
ou retry de offline dispara 2 syncs paralelas. Cada uma puxa sua versão
de `entries`, modifica localmente, escreve. A segunda sobrescreve a primeira
silenciosamente — lançamentos achados pela primeira mas não pela segunda
somem.

**Fix aplicado:** lock leve via subcoleção `users/{uid}/_syncLocks/pluggy`.
Aquisição em `runTransaction` com TTL de 15min (margem para o timeout 540s).
Se sync já em andamento, retorna `aborted` com mensagem clara.

Regras Firestore atualizadas: subcoleção `_syncLocks` tem leitura pelo dono
(para UI mostrar "sincronizando"), mas escrita exclusiva via Admin SDK.

---

### PLG-3 — `fetchAllTransactions` sem cap externo (ALTO) — PENDÊNCIA

**Onde:** linha 405. `client.fetchAllTransactions(acc.id, { from, to })` —
o SDK Pluggy pagina internamente. Para um item com longo histórico (anos),
puxa dezenas de milhares de transações. Mesmo com filtro de 90 dias,
contas com volume alto (Nubank de empresa, p.ex.) podem trazer 1.000+ tx/conta.

`MAX_NEW_TRANSACTIONS_PER_SYNC = 1500` limita o que VAI para o Firestore,
mas não o que é puxado da API Pluggy — quota e tempo continuam em risco.

**Fix recomendado:** usar `client.fetchTransactions(...)` com `pageSize`
explícito + paginação manual com early-return quando atingir
`MAX_NEW_TRANSACTIONS_PER_SYNC`.

**Custo:** ~1h.

---

### PLG-4 — `Math.abs(tx.amount)` sem validar consistência com `tx.type` (ALTO) — PENDÊNCIA

**Onde:** linha 102. `mapTransactionToEntry` faz:
```js
const type = tx.type === 'CREDIT' ? 'receita' : 'despesa';
const value = round2(Math.abs(Number(tx.amount) || 0));
```

`Math.abs` perde o sinal. Se Pluggy retornar `type=CREDIT, amount=-100`
(inconsistência da fonte), entry vira `receita 100` — receita errada.
Risco maior em bancos com formatação não-padrão.

**Fix recomendado:** se `tx.type === 'CREDIT' && tx.amount < 0` ou
inverso, logar warning e descartar/marcar tx como anômala.

**Custo:** ~30min.

---

### PLG-5 — `pickUniqueLabel` colide para múltiplas contas com mesmo `marketingName` (ALTO) — PENDÊNCIA

**Onde:** linhas 42–56. Se o usuário tem 2 Itaú (corrente + poupança) e nenhum
ainda tem mapping em `meta`, ambos viram "Itaú (Conta · Open Finance)" e
"Itaú (Conta · Open Finance) (1)" — sequencial. OK na primeira sync, mas
se um item for revogado e re-conectado, a label pode ser reciclada
incorretamente para a outra conta (perdendo histórico de saldo da label).

**Fix recomendado:** usar últimos 4 dígitos do `accountNumber` no label
quando disponível.

**Custo:** ~1h.

---

### PLG-7 — Edições manuais em obligations Pluggy são perdidas (MÉDIO) — PENDÊNCIA

**Onde:** linha 477. `creditObligations = [...manualObl, ...pluggyObl]`. Se
o usuário marcar uma obrigação Pluggy como "paga" manualmente, na próxima
sync o `pluggyObl` é regenerado da Pluggy e a marcação some.

**Fix recomendado:** preservar campo `userOverrides: { status: 'paga' }`
em obligations Pluggy. Sync respeita o override.

**Custo:** ~2h.

---

### PLG-6 — `stableNumericId` modulo 2 bilhões (MÉDIO) — PENDÊNCIA

**Onde:** linha 76. Hash 32-bit modulo 2.000.000.000 → colisão prática
quando user tem milhares de transações Pluggy. Com `birthday paradox`,
~50% chance de colisão começa em ~50.000 itens.

Para um usuário comum com Open Finance há 6 meses, dificilmente atinge.
Para empresário/freela com volume alto, possível.

**Fix recomendado:** mesmo destino de PUD-3 — migrar Entry.id para string
UUID. Ampla refator de tipo.

**Custo:** alto (~1 dia).

---

### PLG-8 — `console.error` em vez de `logError` (BAIXO) — PENDÊNCIA

**Onde:** linhas 356, 414, 452, 464. Sem logger estruturado, fica difícil
filtrar erros de sync no Cloud Logging.

**Fix:** trocar por `logError("pluggySync", "stage", e, { uid, itemId })`.

**Custo:** 30min.

---

### PLG-9 — Array `entries` cresce sem teto além do trim Pluggy (BAIXO) — PENDÊNCIA

`trimPluggyEntriesToLimit` (linha 419) arquiva entries Pluggy excedentes para
`entriesOverflow`. Mas o `entries` array do doc principal pode ainda ter
muitos manuais. Se o usuário tem 5+ anos de uso manual do app, o doc passa
de 1MB e o write falha com erro do Firestore.

**Fix:** estender o trim para entries manuais também, ou migrar de vez
para subcoleção `entries` (já preparada).

**Custo:** alto, parte da migração de entries para subcoleção.

---

## Resumo

| ID | Severidade | Status |
|---|---|---|
| PLG-1 | CRÍTICO | ✅ Fechado nesta sessão (write final em runTransaction) |
| PLG-2 | CRÍTICO | ✅ Fechado nesta sessão (lock anti-concurrent) |
| PLG-3 | ALTO | Pendência (~1h) |
| PLG-4 | ALTO | Pendência (~30min) |
| PLG-5 | ALTO | Pendência (~1h) |
| PLG-6 | MÉDIO | Pendência (refator amplo) |
| PLG-7 | MÉDIO | Pendência (~2h) |
| PLG-8 | BAIXO | Pendência (30min) |
| PLG-9 | BAIXO | Pendência (refator) |

**Risco residual:** PLG-3 e PLG-4 são os próximos a fechar. PLG-3 reduz
custo Pluggy (cap de fetch), PLG-4 evita receita/despesa invertida.

---

## Notas operacionais

1. **Após deploy:** se houver locks órfãos em produção (sync anterior travada
   sem TTL), o novo TTL de 15min vai destravar automaticamente. Em produção
   já existente, considere uma limpeza inicial:
   ```js
   // Cloud Shell:
   db.collectionGroup('_syncLocks').get().then(s => s.docs.forEach(d => d.ref.delete()));
   ```

2. **UI sugerida:** mostrar indicador "Sincronizando..." quando
   `users/{uid}/_syncLocks/pluggy` existir. Cliente já tem permissão de
   leitura na regra nova.
