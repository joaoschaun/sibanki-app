# Visão de Plataforma – Sibanki, Parceiros e Sibcoin (Polygon)

Este documento não é sobre telas, e sim sobre **plataforma**: como os dados, os produtos financeiros de parceiros, o token Sibcoin e a IA se encaixam em um ecossistema único.

---

## 1. Camadas da plataforma

### 1.1. Camada de identidade & dados financeiros

- **Firebase Auth**: identidade única do usuário (e-mail/senha, Google).
- **Firestore default**:
  - Documento principal `users/{uid}`:
    - Transações: `entries[]`.
    - Contas: `accounts[]`, `accountBalances`, `accountMeta`, `accountCesta`.
    - Cartões: `cards[]` (faturas, compras, parcelas).
    - Metas e orçamento: `goals[]`, `budgets`, `orcamentosByMonth`.
    - Investimentos: `investments[]` (carteira, proventos, B3).
    - Preferências: `dashboardLayout`, `privacy`, `onboarding`, `primeirosPassos`, flags diversas.
    - Perfil avançado: `investorProfile`, dados de planejamento, score financeiro.
    - Integrações: campos para WhatsApp/Telegram, flags de resumo semanal, etc.
  - Coleções complementares:
    - `community` (posts públicos).
    - `invites` (convites de Família).
    - Futuras coleções para open finance, crédito, consórcios, seguros, etc.

Essa camada é o **“cérebro de estado”** do usuário: tudo que a IA e as jornadas usam vem daqui.

### 1.2. Camada de produtos financeiros (via parceiros)

Integrações externas, sempre abstraídas por Cloud Functions/serviços:

- **Open Finance / Open Banking** (ex.: Pluggy):
  - Conecta bancos, cartões, investimentos externos.
  - Sincroniza saldos, lançamentos e posições para o `users/{uid}`.
  - Mantém histórico de consentimento, data de última sincronização, erros.
- **Crédito**:
  - Ofertas white label (bancos, fintechs, parceiros).
  - Pré-aprovação baseada em comportamento financeiro e dados de renda/comprometimento.
  - Jornada de contratação (simulação → proposta → aceite → acompanhamento).
- **Consórcios**:
  - Grupos white label ou próprios (como evolução do “Consórcio Amigos”).
  - Status de participação, contemplação, pagamentos.
- **Seguros**:
  - Cotações e apólices (vida, residencial, cartão, renda).
  - Eventos: renovação, sinistros, descontos atrelados ao comportamento.
- **Investimentos & Cripto**:
  - Ações, FIIs, ETFs, fundos, cripto.
  - API de mercado (já existe camada Brapi / notícias / índices).
  - Conectores de corretoras e exchanges (Binance, corretoras locais).

Todos esses produtos são expostos para o usuário como **cards/jornadas no app**, mas vistos pelo backend como **pipelines de dados e eventos**.

### 1.3. Camada de tokenomics – Sibcoin em Polygon

- **Sibcoin**:
  - Token emitido em **Polygon** (baixos custos, alta velocidade).
  - Funções principais:
    - **Recompensa**: por uso, disciplina financeira, missões, desafios, indicações, contribuição na comunidade.
    - **Moeda interna**: desconto em planos, acesso a features PRO, upgrades, vantagens em produtos parceiros.
    - **Troca entre usuários**: Família, Credi Amigo/Consórcio, desafios em grupo, prêmios comunitários.
- **Conexão on-chain ↔ off-chain**:
  - Off-chain: saldo e histórico de Sibcoin por usuário em Firestore (snapshot para UX rápida e IA).
  - On-chain: carteiras (wallets) do usuário na Polygon, contratos do token, regras on-chain (staking, pools, etc.).
  - Bridges:
    - Funções que:
      - Escutam eventos on-chain relevantes (transferências Sibcoin envolvendo endereços do app).
      - Sincronizam esses eventos para o `users/{uid}` (para IA, relatórios, gamificação).
      - Disparam transações on-chain com base em ações off-chain (ex.: completar missão → mint/transfer Sibcoin).

### 1.4. Camada de experiência IA (orquestrador)

- **Consultor IA (chat + insights)**:
  - Usa Functions (`chatApi`, `proactiveInsightApi`, `briefingIa`) para:
    - Ler estado financeiro consolidado (snapshot das finanças).
    - Ler estado de uso de produtos (quais integrações e produtos o usuário já tem).
    - Ler estado de engajamento/gamificação (missões, conquistas, Sibcoin).
  - Atua como **orquestrador de jornada**:
    - Sugere próximos passos financeiros.
    - Sugere produtos (de parceiros) coerentes com o momento e perfil.
    - Sugere ações que geram Sibcoin (ex.: completar meta, estudar, convidar alguém).
