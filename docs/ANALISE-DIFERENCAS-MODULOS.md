# Análise das diferenças por módulo – Legado vs React

Comparação direta de cada módulo entre o app legado (staging-13a0b.web.app/app/) e o React (staging-13a0b.web.app), para guiar ajustes visuais e de funcionalidade.

**Comparação visual com Playwright:** defina `TEST_EMAIL` e `TEST_SENHA` e rode `npm run test:compare` (usa `playwright.config.cjs`). Os screenshots vão para `screenshots/compare/legado/` e `screenshots/compare/react/` — compare os mesmos números (ex.: 01-Dashboard, 02-Contas) entre as duas pastas.

---

## 1. Dashboard

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Layout** | Grid de widgets (cards de saldo, receita, despesa, lançamentos), cada um com título e valor; botão "Editar Dashboard" abre painel para reordenar/esconder/adicionar widgets | Cards em coluna/grid fixo (totais, gráficos, consultoria) | React não permite editar layout; ordem e visibilidade são fixas |
| **Primeiros passos** | Widget "Seus Primeiros Passos" (0/5) com checklist de configuração | Não existe | Falta onboarding no React |
| **Totais** | Receita, Despesa, Saldo do mês com variação % e seta (trend) | Mesmo conceito, com variação % e ícone TrendingUp/Down | Paridade de dados; visual pode variar (cores, ícones) |
| **Gráficos** | Donut (despesas por categoria), linha (evolução 6 meses) | Donut e linha (Chart.js ou similar) | Paridade; verificar se cores e labels batem |
| **Consultoria** | Bloco "Consultoria / alertas" (saldo, orçamento, fatura) com links para ações | Bloco de alertas com links para orçamento/lançamentos | Paridade de ideia; textos podem diferir |
| **Link "Novo lançamento"** | Botão destacado para lançar | Link para /lancamentos | Comportamento equivalente |

**Resumo:** React tem os mesmos dados e gráficos; falta **editar layout** e **widget Primeiros passos**.

---

## 2. Contas

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Lista** | Cards ou lista de contas com saldo, opção "Voltar às contas" quando em detalhe | Lista de cards com nome e saldo | Estrutura similar; legado pode ter "Visão geral / Movimentações" por conta |
| **Nova conta** | Modal com nome, saldo inicial, instituição, "incluir na soma", cesta de serviços | Modal com nome e saldo inicial | React mais simples: sem instituição, sem cesta, sem "incluir na soma" na UI (usa accountMeta no código) |
| **Ajustar saldo** | Reajuste com opção "Criar transação de ajuste" ou "Modificar saldo inicial" | Modal com novo saldo (atualiza accountBalances) | Legado oferece duas estratégias; React só atualiza o saldo |
| **Extrato** | Modal "Extrato" ao clicar na conta, lista de lançamentos da conta | Modal Extrato ao clicar na conta ou no ícone List | Paridade |
| **Excluir conta** | Opção de excluir conta | Não existe | Falta no React |
| **Detalhe da conta** | Aba "Detalhes da conta" (tipo, saldo inicial, despesas/receitas/transferências, incluir na soma, editar) | Não há tela de detalhe além do extrato | Legado tem tela de detalhe e edição de conta (nome, tipo, cor, incluir na soma) |

**Resumo:** React cobre lista, nova conta, ajuste de saldo e extrato; faltam **excluir conta** e **detalhe/edição da conta** (tipo, cor, incluir na soma na UI).

---

