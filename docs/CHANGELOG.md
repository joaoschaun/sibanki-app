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

### Busca e Seleção Visual de Instituições na Aba de Contas (08/06/2026)
- **`src/types/userData.ts`**: Adicionado campo opcional `bankSlug` no objeto `accountMeta` para persistência do banco vinculado à conta.
- **`src/services/persistUserData.ts`**: Atualizado o tipo `AccountMetaEntry` para conter o campo `bankSlug`.
- **`src/pages/Accounts.tsx`**:
  - Novo fluxo de criação manual de contas contendo campo de busca reativo (`searchQuery`) e grade rolável das instituições do `BANKS` com seus logotipos oficiais.
  - Adicionado componente `<AccountCard>` de visualização prévia em tempo real dentro do modal de criação e no modal de edição, atualizando as cores, logos e textos dinamicamente.
  - Nova lógica utilitária local `getAccountBank(accountName)` que prioriza `meta.bankSlug` para buscar a identidade visual e o logotipo nas listagens e no simulador (`BankSimulator`), garantindo retrocompatibilidade (fallback com `identifyBank`).
  - Adicionado o dropdown de instituição no modal de edição ("Configurações Locais") para re-vincular instituições e atualizar a cor automática.

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
