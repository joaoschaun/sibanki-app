# HANDOFF-0007 — Sync Fase 1.5: transferências, cartão e recorrentes na subcoleção

> Fecha o "divergente pra sempre": os caminhos de escrita de entries que a Fase 1
> (PUD-5, HANDOFF-0004) não cobriu — `addTransfer`, `addCardPurchase`,
> `importCardPurchases` e `generateEntriesFromRecurrents` — passam a gravar na
> subcoleção `users/{uid}/entries` para usuários migrados, replicando o padrão
> já testado do `addEntry`. Inclui o espelho server-side em `recorrentesService.js`
> (**código apenas — deploy FORA deste handoff**).
>
> Review reforçada (Dev+Security+QA): toca a vizinhança do god-node `updateUserDoc`.

---

## 0. Leia antes (auto-referências — obrigatório)

- `AGENTS.md` — contrato de engenharia (precedência sobre tudo); §4.4 (Cloud Functions), §12 (pipeline).
- `CLAUDE.md` — status do produto + mapa de versões (ignorar `public/`, `.claude/worktrees/`, `_legacy/`).
- `src/services/persistUserData.ts` — **o padrão a replicar já existe**: caminho
  migrado do `addEntry` (L493–540): `isEntriesMigrated` → `writeEntryToSubcollection`
  → `persistFinScoreSlim`. Leia também `modifyUserDoc` (L321) e os comentários PUD-1/PUD-5.
- `src/services/persistUserData.syncPhase1.test.ts` — a infra de mock path-aware que você vai estender.
- `src/utils/entryUtils.ts` — `mergeAllEntries` (merge 3-vias, dedup por id, subcoleção > inline > overflow).
- `docs/MIGRACAO-ENTRIES-SUBCOLECAO.md` — contexto da migração.

## Pré-flight (antes de escrever qualquer arquivo)

- Lock `.pipeline/EXECUTION.lock.md` em `free`; adquira antes de começar.
- `git status` **limpo** exceto por este handoff + `.pipeline/STATE.md` (escritos pelo Claude); se houver outro WIP → PARE e pergunte.
- Branch: `pipe/0007-sync-fase-1-5`, a partir da `main`.

---

## 1. Objetivo

Para usuários migrados (`entriesMigratedAt` presente), **nenhuma** mutação manual de
entries escreve mais no array inline — transferências, compras de cartão e recorrentes
passam a gravar na subcoleção, eliminando o estouro de 1MB e a divergência entre devices.

---

## 2. Escopo

**Dentro:**
- `addTransfer`, `addCardPurchase`, `importCardPurchases`, `generateEntriesFromRecurrents`
  em `persistUserData.ts` — caminho migrado via subcoleção; caminho legado preservado.
- Dedup de recorrentes por `rcTag` considerando **também** a subcoleção (crítico — ver §4.4).
- Espelho server-side: `functions/services/recorrentes/recorrentesService.js` (código apenas).
- Testes novos em `persistUserData.syncPhase1.test.ts`.
- Registro no `docs/CHANGELOG.md`.

**Fora (NÃO tocar):**
- `pagarMesada` — **cortado do escopo** pela deliberação: não cria Entry (só atualiza
  `filhos[]`); não há dual-write de entries a migrar. Não mexa.
- `addCardPurchasesV2` / `removeCardPurchaseV2` / `payCardCycle` — modelo novo de ciclos,
  grava `purchases` dentro de `cards` (não entries inline por fora do fluxo coberto). Não mexa.
- **Assinaturas públicas** das 4 funções — os callers (`Transactions.tsx` L242/L251,
  `Cards.tsx` L359/L836, `Recurring.tsx` L109) NÃO podem precisar de mudança.
  (Renomear parâmetro `_currentEntries` → `currentEntries` é permitido — não muda a assinatura.)
- `firestore.rules` — a regra de `users/{uid}/entries` já existe (L134–136). NÃO editar rules.
- **Deploy de qualquer Cloud Function** — a mudança em `recorrentesService.js` entra no
  repo, mas NÃO é deployada neste handoff (Regra de Ouro: deploy = aval do João, por ação).
- O quirk de leitura do overflow em `recorrentesService.js` (`overflowData.entries` como
  array — provavelmente nunca casa, pois cada doc de overflow É um entry): **conhecido e
  inofensivo** (rcTag nunca existe em entry de overflow/Pluggy). NÃO "consertar" de carona.