## 3. Cartões

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Navegação** | Abas por cartão (carrossel) + sub-abas: **Lançar**, **Importar**, **Fatura** | Lista de cards + botões "Lançar" e "Fatura" em cada card; seção "Detalhe da fatura" abaixo | Legado tem sub-aba Importar; React não |
| **Novo cartão** | Modal com nome, bandeira, limite, fechamento, vencimento, **cor**, **anuidade** (valor anual, mês cobrança), banco | Modal com nome, limite, dia fechamento, dia vencimento | React sem bandeira, cor, anuidade e banco no formulário |
| **Lançar na fatura** | Modal: cartão, descrição, categoria, valor, parcelas, data | Modal equivalente | Paridade |
| **Importar fatura** | Sub-aba: CSV/OFX/colar texto; escolher cartão destino; analisar e importar itens | Não existe | Falta no React |
| **Fatura** | Sub-aba: seleção cartão + mês, resumo (total, itens), tabela de compras, excluir compra | Seção "Detalhe da fatura" com seleção cartão + mês, totais, tabela, excluir compra | Paridade de dados; layout em aba vs seção |
| **Editar/Excluir cartão** | Editar (nome, limite, bandeira, etc.) e excluir cartão | Apenas criar; não há editar nem excluir | Falta no React |

**Resumo:** React tem lista, novo cartão, lançar na fatura e detalhe da fatura; faltam **Importar fatura (CSV/OFX/colar)**, **editar cartão**, **excluir cartão** e campos **bandeira, cor, anuidade** no cadastro.

---

## 4. Lançamentos

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Abas** | Pills: Lançar, Transferir, Fixos (recorrentes) | Página única com lista + filtros + botão novo | Legado agrupa "Lançar / Transferir / Fixos" na mesma tela; React tem Recorrentes em página separada |
| **Lista** | Tabela/lista com filtros (tipo, categoria, conta, período), "Filtros avançados" | Lista com filtro tipo + categoria, busca | Legado tem mais filtros (conta, período, etc.) |
| **Novo lançamento** | Modal com tipo, valor, descrição, data, categoria, conta, status, forma pagamento, cartão, parcelas | Modal equivalente (EntryForm) | Paridade |
| **Editar/Excluir** | Editar e excluir por lançamento | Editar e excluir | Paridade |
| **Transferir** | Aba/modal "Transferir" (de/para/valor/data) | Pode estar no mesmo modal de lançamento ou separado; verificar | Confirmar se React tem fluxo explícito de transferência |
| **Gerar PDF** | Botão "Gerar Relatório PDF" na tela | PDF em Configurações | Legado mais à mão no módulo |

**Resumo:** Funcionalidade de CRUD e lista está par; diferenças em **organização** (Fixos/Recorrentes em outra página no React) e **filtros** (legado mais completo).

---

## 5. Recorrentes (Fixos)

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Onde fica** | Dentro de Lançamentos (aba "Fixos") | Página dedicada /recorrentes | React dá mais destaque; legado integrado aos lançamentos |
| **Lista** | Lista com descrição, categoria, valor, conta, dia, frequência | Lista com tipo, descrição, valor, conta, dia, frequência | Paridade |
| **Novo** | Modal: tipo, descrição, valor, categoria, conta, dia, frequência | Modal equivalente | Paridade |
| **Gerar lançamentos do mês** | Botão que gera entries a partir dos recorrentes (tag evita duplicata) | Botão equivalente | Paridade |
| **Excluir** | Sim | Sim | Paridade |

**Resumo:** Paridade; só muda o lugar (aba Fixos vs página Recorrentes).

---

## 6. Planejamento (Metas)

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Título** | "Metas Financeiras" | Planejamento (Metas como conteúdo) | Legado foca em "Metas"; React em "Planejamento" |
| **Lista** | Cards de metas com barra de progresso, valor atual/alvo, prazo | Idem | Paridade |
| **Nova meta** | Modal: ícone (Reserva, Viagem, etc.), nome, valor alvo, valor atual, prazo, cor | Modal com título, alvo, atual (e prazo se houver) | Legado tem ícones e cor; React pode ter menos campos visuais |
| **Editar/Excluir** | Sim | Sim | Paridade |

**Resumo:** Paridade de dados; legado tem mais opções visuais (ícones, cores).

---

