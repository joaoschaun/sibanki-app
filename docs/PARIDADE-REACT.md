# Paridade React – o que temos e o que falta

Objetivo: o app React ter **tudo** que o app legado tem. Este doc lista o que já está no React e o que falta, com ordem sugerida para implementar.

**Lacunas detalhadas:** para uma lista completa do que o legado tem e o React ainda não tem, veja **[LACUNAS-VS-LEGADO.md](./LACUNAS-VS-LEGADO.md)**.

---

## ✅ Já temos no React

| Módulo | O que está pronto |
|--------|-------------------|
| **Auth** | Login e-mail/senha + Google, **Criar conta** (registro com verificação de e-mail), **Esqueci a senha** (sendPasswordResetEmail), logout |
| **Dashboard** | Totais (receita, despesa, saldo, qtd lançamentos), score, link Novo lançamento |
| **Lançamentos** | Lista, busca, filtros (tipo, categoria, conta, período), **CRUD completo** (novo, editar, excluir), botão **Gerar PDF** na página |
| **Contas** | Lista, saldos, total, **Nova conta**, **Ajustar saldo**, **Extrato**, **Editar conta** (nome, tipo, cor, incluir na soma), **Excluir conta** |
| **Cartões** | Lista (nome, limite, fechamento, vencimento, bandeira, cor), **Novo cartão**, **Editar/excluir cartão**, **Fatura** (resumo por mês, compras, total), **Lançar na fatura** (com parcelas), excluir compra |
| **Planejamento** | **Metas**: lista, barra de progresso, **Nova meta**, editar, excluir |
| **Crescimento** | **Investimentos**: lista, totais aplicado/atual, **Registrar**, editar valor atual, excluir; **Proventos** (registrados como receitas na categoria Proventos/Dividendos); **Simulador** de juros compostos (valor inicial, aporte mensal, taxa a.a., prazo) |
| **Social** | Perfil comunidade (apelido, cor), feed (coleção `community`), publicar, curtir, salvar, **Ranking** (abas Feed/Ranking; ranking mensal por pts/posts/curtidas; pódio top 3; prêmios) |
| **Perfil** | Nome, avatar (upload Storage), **Segurança** (alterar senha para conta e-mail/senha), **Privacidade** (toggles: análise IA, personalização, marketing, parceiros, relatórios – persistidos em `users/{uid}.privacy`), exibição na sidebar e header |
| **404** | Página não encontrada para rotas inexistentes |
| **Orçamento** | Página Orçamento: lista categorias, gasto vs limite, definir/alterar limite por categoria |
| **Contas** | **Extrato** por conta (modal ao clicar na conta ou no ícone lista) |
| **Configurações** | Backup JSON, **Importar JSON**, **Importar CSV**, **Gerar relatório PDF** (resumo do mês, lançamentos, despesas por categoria), Recomeçar do zero, **Privacidade e termos** (modal Termos de Uso e Política de Privacidade), **Tema claro/escuro** |
| **Consultor IA** | Página chat que chama Cloud Function `chatApi` com contexto financeiro (receita, despesa, metas, contas, etc.) |
| **Educação** | Página Educação (`/educacao`): cards estáticos com dicas (reserva de emergência, 50-30-20, rotativo, investir, revisar custos, metas); link para Consultor IA |
| **Recorrentes** | Página Recorrentes: lista, totais, **Novo recorrente**, **Gerar lançamentos do mês** (cria entries a partir dos ativos, evita duplicata por rcTag), excluir |

---

## ❌ O que falta (em ordem sugerida)

### 1. Crescimento – além da carteira
- **Análise B3**: mesma lógica do legado (cotação, screener) – chamar Cloud Function existente (ex.: `brapiQuote`) se houver.
- **Simuladores**: calculadora juros compostos, etc. (pode ser só front, sem backend).
- **Perfil do investidor**: suitability (perguntas e resultado); ver onde fica no legado (Firestore / `investorProfile`).

### 2. Consultor IA ✅
- Página **Consultor IA** (`/consultor-ia`): chat que chama a Cloud Function `chatApi` com contexto financeiro (receita/despesa do mês, saldo, categorias, metas, contas, investimentos, orçamentos, cartões). Mesmo comportamento que o legado.

