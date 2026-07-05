# Auditoria e Curadoria do Sistema Legado — Sibanki

Documento de referência para auditorias periódicas do app legado em **sibanki.com.br** (ou virtus-financeiro-cd7bd.web.app/app).

---

## 1. Escopo da Auditoria

| Categoria | Itens |
|----------|-------|
| **Autenticação** | Login e-mail/senha, Google OAuth, recuperação de senha, verificação de e-mail |
| **Navegação** | Drawer, abas móveis, deep links |
| **Módulos principais** | Dashboard, Contas, Cartões, Lançamentos, Metas, Orçamento, Calendário |
| **Crescimento** | Investimentos, Consultor IA, Educação |
| **Social** | Família, Comunidade |
| **Sistema** | Relatórios, Conquistas, Configurações, Perfil |
| **Integrações** | Telegram, WhatsApp, Stripe, BRAPI, Resend |
| **Console/Segurança** | Erros JS, CSP, permissões Firestore |

---

## 2. Checklist por Módulo

### 2.1 Dashboard
- [ ] KPIs carregam (saldo, receitas, despesas)
- [ ] Gráficos renderizam sem erro
- [ ] Cards de primeiros passos funcionam
- [ ] Botões de ação (Lançar, Vincular Telegram) respondem
- [ ] FAB Consultor IA abre

### 2.2 Contas (Carteira)
- [ ] Lista de contas carrega
- [ ] Adicionar conta funciona
- [ ] Ajuste de saldo e transferência
- [ ] Sub-abas (Visão geral, Movimentações)

### 2.3 Cartões
- [ ] Lista de cartões carrega
- [ ] Adicionar cartão funciona
- [ ] Fatura e lançamentos por cartão
- [ ] Importar extrato (CSV/OFX/colar)

### 2.4 Lançamentos
- [ ] Abas: Lançar | Transferir | Fixos
- [ ] Formulário de lançamento completa
- [ ] Lista com filtros e paginação
- [ ] Editar e excluir lançamento

### 2.5 Metas
- [ ] Lista de metas carrega
- [ ] Criar/editar meta
- [ ] Aporte rápido e progresso visual

### 2.6 Orçamento
- [ ] Navegação por mês
- [ ] Renda e limites por categoria
- [ ] Barras de uso e alertas

### 2.7 Calendário
- [ ] Grade mensal renderiza
- [ ] Dias com lançamentos destacados
- [ ] Modal ao clicar no dia
- [ ] Adicionar lançamento no dia

### 2.8 Investimentos
- [ ] Sub-abas: Carteira | Análise B3 | Proventos | Simuladores | Perfil
- [ ] Cotação BRAPI carrega
- [ ] Busca por ticker
- [ ] Exportar PDF da carteira

### 2.9 Consultor IA
- [ ] Campo de chat e envio
- [ ] Resposta da IA (Gemini)
- [ ] Resumo IA do mês (se disponível)

### 2.10 Educação (Dicas)
- [ ] Trilhas/conteúdo carregam
- [ ] Progresso e badges

### 2.11 Família
- [ ] Convite por e-mail
- [ ] Aceitar/recusar convite
- [ ] Dashboard familiar compartilhado

### 2.12 Comunidade
- [ ] Feed de posts
- [ ] Criar post
- [ ] Curtir e comentar

### 2.13 Relatórios
- [ ] 6 abas (Resumo, Patrimônio, Categorias, Comparativo, Cartões, Metas)
- [ ] Gráficos e tabelas
- [ ] Exportar CSV/PDF

### 2.14 Conquistas
- [ ] Grid de badges
- [ ] Score Sibanki
- [ ] Próximo nível

### 2.15 Configurações
- [ ] Tema claro/escuro
- [ ] Idioma PT/EN
- [ ] Vincular Telegram e WhatsApp
- [ ] Categorias e contas customizadas
- [ ] Upgrade Pro (Stripe)

### 2.16 Perfil
- [ ] Dados do usuário
- [ ] Score e progresso
- [ ] Preferências

---

## 3. Execução Automatizada

### Comando
```bash
# Produção (sibanki.com.br)
$env:TEST_EMAIL="seu@email.com"
$env:TEST_SENHA="suasenha"
npx playwright test curadoria --project=curadoria

# Local (legado rodando em localhost:3000)
$env:LEGACY_BASE_URL="http://localhost:3000/app"
$env:TEST_EMAIL="seu@email.com"
$env:TEST_SENHA="suasenha"
npx playwright test curadoria --project=curadoria

# Staging Firebase
$env:LEGACY_BASE_URL="https://virtus-financeiro-cd7bd.web.app/app"
$env:TEST_EMAIL="seu@email.com"
$env:TEST_SENHA="suasenha"
npx playwright test curadoria --project=curadoria
```

### Artefatos
- `screenshots/curadoria/01-Dashboard.png` ... `17-Perfil.png` — screenshots de cada módulo
- `screenshots/curadoria/00-falha-login.png` — captura em caso de falha no login
- `screenshots/curadoria/curadoria-report.json` — relatório em JSON (erros, warnings, timings)

---

## 4. Critérios de Sucesso

| Critério | Aceitável |
|----------|-----------|
| Login | Conclusão em &lt; 60 s |
| Todos os módulos | Navegação sem crash |
| Erros críticos | 0 (permission, renderAll, is not defined, etc.) |
| CSP | Sem bloqueio de scripts essenciais |

---

## 5. Problemas Conhecidos (última auditoria)

Consultar `RELATORIO-CURADORIA.md` após cada execução para:

- Falhas de login (credenciais, cold start)
- Violações CSP (ex.: Cloudflare Insights)
- Erros de console recorrentes
- Módulos com falha de renderização

---

## 6. Fluxo Recomendado

1. **Antes do deploy:** rodar curadoria em staging/local.
2. **Após deploy:** rodar contra produção (sibanki.com.br).
3. **Mensalmente:** auditoria completa + atualização deste checklist.
4. **Ao alterar módulo:** validar paridade visual com `npm run test:compare`.
