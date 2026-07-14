# HANDOFF-0019 — Horizonte: a régua dos dias fica SEMPRE (mesmo vazio)

> Correção pequena do 0018: o estado vazio do `HorizonStrip` **substitui a régua inteira por um texto
> centralizado** — mas o Horizonte **é** a régua dos 15 dias. O certo: a **grade de dias fica sempre
> visível**; quando não há eventos, ela aparece **sem marcadores** + uma **linha de convite** no lugar da
> legenda — não some, não vira só texto. Um arquivo (`HorizonStrip.tsx`).
>
> Review: Dev + UIUX. Presentational — não toca motor/decisão/deploy.

---

## 0. Leia antes

- `docs/DESIGN-SYSTEM-RUBRIC.md` §8.5 (Horizonte = régua de planejamento sempre-presente; estado vazio =
  convite, **não vão oco** — e aqui: convite **com** a régua, não substituindo) · §9.2 · §11 (a11y/motion).
- `src/components/ui/HorizonStrip.tsx` — hoje: **L21–34** faz `if (hasNoEventsAndNoIncome) return <Card>…só
  texto…</Card>` (troca a régua por texto). O resto (grade L82–135, legenda L137–153) já lida com "sem
  marcadores". **O motor/`events` NÃO mudam** — só a apresentação do vazio.

## Pré-flight

- `HANDOFF-0018` mergeado. Lock `free` → adquira. `git status` limpo exceto pelo que o Claude escreveu.
- Branch: `pipe/0019-horizonte-regua-sempre`, a partir da main.

---

## 1. Objetivo

A régua dos 15 dias (as células com os dias) aparece **sempre** — com dados, mostra marcadores; sem dados,
mostra a régua vazia + o convite. O Horizonte nunca "some" nem vira um bloco de texto.

---

## 2. Escopo

**Dentro (só `HorizonStrip.tsx`):**
- **Remover** o early-return do estado vazio (L21–34). Manter o cálculo do vazio (renomear p/ `isEmpty =
  events.length === 0 && !isIncomeInHorizon`).
- A **grade de dias (L82–135) renderiza sempre** (ela já funciona sem marcadores quando não há eventos —
  não precisa mudar a grade).
- Na área de **legenda (L137–153):** condicionar —
  - `isEmpty` → mostrar **uma linha de convite** no lugar das legendas:
    "Provisione seus próximos 15 dias · adicione recorrentes ou conecte seu banco." (tom §9.2, `text-si-4`/`si-3`).
  - senão → as legendas atuais (recebimentos/pagamentos + janela) inalteradas.
- Ajustar o resumo `sr-only` (L70–72) p/ o caso vazio (ex.: "nenhum compromisso nos próximos 15 dias") — a11y.
- Cor só estado/dado; **zero `shadow-{hue}`**; `motion-reduce` preservado.
- `src/components/ui/HorizonStrip.test.tsx` — o teste do estado vazio deve passar a esperar **a grade (16
  células) presente** + a linha de convite (não mais "só texto, sem grade").
- `docs/CHANGELOG.md` · `.pipeline/*`.

**Fora (NÃO tocar):**
- `anticipationEngine`, `useHorizonTop`, `RadarCard`, `Dashboard` (o mount não muda), `dashboardBlueprint`,
  `Sidebar`/`App.tsx`, `guard.test.ts`, tokens, backend, rules, deploy.

---

## 3. Arquivos-alvo

- `src/components/ui/HorizonStrip.tsx` *(editar — vazio renderiza a grade + convite)*
- `src/components/ui/HorizonStrip.test.tsx` *(editar — expectativa do vazio)*
- `docs/CHANGELOG.md` · `.pipeline/STATE.md` · `.pipeline/EXECUTION.lock.md` · `.pipeline/reports/HANDOFF-0019.report.md`

> Fora da lista = reprovação. Só o `HorizonStrip` de código muda.

---

## 4. Passos

1. `HorizonStrip.tsx`: apagar o bloco L21–34; definir `const isEmpty = events.length === 0 && !isIncomeInHorizon;`
2. Deixar a grade (mapa dos 16 dias) renderizar sempre (sem os markers quando vazio — já é o comportamento).
3. Legenda: `{isEmpty ? <p convite> : <legendas atuais>}`.
4. `sr-only`: texto coerente com vazio/cheio.
5. Teste do vazio: esperar as 16 células + o texto de convite (grade presente).
6. `docs/CHANGELOG.md`: "Horizonte régua sempre (HANDOFF-0019): estado vazio passa a mostrar a régua dos 15
   dias (sem marcadores) + linha de convite, em vez de substituir a régua por texto. Sem deploy."

---

## 5. Critério de aceite

- [ ] Só `HorizonStrip.tsx` + seu teste (+ CHANGELOG/protocolo) no diff; motor/hook/Dashboard fora.
- [ ] `npm run gate` verde.
- [ ] **Estado vazio:** a grade dos 15 dias aparece (16 células, "hoje" marcado), **sem marcadores**, + a
      linha de convite — a régua **não** é substituída por texto.
- [ ] **Com eventos:** comportamento inalterado (marcadores, janela, legendas).
- [ ] Gate 3 = 0; `motion-reduce`/a11y preservados.
- [ ] Teste do estado vazio ajustado (grade presente + convite).

---

## 6. Gate de risco

- **Dinheiro / rule / deploy?** NÃO. Presentational, um componente.
- Risco mínimo: a grade vazia ficar "sem sentido" sem markers — mitigado pela linha de convite que a
  contextualiza (§9.2). Nada de motor.

---

## 7. Instrução de bloqueio

Se remover o early-return quebrar a grade no caso vazio (ex.: `incomeIdx`/`eventsByDayIdx` assumindo dados),
**PARE e registre no report**. Não toque no motor nem no mount do Dashboard. `AGENTS.md` vence conflitos.