- **Insights proativos**:
  - Funções agendadas que analisam:
    - Fluxo de caixa, dívidas, metas, orçamento, investimentos.
    - Uso (ou não uso) de recursos como Família, Educação, Comunidade.
  - Geram:
    - Alertas, dicas, “missões” específicas.
    - Recomendações de produtos ou upgrades (ex.: plano PRO).

### 1.5. Camada social/gamificada (evolução do usuário)

- **Família**:
  - Vínculos entre usuários (adultos/crianças).
  - Painéis compartilhados, metas em conjunto, ranking familiar, desafios.
- **Comunidade**:
  - Feed, grupos, ranking global, prêmios.
  - Conteúdo educativo, desafios, trilhas de aprendizado.
- **Conquistas & Missões**:
  - Badges, XP, missões diárias/semanais/mensais.
  - Evolução de níveis (Iniciante → Intermediário → Avançado → Mentor, etc.).
- **Afiliado & Colaborador**:
  - Papel de usuário que:
    - Indica novos usuários.
    - Cria conteúdo para a comunidade.
    - Ajuda a moderar/mentorar.
  - Remunerado em Sibcoin (e eventualmente rede de afiliados off-chain).

Essa camada é onde a plataforma vira **ecossistema humano + financeiro**, não só um app.

---

## 2. Como o legado já representa essa visão

O app legado em `/app` hoje já funciona como **protótipo vivo dessa visão**:

- Centraliza tudo em `users/{uid}` + coleções (`community`, `invites`, etc.).
- Tem módulos que já testam:
  - Família (vínculos, filhos, painéis).
  - Credi Amigo e Consórcio Amigos (microprodutos financeiros P2P).
  - Conquistas, calendário, relatórios avançados, educação gamificada.
  - Investimentos com B3 + simuladores + IR.
  - Comunidade com feed, grupos, prêmios, ranking.
- O consultor IA e os insights já interagem com esse contexto.

Por isso, o legado **não é apenas “código velho”**: ele é o **laboratório funcional** da visão de plataforma.

---

## 3. Papel do React nessa história

O app React em `src/` deve ser:

- A **nova casca de experiência** (UI/UX moderna, performance, acessibilidade, manutenção).
- Uma base mais modular para:
  - Plug-and-play de parceiros (Pluggy, white labels de crédito, consórcio, seguros, cripto).
  - Evolução rápida das jornadas IA.
  - Entrada e saída de features gamificadas sem “quebrar” tudo.

Sem perder de vista que:

- Enquanto React não cobre um pedaço importante do ecossistema (Família completo, Credi Amigo/Consórcio, Conquistas, Relatórios avançados, educação gamificada), o **legado continua sendo o “cliente PRO”**.
- A migração ideal é vista como:
  - **Fase 1** – React domina o CORE (controle financeiro pessoal + IA).
  - **Fase 2** – React absorve os módulos que são pré-requisito para produtos de parceiros + Sibcoin (Família, Conquistas básicas, relatórios essenciais, comunidade enriquecida).
  - **Fase 3** – React passa a ser a porta principal do ecossistema (parceiros + Sibcoin + IA orquestrando tudo), e o legado é aposentado com rollback fácil.

---

## 4. Próximos passos práticos (alto nível)

1. **Mapear em Firestore campos necessários para Sibcoin e tokenomics**:
   - Estruturas como `users/{uid}.sibcoinBalance`, `sibcoinHistory[]`, flags de nível/missões/afiliado.
2. **Definir contrato mínimo de dados para parceiras (Pluggy, crédito, consórcios, seguros, cripto)**:
   - Quais campos precisamos ler/gravar para que o consultor IA e o motor de recompensa possam “ver” que o usuário adotou um produto e como está usando.
3. **Desenhar a jornada de “evolução do usuário”**:
   - Do ponto de vista de dados/eventos: que ações disparam XP, conquistas, Sibcoin, upgrades.
4. **Escolher 1 piloto**:
   - Ex.: Open banking com Pluggy + missão/XP/Sibcoin associada (conecta banco → ganha XP/Sibcoin → IA passa a usar dados consolidados).
5. **Implementar primeiro no React, sem desligar o legado**:
   - Assim o legado continua sendo o laboratório rico, e o React passa a ser o “portal” para as novas experiências baseadas em parceiros + Sibcoin.

Este documento serve como **bússola** para que, ao mexer em qualquer tela ou módulo, a pergunta seja sempre: “como isso conversa com os parceiros, com o Sibcoin e com o consultor IA, na visão de plataforma?”.+

