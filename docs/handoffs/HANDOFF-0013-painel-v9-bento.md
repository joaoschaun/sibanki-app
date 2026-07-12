# HANDOFF-0013 — Painel v9: conteúdo bento completo (sidebar mantida)

> Faz o **conteúdo** do Painel (aba Visão geral) virar o bento completo do v9/v8 — hero + decisão +
> "Para onde foi" · Horizonte · Contas conectadas · Fluxo + Crédito em formação — **na largura do
> conteúdo, sem coluna-rail separada**. A **sidebar do `App.tsx` FICA** (não é tocada aqui). Reusa o
> máximo do que existe; cria os cards de módulo que faltam. Referência canônica visual: o mock
> `docs/design/mocks/painel.html` (v8) + o v9 (sidebar + esse conteúdo).
>
> **Handoff grande** (é a evolução inteira do Painel, não uma fatia). Review reforçada Dev + UIUX;
> a Regra de Ouro (§9) tem que sobreviver. Não toca dinheiro/rules/deploy/App.tsx/sidebar.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` (§12) · `docs/DESIGN-SYSTEM-RUBRIC.md` — **§8 item 6** (os 4 movimentos + anatomia:
  hero+decisão → horizonte → contas → fluxo+crédito), **§8.6a** (número fino/neutro — já aplicado no
  0012), **§9** (calmo-por-padrão, Regra de Ouro), **§10** (dark-glass), **§11** (craft: microinterações,
  a11y cor+ícone+texto, movimento ≤500ms/reduced-motion, skeleton).
- Mock canônico: `docs/design/mocks/painel.html` (v8) — a anatomia e os módulos.
- `src/pages/Dashboard.tsx` — hoje: aba `visao_geral` num grid `lg:grid-cols-12` (col-8 conteúdo +
  col-4 rail direito) + `WIDGET_MAP` (L168) alimentado pelo `buildDashboardBlueprint` (adaptativo).
  O slot `sovereignty-hero` (L175) já é o bento do topo (Hero|Radar + Horizonte) do 0012.
- `src/utils/dashboardBlueprint.ts` — **NÃO alterar a lógica adaptativa** (Regra de Ouro). Ela decide a
  ORDEM em estado crítico; o v9 é a anatomia do estado **saudável**.
- Reuso disponível: `AccountSummaryStrip`, `DashboardCreditSection`, `ExpensesPieChart`,
  `BalanceAreaChart`, `FinancialBarChart`, `DashboardCategoriasTab`; dados no `AppContext`
  (`accounts`, `accountBalances`, `accountMeta`, `cards`, `recurrents`, `receitaMes/despesaMes/saldoMes`)
  e `IntelligenceContext` (`creditObligations`, `catTotals`, `freedom`); helper `reaisToFreedomDays` (§8.3).
- `SovereigntyHero` (0012, já compacto/§8.6a), `RadarCard`, `HorizonStrip`, `useHorizonTop` — **reuse**.

## Pré-flight

- `HANDOFF-0012` mergeado. Lock `free` → adquira. `git status` limpo exceto pelo que o Claude escreveu.
- Branch: `pipe/0013-painel-v9-bento`, a partir da main.

---

## 1. Objetivo

A aba **Visão geral** do Painel passa a ser o **bento do v9**: densa, tudo acima da dobra, na
linguagem dark-glass — **dentro da sidebar atual** (sem tela cheia, sem trocar a nav). O estado
saudável usa a anatomia fixa do §8 item 6; o estado **crítico** continua obedecendo à Regra de Ouro
do blueprint (alerta primeiro). Reusa componentes; cria só os cards de módulo que faltam.

---

## 2. Escopo

**Dentro:**
- **Novos cards de módulo** (presentacionais, `src/components/dashboard/`), cada um consumindo dados
  que já existem — sem lógica de decisão/motor nova:
  - `ContasConectadas.tsx` — tiles densos por banco (nome + saldo) a partir de `accounts`/
    `accountBalances`/`accountMeta` + total + estado Open Finance ("ao vivo"/"não conectado"). Estado
    vazio (sem OF): tile "Conectar banco" (§9.2 convite, não erro).
  - `CreditoEmFormacao.tsx` — fatura consolidada (de `creditObligations`/`cards`) + **"equivale a N
    dias da sua liberdade"** via `reaisToFreedomDays` (§8.3) + barra de utilização + link Hub. Vazio: card calmo.
  - `ParaOndeFoi.tsx` — top categorias do mês (de `catTotals`/`IntelligenceContext`), barra empilhada
    + linhas, **cor = categoria** (`--si-cat-*`, dado). Reusa a fonte de `DashboardCategoriasTab`.
  - `FluxoResumo.tsx` — card coadjuvante do fluxo 15 dias (altura reduzida); pode envolver
    `BalanceAreaChart` ou uma área simples + 3 microlabels (receitas/despesas/sobra).
- `src/pages/Dashboard.tsx` — **reestruturar a aba `visao_geral`**: trocar o grid 8/4 + rail direito
  pela **grade bento** do §8 item 6 (largura do conteúdo). Assembleia (estado saudável):
  linha 1 `[Hero | (Decisão + ParaOndeFoi)]` → linha 2 `Horizonte` full-width → linha 3
  `ContasConectadas` full-width → linha 4 `[FluxoResumo | CreditoEmFormacao]`. **Estado crítico**
  (blueprint `isCritical`): mantém a ordem do blueprint (alerta-crítico/credit-section primeiro) —
  a Regra de Ouro vence a anatomia. SibCoin/Próximas Ações/Alertas/RoundUp que saíam do rail:
  Próximas Ações vira um card do bento (quando `journeyStage` pede); SibCoin permanece **1 card
  compacto** no fim do bento (mover pra sidebar = handoff futuro, não força App.tsx aqui).
- `src/components/dashboard/*.test.tsx` — testes dos novos cards (render + estado vazio + sem shadow-hue).
- `docs/CHANGELOG.md` · `.pipeline/*`.

**Fora (NÃO tocar):**
- `src/App.tsx` e a **`Sidebar`** — ficam como estão (a evolução é do conteúdo; a nav é outro capítulo).
- `dashboardBlueprint.ts` — lógica adaptativa/Regra de Ouro **inalterada**.
- `anticipationEngine`, `RadarCard`, `HorizonStrip`, `SovereigntyHero` (reuse; ajuste só se a assinatura
  exigir — evite), `Consultant`, `guard.test.ts`, tokens existentes, backend, rules, deploy.
- Abas `Transações/Categorias/Cartões` — inalteradas (só a `visao_geral` muda).

---

## 3. Arquivos-alvo

- `src/components/dashboard/ContasConectadas.tsx` · `CreditoEmFormacao.tsx` · `ParaOndeFoi.tsx` · `FluxoResumo.tsx` *(novos)*
- `src/components/dashboard/PainelV9.test.tsx` (ou um por card) *(novo)*
- `src/pages/Dashboard.tsx` *(editar — só a aba `visao_geral`)*
- `docs/CHANGELOG.md` *(editar)*
- `.pipeline/STATE.md` + `.pipeline/EXECUTION.lock.md` + `.pipeline/reports/HANDOFF-0013.report.md` *(protocolo)*

> Fora da lista = reprovação. Em especial: `App.tsx`, `Sidebar`, `dashboardBlueprint.ts`, `anticipationEngine.ts` **não** no diff.

---

## 4. Passos (resumo — detalhe fica com o executor, respeitando §2/§3)

1. Criar os 4 cards de módulo (presentacionais, props = dados já disponíveis; **cor só estado/categoria**;
   glow só sancionado; `motion-reduce`; estado vazio = convite calmo §9.2; a11y §11.5 cor+ícone+texto).
2. Em `Dashboard.tsx` (`visao_geral`): montar a grade bento do §8 item 6 na largura do conteúdo,
   reusando Hero/Radar/Horizonte do 0012 e plugando os 4 cards novos. Preservar o override crítico do
   blueprint (Regra de Ouro). Skeleton no load (§11.7), sem layout shift.
3. Cards de módulo carregam **dados reais** dos contexts (não fictícios — §10.6). Números via `reaisToFreedomDays` no crédito (§8.3).
4. `docs/CHANGELOG.md`: "Painel v9 — conteúdo bento completo (HANDOFF-0013): Visão geral vira bento
   (hero+decisão+categorias / horizonte / contas / fluxo+crédito) na largura do conteúdo, sidebar mantida;
   4 cards de módulo novos reusando dados dos contexts; Regra de Ouro preservada. Sem deploy."

---

## 5. Critério de aceite

- [ ] `App.tsx`, `Sidebar`, `dashboardBlueprint.ts`, `anticipationEngine.ts`, `guard.test.ts` **fora do diff**.
- [ ] `npm run gate` verde (tsc + test:unit incl. 5 gates; smoke = watch-item).
- [ ] Visão geral saudável = bento do §8 item 6 (anatomia certa), na largura do conteúdo (sem rail 8/4).
- [ ] Estado **crítico** ainda mostra o alerta/credit primeiro (Regra de Ouro do blueprint viva).
- [ ] Cards de módulo com **dados reais** dos contexts; crédito mostra "= N dias" (§8.3).
- [ ] Estado **vazio** de cada card = convite calmo (§9.2), nunca vão oco nem erro.
- [ ] Cor só estado/categoria; Gate 3 = 0 (sem `shadow-{hue}`); `motion-reduce` respeitado; a11y cor+ícone+texto.
- [ ] Abas Transações/Categorias/Cartões inalteradas.
- [ ] Testes dos cards novos passam.

---

## 6. Gate de risco

- **Dinheiro / rule / deploy?** NÃO. Presentational + reuso.
- **Maior risco = regressão do adaptativo/Regra de Ouro** ao reestruturar `visao_geral`. Mitigação:
  não tocar o `dashboardBlueprint`; o override crítico continua governando a ordem; a anatomia v9 é só
  o estado saudável. **Se reestruturar exigir mexer no blueprint ou no App.tsx → PARE e registre.**
- Segundo risco: card novo com dado que o contexto não expõe (ex.: patrimônio já vem do hero; se um
  módulo pedir dado inexistente, use o que há ou registre a lacuna — não invente número).
- Review reforçada Dev+UIUX; §8 item 6 + §11 são o gabarito; o mock v8 é a referência.

---

## 7. Instrução de bloqueio

Se a grade bento na largura do conteúdo exigir matar o rail/blueprint, se um módulo pedir dado que os
contexts não têm, ou se algo empurrar pra dentro do `App.tsx`/`Sidebar` — **PARE e registre no report**
(a nav/sidebar é outro handoff). Nunca altere motor/blueprint pra "facilitar". `AGENTS.md` vence conflitos.
