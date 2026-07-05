# Arquitetura futura do ecossistema Sibanki

Este documento registra uma visão evolutiva da arquitetura para suportar o crescimento do produto em direção a um **ecossistema financeiro completo**, com múltiplos módulos (investimentos, crédito, seguros, família, open finance, tokenização) e potenciais parcerias white label.

O objetivo **não é** reescrever o app agora, mas orientar decisões futuras para que o código atual possa convergir naturalmente para essa arquitetura.

---

## 1. Estado atual (2026)

- **Front-end**: SPA React web (Vite), com um app único (`/`), rotas por módulo (Dashboard, Lançamentos, Contas, Cartões, Crescimento, Social, Perfil, Configurações).
- **Backend / dados**:
  - Firebase Auth (e‑mail/senha + Google).
  - Firestore (`users/{uid}`) como fonte principal de dados.
  - Cloud Functions pontuais (ex.: `chatApi`, B3 via Brapi).
- **Módulos principais entregues**:
  - Financeiro pessoal (lançamentos, contas, cartões, orçamento, recorrentes).
  - Crescimento (investimentos, proventos, perfil do investidor, análise B3).
  - Social/comunidade, educação, consultor IA.

Conclusão: hoje temos um **monólito front-end bem organizado**, adequado para evolução rápida de produto e validação de features.

---

## 2. Visão futura de alto nível

À medida que o produto escalar para:

- Múltiplos **módulos comissionados / white label** (crédito, seguros, consórcios, investimentos via parceiros diferentes),
- Integrações oficiais com **Open Finance** (parceiros como Cumbuca, Klavi etc.),
- Possível **tokenização** de ativos (carteira, emissão, custódia),

a arquitetura alvo é:

- **Super App / Micro-frontends** no front-end:
  - App “host” carregando mini‑apps/micro-frontends independentes por domínio (Investimentos, Crédito, Seguros, Família).
  - Cada módulo com seu ciclo de deploy, time e até parceiro diferente.
- **Clean Architecture + BFF no backend**:
  - Regras de negócio separadas de integrações com bancos, bureaus e parceiros.
  - Um **Backend for Frontend (BFF)** consolidando dados de Open Finance e do ecossistema antes de expor para o app e para a IA.
- **Serviços especializados para IA e tokenização**:
  - Consultor IA como microserviço dedicado, consumindo dados consolidados do BFF.
  - Camada de tokenização e custódia isolada (compliance Bacen/CVM), com o app apenas como interface/“wallet”.

---

## 3. Evolução recomendada (sem reescrever tudo agora)

### 3.1. Modularização forte dentro do SPA React

Sem mudar a tecnologia base, estruturar o front-end em **módulos de domínio** claros, por exemplo:

- `modules/investimentos` (Crescimento: carteira, proventos, B3, perfil do investidor).
- `modules/cartoes`
- `modules/contas`
- `modules/lancamentos`
- `modules/social`
- `modules/familia`
- `modules/config`

Cada módulo deve concentrar:

- Rotas do domínio.
- Hooks específicos de dados.
- Serviços de API (BFF/Firestore/partners).
- Componentes de UI de alto nível.

Isso prepara o código para uma futura extração em **micro-frontends (Module Federation)** sem exigir reescrita.

### 3.2. Backend for Frontend (BFF) para IA e Open Finance

Antes de micro-fronts, introduzir um BFF que:

- Recebe `uid` e compõe a visão financeira consolidada do usuário:
  - Lançamentos, metas, orçamentos, contas, cartões, investimentos, perfil do investidor.
  - Futuramente: dados agregados de Open Finance (saldos e transações bancárias).
- Expõe endpoints específicos para:
  - **Consultor IA** (chat financeiro contextualizado).
  - Relatórios, alertas, recomendações de otimização.

Benefícios:

- Reduz acoplamento do front com Firestore e múltiplos serviços.
- Permite trocar provedores de Open Finance sem tocar no app.

### 3.3. Contratos para módulos white label

Mesmo antes de separar repositórios, definir **interfaces claras** entre o app principal e futuros módulos:

- Dados de entrada que o módulo requer (perfil, renda, score, contexto financeiro).
- Eventos de saída que o módulo gera (contrato emitido, empréstimo aprovado, simulação concluída).

Esses contratos podem ser expressos hoje em **types TypeScript** e, no futuro, se tornam:

- Interface para micro-frontends carregados via Module Federation.
- Contratos para apps externos plugados via WebView/SDK.

---

## 4. Quando considerar Micro-frontends e Super App

Adotar micro-frontends, Module Federation e um “Super App” faz sentido quando:

- Há **múltiplos times** e **múltiplos parceiros** operando módulos distintos com ritmo próprio.
- O app mobile (React Native) precisar:
  - Atualizar módulos sem republicar binário (CodePush/OTA).
  - Trocar parceiros de white label sem quebra da experiência do usuário.

Até lá, um SPA React bem modular, com BFF e contratos de domínio bem definidos, entrega a maior parte dos benefícios com menos complexidade operacional.

---

## 5. Resumo

- **Agora**: manter o SPA React, modularizar por domínios e introduzir um BFF para IA/Open Finance.
- **Médio prazo**: evoluir para micro-frontends e super app **apenas** quando:
  - Houver múltiplos parceiros/módulos white label,
  - Houver necessidade real de deploy/desacoplamento independente.
- **Longo prazo**: serviços dedicados de IA e tokenização, com o app atuando como camada de experiência e orquestração.

Esta visão deve ser revisitada periodicamente conforme o produto e o time crescem.

