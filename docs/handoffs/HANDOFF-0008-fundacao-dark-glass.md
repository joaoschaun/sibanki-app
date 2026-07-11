# HANDOFF-0008 — Fundação Dark-Glass (tokens de profundidade + glow sancionado + Card)

> Estabelece a camada de execução visual da rubric **v2 §10** (Pierre Dark-Glass) no design
> system **que já existe** — de forma **ADITIVA e retrocompatível**. Nenhuma tela é reescrita
> nesta task (isso é 0009+). Zero mudança de comportamento nas telas atuais; zero dependência nova.
>
> Review: Dev + UIUX. Não toca dinheiro/rules/deploy.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` — contrato de engenharia (precede tudo); §12 (pipeline).
- `docs/DESIGN-SYSTEM-RUBRIC.md` — **v2**, especialmente **§10** (linguagem Dark-Glass), §1 (cor=estado,
  glow via canal sancionado), §6 Gate 3 (mantido em 0), §2 (WCAG), §10.5 (modo claro obrigatório).
- Referência visual: `docs/design/mocks/{painel,credito,consultor}.html` (glamour shots — copie a
  linguagem, não os números; ver §10.6).
- `src/index.css` — camada de tokens atual (`:root` dark + `[data-theme="light"]`). Tailwind v4
  (`@import 'tailwindcss'`). **Só ADICIONE tokens/utilities; não altere nenhum token existente.**
- `src/components/ui/Card.tsx` — o primitivo a estender (classes atuais: `bg-si-card rounded-2xl
  border border-si-border` + `interactive` hover). `cn()` de `../../utils/cn`.
- `src/constants/designSystem.guard.test.ts` — o ratchet. **Gate 3 (`COLORED_GLOW`) NÃO muda** —
  a fundação não usa `shadow-{hue}-{n}/{n}` inline; usa o token `--si-glow-*`.

## Pré-flight

- Lock `.pipeline/EXECUTION.lock.md` em `free`; adquira antes de começar.
- `git status` limpo exceto pelo que o Claude escreveu (este handoff, rubric v2, mocks, STATE); se
  houver outro WIP → PARE e pergunte.
- Branch: `pipe/0008-fundacao-dark-glass`, a partir da `main`.

---

## 1. Objetivo

Entregar os **tokens de profundidade** e o **canal sancionado de glow** da §10, mais as **variantes
opcionais do `Card`** que os consomem — para que 0009+ (rebuild de telas) tenha a base pronta.
Retrocompatibilidade é inegociável: `Card` sem props novas renderiza **idêntico** ao de hoje, e
nenhum token existente muda.

---

## 2. Escopo

**Dentro:**
- `src/index.css` — novos tokens de profundidade em `:root` **e** `[data-theme="light"]` (§10.5),
  + utilities `.si-surface` / `.si-glass` / `.si-glow` / `.si-glow-positive`, com trava
  `prefers-reduced-motion` onde houver transição. **Tudo aditivo.**
- `src/components/ui/Card.tsx` — props **opcionais** `surface` e `glow` (defaults = comportamento atual).
- `src/components/ui/Card.darkglass.test.tsx` — testes de retrocompat + das novas variantes.
- `docs/CHANGELOG.md` — entrada da sessão.
- `.pipeline/STATE.md` + `.pipeline/EXECUTION.lock.md` + `.pipeline/reports/HANDOFF-0008.report.md`.

**Fora (NÃO tocar):**
- **Qualquer tela** (`src/pages/**`) — nenhuma reescrita nesta task. O `Card` novo é opcional e
  ninguém passa a usá-lo aqui.
- `Button` / `Field` / `Badge` — fundação foca no `Card`; os outros primitivos são 0009+.
- **Tokens existentes** em `index.css` (`--si-*` atuais) — nenhum alterado. Só adição.
- **Gate 3** e o resto de `designSystem.guard.test.ts` — sem alteração (o glow é via `--si-glow-*`,
  não via `shadow-{hue}`). *Gate 6 opcional está no §5 como item não-bloqueante.*
- shadcn / Radix / qualquer dependência nova — proibido (a §3 é "primitivos primeiros", já existem).
- Backend, `firestore.rules`, deploy — nada.

---

## 3. Arquivos-alvo (só estes)

- `src/index.css` *(editar — aditivo)*
- `src/components/ui/Card.tsx` *(editar — props aditivas)*
- `src/components/ui/Card.darkglass.test.tsx` *(novo)*
- `docs/CHANGELOG.md` *(editar)*
- `.pipeline/STATE.md` + `.pipeline/EXECUTION.lock.md` + `.pipeline/reports/HANDOFF-0008.report.md` *(protocolo)*

> Tocar qualquer arquivo fora desta lista = reprovação imediata.

---

## 4. Passos

### 4.1 `src/index.css` — tokens de profundidade (aditivo, nos DOIS temas)

Adicione ao bloco `:root` (dark), **sem tocar nos tokens existentes**:

```css
  /* ── PROFUNDIDADE (rubric §10) — dark ─────────────────────────────── */
  --si-surface-grad: linear-gradient(180deg, var(--si-card), var(--si-zinc-9));
  --si-glass: rgba(20, 27, 35, 0.55);
  --si-glass-blur: 15px;
  --si-elev: 0 16px 46px -22px rgba(0, 0, 0, 0.8);
  --si-glow-neutral: 0 0 40px -14px rgba(255, 255, 255, 0.10);
  --si-glow-positive: 0 0 44px -14px rgba(16, 185, 129, 0.28); /* estado: soberania */
