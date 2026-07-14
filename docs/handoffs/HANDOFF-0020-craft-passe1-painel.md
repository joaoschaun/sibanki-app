# HANDOFF-0020 — §11 craft, passe 1: count-up + stagger + press (Painel)

> Primeiro passe do **craft premium (§11)** — codificado na rubric, ainda quase não aplicado. Conjunto
> **concreto e revisável** (não "deixa premium" vago): **(1)** count-up no número Ld, **(2)** entrada em
> stagger dos cards do bento, **(3)** feedback de press nos botões/CTAs. Tudo **subordinado a
> `prefers-reduced-motion`** (§11.2/§11.5). Presentational — não toca motor/dados/deploy.
>
> **Nota de escopo (correção do Claude):** o "responder ao toque" do §11.1 vai nos **botões** (elementos
> de fato clicáveis), NÃO em hover-lift nos cards de display (isso seria falsa affordance — card não é botão).
>
> Review: Dev + UIUX. **Craft é subjetivo:** o gate garante que não quebra; timing/intensidade o João
> afina no app rodando. Este passe é a base; iteramos.

---

## 0. Leia antes

- `docs/DESIGN-SYSTEM-RUBRIC.md` **§11.1** (microinterações — 4 estados; press = `scale(.98)` ~120ms),
  **§11.2** (movimento — count-up, reveal stagger ~85ms; timing 120–500ms; curva `cubic-bezier(.2,.7,.2,1)`;
  **trava dura `prefers-reduced-motion`**), **§11.5** (a11y — movimento nunca bloqueia leitura).
- `src/components/ui/SovereigntyHero.tsx` — o número Ld (`{freedom.days}`, `font-extralight text-si-1
  tabular-nums`) **aparece direto**, sem count-up. `noLdData` mostra "—" (não animar esse caso).
- `src/pages/Dashboard.tsx` — os cards do bento (aba `visao_geral`, estado saudável) aparecem **todos juntos**.
  `PageTransition`/`StaggerItem` (framer-motion) já existem em `components/ui/PageTransition.tsx`.
- `src/components/ui/Button.tsx` (+ `buttonClasses`) — o primitivo de botão; ganha o press.

## Pré-flight

- `HANDOFF-0019` mergeado. Lock `free` → adquira. `git status` limpo exceto pelo que o Claude escreveu.
- Branch: `pipe/0020-craft-passe1`, a partir da main.

---

## 1. Objetivo

O Painel ganha o toque premium do §11: o número-herói **conta** ao carregar, os cards **entram em cascata**,
e os botões **respondem ao clique** — com a trava de `reduced-motion` respeitada.

---

## 2. Escopo

**Dentro:**
- **(1) Count-up no Ld** — `SovereigntyHero.tsx`: quando `!noLdData`, o número anima de **0 → `freedom.days`**
  ao montar. Duração ~1200ms, ease-out cúbico (`1-(1-p)^3`), `requestAnimationFrame`, arredondando pra inteiro.
  **`prefers-reduced-motion: reduce` → mostra `freedom.days` na hora** (sem contar). `tabular-nums` já evita
  "pulo" de largura. Não animar o caso `noLdData` ("—").
- **(2) Stagger dos cards do bento** — `Dashboard.tsx` (aba `visao_geral`, **estado saudável**): os cards do
  bento entram com **fade + rise** (opacity 0→1, y ~10→0) em **stagger ~85ms**, ~450ms cada,
  `cubic-bezier(.2,.7,.2,1)` — via `StaggerItem` (já existe) ou `motion` com `staggerChildren`. **`reduced-motion`
  → estado final imediato** (sem stagger). **Só na primeira pintura** — não re-animar a cada re-render (§11.2).
  **Não** mexer no estado crítico (blueprint) nem na coluna/estrutura — só envolver os cards com o wrapper de entrada.
- **(3) Press nos botões** — `Button.tsx`/`buttonClasses`: adicionar **`active:scale-[.98]`** + `transition-transform`
  (~120ms) ao primitivo, com **`motion-reduce:active:scale-100 motion-reduce:transition-none`**. Sistêmico
  (todo `<Button>` do app ganha o press). Hover atual inalterado.
