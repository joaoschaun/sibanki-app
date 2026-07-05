# Análise profunda — Sibanki / Virtus Financeiro

Documento gerado a partir do código e do roadmap comercial 2026. Objetivo: entender o que já existe, o que falta e como tornar o projeto **único e revolucionário**.

---

## 1. Visão geral do projeto

| Aspecto | Situação atual |
|--------|-----------------|
| **Stack** | HTML/CSS/JS (SPA única ~15,6k linhas em `public/app/index.html`), Firebase (Auth, Firestore, Hosting, Functions Node 22), Stripe, BRAPI, Telegram, **WhatsApp (previsto)**, Gemini, jsPDF, Chart.js, PWA |
| **Deploy** | Firebase Hosting (`virtus-financeiro-cd7bd.web.app`), domínio sibanki.com.br |
| **Estrutura** | `public/` (app + landing + docs), `functions/` (Cloud Functions: Stripe, BRAPI, notícias, Telegram; **WhatsApp bot previsto**) |

---

## 2. Onboarding atual — o que já existe

### Fluxo de 4 passos (primeira vez)

1. **Boas-vindas** — "Bem-vindo ao Sibanki, [nome]!", subtítulo, "Vamos começar".
2. **Bancos** — Nubank, Inter, Itaú, Bradesco, BB, Outro (múltipla escolha obrigatória).
3. **Primeira conta** — Nome (preenchido pelos bancos) + saldo atual (R$).
4. **Parabéns** — Emoji 🎉, "Tudo pronto!", botão **"Lançar meu primeiro gasto"**.

**Persistência:** `onboardingDone: true` e `accounts` / `accountBalances` salvos no Firestore (`users/{uid}`).  
**Gatilho:** `maybeShowOnboarding()` após `loadData()` (se `!onboardingDone` e usuário logado).  
**Design:** Modal overlay (z-index 11000), barra "Passo X de 4", botões Voltar/Continuar, confete no passo 4 (se `confetti` disponível).

### Tour pós-onboarding (18 passos)

- Só roda **depois** que `onboardingDone === true` e não existe `localStorage.vrt_onb`.
- Cobre: Dashboard, Lançar, Recorrentes, Cartões, Carteira, Investimentos, Metas, Orçamento, Calendário, Família, Relatórios, IA, Notificações, Conquistas, Config, Segurança.
- Persistência: apenas `localStorage.setItem('vrt_onb','1')`. Pode ser refeito em Configurações.

### Lacunas do onboarding (vs roadmap e “revolucionário”)

| Lacuna | Impacto | Ação sugerida |
|--------|---------|----------------|
| Ao clicar "Lançar meu primeiro gasto" o modal fecha mas **não leva à aba Lançar** | Usuário fica no dashboard vazio e pode não descobrir onde lançar | Redirecionar para a aba **Lançar** ao finalizar onboarding |
| Nenhum incentivo a **importar extrato** no primeiro uso | Quem tem Nubank/Inter não vê valor imediato | Opcional: passo extra "Quer importar seu extrato?" ou card pós-onboarding "Importar CSV" |
| Nome padrão "investidor" se `U.name` vazio | Boas-vindas menos pessoais | Já existe fallback; garantir que Auth/displayName estejam preenchidos no registro |
| Sem **skip** explícito (só o X) | Usuário avançado pode achar forçado | Manter X; opcional: "Pular por agora" no passo 1 |

---

## 3. Funcionalidades já implementadas (checklist roadmap)

| Item do roadmap | Status | Observação |
|----------------|--------|------------|
| **Onboarding 4 telas** | ✅ | Boas-vindas, bancos, conta, parabéns + Firebase |
| **Feedback visual (toasts)** | ✅ | `toast(msg, type)` usado em vários fluxos; loading em botões em pontos críticos (ex.: login) |
| **Importação CSV/OFX** | ✅ | Nubank, Inter, Itaú, C6 (detecção de colunas), OFX, preview (`renderImportPreview`) |
| **IA proativa** | Parcial | `smartNotifs()` envia notificações (saudação, alerta gastos, meta perto, fatura). **Falta:** card fixo "Insight do Dia" no topo do dashboard |
| **Relatórios PDF** | ✅ | jsPDF + autoTable; várias abas no relatório |
| **Modo Família** | ✅ | Casal (convites, Firestore `couples`/`invites`), filhos, mesadas, missões |
| **Bot Telegram** | ✅ | Webhook, vinculação por código, funções (alertas, notícias, relatório) |
| **Landing** | ✅ | `public/index.html` (hero, features, CTA); app em `/app` |

---

## 4. O que falta para ser “único e revolucionário”

### 4.1 Experiência do primeiro uso (onboarding + dia 1)

- **Redirecionar para Lançar** ao clicar "Lançar meu primeiro gasto" (fechar modal + `go('lanc', ...)`).
- **Primeiro lançamento guiado:** opcionalmente destacar o formulário (ex.: borda ou tooltip "Adicione seu primeiro gasto aqui").
- **Pós-onboarding:** card ou botão em destaque "Importar extrato (Nubank/Inter)" na primeira vez que o dashboard carrega após onboarding.

### 4.2 IA que “aparece” sem o usuário pedir

- **Card "Insight do Dia"** no topo do dashboard (como no roadmap):
  - Gerado automaticamente ao abrir o app.
  - Regras baseadas em dados reais: gasto da semana vs média, meta perto do prazo, fatura fechando, saldo + meta de investimento.
  - Botão "Novo insight" e "Ver detalhes" (abre Consultor IA com contexto).