```

E os **equivalentes claros** no bloco `[data-theme="light"]` (§10.5 — glow vira sombra suave neutra,
glass vira frost claro):

```css
  --si-surface-grad: linear-gradient(180deg, var(--si-card), #f7f9fb);
  --si-glass: rgba(255, 255, 255, 0.6);
  --si-glass-blur: 15px;
  --si-elev: 0 16px 40px -24px rgba(0, 0, 0, 0.18);
  --si-glow-neutral: 0 8px 24px -14px rgba(0, 0, 0, 0.12);
  --si-glow-positive: 0 8px 28px -14px rgba(16, 185, 129, 0.20);
```

Depois, **utilities aditivas** (após os tokens; não redefina classes existentes):

```css
.si-surface { background: var(--si-surface-grad); box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
.si-glass   { background: var(--si-glass); backdrop-filter: blur(var(--si-glass-blur)); -webkit-backdrop-filter: blur(var(--si-glass-blur)); }
.si-elev    { box-shadow: var(--si-elev); }
.si-glow          { box-shadow: var(--si-glow-neutral); }
.si-glow-positive { box-shadow: var(--si-glow-positive); }
```

> `inset ... rgba(255,255,255,.06)` é branco-alpha (neutro) → não casa Gate 3. `--si-glow-*` é o
> **único** canal de glow sancionado (§1 ⚠︎v2, §6 Gate 3). Não use `shadow-emerald-*` inline em lugar nenhum.

### 4.2 `src/components/ui/Card.tsx` — variantes opcionais (retrocompat)

1. Estenda `CardProps` com dois opcionais:
   ```ts
   surface?: 'flat' | 'raised';   // default 'flat' = comportamento atual
   glow?: 'none' | 'positive' | 'neutral'; // default 'none'
   ```
2. No `cn(...)`, **preserve exatamente** a base atual quando `surface='flat'` e `glow='none'`
   (diff não pode mudar o render default). Aplique aditivamente:
   - `surface === 'raised'` → adiciona `'si-surface si-elev'` (mantém `rounded-2xl border border-si-border`).
   - `glow === 'positive'` → `'si-glow-positive'`; `glow === 'neutral'` → `'si-glow'`.
   - `surface='flat'` continua com `bg-si-card` (não sobrescreva por `.si-surface`).
3. Assinatura pública inalterada (props novas são opcionais) — nenhum caller existe a mudar.

### 4.3 `src/components/ui/Card.darkglass.test.tsx` — testes

Com Testing Library (padrão do repo; confira um teste `.test.tsx` vizinho para o setup):
1. **Retrocompat:** `<Card>` sem props novas contém as classes atuais (`bg-si-card`, `rounded-2xl`,
   `border`, `border-si-border`) e **não** contém `si-surface`/`si-glow-positive`.
2. `<Card surface="raised">` contém `si-surface` e `si-elev`; ainda contém `rounded-2xl border`.
3. `<Card glow="positive">` contém `si-glow-positive`; `<Card glow="neutral">` contém `si-glow`.
4. `<Card>` default **não** contém nenhuma classe `si-glow*` nem `si-surface`.

### 4.4 `docs/CHANGELOG.md`

Entrada do dia (Keep a Changelog): "Fundação Dark-Glass (HANDOFF-0008): tokens de profundidade
(`--si-surface-grad`/`--si-glass`/`--si-elev`/`--si-glow-*`) nos dois temas + utilities + variantes
opcionais `surface`/`glow` no `Card` (retrocompatível). Rubric v2 §10. Sem rebuild de tela, sem deploy."

---

## 5. Critério de aceite

- [ ] Nenhum arquivo fora do §3 alterado (em especial: nenhuma tela em `src/pages/**`).
- [ ] `npm run gate` verde (tsc + test:unit incl. os 5 gates atuais **inalterados**; smoke = watch-item).
- [ ] `Card` sem props novas = render **idêntico** (o diff do `Card` só adiciona ramos condicionais).
- [ ] Nenhum token `--si-*` existente foi alterado (só adição em `index.css`).
- [ ] Tokens de profundidade existem em `:root` **e** `[data-theme="light"]` (§10.5).
- [ ] Glow só via `--si-glow-*` — zero `shadow-{hue}-{n}/{n}` novo (Gate 3 segue = 0, sem editar o teste).
- [ ] 4 casos de `Card.darkglass.test.tsx` passam.
- [ ] Nenhuma dependência adicionada ao `package.json`.
- [ ] (Não-bloqueante) **Gate 6 opcional:** se sobrar folga, adicione ao ratchet um gate que
      garanta que `box-shadow` colorido só apareça via `var(--si-glow-*)`. Se ficar frágil, **pule**
      e registre no report — não arrisque o gate por isso.

---

## 6. Gate de risco

- **Dinheiro / rule Firestore / deploy?** NÃO. Puramente visual/aditivo, front-end.
- Risco principal = **regressão de retrocompat do `Card`** (default mudar) → coberto pelo critério
  de aceite + teste 1/4. Segundo risco = mexer em token existente → proibido no §2.
- Review Dev + UIUX (a rubric §10 é o gabarito).

---

## 7. Instrução de bloqueio

Se o setup de teste do repo não bater com o assumido no §4.3, se o `index.css` no disco divergir do
esperado, ou se o `Card` atual não casar com as classes citadas, **PARE e registre no report** — não
improvise. Em conflito com `AGENTS.md`, o `AGENTS.md` vence.
