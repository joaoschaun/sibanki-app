# PIPELINE-DESIGN — Comitê de Agentes + Execução Antigravity (Sibanki)

> Contrato profissional de como decisões viram código no Sibanki, com múltiplos
> agentes deliberando, **um** executor por vez e gates que ninguém consegue pular.
>
> Precedência: `AGENTS.md` (engenharia) manda em tudo. Este documento **não** cria
> regra de código nova — ele descreve o *processo*. Em conflito, `AGENTS.md` vence.
> Ao adotar este pipeline, o `AGENTS.md` precisa ser atualizado (§9) — de forma
> consciente, com aval do João.

---

## 0. Princípio (por que este desenho)

Três verdades que moldam tudo abaixo:

1. **Deliberar é barato; escrever é perigoso.** Quantos agentes quiser podem
   *discutir* uma decisão — nada é tocado. Mas **um único** executor pode escrever
   por tarefa. Multi-writer no mesmo git é a causa raiz de corrupção de índice,
   commit sobre WIP e perda de rastreabilidade.
2. **O pensamento fica com o Claude; a digitação, com o Antigravity.** Claude
   delibera, escreve a *spec* e revisa o *diff* (barato em token, pega erro). O
   Antigravity implementa o mecânico a partir da spec. Nunca os dois na mesma
   árvore ao mesmo tempo.
3. **O humano é o gate do que é irreversível.** Dinheiro, `firestore.rules` e
   deploy **sempre** passam pelo João, por ação, no chat (a Regra de Ouro).

Anti-objetivo declarado: **não sobre-engenheirar.** Este pipeline serve o produto,
não o contrário. Se um passo não reduz risco nem melhora qualidade de forma
observável, ele sai.

---

## 1. Papéis

### 1.1 Comitê de deliberação (agentes — só opinam, não escrevem)

Cada agente vive em `.claude/agents/<nome>.md`, ancorado numa fonte de verdade.
Eles produzem **parecer**, não código.

| Agente | Mandato | Ancoragem | Pode | Não pode |
|--------|---------|-----------|------|----------|
| **CPO** | O quê / por quê, priorização, tese de soberania | `CLAUDE.md` + rubric | Recomendar, cortar, adiar | Escrever código, autorizar deploy |
| **Dev** | Viabilidade, risco técnico, dívida, gate de qualidade | `AGENTS.md` + inventário | Apontar impacto, estimar esforço | Aprovar mudança de dinheiro/rules |
| **UI/UX** | Experiência, hierarquia, contrato anti-ansiedade, tokens | `DESIGN-SYSTEM-RUBRIC.md` | Exigir aderência à rubric | Relaxar um gate do ratchet |
| **Security/Compliance** | Rules, dinheiro (SibCoin/billing/Open Finance), LGPD | `AGENTS.md` §Regra de Ouro + `firestore.rules` | **Bloquear** merge de risco | Liberar sozinho o que toca dinheiro |
| **Data/Métricas** | Decisão guiada por número (ativação, retenção, Ld) | plugin de tracking | Definir a métrica-norte | Inventar dado que não existe |
| **QA / Design-QA** | Verificação cética antes do merge | testes + rubric + ratchet | Reprovar por regressão | Ser o único gate (soma-se ao humano) |
| **Escriba** *(opcional)* | Auditoria: CHANGELOG, inventário, este contrato | `docs/` | Registrar o que mudou | Decidir mérito |

> **Security/Compliance tem poder de veto** no que toca a Regra de Ouro. É o único
> agente que *bloqueia* — os demais aconselham.

### 1.2 Executor (escreve — **um por vez**)

- **Antigravity** é o executor mecânico padrão, guiado por uma spec (§3).
- **Claude** pode ser executor em tarefas de alto julgamento, mas **nunca**
  simultâneo ao Antigravity na mesma branch (§5, lock).

### 1.3 Humano (João)

- **Decisor final** da deliberação.
- **Gate obrigatório** de dinheiro / `firestore.rules` / deploy.
- **Revisor do bootstrap** e de qualquer mudança sem rede (§7).

---

## 2. O loop (as fases)