## 7. Orçamento

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Título** | "Orçamento Mensal" com mês (ex.: Março 2026) | Página Orçamento com lista por categoria | Similar |
| **Conteúdo** | "Criar planejamento" (renda, % economia, distribuição por categoria), "Planejado vs Real", "Últimos 6 meses", "Distribuição de Gastos" | Lista categorias com orçado vs gasto, definir limite por categoria | Legado tem fluxo "renda → economia → distribuir"; React foca em limite por categoria |
| **Alertas** | "X% acima do orçado" no dashboard | Alertas de consultoria no dashboard | Paridade de ideia |

**Resumo:** React cobre orçado vs gasto e limite por categoria; legado tem **fluxo de planejamento** (renda, % poupar, distribuição) mais elaborado.

---

## 8. Crescimento (Investimentos)

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Sub-abas** | Minha Carteira, **Análise B3**, **Proventos**, **Simuladores**, **Perfil (investidor)** | Uma página: lista de investimentos + simulador de juros compostos | React não tem Análise B3, Proventos nem Perfil do investidor |
| **Carteira** | Lista com data, tipo, nome, investido, atual, retorno, conta; Nova compra, Registrar venda, **Provento**, Atualizar cotações | Lista + Registrar investimento + editar valor atual + excluir | Falta **Proventos** (registrar dividendo/JCP) e **Atualizar cotações** (B3) no React |
| **Análise B3** | Cotação em tempo real, gráfico, indicadores, screener, watchlist, alertas de preço, mapa de calor | Não existe | Falta no React |
| **Proventos** | Lista + modal "Registrar Provento" (ticker, tipo, valor, data) | Não existe | Falta no React |
| **Simuladores** | Juros compostos, Renda Fixa, FIRE, IR sobre investimentos, Renda passiva | Apenas juros compostos (valor inicial, aporte mensal, taxa, prazo) | Legado tem mais simuladores |
| **Perfil do investidor** | Perguntas de suitability, alocação sugerida | Não existe | Falta no React |

**Resumo:** React tem **carteira (CRUD)** e **um simulador**; faltam **Análise B3**, **Proventos**, **Perfil do investidor** e **outros simuladores**.

---

## 9. Consultor IA

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Tela** | Chat com histórico, perguntas sugeridas, indicador "Online", contador de consultas | Página de chat com contexto financeiro e chamada à Cloud Function chatApi | Paridade de conceito |
| **Contexto** | Envio de dados (receita, despesa, metas, etc.) para a IA | buildFinancialContextString + chatApi | Paridade |

**Resumo:** Paridade funcional; diferenças só de layout/texto.

---

## 10. Educação (Dicas)

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Conteúdo** | Cursos, Dicas do dia, Calculadoras, Conquistas, nível/XP, "Continuar de onde parei" | Cards estáticos com dicas (reserva de emergência, 50-30-20, etc.) + link Consultor IA | Legado tem gamificação (nível, XP, conquistas) e mais seções; React é estático |
| **Calculadoras** | Aba com calculadoras financeiras | Não (simulador está em Crescimento) | Legado concentra mais ferramentas aqui |

**Resumo:** React tem **dicas estáticas**; legado tem **estrutura de cursos**, **nível/XP** e **calculadoras** na Educação.

---

## 11. Social (Comunidade)

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Abas** | Feed, **Notícias**, Ranking, **Grupos**, **Prêmios**, Perfil | Feed + Ranking (abas na mesma página) | React sem abas Notícias, Grupos e Prêmios dedicadas |
| **Feed** | Publicar, curtir, salvar, stories, "Dica do dia", "Em alta" | Publicar, curtir, salvar | Paridade de núcleo; legado tem extras (stories, em alta) |
| **Ranking** | Mensal, pódio, lista, prêmios (1º/2º/3º, especiais) | Ranking por pts/posts/curtidas, pódio, texto de prêmios | Paridade de ideia; legado pode ter mais texto de prêmios |
| **Notícias** | Aba com feed de notícias (loadCommNews) | Não existe | Falta no React |
| **Grupos** | Aba com grupos (ex.: Renda Fixa, Investidores Iniciantes) | Não existe | Falta no React |

