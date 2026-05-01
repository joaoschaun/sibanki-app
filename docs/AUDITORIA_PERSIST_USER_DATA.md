# Auditoria: `src/services/persistUserData.ts`

> Gerada em 26/04/2026 ao final da extensão pós-fundação. Cobre os 753 linhas
> que centralizam toda a escrita Firestore do app (entries, cards, goals,
> investments, contas, metas, etc.).
>
> 9 achados (1 crítico, 4 altos, 3 médios, 1 baixo). Mesma escala da auditoria
> sênior original.

---

## Achados

### PUD-1 — Race condition no padrão "load → modify → write" (CRÍTICO) — PARCIALMENTE FECHADO em 26/04/2026

**Onde:** linhas 222, 294, 329, 351, 461, 527, 580 (e correlatos).

**Padrão recorrente:**
```ts
const inline = await loadInlineEntries(uid);
await updateUserDoc(uid, { entries: [...inline, newEntry] });
```

`loadInlineEntries` lê o doc do Firestore. Entre esse `await` e o
`updateUserDoc`, outro write (do mesmo usuário em outra aba ou de um
listener Open Finance) pode mudar o doc — e o `[...inline, newEntry]`
substitui o estado fresco pelo estado stale.

**Por que `updateUserDoc` não salva:** a transaction interna lê `current`,
mas faz `merged = { ...current, ...payload }` — `payload.entries` já é o
array stale + o novo. O spread sobrescreve `current.entries` em vez de
deduplicar/concatenar.

**Cenário concreto:**
1. Aba A lê entries = [E1, E2].
2. Aba B lê entries = [E1, E2], adiciona E3 → grava [E1, E2, E3].
3. Aba A adiciona E4 → grava [E1, E2, E4]. **E3 perdido.**

**Fix correto:** mover o "load entries" para DENTRO da transaction em
`updateUserDoc`, e aceitar **append/upsert** específicos em vez de
"set entries inteiro". Refator de meio porte (~6h).

**Mitigação atual:** debounce de 1.5s em memória (linha 110) reduz colisão
de duplo-clique no MESMO tab. NÃO ajuda cross-tab.

**Fix nesta sessão (parcial):**
- ✅ Helper novo `modifyUserDoc(uid, mod)` aplica append/update/remove em
  `entries` DENTRO da `runTransaction` (lê estado fresco do Firestore antes
  de aplicar a operação).
- ✅ Refatorados para usar `modifyUserDoc`: `addEntry`, `addTransfer`,
  `updateEntry`, `deleteEntry`, `addCardPurchase`, `importCardPurchases`,
  `deleteCardPurchase` (7 paths principais).
- ⚠️ **Pendente** (próxima sessão): mesma migração para os 5 paths menos
  frequentes ainda usando `loadInlineEntries`:
    - `renameAccount` (linha ~951) — rename de conta propaga em entries
    - `aplicarRecorrentes` (linha ~1013) — aplica recorrentes mensais
    - `comprarQuarentena` (linha ~1136) — comprar item da quarentena
    - `pagarFatura` (linha ~1426) — pagamento de fatura
    - `estornarPagamentoFatura` (linha ~1468) — estorno

**Risco residual:** os 5 paths não-migrados são chamados com frequência
menor (rename de conta, ações mensais, ações pontuais de fatura). Probabilidade
de race em uso real é baixa, mas não-zero.

---

### PUD-2 — `addAccount` aceita nome duplicado por case (ALTO)

**Onde:** linha 367.

```ts
if (!nameTrim || currentAccounts.includes(nameTrim)) return;
```

Compara case-sensitive. "Itaú" e "ITAÚ" passam. "Conta corrente" e
"conta corrente" passam.

**Fix nesta sessão:** APLICADO — comparação case-insensitive normalizada.

---

### PUD-3 — `id = Date.now()` em adições (ALTO)

**Onde:** linhas 213, 399, 421 (+ `purchaseId + p`), 487, 509, 635.

Em loops de parcelas e em testes/scripts, IDs colidem.

`addGoal` linha 594 usa `crypto.randomUUID()` corretamente — modelo a seguir.

**Fix correto:** trocar todos os `Date.now()` para `crypto.randomUUID()` no
ID novo. Mas **muda o tipo** (`number` → `string`), o que quebra:
- `Entry.id: number` (em type)
- Comparações `e.id === id` em vários lugares.

