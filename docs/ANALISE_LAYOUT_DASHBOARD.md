# Análise do layout e do dashboard — Sibanki

Documento focado na **estrutura visual**, **hierarquia** e **experiência** do layout geral do app e do dashboard.

---

## 1. Layout geral do app

### 1.1 Estrutura em camadas

| Camada | Elemento | Descrição |
|--------|----------|-----------|
| **Fundo** | `body` + `body::before` | Fundo escuro (`--bg: #050510`) com gradientes radiais suaves (azul 5% / 3%) para profundidade. Modo claro altera `--bg`, `--card`, `--t1/2/3`, `--brd`. |
| **Container** | `.wrap` | `max-width: 1440px`, `margin: 0 auto`, `padding: 16px` (8px em mobile). Centraliza o conteúdo e evita overflow horizontal. |
| **Header** | `.top` | Barra fixa no topo: logo + nome "Sibanki" + tag PRO, à esquerda; à direita: tema, notificações, config, usuário, Backup/CSV/Importar/Sair. `backdrop-filter: blur(20px)`, borda e `border-radius: 16px`. |
| **Navegação** | `.nav` | Lista horizontal de abas (`.ni`): Dashboard, Lançar, Investimentos, Cartões, Metas, Orçamento, Carteira, Família, Consultor IA, Dicas, Conquistas, Relatórios, Calendário, Comunidade. Em mobile (<600px) vira barra fixa no **rodapé** com scroll horizontal. |
| **Conteúdo** | `.tab` | Uma `.tab.on` visível por vez (`display: block`); demais `display: none`. Transição com `animation: fadeIn .4s`. |

### 1.2 Design system (CSS)

- **Cores:** variáveis `:root` (--vr azul primário, --bg, --card, --t1/t2/t3, --brd, --green/blue/purple/yellow/cyan/orange/pink). Consistência em KPIs, botões e cards.
- **Tipografia:** Inter (300–900), tamanhos relativos (.62rem–1.3rem), labels em uppercase + letter-spacing.
- **Espaçamento:** gap 8–18px, padding 14–22px, margens bottom 14–18px entre blocos.
- **Componentes reutilizáveis:** `.kpi`, `.cb` (card), `.tb` (tabela), `.fg`/`.fb` (form), `.btn`/`.btn-r`/`.btn-g` etc., `.fr` (filtros).

### 1.3 Responsividade

- **Breakpoint 768px:** header em coluna e centralizado; KPI em 2 colunas; grids em 1 coluna; nav centralizado; auth-box e wrap com menos padding.
- **Breakpoint 600px:** nav fixa no **bottom** (estilo app), `border-radius: 20px 20px 0 0`, safe-area-inset-bottom; scroll horizontal sem scrollbar visível.

**Pontos fortes:** Header e nav adaptam bem; wrap evita quebra de layout.  
**Atenção:** Em mobile, muitas abas no rodapé podem exigir scroll horizontal; considerar agrupar ou priorizar itens (ex.: menu “Mais”).

---

## 2. Dashboard (#dash) — estrutura e ordem

O dashboard é a primeira tab visível após o login. Ordem **de cima para baixo**:

### 2.1 Blocos na ordem atual