- Manter e reforçar as **smartNotifs** já existentes (notificações no sino).

### 4.3 Importação sem atrito

- Já existe: CSV (Nubank, Inter, Itaú, C6), OFX, preview.
- **Reforçar:** tela de revisão com edição de categoria por item, totais (receitas/despesas) e mensagem final "X lançamentos importados".
- **Diferencial:** sugestão de categoria por IA (Gemini) a partir da descrição quando a coluna de categoria não existir ou for genérica.

### 4.4 Relatórios PDF que “vendem” o app

- Capa com logo e título "Relatório Financeiro Mensal — [Mês] [Ano]".
- Resumo executivo (cards + gráfico Receitas vs Despesas).
- Detalhamento por categoria (pizza + tabela + top 5).
- Rodapé em todas as páginas (logo + página + data).
- Cores de marca consistentes (ex.: azul #1A237E, verde #2E7D32 do roadmap).

### 4.5 Modo Família como produto

- Convite por e-mail com link direto e status "Aguardando aceite de [email]".
- Dashboard do casal: gráfico lado a lado (eu vs cônjuge), saldo combinado, metas compartilhadas.
- Mesadas: confete ao completar missão, histórico de pagamentos, notificação aos pais, aprovação/reprovação de missão.

### 4.6 Telegram como “superpoder”

- Lançamento por linguagem natural ("gastei 45 no almoço") já no escopo do roadmap; verificar se o bot atual já faz parsing e gravação.
- Comandos `/saldo` e `/mes` para consulta rápida.
- Alertas automáticos (conta a pagar, meta atingida, orçamento estourado).
- Perguntas livres à IA com contexto do usuário (Gemini + dados Firestore).

### 4.6.1 Bot WhatsApp (previsto)

- **Objetivo:** ofertar o mesmo conceito do bot Telegram (lançar gastos, saldo, resumo, alertas) via **WhatsApp**, para apresentação a investidores no app gratuito e evolução para recursos premium quando o app estiver comercializado.
- **Implementação:** WhatsApp Business API (provedor/BSP); reutilizar lógica de lançamento e comandos já existente no Telegram; custo por conversa (janela 24h), principalmente no Brasil.
- **Posicionamento:** bot no plano gratuito para demo e aquisição; no plano pago, alertas automáticos, relatórios agendados e/ou limite maior de interações.

### 4.7 Landing e conversão

- Landing profissional (hero, problema/solução, funcionalidades, depoimentos, planos, CTA) em `public/index.html` ou `landing.html`.
- Mensagem clara em <10 segundos: "Controle total das finanças com IA + Bot Telegram + Modo Família — grátis para sempre".
- Planos Grátis vs Pro (tabela comparativa) e CTA final.

### 4.8 Diferenciais “revolucionários” (idéias)

- **Score de saúde financeira** visível no dashboard (já existe indicador de “health” em algum lugar? Reforçar e explicar em 1 frase).
- **Previsão de fim do mês:** "Com esse ritmo, você termina o mês com R$ X" (baseado em média diária e despesas recorrentes).
- **Um toque para o Telegram:** após onboarding, "Quer lançar gastos pelo Telegram? Vincule em 30 segundos" com link/código.
- **Comunidade:** já existe aba Comunidade (posts, curtidas); transformar em "dicas da comunidade" ou desafios mensais para engajamento.

---

## 5. Priorização sugerida (próximos passos)

| Ordem | Ação | Esforço | Impacto |
|-------|------|--------|--------|
| 1 | **Onboarding:** ao clicar "Lançar meu primeiro gasto", redirecionar para aba Lançar | Baixo | Alto (fecha lacuna principal do primeiro uso) |
| 2 | **Card "Insight do Dia"** no dashboard (IA proativa visível) | Médio | Alto (diferencial de produto) |
| 3 | **Revisão da importação:** garantir edição de categoria + totais + mensagem de sucesso | Baixo/Médio | Alto (reduz atrito) |
| 4 | **PDF profissional:** capa, resumo, rodapé, cores de marca | Médio | Médio (compartilhamento e imagem) |
| 5 | **Landing:** hero + valor em 10s + planos + CTA | Médio | Alto (captação) |
| 6 | **Modo Família e Telegram:** polish (convite, dashboard casal, comandos/alertas) | Alto | Alto (retenção e viralidade) |

---

## 6. Conclusão

O Sibanki já tem **base sólida** (onboarding 4 passos, importação CSV/OFX, IA no consultor, notificações inteligentes, Família, Telegram, relatórios, Stripe). Para ser **único e revolucionário**:

1. **Feche a experiência do primeiro uso:** redirecionar para Lançar ao terminar o onboarding e destacar "primeiro gasto" ou "importar extrato".
2. **Torne a IA visível:** card "Insight do Dia" no dashboard e notificações já existentes.
3. **Importação e PDF:** polish na revisão pré-importação e identidade visual do PDF.
4. **Landing e planos:** mensagem clara e tabela Grátis vs Pro.
5. **Família e Telegram:** transformar em pilares de produto (convite, dashboard casal, comandos e alertas no bot).
6. **Bot WhatsApp:** previsto na documentação; mesmo conceito do Telegram (lançar, saldo, alertas), via WhatsApp Business API, para demo/investidores e depois oferta premium no pago.

Este documento pode ser usado como referência para prompts no Cursor/Claude (por exemplo: "Implemente o redirecionamento do onboarding para a aba Lançar" ou "Adicione o card Insight do Dia no dashboard conforme ANALISE_PROJETO_SIBANKI.md").
