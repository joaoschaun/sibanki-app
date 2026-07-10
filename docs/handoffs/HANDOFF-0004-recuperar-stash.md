# HANDOFF-0004 — Recuperar o trabalho no stash@{2}

> Spec para o executor (Antigravity — tem git funcional; o Claude NÃO consegue git
> confiável no ambiente dele). Objetivo: recuperar, sem redo, o trabalho de produto
> que foi parar no `stash@{2}` e transformá-lo em commits limpos e gated.
>
> **Alto blast radius:** toca `persistUserData.ts` (god node `updateUserDoc`). NÃO toca
> `firestore.rules`, dinheiro nem deploy. Review reforçada (Dev + Security + QA) + review do Claude.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` (governança + Regra de Ouro) e `docs/PIPELINE-DESIGN.md` (o loop, o lock).
- Contexto do stash (confirmado por consulta ao git):
  - `git stash list` → `stash@{2}: WIP on feature/dashboard-adaptavel: 48bda12 ...`
  - `git stash show --stat stash@{2}` toca: `.claude/settings.local.json`, `docs/CHANGELOG.md`,
    `firebase.json`, `src/components/ui/CoachSetup.tsx`, `src/constants/designSystem.guard.test.ts`,
    `src/hooks/useCoachActive.ts`, `src/index.css`, `src/pages/Consultant.tsx`,
    `src/services/persistUserData.ts`.

---

## 1. Objetivo

Restaurar (do `stash@{2}`) a **Fase 1 do sync**, a **correção do coach** e o **wiring do
Consultor**, fatiados em commits temáticos que passam no gate — sem reescrever nada do zero.

---

## 2. Escopo

**Dentro:** aplicar o stash numa branch de recuperação, resolver conflitos preservando o
código recuperado, separar em commits por tema, e deixar a branch pronta para review.

**Fora:** merge (fica pra revisão do Claude + aval do João); qualquer mudança de
`firestore.rules`/dinheiro/deploy; **dropar** qualquer stash (mantenha todos).

---

## 3. Higiene de git (regras duras desta tarefa)

- Use **`git stash apply`**, NUNCA `git stash pop` — o stash tem que **sobreviver** até o merge confirmar.
- **PROIBIDO** `git reset --hard`, `git checkout .`, `git clean -fd` ou qualquer comando que
  descarte trabalho não commitado. Foi isso que causou a perda original.
- Adquira o **lock** (`.pipeline/EXECUTION.lock.md`) antes de começar; libere ao terminar.
- Trabalhe na branch `pipe/0004-recover-wip`, criada a partir da `main` atual.

---

## 4. Passos

1. `git checkout main && git pull` → `git checkout -b pipe/0004-recover-wip`.
2. `git stash apply stash@{2}`. Vão surgir conflitos (a árvore mudou desde o stash: o
   `CoachSetup.tsx` foi revertido, o `persistUserData.ts` está na versão antiga de dual-write).
   **Resolva preservando o código recuperado** do stash (a versão nova). Em dúvida real sobre
   um conflito, **pare e traga pro Claude** (§7).
3. **Arquivos novos (untracked no stash):** rode `git stash show -p --include-untracked stash@{2}`
   e confirme se estes vieram: `src/utils/anticipationEngine.ts` (+ `anticipationEngine.test.ts`)
   e `src/components/consultant/HorizonBriefing.tsx`. **Se NÃO vierem**, NÃO invente — sinalize
   no relatório que faltam; o Claude regenera (ele tem o conteúdo).
4. Fatie em commits temáticos (um por concern):
   - `fix(entries): Fase 1 sync — subcolecao como fonte unica p/ migrados` → só `persistUserData.ts`.
   - `fix(coach): fonte unica de verdade (stepStatus)` → `CoachSetup.tsx` + `useCoachActive.ts`.
   - `feat(consultor): motor de antecipacao + HorizonBriefing na entrada` → `Consultant.tsx`
     + `anticipationEngine.ts` (+ teste) + `HorizonBriefing.tsx`.
   - Os **extras** (`designSystem.guard.test.ts`, `index.css`, `firebase.json`,
     `docs/CHANGELOG.md`, `.claude/settings.local.json`): avalie um a um. `index.css` e
     `designSystem.guard.test.ts` podem ser mudanças de design válidas → commit próprio
     (`chore(design): ...`). **`firebase.json` e `.claude/settings.local.json`: NÃO commite
     automaticamente** — podem conflitar com o estado atual pós-pipeline; liste-os no relatório
     pro João decidir.
5. `npm run gate` — tem que passar (`tsc` + `test:unit`, incluindo `anticipationEngine.test`).
6. **NÃO** mergeie. Deixe a branch + um resumo do diff **por commit** pra review.

---

## 5. Critério de aceite (ligado a checagem)

- [ ] Branch `pipe/0004-recover-wip` existe, com os commits temáticos do §4.
- [ ] Estes símbolos existem no código da branch: `persistFinScoreSlim` e
      `removeInlineEntryAndPersistScore` (em `persistUserData.ts`), `CoachStepStatus`
      (em `useCoachActive.ts`), e os arquivos `anticipationEngine.ts` + `HorizonBriefing.tsx`
      (ou, se ausentes, documentados como faltando — não inventados).
- [ ] `npm run gate` **verde**.
- [ ] `stash@{2}` **continua existindo** (`git stash list` ainda o mostra).
- [ ] `firebase.json` e `.claude/settings.local.json` NÃO commitados sem decisão do João.

---

## 6. Gate de risco

- **Alto blast radius** (`updateUserDoc`), mas **não** toca rules/dinheiro/deploy → gate padrão
  + review reforçada. Sem merge sem review do Claude; sem deploy.

---

## 7. Instrução de bloqueio

- Conflito de merge onde a resolução correta não é óbvia → **pare e traga o hunk pro Claude**.
- Arquivo novo esperado ausente → **sinalize**, não recrie de memória (o Claude regenera).
- Qualquer tentação de usar `reset --hard`/`clean`/`pop` → **pare**. É a causa raiz da perda.