| Ordem | ID / classe | Conteúdo | Observação |
|-------|-------------|----------|------------|
| 1 | `#alertBar` | Alertas gerais (conta a pagar, etc.) | Oculto por padrão; exibido por `checkAlerts()`. |
| 2 | `.dash-hero` | Saudação (Bom dia/tarde/noite), subtítulo (mês + % receita gasta), previsão fim do mês; à direita: **medidor de saúde financeira** (nota 1–10 + label + descrição) | Hero em flex, wrap; em mobile pode empilhar. Saúde financeira bem destacada. |
| 3 | `#dashImportPromoCard` | Card “Importar extrato” (Nubank, Inter, etc.) | Condicional: pós-onboarding, sem `vrt_imp_promo`, poucos lançamentos. |
| 4 | `#dashTelegramPromoCard` | Card “Vincule o Telegram” | Condicional: pós-onboarding, sem `vrt_telegram_promo`. |
| 5 | `#insightDoDiaCard` | **Insight do Dia** (IA proativa) + botões “Novo insight” e “Ver detalhes no Consultor IA” | Condicional; conteúdo em `getInsightDoDia()`. |
| 6 | `#tipBanner` | Dica do dia (smart tips) | Preenchido por rKPI() com primeira dica. |
| 7 | `#kR` (`.kpi-row`) | **6 KPIs:** Receitas do mês, Despesas do mês, Saldo do mês, Custos fixos, Investido, Patrimônio total | Grid `auto-fit minmax(160px, 1fr)`. Clicáveis (modal detalhe). |
| 8 | `#topGastosBox` | Caixa “Maiores Gastos do Mês” | Conteúdo em `#topGastosList`; lógica pode estar em `renderDashPremium` (top 5 em `#topGastos`). Há duplicidade: existe também `#topGastos` mais abaixo. |
| 9 | Card “Saldos das Contas” | Resumo por conta + total; clique leva à aba Carteira | `renderDashW()` preenche `#dashWallet`. |
| 10 | Grid 4 colunas | Taxa de poupança, Dias restantes no mês, Comparativo mês anterior, Progresso das metas | Indicadores secundários; barras de progresso e valores. |
| 11 | `#prevBox` | **Previsão para o fim do mês:** receita prevista, despesa prevista, saldo previsto | 3 mini-cards em grid. |
| 12 | `.cg` (grid de gráficos) | 4 gráficos: Evolução patrimonial, Categorias de despesa, Receita vs despesa, Saldo mensal | Chart.js (c1–c4). |
| 13 | Segundo `.cg` | 2 gráficos: Gastos por dia da semana, Projeção anual | c5, c6. |
| 14 | Card “Top 5 Maiores Gastos do Mês” | Lista detalhada (medalhas, descrição, categoria, valor, % do total) | Preenchido por `renderDashPremium()` em `#topGastos`. |

### 2.2 Fluxo de dados do dashboard

- **renderDashPremium():** saudação, subtítulo, previsão fim do mês, saúde financeira, taxa poupança, dias restantes, limite diário, comparativo mês anterior, metas, previsão (receita/despesa/saldo previstos), **top 5 gastos** em `#topGastos`.
- **renderDashW():** saldos por conta em `#dashWallet`.
- **renderInsightDoDia():** texto do insight em `#insightDoDiaText`.
- **rKPI():** preenche `#kR` e `#tipBanner`.
- **rCharts()** e **renderNewCharts():** gráficos c1–c6.

### 2.3 Duplicidade e confusão

- **Top 5 gastos** aparece duas vezes na estrutura: uma caixa `#topGastosBox` / `#topGastosList` e, mais abaixo, um card com `#topGastos`. A lógica em `renderDashPremium()` preenche `#topGastos`; `#topGastosList` pode estar obsoleto ou ser outro bloco. Vale **unificar** em um único bloco “Top 5 gastos do mês” para não duplicar informação.

---

## 3. Pontos fortes do layout e do dashboard

1. **Design system coerente:** variáveis CSS, cores semânticas (verde/vermelho/azul para receita/despesa/saldo), bordas e raios padronizados.
2. **Hierarquia clara:** hero → promoções condicionais → insight IA → KPIs → carteira rápida → indicadores → previsão → gráficos → top gastos.
3. **Dashboard rico:** KPIs clicáveis, saúde financeira, previsão de fim do mês, gráficos múltiplos e top 5 gastos dão uma visão completa em uma tela.
4. **Condicionais bem usadas:** cards de importar e Telegram só quando fazem sentido; insight do dia sempre que há dados.
5. **Tema claro/escuro:** suporte completo via `.light` no body e variáveis sobrescritas.
6. **Nav mobile:** barra inferior fixa em telas pequenas melhora uso com uma mão.
7. **Acessibilidade parcial:** `role="tab"`, `role="navigation"`, `aria-label` em alguns controles; foco em campos críticos no onboarding.

---

## 4. Pontos a melhorar

### 4.1 Layout / estrutura