```
1. PEDIDO            João descreve a intenção.
2. DELIBERAÇÃO       Agentes relevantes dão parecer (paralelo, sem tocar arquivo).
3. DECISÃO           João + Claude fecham UM plano.
4. SPEC              Claude escreve a spec de handoff (§3) — o contrato executável.
5. LOCK              Adquire o lock de execução (§5). Cria a branch.
6. EXECUÇÃO          UM executor (Antigravity) implementa a partir da spec.
7. GATES             CI roda tsc + vitest + smoke + ratchet. Vermelho = para.
8. REVIEW            Claude revisa o diff contra a spec (critério de aceite).
9. GATE HUMANO       Se toca dinheiro/rules/deploy → aval do João. Senão, pula.
10. MERGE + REGISTRO Merge; Escriba atualiza CHANGELOG/inventário; libera o lock.
```

Regra de corte: **nenhuma fase 6 começa sem a fase 4** (sem spec, não há execução).

---

## 3. Contrato de handoff (o formato da spec)

Toda spec vive em `docs/handoffs/HANDOFF-<NNNN>-<slug>.md` e **tem que** conter:

1. **Auto-referências** — os arquivos que o executor deve ler antes (sobrevive ao
   cold start): `AGENTS.md`, `CLAUDE.md`, a seção relevante do inventário, a rubric
   quando for UI.
2. **Objetivo** — uma frase.
3. **Escopo** — o que fazer / o que está **fora** de escopo (explícito).
4. **Arquivos-alvo** — caminhos exatos que podem ser tocados. Tocar fora = reprovado.
5. **Passos** — a implementação mecânica, sem ambiguidade.
6. **Critério de aceite ligado a checagem** — não "parece certo", e sim
   "`tsc` verde + `vitest` verde + ratchet verde + estes arquivos existem + este
   comportamento observável". É o que define "terminou".
7. **Gate de risco** — marca se toca dinheiro/rules/deploy (→ §9 gate humano).
8. **Instrução de bloqueio** — se algo ficar ambíguo, **pare e pergunte**; não adivinhe.

Uma spec sem critério de aceite verificável **não é executável** e não entra no loop.

---

## 4. Gates un-skippable (a espinha profissional)

O que separa "profissional" de "sistema de honra": o gate é **mecânico**, não um
pedido. Roda no CI / pre-merge; vermelho **impede** o merge — para o Antigravity,
para o Claude e para o João às 2h da manhã.

Gates obrigatórios (todos já existem no repo — falta só torná-los bloqueantes):

| Gate | Comando | Protege |
|------|---------|---------|
| Tipos | `npx tsc --noEmit` | Contrato de tipos |
| Unidade | `npm run test:unit` | Lógica (engines, persist, motor de antecipação) |
| Smoke | `npm run test:react-smoke` | Rotas, PWA, bundle |
| Ratchet | `designSystem.guard.test.ts` | Design system (cor/foco/glow/contraste/OKLCH) |

Meta de bootstrap (§ HANDOFF-0001): amarrar esses quatro num **único gate
bloqueante** (script + hook/CI) que o merge respeita. Enquanto não existir, o gate
é humano (João roda e confere) — é o estado atual.

> [!IMPORTANT]
> **Limitação Conhecida e Dívida Técnica (react-smoke):**
> Hoje o passo `react-smoke` roda como non-blocking (watch-item) por causa de flake de cold-start/URL remota do lighthouse-audit. Portanto, os gates **duros** atuais (bloqueantes) são `tsc` + `test:unit` (que já inclui o ratchet).
>
> **Dívida:** Dividir o `react-smoke` em um projeto estrutural bloqueante (rota/bundle, rodável localmente contra o build de forma rápida) e um projeto remoto/perf non-blocking (lighthouse), permitindo que o smoke estrutural volte a ser um gate 100% bloqueante.

---

## 5. Lock de execução (um executor por vez)

Mecanismo simples, sem plataforma:

- Um arquivo-razão compartilhado, ex. `.pipeline/EXECUTION.lock.md`, registra:
  quem está executando, em qual branch, contra qual HANDOFF, desde quando.
- **Regra:** só há execução se o lock estiver livre. Quem executa adquire o lock;
  ao mergear (ou abortar), libera.
- Convenção de branch: `pipe/<NNNN>-<slug>` (bate com o HANDOFF).
- Se o lock estiver preso por outro executor, a resposta é **esperar ou pedir ao
  João**, nunca escrever em paralelo.

Isso é o que impede o retorno do bug de multi-writer que aposentou o pipeline antigo.