**Resumo:** React tem **Feed** e **Ranking**; faltam **Notícias** e **Grupos** como no legado.

---

## 12. Perfil

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Abas** | Visão Geral, Minha Conta, Segurança, Privacidade, **Modo Família** | Uma página com seções: foto/nome, Segurança, Privacidade | React não tem aba **Visão Geral** nem **Modo Família** |
| **Visão Geral** | Score Siba, saúde financeira, metas ativas, atividade recente, notificações (Telegram, WhatsApp), preferências (idioma, moeda, aparência), resumo semanal por e-mail, Família Sibanki | Não existe | Falta no React |
| **Minha Conta** | Nome, e-mail, alterar e-mail, telefone, objetivo financeiro, foto | Nome, avatar, e-mail (somente leitura) | Legado tem mais campos (telefone, objetivo) e alterar e-mail |
| **Segurança** | Alterar senha | Alterar senha (e-mail/senha); mensagem para Google | Paridade |
| **Privacidade** | Toggles (análise, personalização, marketing, etc.) | Toggles equivalentes, persistidos em `privacy` | Paridade |
| **Modo Família** | Convidar parceiro(a), aceitar convite, membros, metas família, perfis filhos (mesada, missões, conquistas) | Não existe | Falta no React |

**Resumo:** React cobre **conta (nome, avatar)**, **Segurança** e **Privacidade**; faltam **Visão Geral**, **Modo Família** e **mais campos** (telefone, objetivo, alterar e-mail).

---

## 13. Configurações

| Aspecto | Legado | React | Diferença |
|--------|--------|--------|-----------|
| **Seções** | Idioma, Meu Plano, Preferências Dashboard (modo caixa), Dados e Backup, Recomeçar, Categorias, Contas, Consultor IA, Integrações (HG, Binance, Corretoras), Telegram, WhatsApp, Tour, Ações rápidas, Insights | Backup JSON, Importar JSON/CSV, Gerar PDF, Recomeçar, Privacidade e termos | Legado tem muito mais: idioma, plano, integrações, Telegram/WhatsApp, tour, ações rápidas |
| **Backup / Importar / PDF** | Backup JSON, Exportar CSV, Importar, Recomeçar | Idem + Privacidade e termos (modais) | Paridade do núcleo de dados |
| **Tema** | Aparência (modo escuro/claro) | Não existe | Falta no React |
| **Idioma** | Seleção de idioma | Não existe | Falta no React |

**Resumo:** React cobre **backup, importar, PDF e recomeçar**; faltam **tema**, **idioma**, **plano**, **integrations** e **Tour**.

---

## 14. Módulos que só existem no legado

- **Conquistas** – Badges, gamificação, nível.
- **Relatórios** – Página com resumo, patrimônio, categorias, comparativo, cartões, metas, PDF, IA.
- **Calendário** – Eventos, vencimentos, faturas.
- **Crédito amigo** – Empréstimos entre amigos.
- **Consórcio amigos** – Poupança coletiva em grupo.
- **Modo Família** – Aba no Perfil (convite, casal, filhos).
- **Briefing pós-login** – Modal com KPIs e insight IA.
- **Registro (criar conta)** e **Verificação de e-mail** – Fluxos de auth.

---

## Como usar esta análise

1. **Ao ajustar um módulo no React:** abra este doc, vá ao módulo e confira a tabela "Diferença".
2. **Para comparação visual:** depois de corrigir o Playwright (config em ESM/CommonJS), rode `npm run test:compare` e compare `screenshots/compare/legado/` com `screenshots/compare/react/`.
3. **Priorize** itens marcados como "Falta no React" no doc e em `LACUNAS-VS-LEGADO.md` para chegar à paridade.
