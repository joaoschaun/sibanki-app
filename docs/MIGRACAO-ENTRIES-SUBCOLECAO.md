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
