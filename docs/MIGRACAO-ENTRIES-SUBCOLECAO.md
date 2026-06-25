# PLANO DE MIGRAÇÃO — `entries[]` inline → subcoleção (Ação #10 da Análise 360)

> Status: **PLANO** — nenhuma execução sem aprovação do João (regra de ouro
> AGENTS.md: dados de produção). Dry-run obrigatório antes de `--execute`.

## 1. Problema

`users/{uid}` guarda `entries[]` (e cards/investments/etc.) como arrays num
único documento. Limites e sintomas:

- **1 MB/documento (limite duro do Firestore).** Um usuário com Open Finance
  sincronizando 12+ meses de extrato chega lá. `entriesOverflow` mitiga
  (arquivamento), mas a escrita inline continua crescendo.
- **Cada update reescreve o documento inteiro** — custo de banda, latência e
  janela de race entre dispositivos (o debounce de `updateUserDoc` protege uma
  sessão, não duas abertas).
- **Sem paginação por query** — o app baixa tudo sempre.

## 2. Estado-alvo

```
users/{uid}                  → metadados, saldos, configurações (SEM entries[])
users/{uid}/entries/{id}     → 1 doc por lançamento (id = entry.id atual)
users/{uid}/entriesOverflow  → absorvida pela nova subcoleção (merge)
```

Leitura no app: `query(collection(db,'users',uid,'entries'), orderBy('date','desc'), limit(N))`
+ paginação sob demanda (substitui o limit(1000) do overflow).

## 3. Fases

### Fase 0 — Pré-requisitos (1 sessão)
- [ ] Regra explícita em `firestore.rules` para `users/{uid}/entries/{id}`
      (owner read/write + `isValidEntry` schema validation).
- [ ] Índice composto `entries (date desc)` se o console exigir.
- [ ] Teto de segurança imediato no modelo atual: ao gravar, se
      `entries.length > 800`, mover os mais antigos para overflow na MESMA
      transação (estanca o crescimento enquanto a migração não roda).

### Fase 1 — Escrita dupla (1–2 sessões)
- [ ] `persistUserData.addEntry/updateEntry/deleteEntry` passam a gravar nos
      DOIS lugares (array inline + subcoleção), com o mesmo `id`.
- [ ] Flag `users/{uid}.entriesMigration = 'dual-write'`.
- [ ] Telemetria de divergência (contagem inline vs subcoleção) em DEV.

### Fase 2 — Backfill (script, executado pelo João)
- [ ] `scripts/migrate-entries-subcollection.mjs` (Admin SDK):
      para cada usuário → batch de 500 → copia `entries[]` + `entriesOverflow`
      para `users/{uid}/entries/{id}` (idempotente por id) → marca
      `entriesMigration = 'backfilled'`.
- [ ] `--dry-run` default; `--execute` só manual (matriz AGENTS.md: migração
      é do João/Antigravity).
- [ ] Validação: amostra de 20 usuários com soma de `value` e contagem batendo.

### Fase 3 — Leitura nova (1 sessão)
- [ ] `useFinancialData` troca o doc-array por
      `onSnapshot(query(entries, orderBy date desc, limit 1000))` quando
      `entriesMigration === 'backfilled'` (feature-flag por usuário → rollout
      gradual, rollback trivial).
- [ ] Optimistic entries do AppContext continuam funcionando (id local → doc).

### Fase 4 — Corte (após 2 semanas estáveis)
- [ ] Parar a escrita no array inline; remover `entries[]` do documento
      (update com `FieldValue.delete()`), `entriesMigration = 'done'`.
- [ ] Remover código legado de overflow.

## 4. Rollback

- Fase 1–2: desligar dual-write (flag) — array inline segue sendo a fonte.
- Fase 3: virar a flag do usuário de volta para `dual-write` (leitura antiga).
- Fase 4 é o único ponto sem volta — por isso só após 2 semanas de métricas.

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Duplicação de leituras durante dual-write | janela curta; custo aceitável |
| Divergência inline × subcoleção | telemetria de contagem + backfill idempotente |
| Custo de reads (1 doc → N docs) | limit + paginação; cache offline do SDK |
| Score/Ld calculados com lista parcial | manter limit ≥ 1000 como hoje (overflow já limita) |

## 6. Esforço estimado

Fases 0+1: ~1 dia · Fase 2 (script+validação): ~1 dia · Fase 3: ~1 dia ·
Fase 4: horas. Total ≈ 3–4 dias de trabalho distribuído, sem downtime.

---