- **Header em mobile:** muitos botões (tema, notif, config, Backup, CSV, Importar, Sair) podem quebrar em duas linhas ou ficar apertados. Considerar agrupar “Backup / CSV / Importar” em um menu “Ações” ou ícones.
- **Nav com 14 itens:** em desktop quebra linha; em mobile vira scroll horizontal longo. Avaliar agrupar “Dicas, Conquistas, Relatórios, Calendário, Comunidade” em “Mais” ou segundo nível.
- **Dashboard longo:** muita informação em uma única coluna; em desktop poderia haver **duas colunas** (ex.: esquerda = KPIs + carteira + indicadores; direita = gráficos + top 5) para reduzir scroll.
- **Top 5 duplicado:** remover um dos blocos (ex.: `#topGastosBox` / `#topGastosList`) e manter só o card com `#topGastos` preenchido por `renderDashPremium()`.

### 4.2 Dashboard — ordem e prioridade

- **Previsão fim do mês** está no hero (ótimo); **saldo previsto** aparece de novo no bloco “Previsão para o fim do mês”. Redundância aceitável, mas o bloco #prevBox poderia ser renomeado para “Receita / despesa / saldo previstos” para não confundir com a frase do hero.
- **Gráficos:** 6 gráficos seguidos podem cansar em mobile. Considerar abas “Resumo” vs “Gráficos” ou colapsar “Gastos por dia” e “Projeção anual” em “Ver mais gráficos”.
- **Indicadores secundários (taxa poupança, dias restantes, comparativo, metas):** bem compactos; em mobile o grid 4 colunas vira 2x2 ou 1 coluna. Está adequado.

### 4.3 Consistência visual

- **Botão “PRO” no header:** estático; não reflete plano real do usuário (ex.: `U.plan`). Se houver plano free/pro, o tag deveria ser dinâmico ou removido no free.  
  **Implementado:** A tag tem `id="topPlanTag"` e é atualizada em `updatePlanUI()`: exibida só para planos `pro`/`familia` (texto "PRO" ou "Família"); para plano grátis fica oculta (`#topPlanTag { display: none }` por padrão).
- **.cb** com `border: 1px solid var(--brd)`; alguns cards de promo (Importar, Telegram, Insight) usam gradiente e borda colorida. Fica claro que são “destaque”; manter esse padrão para futuros cards de ação.

### 4.4 Performance (já citado em ANALISE_DESIGN_APP)

- **renderAll()** na troca de aba re-renderiza só a tab ativa quando `tabId === 'dash'` (dashboard), o que é bom. No dashboard, porém, são chamadas em sequência: rCharts, renderDashW, renderInsightDoDia, rDicas, checkAlerts, renderDashPremium, renderNewCharts, renderDashImportPromo, renderDashTelegramPromo. Se os dados forem grandes, pode haver atraso; considerar lazy load dos gráficos (ex.: só desenhar c5/c6 quando visíveis no viewport).

---

## 5. Resumo

| Aspecto | Avaliação |
|---------|-----------|
| **Layout geral** | Sólido: wrap, header, nav e tabs bem definidos; design system e tema claro/escuro consistentes. |
| **Dashboard** | Muito completo e informativo; ordem lógica (hero → promoções → insight → KPIs → carteira → indicadores → previsão → gráficos → top 5). |
| **Mobile** | Nav no rodapé e breakpoints ajudam; header e número de abas podem ser refinados. |
| **Ações sugeridas** | (1) Unificar Top 5 em um único bloco; (2) opcional: layout 2 colunas no dashboard em desktop; (3) header mobile: agrupar ações; (4) tag PRO dinâmica ou condicional. |

**Implementado (melhorias aplicadas):** (1) Bloco duplicado Top 5 removido; mantido só o card `#topGastos` preenchido por `renderDashPremium()`. (2) Dashboard em 2 colunas em desktop (≥1024px): `.dash-grid` com coluna esquerda (alertas, hero, promoções, insight, KPIs, carteira, indicadores, previsão) e direita (gráficos + Top 5). (3) No header, em mobile (≤768px) os botões Backup/CSV/Importar ficam em um botão "Ações" com dropdown. (4) Tag PRO dinâmica: `#topPlanTag` atualizada em `updatePlanUI()` — exibida apenas para planos pro/família; oculta para grátis.

Este documento pode ser usado para priorizar ajustes de UI/UX e para alinhar novas telas ao mesmo padrão de layout e dashboard.
