# HANDOFF-0006 — Caixa-postal no repo (comunicação Claude↔Antigravity)

> Spec para o executor (Antigravity). Institui a comunicação por **arquivos no
> repositório** — eliminando o copia-e-cola de spec e de relatório entre o Claude e
> o Antigravity. O João passa a ser **gatilho de uma palavra** + o gate humano.
>
> **Toca governança** (`AGENTS.md`) → merge exige aval do João. Não toca código,
> `firestore.rules`, dinheiro nem deploy.
>
> Nota: este próprio handoff foi escrito **direto no repo** pelo Claude (não pelo
> chat) — é o fluxo novo sendo dogfoodado.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` — §12 (Governança do Pipeline).
- `docs/PIPELINE-DESIGN.md` — §2 (o loop), §5 (lock), §7 (playbook).
- `docs/handoffs/HANDOFF-TEMPLATE.md` — o formato de spec.

## Pré-flight (antes de escrever qualquer arquivo)

- Lock `.pipeline/EXECUTION.lock.md` em `free`; adquira antes de começar.
- `git status` **limpo**; se sujo com WIP alheio → PARE e pergunte.
- `git stash list` conferido (não pisar em stash).
- Branch: `pipe/0006-caixa-postal`, a partir da `main`.

---

## 1. Objetivo

Fazer specs e relatórios trafegarem por arquivos versionados no repo, para que Claude
e Antigravity troquem informação sem o João copiar e colar conteúdo.

---

## 2. Escopo

**Dentro:** criar a estrutura de caixa-postal + documentar a convenção.
**Fora:** qualquer código, `firestore.rules`, dinheiro, deploy, o gate, as personas.

---

## 3. Arquivos-alvo (só estes)

- `.pipeline/STATE.md` *(novo)*
- `.pipeline/reports/README.md` *(novo)*
- `.pipeline/reports/REPORT-TEMPLATE.md` *(novo)*
- `docs/PIPELINE-DESIGN.md` *(editar — nova seção de comunicação via repo)*
- `AGENTS.md` *(editar — nota na §12)*

---

## 4. Passos

### 4.1 `.pipeline/STATE.md` — o quadro de status
Arquivo único, fonte de verdade de "de quem é a vez". Campos:

```
# Pipeline State
- **Handoff atual:** <NNNN ou none>
- **Turno:** <claude | antigravity | joao | idle>
- **Estado:** <idle | spec_ready | executing | report_ready | reviewed | merged>
- **Próxima ação:** <uma frase>
- **Atualizado em:** <ISO timestamp>
```
Estado inicial: Handoff `none`, Turno `idle`, Estado `idle`.

### 4.2 `.pipeline/reports/REPORT-TEMPLATE.md` — o formato do relatório
O que o Antigravity escreve ao terminar um handoff (o Claude lê isto no lugar do paste):

```
# Report — HANDOFF-<NNNN>
- **Branch:** pipe/<NNNN>-<slug>
- **Commits:** <lista hash + mensagem>
- **Arquivos alterados:** <git diff --stat resumido>
- **Gate:** tsc <ok/fail> · vitest <ok/fail, nº testes> · smoke <ok/fail/watch-item>
- **Arquivos novos ausentes:** <nenhum | lista — NÃO inventados>
- **Desvios de escopo:** <nenhum | descrição + justificativa>
- **Bloqueios:** <nenhum | descrição>
- **Pronto pra review:** <sim/não>
```

### 4.3 `.pipeline/reports/README.md` — o fluxo da caixa-postal
Documentar o ciclo:
1. **Claude** escreve `docs/handoffs/HANDOFF-<NNNN>-<slug>.md` e seta `STATE`:
   Turno=`antigravity`, Estado=`spec_ready`.
2. **Antigravity** adquire o lock, executa, escreve
   `.pipeline/reports/HANDOFF-<NNNN>.report.md` (formato §4.2) e seta `STATE`:
   Turno=`claude`, Estado=`report_ready`; libera o lock.
3. **Claude** lê o report, revisa o diff, e seta `STATE`: Turno=`joao`, Estado=`reviewed`.
4. **João** mergeia (gate humano se tocar dinheiro/rules/deploy) e seta `STATE`:
   Estado=`merged`, Turno=`idle`.
O João só dá pings de uma palavra ("roda" / "revisa") — o conteúdo mora nos arquivos.

### 4.4 `docs/PIPELINE-DESIGN.md` — nova seção "## 11-bis. Comunicação via repo (caixa-postal)"
Resumir §4.1–4.3: specs em `docs/handoffs/`, relatórios em `.pipeline/reports/`,
sinal de vez em `.pipeline/STATE.md`; conteúdo nunca trafega por chat; o humano é
gatilho de uma palavra + o gate. (Ajuste a numeração da seção conforme o documento.)

### 4.5 `AGENTS.md` §12 — nota
Acrescentar 1 bullet: "Comunicação Claude↔Antigravity passa pelo repo (spec em
`docs/handoffs/`, relatório em `.pipeline/reports/`, vez em `.pipeline/STATE.md`),
nunca por conteúdo colado no chat."

---

## 5. Critério de aceite (ligado a checagem)

- [ ] `.pipeline/STATE.md`, `.pipeline/reports/README.md` e `.pipeline/reports/REPORT-TEMPLATE.md` existem com os campos do §4.
- [ ] `docs/PIPELINE-DESIGN.md` tem a seção de comunicação via repo.
- [ ] `AGENTS.md §12` tem o bullet da caixa-postal.
- [ ] Nenhum arquivo fora do §3 alterado.
- [ ] `npm run gate` verde.

---

## 6. Gate de risco

- **NÃO** toca dinheiro/rules/código/deploy.
- **Toca governança** (`AGENTS.md`) → **merge exige aval do João**.

---

## 7. Instrução de bloqueio

Se a estrutura de `.pipeline/` ou a §12 divergir do esperado, **pare e mostre ao João**.
Não improvise a estrutura.
