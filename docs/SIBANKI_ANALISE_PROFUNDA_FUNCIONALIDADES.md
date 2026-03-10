# Sibanki — Análise profunda: o que já temos (e que muitos nem imaginam)

**Data:** 08 de Março de 2026  
**Base:** código-fonte (public/app, functions) + staging

---

## 1. Estrutura do menu (15 módulos + Perfil)

O app está organizado em **4 blocos** no drawer lateral:

| Bloco | Módulos |
|-------|--------|
| **Principal** | Dashboard, Contas, Cartões, Lançamentos |
| **Planejamento** | Orçamento, Metas, **Calendário** |
| **Crescimento** | Investimentos, **Consultor IA**, **Educação** |
| **Social** | **Família**, **Comunidade** |
| **Sistema** | **Relatórios**, **Conquistas**, Configurações |

Além disso: **Perfil** (acesso pelo header do drawer, avatar + nome).

---

## 2. Dashboard

- **KPIs em tempo real:** saldo mensal, receitas, despesas, saldo previsto.
- **Widgets editáveis:** o usuário pode escolher o que ver (gráficos, resumo, etc.).
- **Promo Importar extrato:** card que leva a Cartões → Importar (Nubank, Inter, Itaú, C6).
- **Promo Telegram:** “Vincule o Telegram para receber insights no celular” com botão Vincular.
- **Primeiros passos:** checklist de 5 passos (ex.: adicionar conta, primeiro lançamento); ao concluir, celebração com ícones Lucide e card some.
- **Dicas contextuais** e **alertas** (ex.: limite de categoria, meta).
- **Upgrade Pro:** CTA para plano pago.

---

## 3. Contas (Carteira)

- **Múltiplas contas:** lista de contas bancárias com saldo.
- **Contas padrão sugeridas:** Nubank, Inter, Itaú, Bradesco, BB, Caixa, Santander, C6, PagBank, Neon, Safra, BTG, Sicoob, Sicredi, Original, Mercado Pago, PicPay, XP, Rico, Clear, Modal, Pan, Will Bank, Next, Agi, Dinheiro (26 opções).
- **Categorias personalizadas:** usuário pode adicionar/remover categorias (além das padrão).
- **Ajuste de saldo** e **transferências** entre contas.
- **Abas por conta:** “Visão geral” e “Movimentações”.
- **Importar extrato:** na seção Cartões, mas usado para lançamentos em conta (CSV Nubank/Inter/Itaú/C6, OFX ou colar texto da fatura).

---

## 4. Cartões

- **Múltiplos cartões:** nome, bandeira (Visa, Master, Elo, Amex, Hipercard, Outra), limite, dia de fechamento, vencimento.
- **Resumo por cartão:** uso (%), saldo, vencimento.
- **Fatura:** visualização de lançamentos por cartão; resumo (total, parcelas).
- **Importar extrato/fatura:** CSV, OFX ou colar texto; seleção de cartão destino e formato.
- **Promo no dashboard:** “Importe seu extrato Nubank, Inter, Itaú ou C6 em segundos”.

---

## 5. Lançamentos

- **Abas:** Lançar | Transferir | Fixos.
- **Lançamento simples:** tipo (Despesa/Receita), valor, descrição, data, categoria (com ícones), subcategoria, conta/cartão, status (Pago), forma de pagamento, **tags**, **parcelas**.
- **Transferência:** conta origem → conta destino.
- **Fixos/Recorrentes:** tipo, valor, categoria, **frequência (mensal)**, **dia do mês**.
- **Filtros avançados:** por período, categoria, conta, tipo, etc.
- **Lista de lançamentos** com edição e exclusão.

---

## 6. Orçamento

- **Navegação por mês** (setas anterior/próximo).
- **Renda mensal** configurável.
- **Limites por categoria:** 15+ categorias (Moradia, Transporte, Alimentação, Saúde, Bem-estar, Educação, Lazer, Cartões, Empréstimo, Assinaturas, Salário, Investimentos, Transferência, Outros, etc.).
- **“Adicionar categorias”** ao orçamento (customização).
- **Visualização de uso** (barra de progresso por categoria).

---

## 7. Metas