---

## 3. Arquivos-alvo (só estes)

- `src/services/persistUserData.ts` *(editar)*
- `src/services/persistUserData.syncPhase1.test.ts` *(editar — estender)*
- `functions/services/recorrentes/recorrentesService.js` *(editar)*
- `docs/CHANGELOG.md` *(editar — entrada da sessão)*
- `.pipeline/STATE.md` + `.pipeline/EXECUTION.lock.md` + `.pipeline/reports/HANDOFF-0007.report.md` *(protocolo do pipeline)*

> **Atenção:** Tocar qualquer arquivo fora desta lista resultará em reprovação imediata da execução.

---

## 4. Passos

Padrão geral (idêntico ao `addEntry` migrado): `const migrated = await isEntriesMigrated(uid);`
— se migrado, `writeEntryToSubcollection` por entry + `persistFinScoreSlim(uid, listaMescladaPós-mutação, extraPatch?)`;
se não, o caminho legado atual permanece **byte a byte**.

### 4.1 `addTransfer` (persistUserData.ts ~L549)

1. Renomeie `_currentEntries` → `currentEntries` (passa a ser usado).
2. Mantenha as validações e a construção de `despesa`/`receita` (ids `now` / `now + 1`) como estão.
3. Materialize os dois entries (`{ ...despesa, id: now }`, `{ ...receita, id: now + 1 }`).
4. Se `migrated`: grave os dois via `writeEntryToSubcollection` e depois
   `persistFinScoreSlim(uid, [...currentEntries, entradaDespesa, entradaReceita])`.
5. Senão: o `modifyUserDoc({ entries: { append: [...] } })` atual, inalterado.

### 4.2 `addCardPurchase` (~L725)

1. Renomeie `_currentEntries` → `currentEntries`.
2. Mantenha construção de `newPurchases`/`newEntries`/`updatedCards` como está.
3. Se `migrated`: grave cada entry de `newEntries` via `writeEntryToSubcollection`
   (**entries primeiro**), depois
   `persistFinScoreSlim(uid, [...currentEntries, ...newEntries], { cards: updatedCards })`
   — o `extraPatch` leva o `cards` atualizado no mesmo write enxuto.
4. Senão: o `modifyUserDoc({ patch: { cards }, entries: { append } })` atual, inalterado.

### 4.3 `importCardPurchases` (~L790)

Mesmo padrão do §4.2, com `allEntries`/`allPurchases`.

### 4.4 `generateEntriesFromRecurrents` (~L1224) — ATENÇÃO ao dedup

**Bug latente a evitar:** hoje o dedup por `rcTag` lê só inline+overflow. Depois deste
handoff, os gerados de usuário migrado vivem na subcoleção — sem incluí-la no dedup,
**cada clique em "Aplicar agora" duplicaria os lançamentos do mês**.

1. Crie o helper privado `loadSubcollectionEntries(uid)` ao lado de `loadInlineEntries`/
   `loadOverflowEntries`: `getDocs(collection(db, 'users', uid, 'entries'))` →
   `Entry[]` com `entryLocation: 'subcollection'`.
2. No início da função: leia o doc do usuário UMA vez (`getDoc`) para obter `entries`
   inline E `entriesMigratedAt` (substitui a chamada a `loadInlineEntries` — evita
   leitura dupla). Carregue overflow como hoje; carregue a subcoleção **somente se migrado**.
3. Monte a lista mesclada com `mergeAllEntries(inline, overflow, subcoleçãoOuVazio)`
   (import de `../utils/entryUtils`) e derive `existingTags` dela.
4. Geração de `toAdd`: inalterada.
5. Escrita:
   - Migrado: `writeEntryToSubcollection` por entry de `toAdd` +
     `persistFinScoreSlim(uid, [...mesclada, ...toAdd])`.
   - Não-migrado: **substitua** o `updateUserDoc(uid, { entries: newEntries })`
     (reescrita do array inteiro — race PUD-1) por
     `modifyUserDoc(uid, { entries: { append: toAdd } })`.
6. Retorno `toAdd.length` inalterado.

### 4.5 `functions/services/recorrentes/recorrentesService.js` — espelho server-side

