# HANDOFF-0014 — Painel: largura cheia + insight no sino

> Dois ajustes de polimento do Painel v9, vindos do João olhando o app rodando:
> **(A)** matar os gutters laterais (o conteúdo está estreito/centralizado — alargar o container);
> **(B)** tirar o card de insight (Arquiteto Soberano / `InsightDoDia`) do CORPO do Painel e
> **surfacá-lo como notificação no sino** (§8.1: insight é CUIDADO, não ESTADO; §9.2: calmo-por-padrão).
> O ícone azul + "modal" desarmônico some do Painel; o insight não se perde — espera no sino.
>
> Review: Dev + UIUX. Não toca dinheiro/rules/deploy/motor.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` (§12) · `docs/DESIGN-SYSTEM-RUBRIC.md` — **§8.1** (Dashboard=ESTADO, Consultor=CUIDADO;
  o insight relacional NÃO vive no Painel), **§9.2** (calmo-por-padrão; o Painel não cutuca), **§11**
  (craft: microinterações no dropdown, a11y `aria-live`/foco, `motion-reduce`), §1/§3 (sem cor decorativa).
- `src/components/ui/InsightDoDia.tsx` — hoje gera o insight (LLM + cache localStorage, `insight_curto`)
  e renderiza como card grande. **Reuse a geração; não a reescreva.**
- `src/pages/Dashboard.tsx` — `<InsightDoDia>` montado no corpo (≈ L526); e o **container de conteúdo**
  do Painel (o `max-w-*`/wrapper que está deixando gutter lateral) a alargar.
- `src/components/layout/Header.tsx` — o **sino já existe**: `bellOpen` (L64), `Bell` (L193), dropdown
  aberto no clique (L188), `usePushNotifications` (L65). É aqui que o insight passa a aparecer.

## Pré-flight

- `HANDOFF-0013` mergeado. Lock `free` → adquira. `git status` limpo exceto pelo que o Claude escreveu.
- Branch: `pipe/0014-painel-polimento`, a partir da main.

---

## 1. Objetivo

Painel mais limpo e coeso: o bento ocupa a **largura útil** (sem margem morta), e a **primeira dobra
para de ser dominada pelo insight** — que vira uma notificação discreta no sino, disponível quando há.

---

## 2. Escopo

**Dentro:**
- **(A) Largura:** no `Dashboard.tsx` (e/ou o wrapper de conteúdo), **alargar o container** do Painel
  (aumentar/remover o `max-w-*` que estreita) pra o bento usar a largura real. Mantém padding lateral
  saudável; não vira "full-bleed" grudado na borda.
- **(B) Insight → sino:**
  - **Extrair a geração** do insight de `InsightDoDia` para um hook `useInsightDoDia()` (lê o
    `AppContext`/dados que hoje vêm por props), **preservando** LLM/cache/localStorage — só reorganiza,
    não reescreve a lógica.
  - No `Header.tsx`: quando `useInsightDoDia()` retornar um insight, mostrar **badge no sino** e, no
    dropdown, um **item de insight compacto** (texto + "Ver no Consultor IA" → navega pro `/consultor-ia`).
    On-brand (dark-glass, neutro; **sem ícone/gradiente azul** que quebrava a harmonia).
  - **Remover** o `<InsightDoDia>` do corpo do `Dashboard.tsx`.
- `*.test.tsx` — teste do hook/insight-no-sino (há insight → aparece no sino; sem insight → sino sem badge).
- `docs/CHANGELOG.md` · `.pipeline/*`.

**Fora (NÃO tocar):**
- A **lógica de geração** do insight (LLM, prompt, cache) — reusar, não reescrever.
- `dashboardBlueprint`, `anticipationEngine`, `RadarCard`, `HorizonStrip`, `SovereigntyHero`, os cards do 0013,
  `Sidebar`/`App.tsx`, `guard.test.ts`, tokens, backend, rules, deploy.
- A **decisão acionável** (RadarCard) — continua no Painel, prominente (§8.2). Só o insight "macio" vai pro sino.

---

## 3. Arquivos-alvo

- `src/hooks/useInsightDoDia.ts` *(novo — extrai a geração)* **ou** refatorar `InsightDoDia.tsx` p/ expor o hook + uma view compacta.
- `src/components/ui/InsightDoDia.tsx` *(editar — vira fonte do hook / view compacta; pode deixar de ser card de corpo)*
- `src/components/layout/Header.tsx` *(editar — insight no dropdown do sino + badge)*
- `src/pages/Dashboard.tsx` *(editar — remove InsightDoDia do corpo + alarga o container)*
- `src/components/layout/Header.test.tsx` (ou do hook) *(novo/estender)*
- `docs/CHANGELOG.md` · `.pipeline/STATE.md` · `.pipeline/EXECUTION.lock.md` · `.pipeline/reports/HANDOFF-0014.report.md`

> Fora da lista = reprovação. Em especial: motor/blueprint/Sidebar/App.tsx/guard.test **não** no diff.

---

## 4. Passos (resumo)

1. **Container:** localizar o `max-w-*`/wrapper do conteúdo do Painel e alargar (bento usa a largura útil;
   padding lateral preservado). Validar que não quebra o grid dos cards do 0013.
2. **Hook:** `useInsightDoDia()` encapsula a geração atual (LLM/cache) lendo o `AppContext`. Retorna
   `{ insight | null, loading }`. **Comportamento idêntico** ao atual (mesmo cache/mesma copy).
3. **Sino:** `Header.tsx` consome o hook; badge no sino quando `insight != null`; item no dropdown com o
   texto + CTA "Ver no Consultor IA". Dark-glass, neutro, sem azul. `aria-live` no badge, foco navegável (§11.5).
4. **Corpo:** remover `<InsightDoDia>` do `Dashboard.tsx` (o card grande sai da primeira dobra).
5. `docs/CHANGELOG.md`: "Painel polimento (HANDOFF-0014): container alargado (fim dos gutters laterais);
   insight do dia sai do corpo do Painel e vira notificação no sino (§8.1/§9.2), reusando a geração
   existente. RadarCard (decisão) permanece. Sem deploy."

---

## 5. Critério de aceite

- [ ] Nenhum arquivo fora do §3; motor/blueprint/Sidebar/App.tsx/guard.test fora do diff.
- [ ] `npm run gate` verde (tsc + test:unit incl. 5 gates; smoke).
- [ ] O bento ocupa a largura útil — sem gutter lateral morto (padding preservado, sem full-bleed).
- [ ] `<InsightDoDia>` **não** aparece mais no corpo do Painel.
- [ ] Com insight: sino mostra badge + item no dropdown com CTA pro Consultor; **sem ícone/gradiente azul**.
- [ ] Sem insight: sino sem badge (nada de card vazio/oco).
- [ ] Geração do insight **inalterada** (mesma copy/cache — só mudou o lugar de exibição).
- [ ] RadarCard segue no Painel; Gate 3 = 0; `motion-reduce`/a11y do dropdown (§11.5).
- [ ] Testes do §3 passam.

---

## 6. Gate de risco

- **Dinheiro / rule / deploy?** NÃO. Presentational + refactor.
- Risco: (a) `Header` é global (todas as telas) → o sino com insight aparece em todo lugar — **intencional**
  (é notificação); só garanta que não pesa o load das outras telas (o hook não deve refazer geração por tela —
  reusar o cache). (b) extrair a geração pode regredir a copy/cache → coberto pelo aceite ("inalterada").
- Review Dev+UIUX; §8.1/§9.2 são o gabarito.

---

## 7. Instrução de bloqueio

Se alargar o container quebrar o grid do 0013, se extrair o hook exigir reescrever a geração do insight,
ou se o insight-no-sino puxar pra dentro de motor/contexto novo — **PARE e registre no report**. Nunca
reescreva a geração do insight "pra facilitar". `AGENTS.md` vence conflitos.