---

## 6. Trilha de auditoria

- Todo merge é rastreável a: **HANDOFF (o quê/porquê)** + **branch (o diff)** +
  **review (quem validou)**.
- O **Escriba** registra em `docs/CHANGELOG.md` e atualiza o inventário quando
  módulo/função/tipo muda (obrigação que já existe no AGENTS.md).
- O `.pipeline/EXECUTION.lock.md` vira histórico de quem executou o quê e quando.

---

## 7. Playbook de falha (o caminho não-feliz)

| Situação | O que fazer |
|----------|-------------|
| **Diff quebrado** (Antigravity produziu algo errado) | Gate reprova OU review do Claude reprova → devolve com correção pontual na spec; não mergeia. |
| **Gate vermelho** | Merge bloqueado. Corrige na branch; se for falso-positivo do ambiente (ex.: mount instável), roda de novo em máquina limpa. |
| **Conflito de tarefa** (dois HANDOFFs mexem no mesmo arquivo) | O lock impede simultaneidade; sequencia — o segundo rebaseia após o merge do primeiro. |
| **Execução travada** (lock preso, executor sumiu) | João libera o lock manualmente após confirmar que a branch foi abortada. |
| **Ambiguidade na spec** | Executor **para e pergunta**. Nunca improvisa em cima de dúvida. |
| **Bootstrap sem rede** (§ HANDOFF-0001) | A 1ª execução não tem gate ainda → **João revisa o diff na mão** antes de aplicar. |

---

## 8. Rollback + kill-switch

- **Tudo reversível via `git`** — branch por tarefa, merge só após verde.
- **Kill-switch** em dinheiro/rules/deploy: são sempre aval humano; nada disso
  entra em `main` automaticamente, jamais.
- Deploy é comando separado e explícito — o pipeline **nunca** deploya sozinho.

---

## 9. Mudança de governança (o que o AGENTS.md precisa passar a dizer)

Hoje o `CLAUDE.md`/`AGENTS.md` dizem: *"desenvolvimento é Claude-only; pipeline
Cursor/Antigravity aposentado (jun/2026)."* Ao adotar este desenho, isso muda —
e a mudança **é uma decisão do João**, não um drift:

- Passa a existir um **executor Antigravity** operando sob spec + gates + lock.
- Claude deixa de ser o único executor e assume também o papel de **especificador
  e revisor de diff**.
- A Regra de Ouro (dinheiro/rules/deploy = aval humano) **permanece intacta** e
  agora vale para qualquer executor, não só o Claude.

Essa reescrita do `AGENTS.md` é parte do bootstrap (HANDOFF-0001) e, por tocar
governança, exige aval explícito do João.

---

## 10. Estado e próximo passo

- **Este documento** = o contrato (o "bar" profissional). Autoria: Claude.
- **Personas dos agentes** (`.claude/agents/*.md`) = artefatos de julgamento →
  autoria do Claude (não do Antigravity).
- **Esqueleto mecânico** (`.pipeline/`, gate bloqueante, lock, reescrita do
  AGENTS.md) = `docs/handoffs/HANDOFF-0001-bootstrap-pipeline.md` → execução do
  Antigravity, com a 1ª revisão na mão do João (bootstrap sem rede).

Ordem: aprovar este design → Claude escreve as personas → João entrega o
HANDOFF-0001 ao Antigravity → Claude revisa o diff → pipeline passa a existir e
tudo depois disso roda por ele.

---

## 11. Mapa do codebase (graphify) — uso e manutenção

- O grafo em `graphify-out/` (graph.json + GRAPH_REPORT.md) é insumo dos agentes
  Dev/QA/Security no review de blast radius (ver as personas). Os *god nodes*
  (`useAppContext`, `updateUserDoc`) marcam mudança de alto risco.
- **Regeneração:** o modo ESTRUTURAL é barato (0 token) — pode rodar sob demanda
  antes de um review grande, ou virar passo opcional do gate. O modo SEMÂNTICO é
  caro em token → só sob demanda, de preferência numa subpasta.
- **Confiança:** arestas `EXTRACTED` (95%) são fato; `INFERRED` (~0.53) são dica,
  com falso-positivos — nunca decidir risco só nelas.
- **Higiene:** `graphify-out/` é build output → não versionar (ver `.gitignore`).

