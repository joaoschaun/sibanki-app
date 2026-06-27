# CHANGELOG — Sibanki / virtus-financeiro

Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Datas no formato `YYYY-MM-DD` (ISO 8601). Linguagem: PT-BR.

> **Política:** este é o changelog incremental do projeto. Use-o para registrar
> features fechadas, bug fixes, mudanças de governança IA, etc., **por sessão**.
> Não use o `CLAUDE.md` para acumular histórico de sessão (a regra está em
> `AGENTS.md` §8).
>
> O histórico antigo, anterior à introdução deste arquivo (26/04/2026), pode
> estar em `CLAUDE.md` (seções "ATUALIZAÇÃO DE SESSÃO …") até que seja migrado
> manualmente para cá. O CHANGELOG raiz (`/CHANGELOG.md`) é o changelog
> orientado a usuário/produto; este aqui é orientado a engenharia.

---

## [Unreleased]

### Cadastro Manual de Passivos & Correção de Onboarding (27/06/2026, Antigravity)

- **Hub de Crédito Manual (`/credito`)**:
  - Implementado formulário e modal de cadastro de Empréstimos, Financiamentos e Consignados manuais em [CreditHub.tsx](file:///c:/Users/jscha/virtus-financeiro/src/pages/CreditHub.tsx).
  - Adicionado suporte a conversão de juros anual para juros mensal canônico (`interestRatePct`) necessário para os engines de soberania financeira e Spread Gap.
  - Adicionados botões de editar e excluir nos cards de passivos para gestão de ciclo de vida de dados manuais.
- **Correção de Fluxo do Modo Coach**:
  - Ajustado o validador de onboarding (`useCoachActive.ts` e `CoachSetup.tsx`) para permitir que a etapa "Registre suas dívidas" seja cumprida ao cadastrar **ou** dívidas estruturadas **ou** cartões de crédito. Isso destrava o onboarding para usuários 100% manuais que não possuem empréstimos tradicionais.

### Generative UI no Assistente IA (CECI) (26/06/2026, Antigravity)

- **Experiência Unificada**:
  - Migrada a página principal do Consultor (`Consultant.tsx`) e o chat drawer global (`ConsultantDrawer.tsx`) para consumir o estado compartilhado e streaming em tempo real via `ConsultantSessionContext.tsx`.
- **Renderização de Generative UI**:
  - Criado o componente [GenerativeUiContainer.tsx](file:///c:/Users/jscha/virtus-financeiro/src/components/consultant/GenerativeUiContainer.tsx) capaz de interceptar o marcador `[UI_PAYLOAD]` do streaming da IA e renderizar widgets React nativos e interativos:
    - **Mini-Budgets**: Progresso dos envelopes de orçamento da Metodologia ZBB.
    - **Mini-Transactions**: Transações recentes com logomarcas dos estabelecimentos (`MerchantLogo`) e pontuação de soberania (`SovereigntyBadge`).
    - **Mini-Goals**: Barra de progresso dos objetivos ativos do usuário.
    - **Mini-Chart**: Gráficos de área usando Recharts para tendências históricas e cotações.
- **Enriquecimento do Contexto**:
  - Adicionado suporte a formatação das últimas transações no prompt de contexto (`src/utils/consultantContext.ts`) para que o LLM consiga construir os payloads de transações com precisão.
  - Atualizadas as instruções do prompt de sistema (`functions/services/llm/sovereignSystemPrompt.js`) orientando o LLM a gerar tags `[UI_PAYLOAD]` para consultas financeiras, incluindo suporte a gráficos históricos.

### Autenticação Biométrica Nativa via Capacitor (26/06/2026, Antigravity)

- **Autenticação Biométrica Nativa (Mobile)**:
  - Instaladas dependências `@capgo/capacitor-native-biometric` e `@capacitor/app`.
  - Criado o componente [BiometricGuard.tsx](file:///c:/Users/jscha/virtus-financeiro/src/components/ui/BiometricGuard.tsx) para controlar o bloqueio do app com overlay seguro e solicitação de biometria nativa (digital/Face ID).
  - Integrado o `BiometricGuard` em [App.tsx](file:///c:/Users/jscha/virtus-financeiro/src/App.tsx) encapsulando o `AuthenticatedShell`.
  - Adicionado toggle para ativação/desativação da autenticação biométrica em [Settings.tsx](file:///c:/Users/jscha/virtus-financeiro/src/pages/Settings.tsx) com detecção nativa (habilita apenas no mobile e mostra indisponível no navegador/web).

### Otimização de Layout e Limpeza de Onboarding no Dashboard (26/06/2026, Antigravity)

- **Layout Grid de Duas Colunas**:
  - Reorganizado o layout principal do Dashboard (`Dashboard.tsx`) em duas colunas (`lg:grid-cols-3`): coluna esquerda (2/3) com métricas e análises principais; coluna direita (1/3) com widgets secundários e insights.
- **Card de Gráficos Unificado**:
  - Consolidado os três gráficos de análise visual (Categorias, Evolução e Saldo Acumulado) em um único contêiner tabulado reativo para reduzir a altura em 66%.
- **Limpeza de Redundâncias de Onboarding**:
  - Removido o checklist duplicado de `"Primeiros Passos"` local e seu estado de ativação no `WidgetConfig`.
  - Adicionado suporte a exibição condicional: quando o usuário está no estado completamente vazio (zero contas e zero lançamentos), os quadros de `"Modo Coach"` e `"Próximas Ações"` são ocultados para manter o foco exclusivo no banner de boas-vindas do Sibanki.

### Correção de Notificações Push e CORS do Chat Stream (26/06/2026, Antigravity)

- **Correção da Chave VAPID**:
  - Identificada e corrigida a capitalização da chave VAPID/Messaging (`VITE_VAPID_KEY`) nos arquivos `.env` e `.env.production`. A chave continha caracteres incorretos (ex: `z` vs `Z`, `I` vs `l`), o que causava o erro de assinatura `messaging/token-subscribe-failed` e impedia a geração do token do dispositivo.
- **Correção de CORS no Chat Stream**:
  - Separadas as opções de execução da callable `chatStreamApi` no `functions/index.js`, definindo `chatStreamOptions` sem `enforceAppCheck`. Isso liberou o preflight OPTIONS (que por padrão não envia o token de App Check) evitando erros de CORS no console do front-end.
- **Suporte ao App Check Debugger**:
  - Configurado suporte automático para App Check Debugger em localhost e ambientes staging (`staging-13a0b.web.app`) em `src/firebase.ts` para evitar que chaves de reCAPTCHA restritas a produção travem a inicialização do banco em testes locais.
- **Telemetria de Notificações**:
  - Injetado log detalhado passo a passo (`[PushTelemetry]`) no hook `usePushNotifications.ts` para mapear todas as etapas de inicialização, registro do Service Worker e gravação no Firestore.
- **Validação e Deploys**:
  - Realizado deploy de staging e de produção com sucesso (`npm run deploy:staging`, `firebase deploy --only functions:chatStreamApi` e `npm run deploy:app`). O fluxo de ativação foi testado e validado como funcional, registrando os tokens no Firestore com badge de Push Notifications marcado como **🟢 Ativo**.

### Alinhamento de Emojis, Melhorias Nativas (Capacitor) e App Check (25/06/2026, Antigravity)


- **Padronização de Emojis e Iconografia**:
  - Unificado o uso de emojis para transações financeiras: `📈` para Receitas, `📉` para Despesas e `💰` para Investimentos.
  - Atualizado o mock chat da Landing Page (`LandingPage.tsx`), resumo mensal do bot de WhatsApp (`whatsappCommandHandler.js`), mensagens/confirmações e resumos do bot do Telegram (`telegramBot.js`).
  - Substituído o uso de emojis brutos nas subabas de lançamento e botões de ação na listagem de transações (`Transactions.tsx`) por ícones vetoriais de alta fidelidade da biblioteca Lucide.
- **Melhorias de Layout Móvel e Acessibilidade**:
  - Inserido um botão central proeminente com ícone de `Mic` (Lançar) no `BottomNavigation.tsx` que abre o painel da CECI (IA) globalmente.
  - Ajustado padding-top e padding-bottom em elementos fixos (Header, Sidebar, BottomNavigation, ConsultantDrawer) para respeitar as safe areas (`env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`) do Capacitor.
  - Implementado resets táteis nativos em `index.css` (remover highlight de toque, prevenir scroll de recarga elástica e seleção de texto em botões).
- **Google App Actions e Shortcuts Nativos**:
  - Criado `android/app/src/main/res/xml/shortcuts.xml` definindo a capacidade `custom.actions.intent.ADD_TO_SIBANKI` integrada com Google Assistant e atalho rápido tátil para o launcher do Android.
  - Registrado o arquivo de shortcuts e string labels no `AndroidManifest.xml` e `strings.xml`.
- **Firebase App Check Backend**:
  - Atualizado as funções callables críticas `ocrToEntry` e `sttToEntry` em `functions/index.js` (e `assistantController.js`) para suportarem verificação do token App Check quando a flag `ENFORCE_APP_CHECK` estiver ativa.
- **Testes & Garantia de Qualidade**:
  - Criado o arquivo de teste `tests/mobile-viewport.spec.cjs` testando o layout e safe areas em iPhone SE e Pixel 5 simulados no Playwright (2/2 testes passando).
  - Executados os testes de unidade frontend (170/170 passando) e de backend das Cloud Functions (293/293 passando).
  - Efetuado deploy em produção do frontend (`npm run deploy:app`) e das funções modificadas (`ocrToEntry`, `sttToEntry`).

### Conclusão Retroativa de Missões do SibCoin (22/06/2026, Antigravity)

- **Conclusão e Crédito Retroativo**:
  - Atualizado o callable `getSibcoinMissions` em [rewardEngine.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/sibcoin/rewardEngine.js) para processar de forma retroativa e automática missões do tipo `once` cujos critérios estáticos já estejam preenchidos no documento do usuário (como lançamentos, objetivos e investimentos existentes).
- **Testes Unitários do Backend**:
  - Criado o arquivo de teste [rewardEngine.test.js](file:///c:/Users/jscha/virtus-financeiro/functions/tests/rewardEngine.test.js) validando o fluxo de missões retroativas com mock de Firestore.
- **Melhorias no Mock do Firestore**:
  - Modificado [firestoreMock.js](file:///c:/Users/jscha/virtus-financeiro/functions/tests/helpers/firestoreMock.js) para aceitar atualizações de chaves em dot-notation (aninhamento), suporte a deep merge recursivo de objetos e transações parciais por `update`.
- **Validação**:
  - Executados os testes de backend (`npm run test` na pasta `functions/`) $\rightarrow$ **293/293 testes passando**.
  - Executados os testes do frontend (`npm run test:unit` na raiz) $\rightarrow$ **130/130 testes passando**.
  - Executado build de produção do SPA (`npm run build`) $\rightarrow$ Compilado com sucesso absoluto.

### Desacoplamento de Contextos (Deus Context) do Sibanki (22/06/2026, Antigravity)

- **Separação de Responsabilidades (Subcontextos)**:
  - Criado o [AuthContext.tsx](file:///c:/Users/jscha/virtus-financeiro/src/context/AuthContext.tsx) para gerenciar o estado da sessão de autenticação do Firebase (`onAuthStateChanged`) e calcular claims administrativas (`isAdmin`).
  - Criado o [FinancialDataContext.tsx](file:///c:/Users/jscha/virtus-financeiro/src/context/FinancialDataContext.tsx) para gerenciar o carregamento de dados do Firestore em tempo real (2 listeners singleton: dados do usuário e `entriesOverflow`), syncs do Open Finance (manual e auto-sync) e telemetria do funil de ativação de marketing.
  - Criado o [SibcoinContext.tsx](file:///c:/Users/jscha/virtus-financeiro/src/context/SibcoinContext.tsx) para processar passivamente em segundo plano os triggers de SibCoin (streak de login e conexão de Open Finance).
- **Fachada Retrocompatível**:
  - Reestruturado o [AppContext.tsx](file:///c:/Users/jscha/virtus-financeiro/src/context/AppContext.tsx) para atuar como fachada integradora. Ele aninha os Providers especializados e monta um selector unificado para garantir compatibilidade total sem quebrar nenhum dos 43 consumidores que utilizam `useAppContext()`.
- **Isolamento de Renderizações (useAuthContext.ts)**:
  - O hook [useAuthContext.ts](file:///c:/Users/jscha/virtus-financeiro/src/hooks/useAuthContext.ts) foi desacoplado de `useAppContext` e agora consome diretamente do `AuthContext` real. Componentes focados apenas em autenticação não re-renderizam mais quando dados financeiros mudam no Firestore.
- **Validação & Garantia de Qualidade**:
  - Executado build de produção com sucesso (`npm run build`).
  - Executados os testes de unidade com sucesso (`npm run test:unit`), obtendo 100% de aproveitamento (**128/128 testes passando**).
- **Deploy**:
  - Deploy efetuado em produção (`npm run deploy:app`) na URL https://virtus-financeiro-cd7bd.web.app sob autorização explícita.

### Melhoria Estética na Landing Page — Logos de Bancos e Marcas nas Transações (19/06/2026, Antigravity)

- **Substituição de Círculos Genéricos por Logos**: Na seção Open Finance da landing page (`landing/index.html`), os círculos puramente coloridos que representavam os bancos mockados foram substituídos por versões com seus respectivos logotipos SVG inline (Nubank, Itaú, Bradesco, Banco do Brasil e um indicador neutro e elegante de "+8" contas).
- **Substituição de Emojis de Transações por Logos de Marcas**: Os emojis genéricos da lista de transações simulada no mock da landing page foram substituídos por logotipos SVG de alta definição das respectivas marcas:
  - `Supermercado Zona Sul` (Alimentação) → `Pão de Açúcar` (logotipo oficial em verde/limão).
  - `Streaming anual` (Assinatura) → `Netflix` (logotipo do "N" em fita vermelha tridimensional).
  - `Delivery 23h47` (Gasto por impulso) → `McDonald's` (logotipo dos arcos dourados sobre fundo vermelho).
  - `Salário ACME Ltda` (Receita) → Ícone vetorial limpo de maleta de trabalho (substituindo o emoji de pasta).
- **Aprimoramento Visual**: Ambas as mudanças trazem maior realismo, profissionalismo e sofisticação estética alinhada com as diretrizes do design system Pierre Finance do Sibanki.

### Port Health Check + SibCoin para o admin REACT + correção de deploy (16/06/2026, Claude)

Correção: o admin operacional do João é o **React** (`src/admin/`, servido em
`sibanki-admin.web.app` via target `admin`), não o vanilla `public/admin/index.html`.
As duas primeiras versões (entradas abaixo) foram feitas no admin vanilla por engano.

- **Novas páginas React:** `src/pages/admin/AdminHealth.tsx` (lê `/api/health`, KPIs +
  tabela por serviço com bolinhas verde/âmbar/vermelho + botão Atualizar) e
  `src/pages/admin/AdminSibcoin.tsx` (form e-mail+quantidade+motivo; resolve email→uid
  pela lista do `adminGetData` e chama `adminCreditSibcoin` via `fnsBR`).
- **Wiring:** rotas `health` e `sibcoin` em `src/admin/main.tsx`; itens de nav (ícones
  `Activity`/`Coins`) em `src/admin/AdminLayout.tsx`.
- Seguem o padrão de `AdminPlanos.tsx` (tokens `si-*`, `fnsUS`/`fnsBR`, toast por estado).
  Validação: `tsc` isolado das 2 páginas → 0 erros (só o falso-positivo de `import.meta.env`
  do firebase.ts, esperado fora do tsconfig do projeto).
- **Deploy correto:** `npm run deploy:app` (o admin React é buildado pelo Vite via
  `admin.html` e publicado nos targets `app`/`admin` a partir de `dist/`). O
  `deploy:legado` sugerido antes estava errado (publica `public/` em outro domínio).
- Edições no admin vanilla (`public/admin/index.html`) foram mantidas (inofensivas;
  também sobem via `dist/admin/` no `deploy:app`), mas o canônico é o React.

### UI de SibCoin (crédito manual) no admin (16/06/2026, Claude)

Segundo item do `docs/ROADMAP-GESTAO-AUTONOMA.md` (Bloco B, item 7).

- `public/admin/index.html`: nova seção **SibCoin** (grupo "Operação") com formulário
  e-mail + quantidade + motivo. `creditSibcoin()` resolve e-mail→uid via
  `users.where('email','==',…)` (mesmo padrão de `setUserPlan`) e chama a callable
  `adminCreditSibcoin` na região correta (`firebase.app().functions('southamerica-east1')`).
- Não grava saldo direto: delega à Function, que faz transação atômica + tier +
  histórico (slice 50). Atualiza `allUsers` localmente no sucesso; trata erros com badge.
- Sem alterações de backend. Sem deploy nesta sessão.

### Painel Health Check no admin (16/06/2026, Claude)

Primeiro item executado do `docs/ROADMAP-GESTAO-AUTONOMA.md` (Bloco B, item 6).

- `public/admin/index.html`: nova seção **Health Check** (grupo de navegação "Operação")
  que consome o endpoint `GET /api/health` da função `api` (CORS `origin:true`) e
  renderiza: status geral (OPERACIONAL/DEGRADADO + latência), contadores
  (saudáveis / não configurados / com erro) e tabela por serviço (Firestore, Auth,
  DeepSeek, Gemini, Stripe, Resend, WhatsApp, Pluggy, Lomadee, Monetizze, Motor de
  Cashback) com badge verde/amarelo/vermelho. Botão "Atualizar" + timestamp.
- `loadHealth()` classifica cada serviço: `ok`/`configured`→verde, `missing`→amarelo,
  `error`/`invalid`→vermelho. Trata API offline (sem resposta) com card OFFLINE.
- Sem alterações de backend (o `/health` já existia). Sem deploy nesta sessão.
- **Nota operacional:** durante a edição, o mount Linux do sandbox travou numa cópia
  truncada do arquivo; o arquivo real (validado via Read no Windows) está íntegro e o
  snippet JS passou em `node --check`. Não houve corrupção do arquivo do projeto.

### Admin completo + separação + governança Claude-only (16/06/2026, Claude)

**Módulos ligar/desligar (Phase 1)**
- `src/constants/appModules.ts`: registro único dos 22 módulos de navegação (4 essenciais não-desligáveis). `src/hooks/useModuleFlags.ts`: lê `config/modules` (listener singleton). `Sidebar`/`BottomNavigation` escondem módulos desligados; `ModuleGuard` (App.tsx) redireciona acesso direto por URL a módulo off.

**Config escopada por ambiente (env switch)**
- `config/modules` e `config/featureFlags` passam a guardar `{ prod: {...}, staging: {...} }`. `src/utils/environment.ts` (`getAppEnv` pelo hostname) faz o app ler a fatia do seu ambiente; switch Staging|Produção no admin escolhe qual editar. Permite testar toggles no staging sem afetar prod (mesmo Firebase project compartilhado).

**Métricas reais (Phase 2)**
- `functions/services/admin/adminDataService.js`: CF `adminGetData` (Admin SDK, claim admin) agrega `users` + `platform_events` → counts/MRR/ativação/série(cadastros+DAU)/uso-por-módulo. Substitui leituras client-side bloqueadas pelas rules e os gráficos `Math.random()`. Telemetria `module_viewed` no app (1x/módulo/sessão). CF `adminSetPlan` (muda plano via Admin SDK).

**Firestore rules**
- `isAdmin()` (claim `admin`) + regra top-level `config/{doc}` (lê: autenticado; escreve: admin) — **conserta as feature flags, que nunca funcionaram em prod** (config era negado pelo catch-all). Regras p/ `/feedbacks` (admin lê/atualiza) e `/admin_posts` (admin read+write).

**Acesso admin**
- Coleção `admins` estava vazia (ninguém tinha acesso). Registrado `admins/joaoschaun@gmail.com` + claim `admin:true` (conta era só-Google → reset de senha p/ login e-mail/senha).

**Admin React SEPARADO do app**
- Admin migrado do painel vanilla para React, depois **extraído para deploy próprio** (`admin.html` + `src/admin/main.tsx` + `AdminLogin` + `AdminLayout` com nav própria) servido em `sibanki-admin.web.app`. Vite multi-page; `firebase.json` aponta `hosting:admin` p/ o build (app/staging ignoram `admin.html`). **Rotas `/admin/*` e botão "Painel Admin" REMOVIDOS do app do usuário.** Vanilla aposentado.

**Waitlist**
- CF `captureWaitlistEmail` (Brevo) + formulário no `landing/index.html`.

**Deploys**: app em produção (`hosting:app`), admin (`hosting:admin`), landing (`hosting:landing`), functions (`adminGetData`, `adminSetPlan`, `captureWaitlistEmail`, `trackPlatformEvent`), `firestore:rules`. `main` alinhada com produção (merge + push `origin/main` `fac84c9..83f552c`).

### Changed — Governança IA (16/06/2026, Claude)
- **Pipeline multi-agente Cursor/Antigravity APOSENTADO.** Desenvolvimento passa a ser 100% Claude. `AGENTS.md` reescrito para **v2.0 Claude-only** (mantém regra de ouro, convenções, deploy, limites; absorve o útil das `.cursor/rules`; remove matriz multi-agente e pipeline). `CLAUDE.md`: header de governança e seção do pipeline atualizados.
- **Removidos:** `.cursor/` (9 regras `.mdc`), `.cursorrules`, `scripts/task-watcher.mjs`, `.pipeline/`, `docs/TASK_QUEUE.md`, `docs/FALLBACK_PROMPT.md`, `scratch/update_queue.js`.

### Limpeza e Atualização de Assets de Imagem (16/06/2026, Antigravity)
- **Remoção de logos obsoletas**: Exclusão de arquivos de imagem antigos do repositório (`public/assets/img/sibanki-original.png`, `public/assets/img/sibanki-favicon-badge.png`, e `public/assets/img/sibanki-favicon-clean.png`) sob aprovação do usuário para evitar bagunça. Apenas a logo atual (`sibanki-logo-clean.png`) foi mantida.
- **Novos Banners do LinkedIn (Empresa e Pessoal)**:
  - Adicionado o banner da LinkedIn Page da empresa ([sibanki-linkedin-banner-mono.png](file:///c:/Users/jscha/virtus-financeiro/public/assets/img/sibanki-linkedin-banner-mono.png)) com proporção 1128x191px e espaçador de segurança à esquerda para o logo.
  - Adicionado o banner do perfil pessoal de Fundador ([sibanki-linkedin-banner-pessoal.png](file:///c:/Users/jscha/virtus-financeiro/public/assets/img/sibanki-linkedin-banner-pessoal.png)) com proporção 1584x396px, rótulo "Founder & Lead Engineer" e espaçamento superior para evitar sobreposição do avatar circular no canto inferior esquerdo.
  - Ambos os banners respeitam as diretrizes de design do sistema *Pierre Finance* (monocromáticos, sem cores desnecessárias, fontes Inter limpas, grids geométricos de wireframe e mockup real da tela do assistente).
- **Campanha de Financiamento Coletivo Recorrente (Benfeitoria)**:
  - Criado o documento de copy completo em [docs/CAMPANHA-BENFEITORIA.md](file:///c:/Users/jscha/virtus-financeiro/docs/CAMPANHA-BENFEITORIA.md) focado no modelo de **Financiamento Recorrente Mensal**.
  - Aprofundamento conceitual e filosófico do Sibanki ("Quem somos e no que acreditamos"): desconstrução do controle financeiro por culpa, explicação aprofundada de *Dias de Liberdade* (Ld) como métrica de tempo, *Spread Gap* (Sg) como vazamento de juros, *Sovereignty Score* (Sv) como voto de autonomia, e o manifesto estético do design monocromático *Pierre Finance*.
  - Configuração de metas recorrentes (Meta 2 de R$ 6.000/mês para dedicação integral e servidores em escala) e tabela de recompensas mensais baseadas em assinaturas do app (Pro, Casal/Família, Conselheiro, Membro Honorário e Patrocinador).

### Checkout Transparente Asaas — Pix no App (12/06/2026, Antigravity)
- **Nova Callable getAsaasPixQr**: Implementada função no backend `functions/services/billing/asaasService.js` com validações rígidas de login e posse do cliente (evita spoofing). Obtém o QR code Pix e copia-e-cola via API Asaas `/payments/{id}/pixQrCode`.
- **Retorno do paymentId**: Atualizada a callable `createAsaasCheckout` para devolver o `paymentId` da primeira cobrança pendente.
- **Componente AsaasPixModal**: Criado modal visualmente premium estilo *glassmorphic* com visualização de QR Code em Base64, botão copia-e-cola com feedback, regressiva do tempo de expiração e redirecionamento de sucesso instantâneo (via listener de `AppContext.tsx` que detecta atualização do plano sem recarregar a tela).
- **Settings Integration**: Atualizado `src/pages/Settings.tsx` para interceptar a resposta do plano Asaas e abrir o modal transparente em vez de redirecionar o usuário diretamente.
- **Qualidade**: tsc sem erros, Vitest com 127 testes aprovados e build local de produção com empacotamento correto dos chunks.

### Landing page pública + separação landing/app (11/06/2026, Claude Cowork)
- **Causa raiz do "landing some"**: `hosting:app` serve de `dist/`, recriada do zero a cada `vite build` — qualquer landing colocada manualmente era apagada no deploy seguinte.
- **Nova pasta `landing/`**: landing page estática (design Pierre: `#0a0a0a`, cards `#111111`, Inter, labels ALL CAPS) com hero, conceitos Ld/Sg/Sv, features (Open Finance, Consultor IA, Hub de Crédito, Valores a Receber BCB, SibCoin), CTAs para `app.sibanki.com.br`, OG tags, JSON-LD, `robots.txt` e `sitemap.xml` (corrige soft-404 do sitemap apontado na análise de 11/06).
- **`firebase.json`**: novo target `landing` (public: `landing/`, sem rewrite SPA, cleanUrls, cache 5min no HTML / 24h em assets). ⚠️ Requer aprovação do João (AGENTS.md §5).
- **`.firebaserc`**: target `landing` → site `sibanki-landing` (site ainda precisa ser criado: `firebase hosting:sites:create sibanki-landing`).
- **`package.json`**: novo script `deploy:landing`.
- **Arquitetura alvo**: `www.sibanki.com.br` + apex → landing; `app.sibanki.com.br` → React SPA (site `virtus-financeiro-cd7bd`). Login permanece dentro do app (`/login`), sem subdomínio de auth separado.
- **Executado na sessão (autorizado pelo João)**: site `sibanki-landing` criado + deploy realizado → https://sibanki-landing.web.app no ar. Commit `c971509` na branch `audit/analise-360`.
- **Pendências manuais (João)**: conectar domínios custom no Firebase Console (www/apex → site landing; `app.sibanki.com.br` → site app), ajustar DNS na Cloudflare, adicionar `app.sibanki.com.br` em Auth → Authorized domains. Cutover do www só após o app responder em `app.sibanki.com.br`.

### Otimização de Design Mobile — Barra de Navegação Inferior (12/06/2026, Antigravity)
- **Barra de Navegação Inferior (Bottom Navigation)**: Criação de `BottomNavigation.tsx` e integração em `App.tsx` para exibição exclusiva em telas menores (`lg:hidden`).
- **Navegação Dinâmica**: Mapeamento das rotas principais para navegação instantânea no celular: Painel (`/dashboard`), Lançamentos (`/lancamentos`), Assistente (`/consultor-ia`) e Família (`/casal`).
- **Menu Lateral Integrado**: Adicionado botão "Menu" no final da barra inferior para disparar a Sidebar drawer lateral original, dando acesso aos módulos secundários.
- **Ajuste de Margens e Padding**: Adicionadas classes `pb-20` (mobile) e `lg:pb-8` (desktop) no container `<main>` de `App.tsx` para assegurar que nenhum conteúdo de página seja encoberto pela barra fixa inferior.
- **Validação de Build e Tipagem**: Conclusão bem-sucedida do typecheck (`npm run typecheck`), testes unitários (`npm run test:unit`) e compilação de produção (`npm run build`).

### Entrega e Unificação do Módulo Família (10/06/2026, Antigravity)
- **Modo Família Unificado**: Integração completa das páginas de casal (`Casal.tsx`) e filhos (`Filhos.tsx`) sob uma única rota canônica `/casal`.
- **Navegação Sincronizada**: Adicionado controle de abas reativo utilizando query string (`?tab=casal` ou `?tab=filhos`), integrado de forma transparente ao roteamento.
- **Redirecionamentos**: Configurado redirecionamento automático da rota `/filhos` para `/casal?tab=filhos` em `App.tsx` para compatibilidade retroativa, limpando também declarações de variáveis lazy não utilizadas.
- **Propriedade hideHeader**: Adicionado suporte a `hideHeader?: boolean` ao componente de filhos (`Filhos.tsx`) para ocultar títulos redundantes quando renderizado no dashboard de abas.
- **Gating de Plano & Upsell**: Gating rígido do Modo Família via hook `useFeatureFlags` (`familia_compartilhado`). Exibição de tela de bloqueio e upsell premium com design de alto contraste e link direto para upgrade de conta.
- **Sidebar**: Renomeado o link do menu sob o grupo `socialNav` de "Casal" para "Família".
- **Qualidade**: typecheck (`tsc --noEmit`) concluído sem erros; 127/127 testes unitários Vitest rodando com sucesso.

### Análise 360 — execução das 10 ações (10/06/2026, Claude Cowork, branch `audit/analise-360`)
- **Análise:** `docs/ANALISE-360-SISTEMA-2026-06-10.md` (v1 + reanálise pós-execução).
- **#1 Billing:** plano efetivo passa a vir de `users/{uid}.plan` (só webhook Stripe escreve; `firestore.rules` bloqueia cliente de alterar `plan`/`stripeCustomerId`); toggle local Gratuito/Pro removido de Configurações; botões "Assinar Sibanki Pro" (createCheckout) e "Gerenciar assinatura" (createPortal); `useFeatureFlags` confia só em `data.plan`. Checklist operacional: `docs/STRIPE-ATIVACAO.md`.
- **#2 Limites do gratuito:** `functions/services/user/usageLimitService.js` — teto mensal de mensagens IA (default 40, env `FREE_AI_MESSAGES_PER_MONTH`) imposto server-side em `chatApi` e `chatStreamApi` (429); contador em `users/{uid}/usage/ai` (rule read-only p/ cliente); front preserva a mensagem de upsell.
- **#3 Funil de ativação:** eventos `activation_signup_completed` (wizard), `activation_of_connected` e `activation_first_entry` (AppContext), `activation_ld_computed` (IntelligenceContext); allowlist atualizada em `trackPlatformEvent`. Doc: `docs/FUNIL-ATIVACAO.md`.
- **#4 Testes do engine:** já existiam (sovereigntyEngine 37 casos + decisionEngine) — análise v1 corrigida; baseline 127/127 verde.
- **#5 App Check:** React SPA inicializa App Check quando `VITE_APPCHECK_SITE_KEY` definida (`src/firebase.ts`, dynamic import); plano de 2 fases em `docs/APP_CHECK.md`. **Pendente João:** chave reCAPTCHA + `ENFORCE_APP_CHECK=true` + deploy.
- **#6 Sidebar modo simples:** padrão com 8 itens (Principal + Contas/Crédito + rodapé); resto atrás de "Menu completo" (localStorage `sib_sidebar_full`); rota oculta ativa auto-expande.
- **#7 Onboarding invertido:** ordem Identidade → Dinheiro Esquecido (BCB) → Conectar Bancos → Contato → Financeiro → Objetivos.
- **#8 Refator Dashboard:** 5 sub-abas extraídas para `src/components/dashboard/` (Transações, Parcelamentos, Assinaturas, Categorias, Cartões+Sentinela); `Dashboard.tsx` 1406 → 724 linhas.
- **#9 Design:** sweep tipográfico em 50 arquivos (mín. 10px; labels 11px); paleta semântica de feedback (`si-positive/warning/risk/projection/info`) em `index.css` dark+light; regra formalizada em `docs/DESIGN-PALETA-SEMANTICA.md`.
- **#10 Migração entries:** plano completo em `docs/MIGRACAO-ENTRIES-SUBCOLECAO.md` (4 fases, dual-write, rollback) — execução depende de aprovação.
- **Qualidade restaurada:** 14 erros tsc pré-existentes corrigidos (MeuCpf `label`, unused vars em Growth/Cards/Sidebar/InvestmentInsights); `tsc --noEmit` zero erros; 127/127 testes; build OK.
- **Governança:** commit snapshot do trabalho não commitado de sessões anteriores (292 arquivos) isolado no início da branch, autorizado pelo João.
- **Deploys pendentes (João/Antigravity):** `firestore:rules`, `functions:chatApi,chatStreamApi,trackPlatformEvent`, `hosting:app` — ver `docs/STRIPE-ATIVACAO.md` §5 e `docs/APP_CHECK.md`.

### Correções de Consistência e Contraste no Modo Claro e Escuro (09/06/2026)
- **`src/index.css`**: Criadas variáveis CSS dinâmicas para as cores das categorias financeiras nos modos claro e escuro, registrando-as como classes utilitárias no Tailwind CSS v4.
- **`src/components/layout/Header.tsx`**: Substituído o fundo preto estático (`bg-[#0a0a0a]`) pelo fundo semântico `bg-si-card` que muda com o tema.
- **`src/components/layout/Sidebar.tsx`**: Alterado o fundo do menu lateral para `bg-si-card` e a borda inferior do cabeçalho da sidebar para a variável semântica `border-si-border`.
- **`src/components/transactions/MerchantLogo.tsx`**: Adaptado o mapeamento fallback de cores de categoria para consumir as novas classes utilitárias baseadas em variáveis CSS.
- **`src/pages/Transactions.tsx`**: Refatorados divisores de lista diária para utilizarem `divide-si-border` e ajustadas as cores estáticas de categoria para a lógica de variáveis do tema.
- **`src/pages/Dashboard.tsx` & `src/pages/Recurring.tsx`**: Substituídos os divisores de lista estáticos por `divide-si-border` nos feeds de transações, assinaturas e recorrentes.

### Identificação e Exibição de Logos de Empresas nas Transações (09/06/2026)
- **`src/components/transactions/MerchantLogo.tsx`**:
  - Criado componente utilitário e visual de detecção e renderização de logomarcas mapeadas. Carrega os logotipos oficiais das marcas em SVG branco da API do Simple Icons sobre fundos circulares nas cores originais de cada empresa (Netflix, Spotify, iFood, Uber, Airbnb, Amazon, Google, Apple, etc.), com fallback offline baseado em iniciais e fallback por categoria (ícones Lucide) quando nenhuma marca coincide.
- **`src/pages/Dashboard.tsx`**:
  - Integrado o componente `MerchantLogo` nas abas de *Transações* e *Assinaturas* do Dashboard principal, substituindo os ícones padrão.
- **`src/pages/Transactions.tsx`**:
  - Integrado o componente `MerchantLogo` na listagem de lançamentos do feed diário.
- **`src/pages/Recurring.tsx`**:
  - Integrado o componente `MerchantLogo` na lista de lançamentos fixos recorrentes ao lado das descrições.

### Cockpit de Sub-Navegação no Dashboard principal (09/06/2026)
- **`src/pages/Dashboard.tsx`**:
  - Implementada barra horizontal de sub-navegação reativa (*pills*) no topo do painel principal para chaveamento entre 6 sub-abas: *Visão geral*, *Transações*, *Parcelamentos*, *Assinaturas*, *Categorias*, *Cartões*.
  - **Aba Visão Geral**: Concentra todos os widgets estratégicos e de onboarding originais do dashboard.
  - **Aba Transações**: Lista compacta e rápida dos 15 lançamentos mais recentes com campo de busca em tempo real (`txSearch`) e exibição inline do `SovereigntyBadge` (com cálculo de score de soberania por transação e dias de liberdade perdidos).
  - **Aba Parcelamentos**: Consolidação de compras parceladas nos cartões de crédito e empréstimos ativos, exibindo valor mensal, saldo devedor restante e progresso de parcelamento. Adicionado alerta conceitual sobre amortização antecipada cruzado com o *Spread Gap*.
  - **Aba Assinaturas**: Agrupação de serviços recorrentes ativos baseada em categorias e palavras-chave, com cálculo de gasto mensal consolidado e filtro de **Vazamento Invisível** (alerta despesas sem movimentação nos últimos 60 dias).
  - **Aba Categorias**: Progresso horizontal de consumo de orçamentos por categoria em tempo real (com rollover/sobras) integrado ao gráfico donut de distribuição de despesas.
  - **Aba Cartões**: Faturas estimadas, limites totais e usados com barra de preenchimento colorida por nível de pressão e integração com o widget do **Sentinela GPS**.

### Melhorias Inteligentes e Rollover no Módulo de Orçamento (09/06/2026)
- **`src/types/userData.ts`**: Adicionados campos `budgetMode`, `envelopeMensal` e `budgetHistory` à interface `UserData` para suporte à persistência histórica de orçamentos e ZBB.
- **`src/services/persistUserData.ts`**: Atualizado o método `updateBudgets` para aceitar um parâmetro opcional `monthKey` e persistir as alocações dinamicamente sob a chave `budgetHistory.${monthKey}` do Firestore.
- **`src/pages/Budget.tsx`**:
  - Implementado o **Rollover Cronológico de Envelopes** na aba Envelope (ZBB), realizando o carryover acumulativo de saldos restantes de meses passados para o mês atual, exibindo o saldo de rollover herdado e calculando a liquidez real de cada envelope.
  - Adicionado o painel de **Inteligência Financeira** com três novos blocos dinâmicos reativos:
    - **Sync de Soberania (Days of Freedom)**: Card de cor esmeralda que converte a economia líquida do mês corrente em ganho real de dias de liberdade financeira com base no custo diário do usuário.
    - **IA Balanceadora (Remanejamento Automático)**: Card de cor violeta que identifica furos e superávits de envelopes e oferece um botão de ação com clique único ("Cobrir Furo") para transferir o excedente e cobrir o estouro.
    - **Alertas Proativos de Velocidade de Queima (Burn Rate)**: Card de cor âmbar que monitora o ritmo de gastos em envelopes e dispara badges de alerta caso o consumo percentual exceda a cota linear de dias passados no mês acrescida de 20% de tolerância.
  - Removido o limite artificial de largura `max-w-3xl` do container principal, permitindo que o painel de orçamentos se redimensione e preencha a tela de forma responsiva e consistente com os outros módulos do painel.
  - Corrigido o erro de runtime `Cannot access 'R' before initialization` (TDZ) reordenando a declaração dos hooks `useMemo` (`gastosByCat` e `categorias`) para virem antes dos blocos que os consomem.

### Simuladores Financeiros Interativos no Hub de Crédito (08/06/2026)
- **`src/pages/CreditHub.tsx`**:
  - Implementado o **Simulador de Quitação Estratégica** na aba "Plano", listando as faturas e empréstimos ativos com estimativas automáticas de juros e ordenando as prioridades em tempo real de acordo com as estratégias Avalanche e Bola de Neve.
  - Implementado o **Simulador de Compra Inteligente** na aba "Oportunidades", fornecendo formulário dinâmico com slider de parcelas, rendimento a.m. do CDI e desconto à vista.
  - Adicionado painel de veredito reativo com gradientes de cores (verde, violeta, âmbar, rosa) mudando dinamicamente de acordo com o nível de risco e spread do veredito da engine.
  - Incorporada tabela comparativa no simulador exibindo o fluxo inicial, rendimento acumulado, preço nominal total e custo líquido real de cada opção.
  - Atualizada a aba "Oportunidades" para um layout de 2 colunas, unindo a simulação à esquerda e a vitrine de produtos contextuais e seguros à direita.
  - Adicionado o bloco **"Portal do Tempo"** no veredito do Simulador de Compra, exibindo o custo de oportunidade acumulado composto caso o valor da compra à vista seja investido por 10 anos.
  - Implementado o **Simulador de Amortização de Empréstimos** (por meio de um Modal interativo), permitindo simular amortizações extras, escolher uso de FGTS, ajustar meses restantes do contrato e visualizar a redução da parcela e economia de juros.
  - Adicionado o painel **"Muralha de Liquidez vs. Exposição"** na aba "Visão Geral", comparando as reservas disponíveis contra o passivo consolidado a vencer em 30 dias com alertas visuais.
  - Adicionada a barra de progresso horizontal **"Concentração de Risco por Emissor"** na aba "Visão Geral", exibindo graficamente a distribuição de passivos em cartões por banco com as cores oficiais de suas respectivas identidades.

### Integração de Cartões Manuais e Acesso no Hub de Crédito (09/06/2026)
- **`src/components/layout/Sidebar.tsx`**: Adicionado o atalho para a rota `/credito/cartoes` ("Cartões") no array `secondaryNav` sob o accordion "Mais", permitindo acesso operacional rápido a qualquer momento.
- **`src/pages/CreditHub.tsx`**:
  - Adicionado banner de atalho estilizado no topo da aba **Cartões** para direcionar o usuário à rota operacional manual `/credito/cartoes`.
  - Atualizado o empty state da aba **Cartões** para exibir um botão "Criar Cartão Manualmente".
  - Refatorada a variável `accounts` para mesclar dinamicamente os cartões manuais (`data.cards`) na tipagem de `CreditAccount`, permitindo exibição integrada.
  - Atualizado o `snapshot` para consumir as métricas calculadas pelo client-side centralizado em `financialProfile.credit`, unificando a consolidação de limites e uso de cartões manuais e Open Finance.
- **`src/pages/Cards.tsx`**:
  - Implementado layout responsivo de 2 colunas com prévia de cartão em tempo real (`CreditCardVisual` de tamanho médio) nos modais de criação ("Novo Cartão") e edição ("Editar Cartão").
  - Integrada busca dinâmica e grade visual contendo todos os emissores e seus respectivos logotipos com tratamento individualizado de marcas para a criação de cartões manuais, aplicando automaticamente a cor oficial e o logotipo selecionado.
  - Adicionado campo de vínculo visual de emissores no modal de edição, permitindo trocar e salvar a identidade visual do banco.
  - Ocultado o seletor de cores manuais quando um banco oficial é selecionado para manter o realismo estético premium do app, ficando disponível apenas no caso "Personalizado".

### Busca e Seleção Visual de Instituições na Aba de Contas (08/06/2026)
- **`src/types/userData.ts`**: Adicionado campo opcional `bankSlug` no objeto `accountMeta` para persistência do banco vinculado à conta.
- **`src/services/persistUserData.ts`**: Atualizado o tipo `AccountMetaEntry` para conter o campo `bankSlug`.
- **`src/pages/Accounts.tsx`**:
  - Novo fluxo de criação manual de contas contendo campo de busca reativo (`searchQuery`) e grade rolável das instituições do `BANKS` com seus logotipos oficiais. Adicionado tratamento de design individualizado de marca para cada banco (via nova propriedade `logoBg` no `BankData` em `bankData.ts`): bancos com logos originalmente brancas (C6, XP, BTG, Neon, Next, PicPay, Agi, Safra, BS2) renderizam sobre seus respectivos fundos temáticos de marca, enquanto as demais instituições coloridas (Itaú, Bradesco, Nubank, BB, Caixa, etc.) usam fundo branco, garantindo contraste e fidelidade visual perfeita de cada identidade.
  - Adicionado componente `<AccountCard>` de visualização prévia em tempo real dentro do modal de criação e no modal de edição, atualizando as cores, logos e textos dinamicamente.
  - Nova lógica utilitária local `getAccountBank(accountName)` que prioriza `meta.bankSlug` para buscar a identidade visual e o logotipo nas listagens e no simulador (`BankSimulator`), garantindo retrocompatibilidade (fallback com `identifyBank`).
  - Adicionado o dropdown de instituição no modal de edição ("Configurações Locais") para re-vincular instituições e atualizar a cor automática.
  - Removida a constante não utilizada `CORES_CONTA` (resolvendo o erro TS6133 do compilador).

### Beta UX — entrada, sidebar, explicações, estado vazio (08/06/2026)
- **`App.tsx`**: entrada pós-login alterada de `/consultor-ia` → `/dashboard`. Rotas `/`, `/login`, `/landing` agora direcionam ao painel principal.
- **`Sidebar.tsx`**: removidas rotas mortas `/fire` (FIRE) e `/relatorio-ir` (Relatório IR) que não tinham páginas — ambas estavam visivelmente acessíveis no menu "Mais". Removidos imports não-usados `Flame` e `FileText`.
- **`SovereigntyHero.tsx`**: adicionado botão "O que significam esses números?" que expande painel inline explicando Ld (Dias de Liberdade), Sg (Spread Gap) e Sv (Sovereignty Score) em linguagem acessível para o usuário final.
- **`Dashboard.tsx`**: banner "empty state" visível quando `accounts.length === 0 && entriesNoTransfer.length === 0` — guia o usuário em 3 passos (adicionar conta → registrar receita → ver Ld) com link para Open Finance.
- **`ConsultantSessionContext.tsx`**: mensagem de boas-vindas agora é proativa — quando o usuário tem dados e Ld > 0, a mensagem inicial do assistente exibe "Seu Ld é X — nível Y" em vez da mensagem genérica.
- **`Growth.tsx`**: bugs corrigidos — `tickerDebounceRef` convertido de `useState` para `useRef` (evitava re-renders desnecessários em cada debounce); `RV_TYPES` movido para nível de módulo (era redeclarado em cada render).

### LojaContextualBanner + LandingPage cleanup (08/06/2026)
- **`src/pages/Loja.tsx`**: banner contextual baseado no perfil financeiro — calcula gastos por categoria nos últimos 30 dias, lê `spread` e `freedom` do `IntelligenceContext`; mostra até 3 sugestões ("Você gastou R$X em Y — cashback disponível", spread negativo → soluções de crédito, freedom alto → crescimento). Visível só na aba Ofertas.
- **`src/pages/LandingPage.tsx`**: removidos 5 imports não-usados (Smartphone, Sparkles, MessageSquare, DollarSign, ArrowUpRight) que causavam erros tsc.

### Adicionado (07/06/2026 — sessão análise sênior + estabilização completa)
- **Rota `/home`**: `Home.tsx` (639 linhas) estava sem rota no router. Adicionada como `/home`.
- **Rota `/casal`**: `Casal.tsx` (322 linhas) estava sem rota. Adicionada como `/casal`.
- **`firebase.ts`: exports `fnsBR` e `fnsUS`** — centraliza regiões de Cloud Functions. `getFunctions()` inline eliminado de 8 callsites.
- **`PageSkeleton.tsx`**: componente novo com CardsSkeleton, GrowthSkeleton, SocialSkeleton, DashboardSkeleton, TransactionsSkeleton, GenericPageSkeleton. Shimmer animate-pulse no design system Pierre.
- **`useAuthContext.ts`**: hook memoizado que expõe apenas `{user, authLoading, avatarURL}`. Componentes auth-only não re-renderizam com updates financeiros.

### Alterado (07/06/2026)
- **Splash 3000ms → 1200ms** (`App.tsx`): usuário não espera mais 3s fixos após auth resolver.
- **15 páginas**: spinner azul genérico substituído por skeleton contextualizado (Cards, Growth, Social, Dashboard, Accounts, Planning, Budget, Recurring, Calendar, Achievements, Consultant, Filhos, Quarentena, Reports, Settings, Filiados). Spinners inline de paginação/feed mantidos.

### Qualidade (07/06/2026)
- **tsc --noEmit**: zero erros em todos os commits.
- **118/118 testes passando** sem regressões.
- **3 deploys em produção**: https://virtus-financeiro-cd7bd.web.app atualizado.

### Task 20260607-009 — Regiões, Conta IA, Investimentos Inteligentes (08/06/2026)

**Stream 1 — Regiões Cloud Functions (frontend)**
- `OpenFinanceConnect.tsx`: chamadas Pluggy migradas de `fnsUS` para `fnsBR` (southamerica-east1). Alinha com AppContext que já usava `fnsBR`.

**Stream 2 — Conta no modal de confirmação IA (Lançamentos)**
- `Transactions.tsx`: estado `aiAccount`; pré-preenchido com `entry.account` extraído pela IA; dropdown de conta no modal OCR/Voz; confirmação aplica conta selecionada.

**Stream 3 — Investimentos Inteligentes (Growth)**
- `brapi.ts`: nova função `searchB3Tickers(query)` — usa callable `brapiSearch`.
- `Growth.tsx`: autocomplete de ticker com debounce 350ms para tipos RV (Ações/FIIs/ETFs); selecionar ticker busca preço atual via `fetchB3Quote` e preenche preço de compra; campos quantidade e preço de compra com sync automático (qtd × preço → valor aplicado); qtd e precoCompra salvos no Firestore; listagem exibe "X cotas · R$ Y/un".

**Qualidade**: tsc --noEmit zero erros · 118/118 Vitest passando.

### Idempotência updateUserDoc (08/06/2026)
- **`src/services/persistUserData.ts`** — deduplicação em duas camadas:
  1. **Debounce per-uid** via `Map<uid, DebounceEntry>`: cada uid tem seu próprio estado de debounce (antes era variável de módulo única compartilhada). Janela aumentada de 1,5 s → 5 s para cobrir reconexões típicas do Firebase SDK.
  2. **`_writeId` (UUID v4) no Firestore**: cada `updateUserDoc` gera um UUID, grava junto com o payload (`_writeId` field). A transação lê o doc antes de escrever — se `doc._writeId === writeId`, o write já foi confirmado anteriormente → pula silenciosamente. Garante idempotência mesmo após reconexões longas onde o SDK retenta.
  - API pública: `updateUserDoc(uid, payload, writeId?)` — o `writeId` pode ser fornecido pelo chamador para operações multi-step, ou gerado automaticamente.
  - Todos os writes (com e sem recálculo de `finScore`) passam por `runTransaction` para garantir leitura do `_writeId` atual antes de escrever.
- **`src/types/userData.ts`** — adicionado campo `_writeId?: string` ao `UserData`.
- **tsc --noEmit**: zero erros. **118/118 testes Vitest** sem regressões.

### Testes Open Finance (08/06/2026)
- **`functions/tests/pluggySyncService.test.js`** (novo, 83 testes, 100% pass):
  - Suíte unitária para todas as funções puras do serviço de sincronização Pluggy (Open Finance).
  - Cobre: `stableNumericId`, `formatYmd`, `daysAgoYmd`, `dayFromPluggyDate`, `pickBalance`, `baseLabel`, `round2`, `mapPluggyCategoryToApp` (16 casos), `mapTransactionToEntry` (6 casos), `mapCreditToCard` (4 casos), `mapInvestmentToUser` (4 casos), `loanIsSettled` (5 casos), `estimateMonthlyInstallment` (4 casos), `mapLoanKind` (10 casos), `mapLoanToCreditAccount` (4 casos), `mapBalloonObligations` (5 casos), `mapNextRegularInstallment` (4 casos).
  - Estratégia: mock de `firebase-functions` + dependências externas via `Module._load`; sem chamadas reais à Pluggy API nem ao Firestore.
- **`pluggySyncService.js`**: adicionado `_internals` ao `module.exports` para exposição de funções puras aos testes (padrão do projeto).

---

## [Unreleased — anterior]

### Adicionado
- **Renda Passiva com Proventos Mensais (SOV-7)**:
  - Adicionado suporte ao campo opcional `proventosMensais` no modal de adição de investimentos ("Registrar investimento") na página [Growth.tsx](file:///c:/Users/jscha/virtus-financeiro/src/pages/Growth.tsx).
  - Atualizado o modal de edição de investimento (anteriormente "Atualizar valor atual", renomeado para "Editar investimento") para incluir edição do campo de proventos mensais declarados.
  - Exibição visual do valor de proventos mensais configurado para cada ativo na lista de investimentos (ex: `· Proventos: R$ X,XX/mês`).
  - Adicionados testes unitários no validador de frontend [validators.test.ts](file:///c:/Users/jscha/virtus-financeiro/src/services/validators.test.ts) e testes unitários no backend [sentinelaWeeklyService.test.js](file:///c:/Users/jscha/virtus-financeiro/functions/tests/sentinelaWeeklyService.test.js).

### Alterado
- **Alinhamento do Cálculo de Dias de Liberdade (SEW-2)**: Refatorado o `calcDaysOfFreedom` no [sentinelaWeeklyService.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/sentinel/sentinelaWeeklyService.js) (backend) para parear completamente com a engine do frontend. Agora considera a exclusão de contas via `accountMeta.incluirNaSoma`, valida os investimentos pelos tipos líquidos canônicos (em vez do antigo boolean `liquido`), calcula o burn rate com data de corte exata de 90 dias, e utiliza estimativas de onboarding do `cadastroCompleto` como fallback para novos usuários.
- **Testes Unitários do Sentinel**: Atualizados os testes existentes e adicionados novos casos em [sentinelaWeeklyService.test.js](file:///c:/Users/jscha/virtus-financeiro/functions/tests/sentinelaWeeklyService.test.js) para cobrir a exclusão de contas e o fallback de onboarding.
- **Validação de Investimentos**: Modificado o validador [validators.ts](file:///c:/Users/jscha/virtus-financeiro/src/services/validators.ts) para garantir que `proventosMensais` seja um número finito e positivo de até R$ 1 bilhão.
- **Cálculo de Dias de Liberdade do Sentinela Semanal**: Refatorada a função `calcDaysOfFreedom` no [sentinelaWeeklyService.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/sentinel/sentinelaWeeklyService.js) (backend) para deduzir proventos mensais declarados dos investimentos do custo mensal médio e ajustar a queima diária líquida de forma idêntica ao painel web.
- **Modularização das Cloud Functions**: Concluída a divisão do arquivo principal `functions/index.js` (reduzido de 1500+ linhas para ~350 linhas de exportações diretas) em controladores de domínio separados e organizados na pasta `functions/services/`:
  - [whatsappController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/whatsapp/whatsappController.js): Webhook, códigos de vinculação e convites via WhatsApp (modo Família, Consórcio, Credi Amigo e resumo semanal).
  - [sentinelController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/sentinel/sentinelController.js): Validação geográfica do Sentinela GPS e relatórios agendados semanais.
  - [pushController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/push/pushController.js): Disparos diários de orçamento/faturas e envio de notificações manuais.
  - [affiliateController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/affiliate/affiliateController.js): Integração de catálogo Lomadee, webhooks de afiliados, registro de cliques e emissão manual/automática de cashback em SibCoin.
  - Mapeadas as funções de convite adicionais para o [emailController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/email/emailController.js) (consórcio e empréstimo entre amigos) e funções de captura para o [assistantController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/assistant/assistantController.js) (OCR e STT de voz para lançamentos).
- **Correção de Sintaxe no Servidor**: Removida uma instrução `catch` orfã deixada na extração parcial do `proactiveInsightApi` que quebrava o carregamento do `index.js`.
- **Suporte a Transações no Mock do Firestore**: Modificado [firestoreMock.js](file:///c:/Users/jscha/virtus-financeiro/functions/tests/helpers/firestoreMock.js) para incluir suporte a `db.doc()` na raiz e `db.runTransaction()`, permitindo simulação de transações atômicas locais em testes unitários do backend.

### Adicionado
- **Suíte de Testes para Rate Limit e Quotas de IA (SEG-12)**: Criada a suíte de testes unitários [chatRateLimiter.test.js](file:///c:/Users/jscha/virtus-financeiro/functions/tests/chatRateLimiter.test.js) cobrindo comportamento feliz, bypass em desenvolvimento, bloqueios por quota diária com base no plano, burst limits (30 reqs/min), leitura dinâmica de plano no banco de dados e tolerância a falhas (fail-open).
- **Fallback de Onboarding para Ld (Dias de Liberdade)**: Lógica no `sovereigntyEngine.ts` que utiliza dados de estimativas coletados no onboarding (`cadastroCompleto` contendo rendaEstimada, gastosEstimados, reservaEstimada, criptoEstimada) como fallback para cálculo de Dias de Liberdade caso o usuário não tenha cadastrado contas ou lançamentos reais.
- **Identificação Visual de Estimativa**: `SovereigntyHero` agora exibe uma badge de aviso específica (`baseado em estimativas do cadastro...`) caso o cálculo do Ld dependa desses dados provisórios, incentivando a conexão do Open Finance ou digitação manual.
- **Testes Unitários do Motor de Decisão (`decisionEngine.test.ts`)**: Criada a suíte de testes com 12 novos casos de teste cobrindo todas as ramificações de cálculos do motor (À vista vs. parcelado com descontos/pressão de crédito, estratégias de quitação de dívidas Avalanche vs. Bola de Neve, amortizações usando o FGTS e dimensionamento de reservas de emergência para diferentes perfis profissionais).

### Alterado
- **Correção da Navegação do Modo Visual (Painel)**: Ajustado `AppModeToggle` para garantir que, ao clicar em "Painel" a partir de qualquer subpágina da visão visual (como `/configuracoes` ou `/lancamentos`), o usuário seja redirecionado de volta para `/dashboard`. Corrigida também a sincronização em `useUiStore.ts` (`syncRoute`), ignorando as rotas `/` e `/login` para evitar que sobreponham o último caminho visual visitado com rotas de redirecionamento genéricas.
- **Navegação do Logotipo de Marca**: O logotipo em `Sidebar.tsx` foi envolvido em um `<Link to="/dashboard">` para permitir acesso rápido à home/dashboard de qualquer página.
- **Hierarquia Visual e Identidade**: Movido `<SovereigntyHero>` para o topo do `Dashboard.tsx` (logo abaixo do `<CoachSetup>`), priorizando os indicadores de Dias de Liberdade (Ld) e o brilho radial da marca.

### Adicionado — Governança IA
- `AGENTS.md` (raiz) — regras universais para qualquer agente de IA
  (Claude Cowork, Cursor, Antigravity). Inclui matriz de responsabilidade,
  convenções de commit, limites duros, política de webhook fail-closed.
- `.cursorrules` (raiz) — entrada principal para Cursor IDE; aponta para
  `AGENTS.md` como fonte única de verdade.
- `.editorconfig` (raiz) — padroniza EOL/charset/indent entre Cursor e Claude.
- `docs/CHANGELOG.md` — este arquivo.

### Alterado — Governança IA
- `AGENTS.md` (raiz) — Atualizado para a versão 1.1 sob autorização do João, permitindo à IA (Antigravity) executar comandos de deploy sob demanda direta no chat.
- `.cursor/rules/global.mdc` — refletir estado atual: dados financeiros vêm de
  Context API (`AppContext`/`IntelligenceContext`), Zustand é só para UI state.
  A regra antiga dizia "evite Context API para dados financeiros" — contradizia
  100% do código real. Adicionada nota explícita sobre precedência do
  `AGENTS.md`.
- `.cursor/rules/deploy.mdc` — refletir cutover concluído (React SPA é
  produção, legado é fallback de rollback). Tabela de targets atualizada.
- `.cursor/rules/legado.mdc` — modo manutenção; desencoraja features novas em
  `public/app/`.
- `.cursor/rules/segunda.mdc` — marcado obsoleto (DEEPSEEK_KEY já configurada).

### Segurança
- **SEG-02** `functions/services/affiliate/affiliateWebhookService.js` —
  webhook de afiliado agora é **fail-CLOSED** quando o secret não está
  configurado. Antes: `if (!expected) return { ok: true, mode: "disabled" }`
  (qualquer atacante forjava conversões e ganhava SibCoin). Agora: retorna
  `503 Webhook secret not configured`. Em DEV, libera com
  `NODE_ENV=development` ou `SIBANKI_ALLOW_UNSAFE_WEBHOOK=1`.
  - Mensagem `[SEG-02]` no log do Cloud Functions facilita identificar a causa
    quando produção rejeitar requests por falta de secret.
- **SEG-03** `functions/index.js` — `creditarCashbackSibCoin` corrigida:
  agora lê `data.uid` (alvo do crédito) em vez de `context.auth.uid` (admin).
  Antes: admin só conseguia auto-creditar SibCoin. Adicionada validação de
  uid alvo + verificação que o usuário existe + auditoria com `actorUid` e
  `actorEmail` no `cashback_log`.
- **SEG-04** `functions/config.js` — `WHATSAPP_VERIFY_TOKEN` perde o default
  público `"sibanki_wa_verify"`. Agora defaulta para empty string.
  - `functions/index.js` `whatsappWebhook` — retorna `503 WhatsApp webhook
    not configured` quando o env não estiver setado, em vez de aceitar o
    default público.
- **SEG-06** `scripts/migrate-to-multitenant.js` — `SUBCOLLECTIONS` ampliado
  de 5 para 11 itens. Adicionados: `entriesOverflow`, `errorLogs`,
  `openFinanceConsents`, `auditLogs`, `sibcoin`, `filiado`. Sem isso, a
  migração causa loss silencioso de dados de Open Finance e SibCoin.

### Documentação
- `AUDITORIA_SENIOR_SIBANKI.docx` (gerado fora do repo, em
  `OneDrive\Documentos\Claude\Projects\sibanki\`) — auditoria sênior 38 achados
  (6 críticos, 14 altos, 13 médios, 5 baixos) que motivou todas as mudanças
  acima.
- `PATCHES_FASE_1_2.md` (raiz) — relatório dos arquivos tocados nesta sessão
  com comandos `git` recomendados.

### Pendente (Semanas 3-4 da auditoria, não fechadas nesta sessão)
- CI no front (GitHub Actions com tsc + vitest + build em todo PR).
- ESLint flat config com `@typescript-eslint` + restrição a `any`.
- `firebase deploy --only firestore:rules,storage:rules` no fluxo de release.
- Trocar `npm install` por `npm ci` em scripts de deploy.
- Quebrar `functions/index.js` (1500+ linhas) em domínios.
- Quebrar `AppContext.tsx` em slices ou contextos por domínio.
- Converter `src/hooks/useTenant.js` para TypeScript.
- Adicionar testes Vitest para `sovereigntyEngine` e `decisionEngine`.

---

## Histórico anterior

Para sessões anteriores a 2026-04-26, consulte:
- `CLAUDE.md` — seções "ATUALIZAÇÃO DE SESSÃO …" (a serem migradas para cá).
- `/CHANGELOG.md` (raiz) — changelog orientado a produto/30 ações de expansão.