- **Tipos pré-definidos:** Reserva de emergência, Viagem, Entrada imóvel, Carro.
- **Campos:** nome, valor alvo, valor atual, prazo, cor.
- **Cálculo:** “Quanto guardar por mês”.
- **Dicas por tipo de meta.**
- **Marcos (badges):** ex. “Meta atingida” com animação.
- **Quick-add:** botão para aporte rápido na meta.

---

## 8. Calendário

- **Visão mensal** com navegação (mês anterior/próximo).
- **Dias com lançamentos** destacados.
- **Modal ao clicar no dia:** lista de lançamentos daquele dia; possível adicionar novo.
- **Layout full-screen** em mobile (aba ocupa tela inteira).

---

## 9. Investimentos

- **Sub-abas:** Minha Carteira | **Análise B3** | Proventos | Simuladores | Perfil.
- **Minha Carteira:** lista de ativos, valor investido, valor atual, retorno; botões “Nova Compra”, “Registrar Venda”, “Atualizar Cotações”, **“Exportar” (PDF)**.
- **Análise B3 (tempo real):**
  - Busca por ticker (PETR4, VALE3, ITUB4, etc.).
  - Chips rápidos: ações (PETR4, VALE3, …), FIIs (HGLG11, XPML11, MXRF11, …), BDRs (AAPL34, AMZO34, …).
  - Gráfico de preço (período configurável).
  - KPIs: preço, variação, volume, etc.
  - Para FIIs: dados de fundos (dividend yield, etc.).
  - Perfil da empresa (texto).
  - Dividendos: tabela e gráfico.
  - Balanço e Demonstrativo de resultado (se disponível na API).
- **Proventos:** registro e visão de proventos.
- **Simuladores:** (mencionados na estrutura).
- **Perfil de investidor:** preenchimento e sugestões.
- **Integração:** Brapi (cotações, busca, multi, crypto, inflação); menção a “XP, Clear, BTG, Modal, Inter Invest” (em desenvolvimento).
- **Exportar carteira em PDF.**

---

## 10. Consultor IA

- **Chat com IA (Gemini)** no app: perguntas em linguagem natural.
- **RAG (conhecimento embutido):** reserva de emergência, imprevistos, dívidas, seguros, consórcio, empréstimos, como usar o Sibanki, comportamento financeiro, vieses, livros/princípios, investimentos.
- **Instruções de sistema:** consultor financeiro pessoal; pode sugerir lançamentos, metas, orçamento; tom empático e proativo.
- **Resumo IA do mês:** overlay com resumo gerado pela IA.
- **Uso proativo:** pergunta contextual (ex.: “Você gastou X em Y; quer dica?”) ao abrir a aba.
- **Configurações:** exibição de uso (loadIAUsage) em Configurações.
- **FAB (botão flutuante):** em algumas telas, abre o chat da IA.

---

## 11. Educação (Dicas)

- **Conteúdo de educação financeira** (trilhas, textos, dicas).
- **Progresso:** badge “finEduProgress” (percentual).
- **Integração com o resto do app** (metas, orçamento, reserva).

---

## 12. Família (Modo casal / família)

- **Convite por e-mail:** envio do link de convite + **Cloud Function `sendFamilyInviteEmail`** (template HTML por Resend).
- **Convite por link:** geração de link e código; “Copiar link” e **“Enviar por e-mail”**.
- **Aceitar/Recusar convite:** notificação no app (“Convite para Família Sibanki!”); aceitar vincula e libera “Dashboard familiar”.
- **Abas:** Parceiro(a) | Filhos.
- **Parceiro(a):** fluxo de convite (e-mail do convidado, nome do convidador); status “Aguardando aceite de [email]”; aceite abre visão compartilhada.
- **Filhos:** conceito de “child” (badges, mesada, etc.) — estrutura presente (child-badge, locked/unlocked).
- **Abertura por deep link:** `#invite=ID` para aceitar convite.

---

## 13. Comunidade

- **Feed de posts:** usuários compartilham dicas, análises, conquistas, dúvidas, discussões.
- **Categorias de post:** Dica, Análise, Dúvida, **Conquista**, Discussão (com badges visuais).
- **Badges de usuário:** nível (level), founder, top.
- **Campo de texto:** “Compartilhe uma dica, analise, conquista ou duvida…” (max 500 chars).
- **Notificação:** badge de novos posts (commNotifBadge).
- **Prêmios:** “Os melhores ganham badges exclusivas e descontos reais!” — 1º lugar: “15% OFF + Badge Ouro” (melhor rentabilidade ou constância do mês).

