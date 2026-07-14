# HANDOFF-0018 — Horizonte como régua de provisionamento (sempre visível)

> Corrige a conflação do 0011: o `HorizonStrip` só aparecia quando havia uma **decisão** ativa
> (`item != null`) e sumia em dia calmo. Pela rubric refinada (**§8.5 ⚠︎13/07**), o Horizonte é
> **PLANEJAMENTO sempre-presente e calmo** — mostra os próximos 15 dias (entradas e saídas provisionadas),
> não some em dia calmo; o que **escala** (o "aja") é o **RadarCard**, separado. Aqui: a régua passa a
> renderizar a partir dos **eventos provisionados** (recorrentes de renda/despesa + faturas), com estado
> vazio = convite calmo.
>
> **Toca o `anticipationEngine` (só ADIÇÃO + extração byte-preservante — NÃO a lógica de decisão).**
> Review reforçada Dev + UIUX + **Security (CISO)**: confirmar que `decideWhenToSpeak`/`buildHorizonItems`/
> `topHorizonItem` (o "quando falar" do §9) ficam **inalterados** em comportamento. Não toca deploy/rules.

---

## 0. Leia antes

- `docs/DESIGN-SYSTEM-RUBRIC.md` — **§8.5 (⚠︎13/07)** (Horizonte = planejamento sempre-presente; decisão =
  RadarCard; estado vazio = convite) · **§9.2** (calmo-por-padrão; régua tranquiliza ≠ lista de perdições) ·
  §10/§11 (dark-glass, movimento `motion-reduce`, a11y cor+ícone+texto).
- `src/utils/anticipationEngine.ts` — o motor. `buildHorizonItems` (L188–273) monta o `raw[]` de **despesas**
  (obrigações L203–219, cartões L222–238, recorrentes de despesa L241–255), depois decide/filtra/ordena.
  `nextIncomeDate` (L112), `daysBetween` (L91), `nextDayOfMonth` (L98), `HORIZON_DAYS` (L21). **A lógica de
  decisão (`decideWhenToSpeak`, o filtro de `silence`, `topHorizonItem`) NÃO muda.**
- `src/hooks/useHorizonTop.ts` — devolve `{ item, incomeDate, snooze }`; vai passar a devolver também `events`.
- `src/components/ui/HorizonStrip.tsx` — hoje `if (!item) return null` + 1 marcador (`item.daysUntilDue`).
  Passa a renderizar de `events` + `incomeDate`, sempre que houver o que provisionar.
- `src/pages/Dashboard.tsx` — monta `<HorizonStrip item=… incomeDate=…>` no slot sovereignty-hero; muda p/ `events`.

## Pré-flight

- Lock `free` → adquira. `git status` limpo exceto pelo que o Claude escreveu.
- Branch: `pipe/0018-horizonte-provisionamento`, a partir da main.

---

## 1. Objetivo

O Horizonte vira **régua de provisionamento sempre visível**: mostra a renda e as despesas/faturas
provisionadas nos próximos 15 dias, calma; sem eventos = convite. A **decisão** que escala continua no
RadarCard. O motor de "quando falar" (§9) permanece intocado no comportamento.

---

## 2. Escopo

**Dentro:**
- `src/utils/anticipationEngine.ts` — **adição + extração byte-preservante:**
  - Tipo `HorizonEvent = { id; kind; label; dueDate: string; daysUntilDue: number; amount: number; flow: 'entrada' | 'saida' }`.
  - `export function listHorizonEvents(input: AnticipationInput): HorizonEvent[]` — **todos** os eventos
    provisionados na janela [0, HORIZON_DAYS], **sem** o filtro de decisão: **saídas** (obrigações não pagas,
    faturas de cartão, recorrentes de despesa — a mesma construção do `raw[]`) + **entradas** (recorrentes de
    RECEITA ativos com data na janela). Ordenado por `daysUntilDue`.
  - **Extrair** a construção do `raw[]` de despesas para um helper privado reutilizado por **ambos**
    `buildHorizonItems` e `listHorizonEvents` — a saída do `buildHorizonItems` deve ficar **byte-idêntica**
    (os testes existentes do motor não mudam de expectativa). **NÃO** tocar `decideWhenToSpeak`, o filtro de
    `silence`, `computeLeverageScore`, `framing`, `topHorizonItem`.
- `src/hooks/useHorizonTop.ts` — devolver também `events = listHorizonEvents({…mesmo input…})`. `item`/
  `incomeDate`/`snooze` inalterados (o RadarCard segue igual).
