# HANDOFF-0001 — Bootstrap do Pipeline

> Spec executável para o **executor** (Antigravity) montar o esqueleto mecânico do
> pipeline descrito em `docs/PIPELINE-DESIGN.md`. Escrita pelo Claude; revisada e
> aplicada com aval do João (bootstrap **sem rede** — os gates ainda não existem
> para proteger esta 1ª execução, então o diff é revisado na mão).

---

## 0. Leia antes (auto-referências — obrigatório)

- `AGENTS.md` — contrato de engenharia (precedência sobre tudo).
- `CLAUDE.md` — status do produto + mapa de versões (o que é legado, não tocar).
- `docs/PIPELINE-DESIGN.md` — o contrato que esta spec implementa.

Se qualquer passo abaixo conflitar com `AGENTS.md`, **pare e pergunte** — não adivinhe.

---

## 1. Objetivo

Criar a infraestrutura mínima que faz o comitê de agentes + execução Antigravity
operarem com **gates un-skippable, lock de execução e trilha de auditoria** — sem
tocar em código de produto.

---

## 2. Escopo

**Dentro:** estrutura de pastas do pipeline, script de gate único, hook/CI que
bloqueia no gate, template de handoff, e a atualização de governança no `AGENTS.md`.

**Fora (NÃO tocar):** `src/`, `functions/`, `firestore.rules`, `storage.rules`,
qualquer lógica de negócio, qualquer coisa que toque dinheiro (SibCoin/billing/
Open Finance). Nenhuma feature de produto entra aqui.

---

## 3. Arquivos-alvo (só estes)

- `.pipeline/README.md` *(novo)*
- `.pipeline/EXECUTION.lock.md` *(novo — estado "livre")*
- `docs/handoffs/README.md` *(novo)*
- `docs/handoffs/HANDOFF-TEMPLATE.md` *(novo)*
- `scripts/pipeline-gate.mjs` *(novo)*
- `package.json` *(editar: adicionar 1 script `gate`)*
- Um hook/CI: `.githooks/pre-push` **ou** `.github/workflows/gate.yml` *(novo — escolha 1, ver passo 5)*
- `AGENTS.md` *(editar: adicionar seção de governança do pipeline — **gate humano**, ver passo 6)*

Tocar qualquer arquivo fora desta lista = reprovado.

---

## 4. Passos

### 4.1 Estrutura do pipeline
- `.pipeline/README.md`: explica o lock, a convenção de branch `pipe/<NNNN>-<slug>`,
  e a regra "um executor por vez" (resumo do §5 do PIPELINE-DESIGN).
- `.pipeline/EXECUTION.lock.md`: template no estado **livre**, com os campos:
  `executor`, `branch`, `handoff`, `desde`, `status: free`.

### 4.2 Handoffs
- `docs/handoffs/README.md`: como um handoff nasce e é consumido (aponta para
  PIPELINE-DESIGN §3).
- `docs/handoffs/HANDOFF-TEMPLATE.md`: template com **todos** os campos do §3 do
  PIPELINE-DESIGN (auto-referências, objetivo, escopo, arquivos-alvo, passos,
  critério de aceite ligado a checagem, gate de risco, instrução de bloqueio).

### 4.3 Gate único
- `scripts/pipeline-gate.mjs`: roda, em sequência, e sai com código ≠ 0 se qualquer
  um falhar: `npm run typecheck` → `npm run test:unit` → `npm run test:react-smoke`.
  (O ratchet de design **já** roda dentro de `test:unit` via `designSystem.guard.test.ts`.)
- `package.json`: adicionar `"gate": "node scripts/pipeline-gate.mjs"`. **Não** alterar
  nenhum outro script.

### 4.4 Bloqueio mecânico
Escolha **uma** abordagem (a que casar com o setup de CI do repo — se houver dúvida,
pergunte ao João):
- **(a) git hook:** `.githooks/pre-push` que roda `npm run gate` e aborta o push se
  vermelho; documentar em `.pipeline/README.md` como ativar (`git config core.hooksPath .githooks`).
- **(b) CI:** `.github/workflows/gate.yml` que roda `npm run gate` em PR e marca o
  check como obrigatório.

### 4.5 Governança (AGENTS.md — **gate humano**)
Adicionar uma seção no `AGENTS.md` registrando a mudança do §9 do PIPELINE-DESIGN:
existe agora um executor Antigravity sob spec+gates+lock; Claude passa a especificar
e revisar diff; a Regra de Ouro (dinheiro/rules/deploy = aval humano) permanece e
vale para qualquer executor. **Esta edição só é aplicada com aprovação explícita do
João** (toca governança).

---

## 5. Critério de aceite (ligado a checagem)

- [ ] Todos os arquivos do §3 existem; **nenhum** arquivo fora do §3 foi alterado.
- [ ] `npm run gate` existe e, numa máquina limpa, roda `typecheck` + `test:unit` +
      `test:react-smoke` em sequência, saindo vermelho se qualquer um falhar.
- [ ] `npm run gate` fica **verde** no `main` atual (ou o desvio conhecido do ambiente
      — ex.: smoke da URL remota por cold-start — está documentado no output).
- [ ] O hook/Cire escolhido bloqueia o merge/push quando o gate falha (testar com uma
      falha proposital temporária e reverter).
- [ ] `HANDOFF-TEMPLATE.md` contém todos os 8 campos do §3 do PIPELINE-DESIGN.
- [ ] `.pipeline/EXECUTION.lock.md` está no estado `free`.
- [ ] A edição do `AGENTS.md` está pronta como diff, **aguardando aval do João**
      (não mergear a parte de governança sem o "ok" dele).

---

## 6. Gate de risco

- **Toca governança** (`AGENTS.md`) → **aval humano obrigatório** antes do merge.
- **Não toca** dinheiro, `firestore.rules`, `src/`, `functions/` nem deploy.
- **Bootstrap sem rede:** como os gates ainda estão sendo criados, o João revisa o
  **diff inteiro na mão** antes de aplicar. A partir do próximo handoff, o gate protege.

---

## 7. Instrução de bloqueio

Se algo ficar ambíguo (qual abordagem de CI, um caminho que não existe, um conflito
com `AGENTS.md`), **pare e pergunte ao João**. Nunca improvise em cima de dúvida —
uma pergunta objetiva custa menos que um diff errado.