---

## 14. Relatórios

- **6 abas:**
  1. **Resumo** — resumo mensal, visão geral.
  2. **Patrimônio** — evolução do patrimônio.
  3. **Categorias** — ranking de categorias (despesas), distribuição (pizza), evolução Top 5 (gráfico).
  4. **Comparativo** — comparação entre períodos.
  5. **Cartões** — foco em cartões.
  6. **Metas** — evolução das metas.
- **Exportar CSV** (lançamentos).
- **Geração de PDF:** “Resumo Financeiro”, “Despesas por Categoria” (cabeçalhos e tabelas no código).

---

## 15. Conquistas

- **Sistema de badges:** grid de conquistas (15+); cada uma com emoji, nome, descrição, data de desbloqueio.
- **Estados:** locked (bloqueada, opacidade/grayscale) e unlocked (destaque, borda dourada, animação).
- **Score Sibanki:** pontuação global (ex.: 0–100); exibida no drawer (“Score: 70”), no perfil (anel de progresso “68 de 100”) e na aba Conquistas.
- **Próximo nível:** sugestão (ex.: “Pague R$ 800 do cartão em 2 meses” para subir ao Score 80).
- **Celebração ao desbloquear:** efeito com ícones Lucide (sparkles, star, trophy).
- **Importar dados (importar.html):** script que, além de lançamentos, pode popular “achievements” (ex.: “6 conquistas desbloqueadas”).

---

## 16. Configurações

- **Tema:** claro / escuro (body.light).
- **Idioma:** PT-BR e English (i18n.js; `sibanki_lang` no localStorage).
- **Bot Telegram:**
  - “Vincule sua conta ao Telegram para consultar saldo, cotações, receber alertas e conversar com a IA.”
  - **Gerar código** → grava em `telegramCodes` (expira ~10 min) → usuário envia no Telegram `/start SEU_CODIGO`.
  - **checkTelegramLink:** lê `users/{uid}.telegramChatId` e exibe “Telegram vinculado! @nick” ou “Desvincular”.
- **Resumo semanal por e-mail:** toggle (resumoSemanalEmail); preferência salva em Firestore; Cloud Function **weeklySummary** (segunda 8h BRT) envia e-mail com resumo da semana (receitas, despesas, top categorias).
- **Notificações:** preferências de alertas (login, senha, dispositivo, bloqueio, resumo).
- **Categorias e contas:** adicionar/remover categorias e contas personalizadas.
- **Plano:** badge Gratuito / Pro / Família; upgrade para Pro (Stripe).

---

## 17. Perfil

- **Dados do usuário:** nome, e-mail, foto (avatar no drawer).
- **Badge de plano** (Free/Pro/Família).
- **Score Sibanki:** número + anel de progresso (ex.: 68/100) e texto “Próximo nível: Score 80” com dica.
- **Preferências:** resumo semanal por e-mail (toggle).
- **Seção “Minha Conta”** e demais dados de perfil (aplicados via applyDocFromServer, loadPerfilData).

---

## 18. Autenticação e segurança

- **Login:** e-mail/senha e **Google** (OAuth).
- **Registro:** criar conta + **Cadastrar com Google**.
- **Verificação de e-mail:** Cloud Function **sendVerificationEmail** (link de verificação Firebase + envio via Resend).
- **Recuperação de senha** (fluxo Firebase).
- **Mensagem de pé:** “Dados criptografados - Sibanki”.

---

## 19. Backend (Cloud Functions)