**Fix nesta sessão:** **NÃO aplicado** — refator de tipo afeta dezenas de
arquivos. Documentado como pendência. Quick mitigação: trocar
`Date.now()` por `Date.now() + Math.random() * 100` para reduzir colisão
sem mudar tipo (já feito em `importCardPurchases` linha 487).

---

### PUD-4 — Cast `as any` em `updateEntry`/`deleteEntry` (ALTO)

**Onde:** linha 325, 347.

```ts
if ((target as any).entryLocation === 'subcollection') { ... }
```

Type narrowing escondido. Lint vai apontar quando ESLint rodar.

**Fix nesta sessão:** APLICADO — adiciona `entryLocation` opcional ao tipo
`Entry` e remove o cast.

---

### PUD-5 — Debounce in-memory por aba (ALTO)

**Onde:** linhas 109-193.

`updateUserDocDebouncing` é variável de módulo, **por aba do browser**. Se
o usuário abrir 2 abas, cada uma tem seu próprio debounce. Cross-tab
double-write passa.

**Fix correto:** usar Firestore como source-of-truth para debounce
(write em `users/{uid}/_locks/update` com TTL) — exige UI handling para
"aguarde alguns segundos".

**Fix nesta sessão:** documentado, não aplicado (UX delicada).

---

### PUD-6 — IDs mistos: `string` vs `number` (MÉDIO)

**Onde:** type system.

- `Goal.id: string` (UUID)
- `Entry.id: number`, `Card.id: number`, `Investment.id: number`

Inconsistência force converters em vários lugares (`String(g.id)` na
linha 608). Difícil para type-narrowing e para Firestore queries.

**Fix correto:** padronizar tudo em `string` (UUID). Refator de tipo
amplo. Mesma família de PUD-3.

**Fix nesta sessão:** documentado, não aplicado.

---

### PUD-7 — `updateAccountBalance` aceita conta inexistente (MÉDIO)

**Onde:** linha 698-709.

Valida saldo mas NÃO checa que `accountName` está em `accounts`. Saldo
órfão fica em `accountBalances` sem aparecer na UI.

**Fix nesta sessão:** APLICADO — passa `currentAccounts` e valida que o
nome existe.

---

### PUD-8 — `importCardPurchases` não valida cada item (MÉDIO)

**Onde:** linha 469-529.

Itera `items` e gera entries SEM chamar `validateCardPurchase` por item.
Se um CSV tiver linha com value negativo ou date inválido, passa direto.

**Fix nesta sessão:** documentado, não aplicado (mexe em CSV importer
que já tem outros caminhos com validação no front).

---

### PUD-9 — `addCardPurchase` não verifica que cardId ainda existe na hora do write (BAIXO)

**Onde:** linha 415-462.

`card = currentCards.find(...)` é feito em linha 415, mas o write em 462
usa `currentCards.map(...)` (do parâmetro). Se o cartão foi deletado
em outra aba entre o `find` e o `map`, o cartão NÃO entra no write
final — mas `newPurchases` foi gerado mesmo assim. Bug raro mas existe.

**Fix nesta sessão:** documentado.

---

## O que foi APLICADO nesta sessão

| ID | Arquivo | O que mudou |
|---|---|---|
| PUD-1 (parcial) | `persistUserData.ts:modifyUserDoc` (novo) + 7 paths refatorados | Helper atômico para mutações em arrays + migração de `addEntry`, `addTransfer`, `updateEntry`, `deleteEntry`, `addCardPurchase`, `importCardPurchases`, `deleteCardPurchase`. 5 paths menores ficam para próxima. |
| PUD-2 | `persistUserData.ts:addAccount` | Comparação case-insensitive normalizada (toLowerCase + trim). |
| PUD-4 | `persistUserData.ts:updateEntry/deleteEntry` + `types/userData.ts:Entry` | Adiciona `entryLocation?` ao type (incluindo `'subcollection'`), remove `as any`. |
| PUD-7 | `persistUserData.ts:updateAccountBalance` | Aceita `currentAccounts` e valida nome existente. |

Os 5 restantes (PUD-3, PUD-5, PUD-6, PUD-8, PUD-9) + PUD-1 nas funções
menores ficam para próxima sessão de execução.
