# Lacunas do app React em relação ao legado

Este documento lista **o que o app legado tem e o React ainda não tem** (ou tem de forma mais simples), para orientar o fechamento da paridade.

---

## Visão geral

| Área | Legado | React | Lacuna |
|------|--------|-------|--------|
| **Abas principais** | Dashboard, Lançamentos, Cartões, Investimentos, Metas, Contas, Perfil, Config, IA, Dicas, **Conquistas**, **Relatórios**, **Calendário**, **Crédito amigo**, **Consórcio amigos**, Comunidade, **Modo Família** | Dashboard, Lançamentos, Cartões, Recorrentes, Planejamento, Orçamento, Crescimento, Social, Consultor IA, Educação, Perfil, Configurações | Faltam: Conquistas, Relatórios (página dedicada), Calendário, Crédito/Consórcio amigos, Modo Família como aba |
| **Auth** | Login, Registro, Esqueci senha, Verificação e-mail, Google, **convite Família** | Login, Registro, Esqueci senha, Verificação e-mail, Google | Falta: banner convite Família |
| **Pós-login** | **Briefing modal** (KPIs + insight IA) | — | Falta: modal de boas-vindas com resumo do dia e insight IA |

---

## 1. Dashboard

| Item | Legado | React |
|------|--------|-------|
| Totais do mês (receita, despesa, saldo) | ✅ | ✅ |
| Variação % vs mês anterior | ✅ | ✅ |
| Gráfico despesas por categoria (donut) | ✅ | ✅ |
| Gráfico evolução 6 meses (linha) | ✅ | ✅ |
| Bloco consultoria/alertas (orçamento, saldo, fatura) | ✅ | ✅ |
| **Editar layout** (reordenar/esconder widgets, Sortable, salvar `dashboardLayout` no Firestore) | ✅ | ❌ |
| **Widget “Primeiros passos”** / onboarding | ✅ | ❌ |

---

## 2. Cartões

| Item | Legado | React |
|------|--------|-------|
| Lista de cartões, novo cartão | ✅ | ✅ |
| **Sub-aba Lançar** (lançar na fatura com parcelas) | ✅ | ✅ (modal Lançar) |
| **Sub-aba Importar** (CSV/OFX/colar texto da fatura da operadora) | ✅ | ❌ |
| Sub-aba Fatura (resumo por mês, compras, totais) | ✅ | ✅ (seção Detalhe da fatura) |
| Modal “Ver fatura” por cartão | ✅ | ✅ (seção + botão Fatura no card) |
| Excluir compra da fatura | ✅ | ✅ |
| **Editar/excluir cartão** | ✅ | ✅ |
| **Anuidade** (valor, cobrança mensal) | ✅ | ❌ |
| **Bandeira, banco, cor** no cadastro | ✅ | Parcial (bandeira e cor no cadastro; banco ainda não) |

---

## 3. Crescimento / Investimentos

| Item | Legado | React |
|------|--------|-------|
| Minha Carteira (lista, registrar, editar valor, excluir) | ✅ | ✅ |
| **Análise B3** (cotação, screener – Cloud Function `brapiQuote`) | ✅ | ❌ |
| **Proventos** (lista + modal “Registrar provento”: ticker, tipo, valor, data) | ✅ | ✅ (registrados como receitas na categoria Proventos/Dividendos) |
| Simuladores (juros compostos, etc.) | ✅ | ✅ (um simulador) |
| **Perfil do investidor** (suitability, perguntas, resultado em `investorProfile`) | ✅ | ❌ |

---

## 4. Perfil

| Item | Legado | React |
|------|--------|-------|
| Visão Geral (stats, resumo) | ✅ | ❌ |
| Minha Conta (nome, e-mail, avatar) | ✅ | ✅ |
| Segurança (alterar senha) | ✅ | ✅ |
| Privacidade (toggles) | ✅ | ✅ |
| **Modo Família** (convidar, aceitar convite, casal, filhos, desvincular) | ✅ | ❌ |

---

## 5. Social / Comunidade

| Item | Legado | React |
|------|--------|-------|
| Feed (publicar, curtir, salvar) | ✅ | ✅ |
| **Notícias** (aba, `loadCommNews`) | ✅ | ❌ |
| Ranking (mensal, pódio, prêmios) | ✅ | ✅ |
| **Grupos** (aba) | ✅ | ❌ |
| **Prêmios** (aba dedicada) | ✅ | Parcial (texto dentro de Ranking) |
| Perfil comunidade (apelido, cor) | ✅ | ✅ |

---

## 6. Funcionalidades que não temos no React

| Funcionalidade | Descrição no legado |
|----------------|----------------------|
| **Conquistas** | Aba “Conquistas” (badges, achievements, gamificação). |
| **Relatórios** | Aba “Relatórios” (gráficos/relatórios além do PDF em Config). |
| **Calendário** | Aba “Calendário” (eventos, vencimentos, faturas). |
| **Crédito amigo / Consórcio amigos** | Abas específicas (fluxos de empréstimo/consórcio entre usuários?). |
| **Registro (criar conta)** | Tela “Criar conta” (e-mail/senha + Google). |
| **Verificação de e-mail** | Tela “Verifique seu e-mail” + reenviar + “Já verifiquei”. |
| **Briefing pós-login** | Modal com KPIs do dia e “Insight IA”. |
| **i18n** | Legado usa `data-i18n` e `i18n.js` para múltiplos idiomas. |

---

## 7. Contas

| Item | Legado | React |
|------|--------|-------|
| Lista, nova conta, ajustar saldo | ✅ | ✅ |
| Extrato por conta (modal ao clicar) | ✅ | ✅ |
| **Excluir conta** | ✅ | ✅ |
| **Meta por conta** (incluir na soma, cor) | ✅ | ✅ (UI de tipo/cor/incluir na soma por conta) |

---

## 8. Orçamento

| Item | Legado | React |
|------|--------|-------|
| Lista categorias, orçado vs gasto, definir limite | ✅ | ✅ |
| Alertas “X% acima do orçado” no dashboard | ✅ | ✅ (consultoria) |
| **Orçamento por mês** (`orcamentosByMonth`) | ✅ | Verificar se React usa |

---

## 9. Configurações

| Item | Legado | React |
|------|--------|-------|
| Backup JSON, importar JSON/CSV, PDF, recomeçar, Privacidade e termos | ✅ | ✅ |
| **Tema (claro/escuro)** | ✅ | ✅ |
| **Notificações** | ✅ | ❌ |

---

## Priorização sugerida para “chegar perto” do legado

1. **Alto impacto, dados já existem**  
   - Editar layout do Dashboard (opcional mas visível).  
   - Cartões: Importar fatura (CSV/OFX/colar).  
   - Perfil: Modo Família (convite/aceitar pelo menos).

2. **Médio impacto**  
   - **Briefing** pós-login (modal com KPIs + insight IA).  
   - Crescimento: **Análise B3** (se a Cloud Function existir).  
   - Cartões: **editar/excluir cartão**.

3. **Abas/funcionalidades inteiras do legado**  
   - **Conquistas** (aba completa).  
   - **Relatórios** (página dedicada).  
   - **Calendário**.  
   - Social: **Notícias**, **Grupos**.  
   - Crescimento: **Perfil do investidor**.

4. **Refino**  
   - Tema claro/escuro.  
   - i18n no React.  
   - Crédito amigo / Consórcio amigos (se ainda forem usados).

---

*Atualizado a partir do legado (index.html + app.js) e do React atual. Use junto com `PARIDADE-REACT.md`.*