## 7. Status de implementação — reconciliação plano × código (24/06/2026)

Auditoria do estado real do código vs. este plano (que é de 10/06). Muita coisa já
foi construída desde então — mas com **divergências** que precisam ser conhecidas
antes de retomar:

**✅ Já implementado:**
- **Leitura nova (Fase 3) — pronta.** `useFinancialData.ts` já lê 3 fontes (inline +
  `entriesOverflow` `limit 1000` + subcoleção `entries` `limit 5000`), com o listener
  da subcoleção ativando quando a flag está presente. `mergeAllEntries` deduplica.
- **Dual-write (Fase 1) — plumbing pronto, dormente.** `addEntry`/`updateEntry`/
  `deleteEntry` chamam `writeEntryToSubcollection`/`deleteEntryFromSubcollection`
  **quando `isEntriesMigrated(uid)`**. Mas como nada seta a flag ainda, está inativo.
- **Backfill (Fase 2) — script existe:** `scripts/migrate-entries-to-subcollection.js`
  (Admin SDK). **Falta validar** (dry-run + amostragem) e confirmar idempotência.

**⚠️ Divergências / lacunas encontradas:**
1. **Flag — RESOLVIDO (auditado 24/06).** O plano falava em `entriesMigration`
   (estados), mas isso **nunca foi implementado**. Tanto o código (`useFinancialData`,
   `persistUserData.isEntriesMigrated`) quanto o script `migrate-entries-to-subcollection.js`
   (linha 103: `set({ entriesMigratedAt: <ISO> }, {merge:true})`) **concordam em
   `entriesMigratedAt`**. Não há divergência real — o plano é que estava desatualizado.
2. **🔴 Regra Firestore da subcoleção `entries` estava AUSENTE** (Fase 0 incompleta).
   Sem ela, o cliente caía no `default-deny` e o dual-write/leitura nova eram
   bloqueados silenciosamente. **CORRIGIDO em 24/06** — adicionada
   `match /users/{userId}/entries/{docId}` (owner read/write) em `firestore.rules`.
   **Requer `firebase deploy --only firestore:rules`.**
3. **Cutover de escrita (Fase 4) — não feito.** Mesmo migrado, `addEntry` ainda grava
   inline (via `modifyUserDoc`) **e** na subcoleção. Enquanto não cortar o inline, o
   doc principal continua crescendo e o ganho de escala não acontece.
4. **Quem dispara o backfill?** O plano previa script manual do João. Não há trigger
   lazy por-usuário no boot. Decidir: script bulk (Admin SDK, manual) vs. lazy no app.

**Auditoria do script `migrate-entries-to-subcollection.js` (24/06) — APROVADO p/ dry-run:**
- ✅ **Idempotente:** lê os ids já existentes na subcoleção (`subColRef.select().get()`) e
  pula os já migrados → re-rodar não duplica.
- ✅ **Em lotes:** `WRITE_BATCH=450` (sob o limite de 500); usuários paginados de 100.
- ✅ **Não-destrutivo:** não apaga o `entries[]` inline (rollback trivial); seta
  `entriesMigratedAt` + `entriesSubcollectionCount` só no fim.
- ✅ **`--dry-run`** funcional (preview sem escrita); aceita uid único ou todos.
- ⚠️ **Só migra `entries[]` inline, NÃO `entriesOverflow`** (Pluggy arquivado). Aceitável:
  a leitura do app já faz merge das 3 fontes, então nada some. Consolidar o overflow é
  etapa opcional posterior.
- ⚠️ No modo bulk, usuários já migrados são **re-processados** (bloco vazio na linha 152-154,
  "força re-check") — desperdício leve, inofensivo (idempotente). Otimização futura: `continue`.
- ⚠️ Requer `GOOGLE_APPLICATION_CREDENTIALS` (service account) ou ADC — credencial de Admin.

**👉 Próximo passo concreto (menor risco, destrava o resto):**
1. Deploy da regra nova (`firestore:rules`) — já editada.
2. Rodar o script em **`--dry-run` num uid de teste** (`node scripts/migrate-entries-to-subcollection.js <uid> --dry-run`)
   e conferir a contagem de "would migrate" vs. lançamentos reais daquele usuário.
3. Migrar **1 usuário de teste real** (sem `--dry-run`, com uid) → conferir na UI que tudo
   aparece (merge/dedup) e que `entriesMigratedAt` foi setado.
4. Só então decidir trigger do backfill em massa e, por último, o cutover de escrita (Fase 4),
   com observação entre as fases.