1. Após ler o doc do usuário: `const migrated = Boolean(data.entriesMigratedAt);`.
2. Dedup: **se migrado**, leia também a subcoleção
   (`await userRef.collection("entries").get()`) e adicione os `rcTag` existentes a
   `existingTags`. (Não faça essa leitura para não-migrados — a função escaneia a base
   inteira no scheduled mensal.)
3. Escrita: **se migrado**, troque o `arrayUnion` por um `db.batch()` com
   `batch.set(userRef.collection("entries").doc(String(entry.id)), entry)` por item +
   `batch.commit()`. Não-migrado: `arrayUnion` atual, inalterado.
4. **Não** adicione recálculo de finScore (paridade com o comportamento atual).
5. Formatação: o arquivo está minificado/monolinha com encoding quebrado nos comentários;
   reescreva-o formatado (multi-linha) **sem alterar comportamento** fora do especificado.

### 4.6 Testes — `persistUserData.syncPhase1.test.ts`

1. Estenda o mock de `firebase/firestore` para ser path-aware também em
   `collection`/`getDocs`: `collection(db, 'users', uid, 'entries')` → docs da
   subcoleção fake (`subs[uid]`); `'entriesOverflow'` → vazio (como hoje).
   Os 4 testes existentes devem continuar verdes **sem alteração de expectativa**.
2. Novos casos (uid único por teste, padrão do arquivo):
   - `addTransfer` migrado: 2 docs na subcoleção (despesa+receita, `isTransfer: true`),
     `users[uid].entries` intocado, `finScore` numérico.
   - `addTransfer` não-migrado: 2 entries no inline, subcoleção vazia.
   - `addCardPurchase` migrado (2 parcelas): 2 docs na subcoleção, `users[uid].cards[0].purchases`
     com 2 itens, inline intocado.
   - `importCardPurchases` migrado (2 itens de 1 parcela): 2 docs na subcoleção, inline intocado.
   - `generateEntriesFromRecurrents` migrado: 1º run gera N>0 docs na subcoleção e retorna N;
     **2º run retorna 0** (dedup por `rcTag` lendo a subcoleção).
   - `generateEntriesFromRecurrents` não-migrado: com 1 entry inline pré-existente,
     gera por append — o pré-existente permanece (não é reescrita do array).

### 4.7 `docs/CHANGELOG.md`

Entrada da sessão (Keep a Changelog, seção do dia): "Sync Fase 1.5 (HANDOFF-0007):
addTransfer/addCardPurchase/importCardPurchases/generateEntriesFromRecurrents na
subcoleção para migrados; espelho em recorrentesService (código; deploy pendente de aval)."

---

## 5. Critério de aceite (ligado a checagem)

- [ ] Nenhum arquivo fora do §3 alterado.
- [ ] `npm run gate` verde (tsc + test:unit incl. ratchet; smoke = watch-item).
- [ ] Os 4 testes pré-existentes de `syncPhase1.test.ts` passam **sem mudança de expectativa**.
- [ ] Os 6 novos casos do §4.6 existem e passam.
- [ ] Assinaturas exportadas das 4 funções inalteradas (callers não tocados: `Transactions.tsx`, `Cards.tsx`, `Recurring.tsx`).
- [ ] Caminho não-migrado de `addTransfer`/`addCardPurchase`/`importCardPurchases` byte a byte igual (diff só adiciona o branch migrado).
- [ ] `generateEntriesFromRecurrents` não contém mais `updateUserDoc(uid, { entries: ... })` (reescrita total).
- [ ] `recorrentesService.js`: caminho não-migrado continua via `arrayUnion`; migrado via batch na subcoleção; sem mudança em `recorrentesController.js`.

---

## 6. Gate de risco

- **Toca dinheiro, regra Firestore ou config de deploy?** NÃO (dados próprios do usuário;
  rules inalteradas; nenhum deploy).
- **PORÉM:** o efeito em produção de `recorrentesService.js` só existe após
  `firebase deploy --only functions:aplicarRecorrentesDoMes,functions:aplicarRecorrentesManual`
  — que **exige aval explícito do João, por ação, fora deste handoff**.
- Review reforçada Dev+Security+QA (vizinhança do god-node `updateUserDoc`).

---

## 7. Instrução de bloqueio

Se qualquer passo parecer ambíguo, se o código no disco divergir das linhas citadas,
ou se o mock dos testes não se estender de forma limpa, **PARE imediatamente e registre
a dúvida no report** — nunca improvise. Em conflito com `AGENTS.md`, o `AGENTS.md` vence.
