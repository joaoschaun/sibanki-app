# HANDOFF-0003 — Registro da Governança do Pipeline (Escriba)

> Spec executável para o executor (Antigravity). Papel do Escriba: **registrar**
> formalmente a nova governança do pipeline na memória do projeto e anotar a dívida
> técnica do gate. É trabalho de DOCUMENTAÇÃO — não toca código, rules, dinheiro nem deploy.
>
> **Pré-condição:** rodar SÓ APÓS o merge da `pipe/0001-bootstrap-pipeline` na `main`.
> Branch desta tarefa: `pipe/0003-escriba-governanca`. Adquira o lock antes.

---

## 0. Leia antes (auto-referências — obrigatório)

- `AGENTS.md` — em especial a nova **§12 (Governança do Pipeline)** e o cabeçalho reconciliado.
- `docs/PIPELINE-DESIGN.md` — o contrato completo (papéis, loop, gates, lock, §11 graphify).
- `CLAUDE.md` — o bloco de status/governança atual (é o que você vai atualizar).
- `docs/CHANGELOG.md` — o formato das entradas de sessão.

Se o texto atual do `CLAUDE.md` divergir muito do esperado, **pare e mostre o trecho ao João**.

---

## 1. Objetivo

Deixar a memória do projeto (CLAUDE.md + CHANGELOG) coerente com a governança já
aprovada (pipeline: Claude especificador/revisor + Antigravity executor + lock + gates),
e registrar a dívida técnica do gate de smoke.

---

## 2. Escopo

**Dentro:** atualizar 3 arquivos de documentação (CLAUDE.md, CHANGELOG, PIPELINE-DESIGN §4).

**Fora (NÃO tocar):** qualquer código (`src/`, `functions/`), `firestore.rules`,
`storage.rules`, `package.json`, `scripts/`, o gate, as personas, o AGENTS.md
(já foi reconciliado no HANDOFF-0002 — não mexer de novo). Nada de deploy.

---

## 3. Arquivos-alvo (só estes)

- `CLAUDE.md` *(editar)*
- `docs/CHANGELOG.md` *(editar — nova entrada)*
- `docs/PIPELINE-DESIGN.md` *(editar — nota de limitação na §4)*

Tocar qualquer arquivo fora desta lista = reprovado.

---

## 4. Passos

### 4.1 CLAUDE.md — reconciliar a governança
No bloco de governança/status do topo, a linha que hoje diz que o pipeline
Cursor/Antigravity foi aposentado e que "todo o desenvolvimento é feito pelo Claude"
está **desatualizada**. Substituir por uma descrição curta do pipeline atual:
- Desenvolvimento via pipeline estruturado — **Claude** especifica (handoff) e revisa o
  diff; **Antigravity** executa o mecânico sob **lock** (`.pipeline/EXECUTION.lock.md`) e
  **gate bloqueante** (`npm run gate`).
- Apontar para `docs/PIPELINE-DESIGN.md` (contrato) e `AGENTS.md §12` (governança).
- A **Regra de Ouro permanece**: dinheiro/rules/deploy = aval humano, qualquer que seja o executor.
Manter o restante do CLAUDE.md intacto.

### 4.2 docs/CHANGELOG.md — nova entrada de sessão
Adicionar uma entrada datada registrando, de forma concisa:
- **Pipeline de agentes (bootstrap):** comitê de 6 personas em `.claude/agents/`
  (cpo, dev, uiux, security, data, qa); gate único `scripts/pipeline-gate.mjs`
  (tsc + vitest bloqueantes; react-smoke non-blocking — ver dívida); hook `.githooks/pre-push`;
  lock `.pipeline/`; template e ciclo de handoff em `docs/handoffs/`.
- **Governança:** `AGENTS.md §12` + cabeçalho reconciliado (v2.2).
- **graphify:** §11 no PIPELINE-DESIGN + `graphify-out/` no `.gitignore`; usado pelos
  agentes Dev/QA/Security no review de blast radius.
- **Origem:** HANDOFF-0001 + HANDOFF-0002, branch `pipe/0001-bootstrap-pipeline`.

### 4.3 docs/PIPELINE-DESIGN.md §4 — nota de dívida do gate
Na §4 (gates), acrescentar uma nota de **limitação conhecida**:
- Hoje o passo `react-smoke` roda como **non-blocking** (watch-item) por causa de flake
  de cold-start/URL remota do `lighthouse-audit`. Portanto os gates DUROS atuais são
  `tsc` + `vitest` (com o ratchet).
- **Dívida:** dividir o `react-smoke` num projeto **estrutural bloqueante** (rota/bundle,
  rodável contra build local) + um projeto **remoto/perf non-blocking** (lighthouse),
  para o smoke estrutural voltar a ser bloqueante.

---

## 5. Critério de aceite (ligado a checagem)

- [ ] `CLAUDE.md` não menciona mais "Antigravity aposentado" / "desenvolvimento é feito
      pelo Claude" como regra vigente; descreve o pipeline e aponta PIPELINE-DESIGN + AGENTS §12.
- [ ] `docs/CHANGELOG.md` tem a nova entrada com os itens do §4.2.
- [ ] `docs/PIPELINE-DESIGN.md §4` contém a nota de limitação/dívida do §4.3.
- [ ] Nenhum arquivo fora do §3 foi alterado.
- [ ] `npm run gate` continua verde (docs não afetam tsc/vitest; rode por higiene).

---

## 6. Gate de risco

- **NÃO** toca dinheiro, `firestore.rules`, código, `package.json`, deploy.
- **Toca documentação de governança** (CLAUDE.md) → como registra governança já aprovada,
  o risco é baixo; ainda assim, **o merge final é aval do João** (mesma regra da §12).

---

## 7. Instrução de bloqueio

Se o texto atual do `CLAUDE.md` estiver muito diferente do descrito, ou se houver dúvida
sobre onde encaixar a nota no CHANGELOG, **pare e pergunte ao João**. Não improvise.
