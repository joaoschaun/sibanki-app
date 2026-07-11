# HANDOFF-0011 — Horizonte no Painel (a régua dos 15 dias · §8.5)

> Fecha o conjunto do protótipo: o **Horizonte** (§8.5 / §10.3) — a régua dos próximos 15 dias
> com **renda** e **despesa-com-alavanca** marcadas e a **janela de ação** destacada como vão
> contínuo. **Reuso puro** do `anticipationEngine` (`nextIncomeDate` + o `topHorizonItem` já usado
> pelo Radar). NÃO altera o motor, o Consultor nem o Radar.
>
> Review: Dev + UIUX (+ CISO de olho no §9: o Horizonte só aparece atrelado à decisão ativa; dia
> calmo não vira timeline de perdições). Não toca dinheiro-real/rules/deploy.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` (§12) · `docs/DESIGN-SYSTEM-RUBRIC.md` **v2** — §8.5 (antecipação; o **Horizonte** é o
  elemento-assinatura), §10.3 (padrão **"Horizonte — a régua dos 15 dias"**: renda esmeralda +
  despesa âmbar + **janela de ação como vão contínuo**), §9.2 (calmo-por-padrão; sem lista de
  perdições), §10.4 (movimento + reduced-motion), §10.5 (modo claro), §2 (WCAG).
- `src/utils/anticipationEngine.ts` — **reuse, não altere.** Exports que o strip usa: `HORIZON_DAYS`
  (15), `nextIncomeDate(recurrents, today)` → `Date | null`, `daysBetween(from, to)`, e o tipo
  `HorizonItem` (`dueDate` ISO, `daysUntilDue`, `label`).
- `src/hooks/useHorizonTop.ts` — já monta o input e devolve `{ item, snooze }`. Você **estende**
  aditivamente para também devolver `incomeDate` (via `nextIncomeDate`). `item`/`snooze` inalterados
  (Radar/Dashboard do 0010 seguem funcionando sem mudança).
- `src/pages/Dashboard.tsx` **L174–187** — o slot `'sovereignty-hero'`: hoje `<>{SovereigntyHero}
  {RadarCard}</>`. Você adiciona `<HorizonStrip>` logo após o `<RadarCard>`.
- `src/components/ui/RadarCard.tsx` — o padrão apresentacional a espelhar (props-driven, sem lógica).

## Pré-flight

- `HANDOFF-0010` mergeado na main (RadarCard + `useHorizonTop` no Dashboard). Se `useHorizonTop` não
  existir na main → PARE e avise.
- Lock `free` → adquira. `git status` limpo exceto pelo que o Claude escreveu. Outro WIP → PARE.
- Branch: `pipe/0011-horizonte-painel`, a partir da `main`.

---

## 1. Objetivo

Renderizar no Painel, **atrelado à decisão ativa do Radar**, a régua dos 15 dias que torna o §9.1
(cash-aware) visível: a renda entra ANTES da despesa ⇒ há cobertura ⇒ a janela de ação fica óbvia.
Reusa a lógica do motor; o strip é 100% apresentacional.

---

## 2. Escopo

**Dentro:**
- `src/hooks/useHorizonTop.ts` — **editar (aditivo):** também devolver `incomeDate: Date | null`
  = `nextIncomeDate(recurrents, new Date())`. **Não** mude `item`/`snooze`/`liquidCash`.
- `src/components/ui/HorizonStrip.tsx` — **novo** componente apresentacional.
- `src/components/ui/HorizonStrip.test.tsx` — **novo** teste.
- `src/pages/Dashboard.tsx` — **editar (mínimo):** montar `<HorizonStrip>` após `<RadarCard>` no
  slot `'sovereignty-hero'`, passando `item={horizon.item}` e `incomeDate={horizon.incomeDate}`.
- `docs/CHANGELOG.md` — entrada.
- `.pipeline/*` — protocolo.

**Fora (NÃO tocar):**
- `src/utils/anticipationEngine.ts` — **reuso puro. Um `+`/`-` no motor reprova.**
- `Consultant.tsx`, `HorizonBriefing.tsx`, `RadarCard.tsx` — intocados.
- Layout do Dashboard além do mount; `Button`/`Field`/`Badge`; tokens existentes; `designSystem.guard.test.ts`; backend/rules/deploy.

---

## 3. Arquivos-alvo (só estes)

- `src/hooks/useHorizonTop.ts` *(editar — aditivo)*
- `src/components/ui/HorizonStrip.tsx` *(novo)*
- `src/components/ui/HorizonStrip.test.tsx` *(novo)*
- `src/pages/Dashboard.tsx` *(editar — só o mount)*
- `docs/CHANGELOG.md` *(editar)*
- `.pipeline/STATE.md` + `.pipeline/EXECUTION.lock.md` + `.pipeline/reports/HANDOFF-0011.report.md` *(protocolo)*

> Fora da lista = reprovação.

---

## 4. Passos

### 4.1 `useHorizonTop.ts` — devolver `incomeDate` (aditivo)

1. Importe `nextIncomeDate` de `../utils/anticipationEngine`.
2. `const incomeDate = useMemo(() => nextIncomeDate(recurrents, new Date()), [recurrents]);`
3. `return { item, incomeDate, snooze };` — **nada mais muda** (Radar/Dashboard usam `.item`/`.snooze`).

### 4.2 `HorizonStrip.tsx` — a régua (apresentacional)

Props: `{ item: HorizonItem | null; incomeDate: Date | null; today?: Date }` (`today` default `new Date()`, injetável p/ teste).

**Regras (§8.5 / §9.2):**
- **Atrelado à decisão:** se `item == null` (dia calmo) ⇒ **não renderize nada** (`return null`).
  O Horizonte acompanha a decisão do Radar; dia calmo não vira timeline (§9.2, "sem lista de perdições").
- Monte `HORIZON_DAYS + 1` (16) células, uma por dia de `today` a `today + HORIZON_DAYS`. Label de
  cada célula = dia do mês.
- **Marcadores (cor = dado/estado, §10.3):**
  - **Renda** — índice `daysBetween(today, incomeDate)` se em `[0, HORIZON_DAYS]`: célula com anel
    esmeralda + legenda "salário entra (dia N)".
  - **Despesa-com-alavanca** — índice `item.daysUntilDue` se em `[0, HORIZON_DAYS]`: célula com anel
    âmbar + legenda "{rótulo curto} (dia N)".
  - **Janela de ação** — se a renda cai ANTES da despesa (`idxRenda < idxDespesa`): destaque as
    células entre elas como **vão contínuo** (fundo/borda âmbar-suave) — o "aja aqui" da §8.5. Se
    não houver renda no horizonte ou a renda cair depois, **não** invente janela (marque só os pontos).
- Cabeçalho: label ALL CAPS "Horizonte · próximos 15 dias" + legenda dos dois marcadores.
- **Cor só via border/bg de estado** (esmeralda/âmbar) — **zero `shadow-{hue}`** (Gate 3). Profundidade,
  se usar, via `<Card>`/tokens sancionados. Contraste AA (§2). `motion-reduce` em qualquer transição (§10.4).
- Robustez: datas fora do horizonte não quebram (clamp/omite marcador); `incomeDate == null` = sem
  marcador de renda e sem janela (§9.1 passo 4, renda irregular).

### 4.3 `Dashboard.tsx` — mount mínimo

No slot `'sovereignty-hero'`, **após** `<RadarCard … />`:
```tsx
<HorizonStrip item={horizon.item} incomeDate={horizon.incomeDate} />
```
(`horizon` já existe do 0010; importe `HorizonStrip`.) **Nada mais.**

### 4.4 `HorizonStrip.test.tsx`

Com `today` fixo (ex.: `2026-07-11`) e um `item` com `daysUntilDue` conhecido:
1. `item = null` ⇒ componente **não renderiza** (retorna null / vazio).
2. Com `item` + `incomeDate` dentro do horizonte ⇒ renderiza 16 células; a célula da renda tem o
   marcador esmeralda e a da despesa o âmbar.
3. Renda antes da despesa ⇒ existe a **janela de ação** (células entre elas destacadas).
4. `incomeDate = null` ⇒ sem marcador de renda e **sem** janela (só o marcador de despesa).
5. Nenhuma classe `shadow-{hue}-{n}/{n}`.

### 4.5 `docs/CHANGELOG.md`

"Horizonte no Painel (HANDOFF-0011): novo `HorizonStrip` (§8.5/§10.3) — régua dos 15 dias com
renda/despesa e janela de ação, atrelado à decisão do Radar; `useHorizonTop` passa a devolver
`incomeDate`. Reuso puro do `anticipationEngine`; motor/Consultor/Radar intocados. Sem deploy."

---

## 5. Critério de aceite

- [ ] Nenhum arquivo fora do §3. **`anticipationEngine.ts`, `Consultant.tsx`, `HorizonBriefing.tsx`, `RadarCard.tsx` NÃO no diff.**
- [ ] `npm run gate` verde (tsc + test:unit incl. 5 gates inalterados; smoke = watch-item).
- [ ] `HorizonStrip` apresentacional: não importa `topHorizonItem`/`buildHorizonItems` (recebe `item` por prop); usa só `HORIZON_DAYS`/`daysBetween` do motor para posições.
- [ ] `item == null` ⇒ strip não renderiza (dia calmo sem timeline — §9.2).
- [ ] Marcadores: renda esmeralda + despesa âmbar; janela de ação como vão contínuo só quando renda<despesa.
- [ ] `incomeDate == null` ⇒ sem marcador de renda e sem janela.
- [ ] `useHorizonTop`: retorno agora inclui `incomeDate`; `item`/`snooze` inalterados (Radar segue funcionando — não deve aparecer regressão no diff do Radar/Dashboard além do mount).
- [ ] Zero `shadow-{hue}` (Gate 3 = 0, sem editar o teste). `motion-reduce` presente.
- [ ] Dashboard: só o mount do `HorizonStrip` no diff.
- [ ] 5 casos de `HorizonStrip.test.tsx` passam.

---

## 6. Gate de risco

- **Dinheiro-real / rule / deploy?** NÃO. Presentational; reuso do motor puro.
- **§9 (CISO):** o Horizonte poderia virar "máquina de ansiedade" se mostrasse uma timeline lotada
  todo dia. Mitigado: só renderiza atrelado à decisão ativa (`item != null`), marca UM ponto de
  despesa (o topo), e enquadra a janela como AÇÃO (não perda). Sem lista de perdições (§9.2).
- Segundo risco: quebrar o Radar ao estender `useHorizonTop` → coberto (retorno aditivo; `item`/`snooze` intactos).

---

## 7. Instrução de bloqueio

Se `nextIncomeDate`/`daysBetween` não estiverem exportados como citado, se o slot do Dashboard
divergir, ou se posicionar os marcadores exigir dado que o `item`/`incomeDate` não trazem — **PARE
e registre no report**. Nunca altere o motor para "facilitar" o strip. `AGENTS.md` vence conflitos.
