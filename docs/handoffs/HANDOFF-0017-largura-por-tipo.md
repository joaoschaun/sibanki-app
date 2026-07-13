# HANDOFF-0017 — Largura do container por tipo de tela (app inteiro)

> **Regra de sistema, não remendo do Painel.** A raiz do vão lateral é o wrapper global
> `max-w-[1180px] mx-auto` no `App.tsx` (L269) que capa **todas** as rotas. Em vez de soltar só o
> `/dashboard` (o que criaria desarmonia — Painel largo, irmãs estreitas), aplicamos um **princípio
> consistente** (rubric §11.6): **telas de dados/funcional usam a largura útil; telas de leitura/conversa
> mantêm o cap de legibilidade (~1180)**. Decidido por rota, num único lugar. `useLocation` já existe (L143).
>
> Substitui as tentativas 0015/0016 (miravam a camada errada). Review reforçada Dev + UIUX (toca a largura
> de todas as telas). Não toca sidebar/nav/motor/deploy.

---

## 0. Leia antes

- `docs/DESIGN-SYSTEM-RUBRIC.md` **§11.6** (consistência sistêmica — largura por tipo de tela; o Claude
  codifica junto com este handoff).
- `src/App.tsx` **L269** — `<div className="max-w-[1180px] mx-auto w-full space-y-6 lg:space-y-8">` abre o
  wrapper global (fecha na **L332**); todas as `Routes` vivem dentro. **É o teto real.**
- `src/App.tsx` **L143** — `const location = useLocation()` já disponível no mesmo componente.
- `src/pages/Dashboard.tsx` **L352** — container = `w-full` (garantir).
- Comentário original do cap (L268): "linhas longas demais em telas largas" — **legítimo para leitura**;
  por isso o cap **fica** nas telas de texto e **sai** nas de dados.

## Pré-flight

- Lock `free` → adquira. `git status` limpo exceto pelo que o Claude escreveu.
  Se `pipe/0015`/`pipe/0016` existirem e não mergeados, **descarte-os** — o 0017 é a correção completa.
- Branch: `pipe/0017-largura-por-tipo`, a partir da main.

---

## 1. Objetivo

O app inteiro coerente: **telas de dados** (Painel, Contas, Crédito, Crescimento, Lançamentos, etc.) usam
a **largura útil**; **telas de leitura/conversa** (Consultor, Configurações, Educação, Perfil) mantêm o
**cap de ~1180** (legibilidade). Sem degrau ao navegar entre telas do mesmo tipo.

---

## 2. Escopo

**Dentro:**
- `src/App.tsx` — **um helper + a className condicional do wrapper (L269):**
  - Set de rotas de **leitura** (cap mantido):
    ```ts
    const READING_ROUTES = ['/consultor-ia', '/configuracoes', '/educacao', '/perfil'];
    const isReading = READING_ROUTES.some((r) => location.pathname === r || location.pathname.startsWith(r + '/'));
    ```
  - Wrapper: `className={isReading ? 'max-w-[1180px] mx-auto w-full space-y-6 lg:space-y-8' : 'w-full space-y-6 lg:space-y-8'}`.
  - **Só a className do wrapper + o helper.** Nada mais no App.tsx.
- `src/pages/Dashboard.tsx` — container (L352) = `className="space-y-8 w-full"` (garantir).
- `docs/CHANGELOG.md` · `.pipeline/*`.

**Fora (NÃO tocar):**
- Qualquer coisa no App.tsx além do wrapper (L269) + o helper — sidebar, nav, main, guards, layout.
- O conteúdo interno das páginas (elas ganham largura; **não** reescrever layouts de página aqui — se
  alguma quebrar feio no full-width, ver §7).
- `Sidebar`, grid dos cards (0013), `dashboardBlueprint`, motor, `guard.test.ts`, tokens, backend, rules, deploy.

---

## 3. Arquivos-alvo

- `src/App.tsx` *(editar — helper `isReading` + className do wrapper L269)*
- `src/pages/Dashboard.tsx` *(editar — garantir `w-full`)*
- `docs/CHANGELOG.md` *(editar)*
- `.pipeline/STATE.md` · `.pipeline/EXECUTION.lock.md` · `.pipeline/reports/HANDOFF-0017.report.md`

> Fora da lista = reprovação. O diff do `App.tsx` = o helper + a className do wrapper (nada mais).

---

## 4. Passos

1. `App.tsx`: adicionar `READING_ROUTES` + `isReading` (usando `location.pathname` já disponível).
2. `App.tsx` L269: aplicar a className condicional (leitura = cap 1180; resto = `w-full`).
3. `Dashboard.tsx` L352: `className="space-y-8 w-full"`.
4. **Conferir (dev) — obrigatório, várias telas:**
   - **Dados** (`/dashboard`, `/contas`, `/credito`, `/crescimento`, `/lancamentos`): preenchem a largura,
     conteúdo perto das bordas, **sem quebra visual** (nenhum layout estourando/estranho no full-width).
   - **Leitura** (`/consultor-ia`, `/configuracoes`): **continuam capadas em 1180** (não esticaram).
   - Se uma tela de dados **quebrar feio** no full-width → **NÃO reescrever a página**; mover a rota dela
     pro `READING_ROUTES` (mantém o cap) e **registrar no report** pra tratarmos depois. A regra é tunável.
5. `docs/CHANGELOG.md`: "Largura por tipo de tela (HANDOFF-0017, §11.6): wrapper global do App decide a
   largura por rota — telas de dados usam largura útil, telas de leitura mantêm cap de 1180. Corrige o vão
   lateral do Painel de forma consistente no app inteiro. Sem deploy."

---

## 5. Critério de aceite

- [ ] `App.tsx` difere só no helper `isReading` + className do wrapper (L269). Nada mais no App.
- [ ] `npm run gate` verde.
- [ ] Telas de **dados** (Painel/Contas/Crédito/Crescimento/Lançamentos) preenchem a largura, sem quebra visual.
- [ ] Telas de **leitura** (Consultor/Configurações) **mantêm** o cap de 1180.
- [ ] `Dashboard.tsx` container = `w-full`.
- [ ] Qualquer tela de dados que precisou voltar pro cap está **listada no report** (não reescrita).
- [ ] Sidebar/nav/main/grid/blueprint/motor fora do diff.

---

## 6. Gate de risco

- **Dinheiro / rule / deploy?** NÃO. Layout condicional por rota, contido no App.tsx.
- **Blast radius:** muda a largura de **todas** as telas de dados de uma vez. O gate (tsc/testes/smoke)
  NÃO pega quebra visual → a conferência do §4.4 é obrigatória. Regra tunável (mover rota pro READING set).
- Risco secundário: over-stretch em monitor ultra-largo (sem cap nas telas de dados). Aceitável agora; um
  teto alto (ex.: `max-w-[1600px]`) entra só se o João pedir. Não adicionar aqui.

---

## 7. Instrução de bloqueio

Se `location` não estiver acessível onde o wrapper é renderizado, se alguma tela de dados quebrar de forma
que **não** se resolva movendo-a pro `READING_ROUTES`, ou se o App.tsx divergir das linhas citadas — **PARE
e registre no report**. Não reescreva layouts de página nem toque no cap das telas de leitura. `AGENTS.md` vence.