- `src/components/ui/HorizonStrip.tsx` — **reescrever a fonte de dados:** props `{ events: HorizonEvent[];
  incomeDate: Date | null; today? }` (troca `item` por `events`). Regras:
  - Renderiza quando `events.length > 0` **ou** `incomeDate` na janela. **Sem** eventos e **sem** renda →
    **estado vazio convite** (§9.2): card calmo "Provisione seus próximos 15 dias · adicione recorrentes ou
    conecte seu banco" (não `return null`, não vão oco).
  - Marcadores: **entrada** (esmeralda) para cada evento `flow:'entrada'` (e/ou `incomeDate`); **saída**
    (âmbar) para cada evento `flow:'saida'`. Múltiplos eventos = múltiplos marcadores nos dias.
  - **Janela de ação** (âmbar suave) entre a renda e a **próxima saída depois dela** (cobertura) — só quando
    renda < saída. Enquadramento calmo (planejamento), nunca alarme.
  - Cor só estado/dado; **zero `shadow-{hue}`**; `motion-reduce`; a11y (`role="img"` + resumo, cor+ícone+texto).
- `src/pages/Dashboard.tsx` — no mount do `HorizonStrip`, passar `events={horizon.events}` (em vez de `item`),
  mantendo `incomeDate`. **Só o mount.**
- `*.test.tsx` (motor + strip) · `docs/CHANGELOG.md` · `.pipeline/*`.

**Fora (NÃO tocar):**
- A **lógica de decisão** do motor (§9): `decideWhenToSpeak`, filtro de `silence`, `topHorizonItem`, `framing`.
- `RadarCard` (a decisão segue nele), `Consultant`/`HorizonBriefing`, `dashboardBlueprint`, `Sidebar`/`App.tsx`,
  `guard.test.ts`, tokens, backend, rules, deploy.

---

## 3. Arquivos-alvo

- `src/utils/anticipationEngine.ts` *(editar — `HorizonEvent` + `listHorizonEvents` + extração byte-preservante)*
- `src/hooks/useHorizonTop.ts` *(editar — devolver `events`)*
- `src/components/ui/HorizonStrip.tsx` *(editar — fonte `events`, estado vazio convite)*
- `src/pages/Dashboard.tsx` *(editar — só o mount: `events` em vez de `item`)*
- `src/utils/anticipationEngine.test.ts` + `HorizonStrip.test.tsx` *(estender/novo)*
- `docs/CHANGELOG.md` · `.pipeline/STATE.md` · `.pipeline/EXECUTION.lock.md` · `.pipeline/reports/HANDOFF-0018.report.md`

> Fora da lista = reprovação. Em especial: **um `+`/`-` em `decideWhenToSpeak`/`topHorizonItem` reprova.**

---

## 4. Passos (resumo)

1. Motor: extrair o helper de eventos de despesa; `listHorizonEvents` = despesas + entradas (recorrentes
   receita na janela). `buildHorizonItems` chama o mesmo helper (saída byte-idêntica). Decisão intocada.
2. Hook: devolver `events`.
3. `HorizonStrip`: render de `events`+`incomeDate`; múltiplos marcadores; janela renda→próxima saída;
   estado vazio = convite calmo.
4. Dashboard: `events` no mount.
5. Testes: (motor) `listHorizonEvents` lista entradas+saídas na janela e `buildHorizonItems` **não mudou**;
   (strip) com eventos renderiza marcadores; sem eventos+sem renda → convite (não null); sem `shadow-hue`.
6. CHANGELOG: "Horizonte provisionamento (HANDOFF-0018, §8.5): régua sempre visível a partir dos eventos
   provisionados (renda+despesas 15d), estado vazio convite; motor ganha `listHorizonEvents` (aditivo,
   decisão intocada). RadarCard segue com a decisão. Sem deploy."

---

## 5. Critério de aceite

- [ ] Nenhum arquivo fora do §3. `decideWhenToSpeak`/`topHorizonItem`/filtro de `silence` **inalterados**.
- [ ] `npm run gate` verde; **os testes existentes do motor passam sem mudar expectativa** (buildHorizonItems byte-idêntico).
- [ ] `HorizonStrip` não recebe mais `item`; renderiza de `events`+`incomeDate`.
- [ ] Com eventos: marcadores de entrada (esmeralda) e saída (âmbar); janela renda→próxima saída quando renda<saída.
- [ ] Sem eventos e sem renda → **convite calmo** (não `null`, não vão oco).
- [ ] RadarCard inalterado (a decisão continua nele); Dashboard só o mount mudou.
- [ ] Gate 3 = 0; `motion-reduce` + a11y (cor+ícone+texto) no strip.

---

## 6. Gate de risco

- **Dinheiro / rule / deploy?** NÃO. Mas **toca o motor** → **CISO revisa**: a extração é só do
  event-building (dados); a decisão do §9 (quando o Consultor fala) fica **byte-idêntica**. `listHorizonEvents`
  é data-only — não decide nada, não escala nada. A régua **tranquiliza** (planejamento), não alarma (§9.2).
- Risco: a extração alterar sutilmente `buildHorizonItems` → coberto pelos testes existentes do motor (byte-idêntico).

---

## 7. Instrução de bloqueio

Se a extração não sair byte-preservante para `buildHorizonItems`, se `listHorizonEvents` exigir tocar a
lógica de decisão, ou se o strip com múltiplos marcadores virar poluição visual (lista de perdições, §9.2) —
**PARE e registre no report**. Nunca altere `decideWhenToSpeak`/o §9 pra "facilitar". `AGENTS.md` vence.