- `*.test.tsx` conforme necessário (ex.: Ld renderiza o valor final; Button tem a classe de press) · `docs/CHANGELOG.md` · `.pipeline/*`.

**Fora (NÃO tocar):**
- **Hover-lift em cards de display** (falsa affordance — não fazer). `Card.tsx` só se precisar do wrapper de
  stagger; sem hover-lift.
- Motor/`anticipationEngine`, `dashboardBlueprint`, `HorizonStrip`/`RadarCard` **lógica** (podem receber o
  wrapper de stagger, mas sem mudar comportamento), `Sidebar`/`App.tsx`, `guard.test.ts`, tokens, backend, rules, deploy.
- Timings/curvas além dos definidos (nada de bounce/overshoot chamativo — §9/§11: calmo).

---

## 3. Arquivos-alvo

- `src/components/ui/SovereigntyHero.tsx` *(editar — count-up + motion-reduce)*
- `src/pages/Dashboard.tsx` *(editar — stagger nos cards do bento saudável)*
- `src/components/ui/Button.tsx` *(editar — press `active:scale-[.98]` + reduce)*
- `src/components/ui/SovereigntyHero.test.tsx` (ou o do Button) *(ajustar/novo)*
- `docs/CHANGELOG.md` · `.pipeline/STATE.md` · `.pipeline/EXECUTION.lock.md` · `.pipeline/reports/HANDOFF-0020.report.md`

> Fora da lista = reprovação. Nada de motor/blueprint/Sidebar/App/guard no diff (a não ser wrapper de stagger sem mudar lógica).

---

## 4. Passos (resumo)

1. `SovereigntyHero`: hook/efeito de count-up 0→`freedom.days` (só `!noLdData`), guardado por `matchMedia
   ('(prefers-reduced-motion: reduce)')` → valor final imediato quando reduce.
2. `Dashboard`: envolver os cards do bento saudável em `StaggerItem`/`motion` com stagger ~85ms; reduce → sem stagger.
3. `Button`: `active:scale-[.98] transition-transform duration-100 motion-reduce:transition-none motion-reduce:active:scale-100`.
4. Testes: Ld mostra o valor final (com reduce e após a animação); Button tem a classe de press.
5. `docs/CHANGELOG.md`: "Craft §11 passe 1 (HANDOFF-0020): count-up no Ld, entrada em stagger dos cards do
   Painel, press nos botões — todos com `prefers-reduced-motion`. Sem deploy."

---

## 5. Critério de aceite

- [ ] Nenhum arquivo fora do §3 (motor/blueprint/Sidebar/App/guard fora, salvo wrapper de stagger sem mudar lógica).
- [ ] `npm run gate` verde.
- [ ] Ld **conta 0→dias** ao carregar (`!noLdData`); com `reduced-motion` mostra o valor final na hora, sem contar.
- [ ] Cards do bento **entram em stagger** na primeira pintura; `reduced-motion` → aparecem já; não re-anima a cada render.
- [ ] Botões têm **press `scale(.98)`**; `reduced-motion` → sem scale.
- [ ] Nenhum bounce/overshoot; timings ≤500ms; curva padrão. Gate 3 = 0.
- [ ] Estado crítico do Painel e a lógica dos componentes inalterados.

---

## 6. Gate de risco

- **Dinheiro / rule / deploy?** NÃO. Presentational.
- **Craft é subjetivo** → o gate só garante que não quebra; "premium o suficiente" é validação visual do João
  (ele afina timing/intensidade depois). Risco de a11y coberto pela trava `prefers-reduced-motion` (§11.5).
- Risco: stagger re-animando a cada re-render (pisca) → cobrir com "só primeira pintura" (§4.2).

---

## 7. Instrução de bloqueio

Se o count-up conflitar com `noLdData`/re-render, se o stagger re-animar a cada update, ou se o press exigir
mexer na lógica de algum botão — **PARE e registre no report**. Nada de hover-lift em card, nada de
bounce/overshoot, nada de tocar o motor. `AGENTS.md` vence conflitos.