### 3. Configurações ✅ (backup e recomeçar feitos)
- Página **Configurações** (`/configuracoes`):  
  - Backup JSON (exportar `users/{uid}`).  
  - “Recomeçar do zero” (apagar lançamentos, metas, contas, investimentos; manter conta de login).  
  - Outras opções que existam no legado (ex.: tema, notificações).

### 4. Perfil – abas completas
- **Minha Conta**: email, alterar nome (já temos). ✅ **Segurança**: alterar senha (Firebase Auth reauthenticate + updatePassword) para usuários e-mail/senha; mensagem para quem entrou com Google.
- ✅ **Privacidade**: toggles (análise IA, personalização, marketing, parceiros, relatórios) – persistidos em `users/{uid}.privacy`.
- **Modo Família**: se o legado tiver (convidar, compartilhar), replicar fluxo e dados.

### 5. Educação / Dicas ✅
- Página **Educação** (`/educacao`): cards estáticos com dicas (reserva de emergência, regra 50-30-20, evitar rotativo, investir consistente, revisar assinaturas, metas claras). Conteúdo pode ser ampliado ou vindo de Firestore depois.

### 6. Social – extras
- ✅ **Ranking**: Aba Ranking na página Social; ranking mensal calculado a partir do feed (pts = posts×3 + likes×2 + comments); ordenação por Pontos / Posts / Curtidas; pódio top 3; lista completa; prêmios (texto estático). Dados do feed (sem leitura de `community_ranking` no Firestore por simplicidade).
- **Notícias** (feed de notícias; no legado pode ser `loadCommNews`) – opcional.
- **Grupos** (se existirem no legado) – opcional.

### 7. Outros do legado
- ✅ **Importar extrato/CSV**: na página Configurações – CSV com cabeçalho Data,Tipo,Descrição,Categoria,Valor,Conta; JSON mescla lançamentos, investimentos, metas, orçamentos, categorias, contas.
- ✅ **Recorrentes**: página `/recorrentes` – lista, novo, excluir, totais; **Gerar lançamentos do mês** (procRc): gera entries do mês atual a partir dos ativos (tag rc_id_ym evita duplicata).
- ✅ **Cartões – faturas**: Detalhe da fatura por cartão e mês; Lançar na fatura (com parcelas); compras com `billingMonth`; exclusão de compra (e entries com `cardPurchaseId`). Persistência: `getBillingMonth`, `addCardPurchase`, `deleteCardPurchase`.
- ✅ **Relatórios/PDF**: em Configurações – botão “Gerar relatório PDF” (jsPDF + jspdf-autotable): capa, resumo financeiro, lançamentos do mês, despesas por categoria.

---

## Ordem prática de implementação

1. **Dashboard rico** (gráficos + consultoria) – impacto alto, usa dados que já temos.  
2. **Orçamento** – usa `budgets` / `orcamentosByMonth`, completa “planejamento”.  
3. **Contas – extrato por conta** – rápido (só filtrar `entries` por conta).  
4. **Configurações** – backup e “recomeçar do zero”.  
5. **Consultor IA** – integrar Function existente.  
6. **Crescimento** – Análise B3, simuladores, perfil investidor.  
7. **Perfil** – abas Segurança/Privacidade e Modo Família (se existirem).  
8. **Educação, Social (ranking/notícias), importar extrato, recorrentes, PDF** – conforme prioridade de uso.

---

## Dados e backend

- **Firestore**: continuar usando o mesmo doc `users/{uid}` e as mesmas coleções (ex.: `community`). Nada mudar de modelo só por causa do React.
- **Cloud Functions**: reutilizar as que o legado já usa (chatApi, brapiQuote, etc.); o React só chama via HTTPS callable ou REST.
- **Storage**: mesmo bucket (avatars, etc.).

Quando uma funcionalidade do legado for replicada no React, pode-se esconder ou redirecionar o mesmo fluxo no legado (ex.: “Use o novo app”) até desativar o legado por completo.
