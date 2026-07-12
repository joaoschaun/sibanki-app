# HANDOFF-0017 — Painel largura: a raiz (o wrapper global de 1180px)

> **A causa real** do vão lateral do Painel — que o 0015/0016 não resolveram porque miravam a camada
> errada: no `App.tsx` há um **wrapper global** `max-w-[1180px] mx-auto` (L269) que **envolve TODAS as
> rotas** e cabe o conteúdo em 1180px centrado, acima de qualquer `w-full`/padding abaixo dele. O fix:
> **soltar esse teto só na rota do Painel** (`/dashboard`), mantendo os 1180 no resto do app (onde o cap
> é bom — evita linhas longas em telas de texto). `useLocation` já está disponível no App (L143).
>
> Substitui as tentativas de largura anteriores (0015 `w-full`, 0016 padding). Review: Dev + UIUX. Não
> toca sidebar/nav/motor/deploy.

---

## 0. Leia antes

- `src/App.tsx` **L269** — `<div className="max-w-[1180px] mx-auto w-full space-y-6 lg:space-y-8">`
  abre o wrapper; fecha na **L332**; as `Routes` (incl. `/dashboard`) vivem dentro dele. **Este é o teto real.**
- `src/App.tsx` **L143** — `const location = useLocation()` já existe no mesmo componente que renderiza o
  wrapper → dá pra condicionar a className por rota **sem** novo import.
- `src/App.tsx` **L267** — `<main … lg:py-8 lg:px-4 …>` (padding do main; do 0016, se mergeado — ok manter).
- `src/pages/Dashboard.tsx` **L352** — o container do Painel deve ser `w-full` (do 0015; se descartado, este handoff garante).
- Rubric §8 item 6 (Painel largura útil) · §11.7 (sem layout shift). Comentário original do cap (L268):
  "linhas longas demais em telas largas" — **legítimo para telas de texto**, por isso mantemos o cap fora do Painel.

## Pré-flight

- Lock `free` → adquira. `git status` limpo exceto pelo que o Claude escreveu.
  Se `pipe/0015`/`pipe/0016` existirem e não mergeados, **descarte-os** — o 0017 é a correção completa.
- Branch: `pipe/0017-painel-largura-raiz`, a partir da main.

---

## 1. Objetivo

Na rota `/dashboard`, o conteúdo **usa a largura útil** (sem o teto de 1180 que o centralizava e criava o
vão lateral). Todas as outras rotas **continuam com o cap de 1180** (legibilidade preservada).

---

## 2. Escopo

**Dentro:**
- `src/App.tsx` — **condicionar a className do wrapper (L269) por rota:**
  - `const isPainelFull = location.pathname === '/dashboard';`
  - `/dashboard` → `w-full space-y-6 lg:space-y-8` (sem `max-w-[1180px] mx-auto`).
  - demais → `max-w-[1180px] mx-auto w-full space-y-6 lg:space-y-8` (inalterado).
  **Só a className desse `<div>`** (mais a const). Nada mais no App.tsx.
- `src/pages/Dashboard.tsx` — garantir o container (L352) = `className="space-y-8 w-full"`.
- `docs/CHANGELOG.md` · `.pipeline/*`.

**Fora (NÃO tocar):**
- Qualquer coisa no App.tsx além da className do wrapper (L269) — sidebar, nav, main, guards, layout.
- O cap de 1180 nas **demais rotas** (fica como está — é proposital pra telas de texto).
- `Sidebar`, grid dos cards (0013), `dashboardBlueprint`, motor, `guard.test.ts`, outras páginas, tokens, backend, rules, deploy.

---

## 3. Arquivos-alvo

- `src/App.tsx` *(editar — só a className do wrapper L269 + 1 const)*
- `src/pages/Dashboard.tsx` *(editar — garantir `w-full` no container)*
- `docs/CHANGELOG.md` *(editar)*
- `.pipeline/STATE.md` · `.pipeline/EXECUTION.lock.md` · `.pipeline/reports/HANDOFF-0017.report.md`

> Fora da lista = reprovação. O diff do `App.tsx` = a className do wrapper + a const (nada mais).

---

## 4. Passos

1. `App.tsx`: antes do `return`/onde há acesso a `location`, `const isPainelFull = location.pathname === '/dashboard';`
2. `App.tsx` L269: `className={isPainelFull ? 'w-full space-y-6 lg:space-y-8' : 'max-w-[1180px] mx-auto w-full space-y-6 lg:space-y-8'}`.
3. `Dashboard.tsx` L352: `className="space-y-8 w-full"`.
4. Conferir (dev): em `/dashboard` o conteúdo preenche a largura (perto das bordas, sidebar expandida e
   colapsada); em `/contas`, `/consultor-ia`, `/configuracoes` o conteúdo **continua capado em 1180** (não estica).
5. `docs/CHANGELOG.md`: "Painel largura raiz (HANDOFF-0017): wrapper global de conteúdo solta o teto de
   1180px só na rota /dashboard (Painel usa largura útil); demais rotas mantêm o cap. Corrige o vão lateral
   que 0015/0016 não pegaram (miravam camada errada). Sem deploy."

---

## 5. Critério de aceite

- [ ] `App.tsx` difere só na className do wrapper (L269) + a const `isPainelFull`. Nada mais no App.
- [ ] `npm run gate` verde.
- [ ] `/dashboard`: conteúdo preenche a largura (sem o teto de 1180; vão lateral some), nos dois estados da sidebar.
- [ ] `/contas` e `/consultor-ia` (ou outra): **continuam capadas em 1180** (não esticaram) — o cap global preservado fora do Painel.
- [ ] `Dashboard.tsx` container = `w-full`.
- [ ] Sidebar/nav/main/grid/blueprint/motor fora do diff.

---

## 6. Gate de risco

- **Dinheiro / rule / deploy?** NÃO. CSS/layout condicional por rota, contido no App.tsx.
- Risco: cards do Painel esticarem demais em tela ultra-larga (sem cap agora). Aceitável (é o pedido);
  se incomodar depois, põe um cap alto só no Painel (ex.: `max-w-[1600px]`). Não adicionar agora.
- Confirmar que só `/dashboard` perde o cap (as outras rotas dependem dele pra legibilidade).

---

## 7. Instrução de bloqueio

Se `location` não estiver acessível onde o wrapper é renderizado, se soltar o cap esticar/quebrar algum
card do Painel, ou se o App.tsx no disco divergir das linhas citadas — **PARE e registre no report**. Não
mexa no cap das outras rotas nem em nada do App além do wrapper. `AGENTS.md` vence conflitos.
