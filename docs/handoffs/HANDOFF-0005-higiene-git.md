# HANDOFF-0005 — Higiene de git (prevenção de perda de WIP)

> Spec docs-only para o executor (Antigravity). Grava, como regra, a lição do
> incidente de perda de trabalho não commitado (recuperado no HANDOFF-0004): proíbe
> operações de git destrutivas e institui um pre-flight. **Toca governança**
> (`AGENTS.md`) → merge exige **aval humano do João**.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` — §12 (Governança do Pipeline) e a Regra de Ouro.
- `docs/PIPELINE-DESIGN.md` — §5 (lock) e §7 (playbook de falha).
- `docs/handoffs/HANDOFF-TEMPLATE.md` — o template que vai ganhar o campo de pre-flight.

---

## 1. Objetivo

Tornar impossível repetir a perda de trabalho não commitado: proibir comandos de git
que descartam WIP e exigir um pre-flight de estado limpo antes de qualquer execução.

---

## 2. Escopo

**Dentro:** editar 3 arquivos de documentação/governança.
**Fora:** qualquer código, `firestore.rules`, dinheiro, deploy, o gate, as personas.

---

## 3. Arquivos-alvo (só estes)

- `AGENTS.md` *(editar — nova subseção de higiene de git na §12)*
- `docs/handoffs/HANDOFF-TEMPLATE.md` *(editar — novo campo "Pré-flight")*
- `docs/PIPELINE-DESIGN.md` *(editar — bullet de higiene de git na §5)*

---

## 4. Passos

### 4.1 AGENTS.md §12 — subseção "Higiene de git (anti-perda de WIP)"
Acrescentar, dentro da §12:

```
### Higiene de git (anti-perda de WIP)
- **PROIBIDO** rodar comandos que descartam trabalho não commitado:
  `git reset --hard`, `git checkout .` / `git checkout -- <arquivo>` em massa,
  `git clean -fd`, ou `git stash` de WIP de outro ator sem registrar. Foi um
  comando desses que apagou trabalho não commitado (recuperado no HANDOFF-0004).
- Se a árvore estiver **suja com WIP desconhecido**, **PARE e pergunte ao João** —
  nunca descarte para "limpar" a árvore.
- Prefira **commit-WIP** (`git commit -m "wip: ..."` numa branch) a `git stash`.
  Só é seguro o que está commitado.
- `git stash` só com `--include-untracked` e sempre com `apply` (não `pop`) até o
  destino confirmar; **nunca** faça `stash drop` de stash alheio.
```

### 4.2 HANDOFF-TEMPLATE.md — novo campo "Pré-flight"
Adicionar, logo após as auto-referências, um campo obrigatório:

```
## Pré-flight (antes de escrever qualquer arquivo)
- `git status` **limpo** (sem WIP alheio); se sujo → PARE e pergunte.
- `git stash list` conferido (não pisar em stash existente).
- Base conhecida: branch/commit de partida explicitado.
- Lock `.pipeline/EXECUTION.lock.md` em `free`; adquira antes de começar.
```

### 4.3 PIPELINE-DESIGN.md §5 (lock) — bullet de higiene
Acrescentar ao final da §5 um bullet:

```
- **Higiene de git (ver AGENTS.md §12):** nenhum comando destrutivo que descarte
  WIP (`reset --hard`, `checkout .`, `clean -fd`, `stash drop` alheio). Todo handoff
  começa por um pre-flight de `git status` limpo + `git stash list` conferido.
```

---

## 5. Critério de aceite (ligado a checagem)

- [ ] `AGENTS.md §12` contém a subseção "Higiene de git (anti-perda de WIP)" com as 4 regras.
- [ ] `docs/handoffs/HANDOFF-TEMPLATE.md` tem o campo "Pré-flight" com os 4 itens.
- [ ] `docs/PIPELINE-DESIGN.md §5` tem o bullet de higiene de git.
- [ ] Nenhum arquivo fora do §3 alterado.
- [ ] `npm run gate` continua verde (docs não afetam tsc/vitest; rode por higiene).

---

## 6. Gate de risco

- **NÃO** toca dinheiro/rules/código/deploy.
- **Toca governança** (`AGENTS.md`) → **merge exige aval explícito do João**.

---

## 7. Instrução de bloqueio

Se o texto atual da §12 ou do template divergir do esperado, **pare e mostre o trecho
ao João** antes de editar. Não improvise a estrutura do documento.