| Função | Descrição |
|--------|-----------|
| **createCheckout / createPortal / getUserPlan** | Stripe: assinatura, portal do cliente, plano do usuário. |
| **stripeWebhook** | Webhook Stripe (pagamentos, assinaturas). |
| **brapiQuote / brapiMulti / brapiSearch / brapiCrypto / brapiInflation** | Brapi: cotações, múltiplos ativos, busca, crypto, inflação. |
| **getNews** | Agregador de notícias (RSS + fontes BR). |
| **sendFamilyInviteEmail** | Convite família: e-mail HTML (Resend) com link e código. |
| **sendVerificationEmail** | Reenvio de verificação de e-mail (Resend). |
| **weeklySummary** | Agendado (segunda 8h BRT): e-mail de resumo semanal para quem tem resumoSemanalEmail === true. |
| **chatIA** (ou equivalente) | Chat com Gemini + RAG para o Consultor IA. |

---

## 20. Telegram Bot (functions/telegramBot.js)

- **Vinculação:** usuário gera código no app → envia `/start CODIGO` no Telegram → bot associa `telegramChatId` e `telegramUsername` ao usuário.
- **Comandos/respostas:** consulta de saldo, cotações, alertas e **conversa com IA** pelo chat do Telegram.
- **Helpers:** sendMessage, getUserByChatId, getUserByLinkCode, formatação de moeda, validação de ticker BR.
- **Integração com Firestore:** `telegramCodes`, `users.telegramChatId` / `telegramUsername`.

---

## 21. Outros recursos de UX e técnicos

- **i18n:** pt-BR e en; troca sem recarregar (menu e textos principais).
- **Tema claro/escuro:** variáveis CSS (--bg, --t1, --card, etc.) e classe body.light.
- **Drawer lateral:** desktop (sidebar fixa) e mobile (overlay); separadores visuais (Planejamento, Crescimento, Social, Sistema).
- **Notificações in-app:** sino com badge; lista de notificações (marcar lidas, limpar); tipos: login, senha, device, bloqueio, resumo.
- **Toasts:** ok (verde), err (vermelho), info (azul).
- **Tour por módulo:** startModuleTour / getModuleTourSteps para metas, lançamentos, orçamento, cartões, contas, ia, config.
- **FAB (botão flutuante):** em algumas views para abrir o Consultor IA.
- **PWA/Service Worker:** sw.js para cache e uso offline.
- **Importar dados em lote:** importar.html (Virtus/Paloma) — importação de 115 lançamentos para um usuário; estrutura pronta para “seed” de dados e conquistas.

---

## 22. Resumo quantitativo (o que “a gente nem imagina”)

| Categoria | Quantidade / detalhe |
|-----------|----------------------|
| **Módulos de menu** | 15 + Perfil |
| **Abas em Relatórios** | 6 (Resumo, Patrimônio, Categorias, Comparativo, Cartões, Metas) |
| **Sub-abas em Investimentos** | 5 (Carteira, Análise B3, Proventos, Simuladores, Perfil) |
| **Conquistas** | 15+ badges + score 0–100 |
| **Contas padrão** | 26 nomes |
| **Cloud Functions** | Stripe (4), Brapi (5), News, Family Invite, Verify Email, Weekly Summary, Chat IA |
| **Idiomas** | 2 (pt-BR, en) |
| **Temas** | 2 (escuro, claro) |
| **Canais de saída** | App, E-mail (Resend), Telegram (bot) |
| **Importação** | CSV, OFX, colar texto (Nubank, Inter, Itaú, C6) |
| **Exportação** | CSV (lançamentos), PDF (carteira investimentos, resumo/relatórios) |

---

## Conclusão

O Sibanki já é um **ecossistema grande**: controle financeiro completo (contas, cartões, lançamentos, fixos, transferências), planejamento (orçamento, metas, calendário), investimentos com **Análise B3 em tempo real** e exportação PDF, **Consultor IA** com RAG e Gemini, **Educação**, **Família** com convite por e-mail e link, **Comunidade** com feed e prêmios, **Relatórios** em 6 visões e exportação CSV/PDF, **Conquistas** e Score, **Telegram** (vinculação + bot), **resumo semanal por e-mail** agendado, **i18n** e **tema claro/escuro**, Stripe para monetização e verificação de e-mail.

Muita coisa que se compara ao GranaZen (painel, categorias, múltiplas contas, relatórios, modo família, notificações/e-mail) **já existe**; o que falta é principalmente **WhatsApp**, **categorização automática por IA**, **lembretes inteligentes** e **OCR**. Esta análise serve para valorizar o que já está construído e priorizar apenas o que realmente falta.
