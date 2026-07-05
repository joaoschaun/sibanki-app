## 🆕 ATUALIZAÇÃO DE SESSÃO (08/04/2026)

### Consultor IA / Inteligência (hotfixes em produção)
- **Barra do chat ajustada** (`ConsultantChat.tsx`): câmera, microfone e enviar ficam visíveis juntos (em vez de alternar por estado de input).
- **Fallback de resposta no frontend** (`ConsultantSessionContext.tsx`): se o stream (`chatStreamApi`) terminar sem texto, o app chama `chatApi` automaticamente para evitar bolha vazia.
- **Histórico limpo para o modelo** (`ConsultantSessionContext.tsx`): histórico recente enviado sem HTML (`<br>`, `<strong>`), reduzindo ruído e melhorando coerência.
- **Prompt de streaming corrigido** (`functions/services/llm/llmService.js`): remove duplicação de contexto no `systemInstruction`; `fullPrompt` passa a ser a única fonte do conteúdo estratégico.
- **Prompt soberano respeitado no fallback** (`llmService.js`): `generateAnalysis()` passa a reconhecer prompt completo do Arquiteto Soberano e não re-empacota com prompt genérico.
- **Roteamento de intenção de mercado reforçado** (`functions/services/llm/marketIntentService.js`):
  - novos sinais para `analysisMode: "raio_x"`
  - fallback regex para ticker B3, cripto, inflação e renda fixa
  - suporte explícito a `fixed_income`.
- **Injeção de mercado compactada** (`functions/index.js`): payload BRAPI resumido antes de entrar no prompt (evita estouro de contexto e melhora estabilidade).
- **Diretivas de Raio-X por classe** (`functions/index.js`): instruções específicas para **ações**, **ETF/FII**, **cripto** e **renda fixa** no prompt final.

### Deploys realizados nesta sessão
- `npm run deploy:app` (hosting React em `hosting:app`)
- `firebase deploy --only functions:chatApi,functions:chatStreamApi`
- Ambiente: `virtus-financeiro-cd7bd` (`https://virtus-financeiro-cd7bd.web.app`)

### Refatoração de qualidade (assistente determinístico)
- Novo módulo: `functions/services/assistant/assistantOrchestrator.js`
  - Pipeline centralizado: intenção -> resolução de ativo -> fetch de mercado -> composição de prompt -> guardrail de classe -> resposta.
  - `chatApi` e `chatStreamApi` agora delegam para o orquestrador (reduz duplicação e regressões cruzadas).
- Mantida compatibilidade com:
  - fallback stream -> resposta completa
  - lock de classe (ações/ETF/FII/cripto/renda fixa)
  - autocorreção de ticker com busca BRAPI

### Orquestrador de captura (voz + visão → lançamento)
- **`functions/services/assistant/entryCaptureOrchestrator.js`**: mesmo contrato `analysisMode: entry_draft` para STT e Gemini Vision; textos de confirmação gerados no backend.
- **`assistantEntryCaptureApi`**: `{ kind: 'voice'|'vision', ... }` — o drawer/página do consultor chama só esta função para microfone e foto.
- **`sttToEntry`** / **`visionToEntryApi`**: mantidos para retrocompatibilidade; implementação unificada no orquestrador.

**Deploy:** após merge, `firebase deploy --only functions:assistantEntryCaptureApi,functions:sttToEntry,functions:visionToEntryApi` (e hosting se alterar só o front).

### Hotfix Raio-X ETF (09/04/2026)
- **Bug raiz identificado:** cache do `callLLM` por prefixo de 120 chars causava colisão no classificador de intenção (ex.: após DEBB11, mensagem `btc` herdava resposta em cache). Corrigido com chave SHA-256 do prompt completo em `functions/services/llm/llmService.js`.
- **Padrão ETFBrasil aplicado ao Raio-X de ETF:** `assistantOrchestrator.js` passa a gerar saída determinística para ETFs em `analysisMode=raio_x` (estrutura do ativo, preço/faixas, liquidez, custo, benchmark e ação recomendada), evitando resposta genérica “dados limitados”.
- **Teste de sequência validado:** BTC → BOVA11 com payload correto em ambos e sem vazamento de contexto.
- **Deploy realizado:** `firebase deploy --only "functions:chatApi,functions:chatStreamApi"`.

### Módulo inicial de renda fixa com dados reais (09/04/2026)
- **Novo serviço:** `functions/services/market/fixedIncomeService.js`
  - Busca Selic/IPCA no Banco Central (SGS 432 e 433).
  - Integra Tesouro Direto com fallback para Tesouro Transparente (CKAN CSV oficial) quando o endpoint primário estiver indisponível.
  - Normaliza catálogo com `indicators`, `tesouro.titles`, `syntheticProducts` e `status` por fonte.
- **Nova função callable:** `fixedIncomeCatalogApi` em `functions/index.js`.
- **Consultor IA:** `assistantOrchestrator.js` usa o catálogo de renda fixa para `intent=fixed_income|inflation` e gera resposta determinística com Selic, IPCA e benchmarks CDB/LCI/LCA.
- **Simulação no card (09/04/2026):** `ConsultantChat.tsx` — seção **Simular meu caso** com prazo (meses → dias), tabela regressiva de IR no CDB (22,5% / 20% / 17,5% / 15%), LCI/LCA isentos, líquido e real estimados no cliente a partir de `indicators` + fração CDI do `id` do produto sintético.

### Entrada padrão Assistente + deploy (09/04/2026)
- **`/` e `/login`** redirecionam para **`/consultor-ia`** (sem toggle em Configurações). Aba **Visão** no consultor = `ConsultantVisionPanel` (KPIs/atalhos).
- **Deploy produção:** `npm run syntax-check` + `npm run deploy:app` → `hosting:app` em https://virtus-financeiro-cd7bd.web.app

### UX Assistente (09/04/2026)
- Briefing OF **stale:** botão **Atualizar agora** (`syncOpenFinance`) + link **ver →** Configurações; `BriefingItem.action === 'sync_open_finance'` em `briefingDay.ts`.
- **Sobre este módulo:** contraste (`text-si-2` / `strong` si-1). **Composer:** label “Sua mensagem”, área com borda/foco; ícones câmera/mic com `ring` no hover.
- Página **Consultant:** subtítulo explicando **Conversa** vs **Visão**.
- **Navegação Painel:** FAB “Ir ao painel” **removido em `/consultor-ia`**; botão duplicado “Abrir painel” no briefing trocado por texto discreto — painel fica na **sidebar** e no **toggle Painel | Assistente** do header.

### Fixes fluxo de dados + análise profunda (10/04/2026)
- **Fix 1:** `useFinancialData.ts` — `entriesOverflow` agora usa `query(col, orderBy('date','desc'), limit(1000))`. Evita download ilimitado para usuários com muito histórico bancário via Open Finance.
- **Fix 2:** Novo hook `src/hooks/useMarketRates.ts` — busca CDI/Selic/IPCA reais via `fixedIncomeCatalogApi` com cache localStorage de 24h e fallback automático. `IntelligenceContext` passa a usar `cdiMonthly` dinâmico no cálculo do Spread Gap (Sg).
- **Fix 3:** `useFinancialData.ts` — score agora loga divergência em DEV (`console.warn`) quando server score e local score diferem por mais de 5 pontos. Prioridade do server score documentada explicitamente.
- **Fix 4:** `AppContext.tsx` — optimistic entries implementadas: `addOptimisticEntry(entry)` retorna tempId, `removeOptimisticEntry(tempId)` reverte. `entries` exposto pelo contexto já inclui otimistas. Auto-limpeza via `useEffect` quando Firestore confirma a escrita.
- **Novo skill:** `.claude/skills/sibanki/SKILL.md` — garante leitura e atualização do CLAUDE.md em toda sessão.
- **Novos docs:** `docs/FLUXO-DE-DADOS.md` (mapa das 4 camadas), `docs/AUDITORIA-PROFUNDA.md` (10 problemas críticos identificados).
- **Deploy:** `npm run deploy:app` → https://virtus-financeiro-cd7bd.web.app

### Afiliados + cashback unificado (10/04/2026)
- **Config de ambiente** expandida em `functions/config.js`: `LOMADEE_APP_TOKEN`, `LOMADEE_SOURCE_ID`, `LOMADEE_WEBHOOK_SECRET`, `MONETIZZE_API_KEY`, `MONETIZZE_TOKEN`, `MONETIZZE_WEBHOOK_SECRET`, `CASHBACK_CONVERSION_RATE`, `CASHBACK_RELEASE_DAYS`.
- **Webhook parceiro** refeito em `functions/index.js` com normalização de payload (Lomadee/Monetizze/generic), validação de secret por parceiro, idempotência e ledger em `affiliate_transactions`.
- **Novos endpoints HTTP:** `webhookLomadee` e `webhookMonetizze` (core compartilhado com `webhookParceiro`).
- **Crédito de moeda**: quando status normalizado = `approved`, registra em `users/{uid}/sibcoin`, atualiza `users/{uid}/filiado/dados` e grava log em `cashback_log`.
- **Guia prático:** `docs/AFILIADOS-WEBHOOKS-CASHBACK.md` com payloads exemplo (`curl`), `reference` com `uid`, `*_PRODUCT_MAP` e troubleshooting.
- **Homologação:** `docs/HOMOLOGACAO-AFILIADOS-CASHBACK.md` inclui os mesmos 5 testes em **PowerShell** (`$BASE`, `$UID`, helper `Post-AffiliateWebhook`).
- **Cashback vs comissão:** `docs/CASHBACK-SIBCOIN-NEGOCIO.md` — tabela por `produtoId`, custo em R$/1k vendas, tetos sugeridos e notas para loja genérica Lomadee.

### Auditoria profunda + hardening de qualidade (10/04/2026 — sessão 2)

#### Cloud Functions — timeouts corrigidos
- **`chatApiOptions`** em `functions/index.js`: de `{}` para `{ timeoutSeconds: 300, memory: '512MB', ...enforceAppCheck }`. Afeta `chatApi`, `chatStreamApi`, `proactiveInsightApi`.
- **`pluggySyncAccounts`**: de `functions.https.onCall` para `functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onCall`. Evita timeout em syncs bancários longos.

#### Memory leak BRAPI rate map
- `brapiRateCheck` em `functions/index.js`: entradas no `_brapiRateMap` agora têm `cleanupTimer` (`setTimeout` de `BRAPI_RATE_WINDOW + 1000ms`) que limpa a entrada automaticamente. Antes acumulava indefinidamente.

#### Novos serviços de qualidade no frontend
- **`src/services/validators.ts`** (novo): validação centralizada para `Entry`, `Card`, `CardPurchase`, `Goal`, `Investment`, `Recurrent`, `Account`. Funções puras que retornam `{ ok, errors[] }`. Previne gravação de dados malformados no Firestore.
- **`src/services/logging.ts`** (novo): logging centralizado de erros para `users/{uid}/errorLogs`. Fire-and-forget, rate-limited (10/min), sanitizado (sem dados financeiros). Exporta `logClientError`, `logClientWarn`, `withErrorLogging`.

#### Firestore rules — schema validation
- **`isValidEntry(data)`**: verifica `desc` (string, 1–200 chars), `value` (number, 0–1B), `date` (string, 10 chars ISO), `type` (enum receita/despesa/transferencia).
- **`isValidUserData(data)`**: verifica `plan` (enum), `openFinanceStatus` (enum), `finScore` (0–100), `sibcoinBalance` (≥0).
- Aplicado a `entriesOverflow` (create/update) e `users/{userId}` (create/update).
- Nova regra `users/{userId}/errorLogs`: append-only (create OK, update/delete = false).

#### Deploy realizado
- `firebase deploy --only "functions:chatApi,functions:chatStreamApi,functions:proactiveInsightApi,functions:pluggySyncAccounts"` ✅
- `firebase deploy --only firestore:rules` ✅
- `firebase deploy --only hosting:app` → https://virtus-financeiro-cd7bd.web.app ✅

### Loja ao vivo — Lomadee + Monetizze (11/04/2026)

#### Problema resolvido: Lomadee API
- **`functions/services/affiliate/lomadeeCatalogService.js`** reescrito:
  - URL corrigida de `api-beta.lomadee.com.br/affiliate/brands` → `api.lomadee.com/v3/{token}/advertiser/_all`
  - `LOMADEE_SOURCE_ID` agora passado como `?sourceId=` em todas as requisições (rastreamento correto)
  - Novo endpoint de deeplink: `GET /v3/{token}/deeplink/create?sourceId=…&url=…` — gera URLs rastreáveis por advertiser em paralelo com timeout de 10s
  - Fallback silencioso: se deeplink falhar, usa URL direta do advertiser
  - Cache do catálogo: 5 min (era 90s); cache de deeplinks: 1h
  - `normalizeBrand` → `normalizeAdvertiser` com suporte a múltiplos campos de comissão e logo

#### Loja.tsx — abas completadas
- **Aba "Resgatar SibCoin"**: grid de rewards com cards, estado `canAfford`, modal de confirmação com botão Confirmar/Cancelar, barra de progresso de saldo.
- **Aba "Histórico"**: KPIs (saldo/resgatados/tier/multiplicador) + lista de transações do `sibcoinHistory` (últimas 50, ordem decrescente), empty state.
- **Aba "Redes"**: cards por rede afiliada com contagem de lojas + seção "Como funciona" (5 passos).

#### Click tracking implementado
- `affiliateStore.ts`: nova função `trackAffiliateClick(offer)` — chama `registrarCliqueSolucao` fire-and-forget antes de redirecionar.
- `Loja.tsx`: `openAffiliateLink` atualizado para receber `offer` (não só URL) e chamar `trackAffiliateClick` automaticamente. Todos os botões "Ir" e "Ativar" rastreados.

#### Webhooks Monetizze — URLs para configurar no painel
- **Lomadee:** `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/webhookLomadee`
- **Monetizze:** `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/webhookMonetizze`
- **Genérico:** `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/webhookParceiro`

#### Deploy realizado
- `firebase deploy --only "functions:affiliateStoreCatalogApi,functions:registrarCliqueSolucao,functions:webhookLomadee,functions:webhookMonetizze,functions:webhookParceiro"` ✅
- `npm run build && firebase deploy --only hosting:app` ✅ → https://virtus-financeiro-cd7bd.web.app

#### Loja em “demonstração” — região (10/04/2026)
- **Causa:** `affiliateStoreCatalogApi` deployada em **`southamerica-east1`**, mas o app chamava com **`getFunctions(app)`** (default **`us-central1`**) → URL da callable errada → erro → fallback **demo** em `Loja.tsx`.
- **Correção correta:** manter a função em **`southamerica-east1`** (escolha válida por latência/região BR) e alinhar o cliente: `getFunctions(app, 'southamerica-east1')` em `affiliateStore.ts` **só** para `affiliateStoreCatalogApi`; `registrarCliqueSolucao` segue em `us-central1` com `functions` padrão.

### Loja — correções de DNS e cascata de endpoints (12/04/2026)

#### Problema DNS resolvido
- `affiliateStoreCatalogApi` movida de **`us-central1`** → **`southamerica-east1`**: domínio `api-beta.lomadee.com.br` agora resolve corretamente (confirmado via logs: antes ENOTFOUND, depois HTTP 404 → problema passou a ser o path, não DNS).
- `affiliateStore.ts` atualizado: usa `getFunctions(app, 'southamerica-east1')` para `affiliateStoreCatalogApi`.
- Detecção de erros DNS em `lomadeeCatalogService.js` expandida: inclui `EAI_AGAIN`, `ETIMEDOUT`, `ECONNRESET`.

#### lomadeeCatalogService.js reescrito (arquivo estava truncado — bug de sessão anterior)
- Cascata de 3 tentativas antes de cair em demo:
  1. `GET /affiliate/products` com `x-api-key` header → catálogo de produtos (requer ativação no painel Lomadee)
  2. `GET /affiliate/brands` com `x-api-key` header → anunciantes/marcas
  3. `GET /v3/{token}/store/_all` (e fallbacks `program/_all`, `advertiser/_all`) → lojas v3
- `normalizeProduct` e `normalizeAdvertiser` separados e completos.
- `module.exports = { getCatalog }` correto.

#### Pendência operacional
- **Ativar módulo `/affiliate/products` no painel Lomadee:** acessar painel → Meus aplicativos → solicitar acesso ao Catálogo de Produtos. Sem isso, a cascata cai em `/affiliate/brands` (poucos anunciantes).

### Onboarding expandido + BCB Valores a Receber (13/04/2026)

#### Contexto
Pivot do foco da Loja para o coração do produto. O onboarding coletava poucos dados e não conectava bancos — usuários chegavam sem dados financeiros, o Ld ficava em zero e o app parecia vazio.

#### RegistrationWizard — 6 etapas (era 4)
- **Novo step 4 "Conectar Bancos"**: embeds `OpenFinanceConnect` inline no wizard. Usuário conecta via Pluggy diretamente no onboarding; flag `openBankingConectadoNoOnboarding: true` salva no Firestore. Botão "Pular" disponível.
- **Novo step 5 "Dinheiro Esquecido"**: ao chegar neste step, o app chama automaticamente `valoresAReceberApi` com o CPF informado no step 0. Mostra:
  - Loading: "Consultando Banco Central…"
  - Encontrou: card verde com instituições + botão "Resgatar no Banco Central" (link para valoresareceber.bcb.gov.br)
  - Não encontrou: card neutro ("Nenhum valor encontrado")
  - API indisponível: card âmbar com link manual
- Validação de CPF com algoritmo completo (módulo 11) integrada ao step identidade.
- Lookup de CEP via ViaCEP auto-preenche estado/cidade no step contato.

#### OpenFinanceConnect — nova prop `onConnected`
- Adicionada prop `onConnected?: () => void` ao componente.
- Chamada após sync Pluggy bem-sucedido (`pluggySyncAccounts` sem erro) → wizard marca `bankConnected = true`.
- Retro-compatível: prop é opcional, componentes existentes não precisam mudar.

#### Nova Cloud Function `valoresAReceberApi`
- `functions/index.js` — callable `us-central1`
- Recebe `{ cpf: string }` do usuário autenticado
- Tenta dois endpoints BCB em cascata: `/api/v1/cpf/{cpf}` e `/api/v1/cliente/{cpf}`
- Se `available.length > 0`: persiste `users/{uid}.valoresAReceber` com `hasValues, institutions, total, checkedAt, claimUrl`
- Retorna `{ hasValues, count, institutions, claimUrl, source: 'bcb' }` ou `{ hasValues: null, error }`

#### Deploy realizado (13/04/2026)
- `firebase deploy --only functions:valoresAReceberApi` ✅ → `us-central1`
- `npm run build && node scripts/prepare-dist.mjs && firebase deploy --only hosting:app` ✅ → https://virtus-financeiro-cd7bd.web.app

### Crédito como módulo pai (13/04/2026)

- **Arquitetura de rotas ajustada (Fase 1):**
  - `/credito` → redirect para `/credito/visao-geral`
  - Novas subrotas: `/credito/cartoes`, `/credito/emprestimos`, `/credito/plano`, `/credito/oportunidades`, `/credito/educacao`
  - `/cartoes` agora é alias compatível e redireciona para `/credito/cartoes`
- **Sidebar:** item secundário mudou de **Cartões** para **Crédito** (`/credito`), consolidando o domínio no menu.
- **CreditHub:** abas passam a sincronizar com URL (deep-link por submódulo), mantendo o estado de navegação coerente.
- **Objetivo:** reduzir sobreposição entre `Cards.tsx` e `CreditHub.tsx` e preparar a migração gradual para “Crédito” como domínio principal.

### Crédito — Fase 2 (13/04/2026)

- Novo componente compartilhado: `src/components/credit/CreditModuleTabs.tsx`.
  - Navegação única dos submódulos (`/credito/visao-geral`, `/credito/cartoes`, `/credito/emprestimos`, `/credito/plano`, `/credito/oportunidades`, `/credito/educacao`).
  - Reutilizado em `CreditHub.tsx` e `Cards.tsx`.
- `CreditHub.tsx`:
  - remove dependência de estado interno para tabs;
  - aba ativa passa a ser derivada da rota atual;
  - bloco duplicado de “Cartões” removido (agora responsabilidade da rota `/credito/cartoes`).
- `Cards.tsx`:
  - incorpora `CreditModuleTabs` no topo;
  - título ajustado para “Crédito · Cartões” reforçando hierarquia de domínio.

### Crédito — Fase 3 (13/04/2026)

- `Cards.tsx` foi reduzido ao escopo operacional de cartões/faturas.
  - blocos longos de macrovisão e “crédito estruturado” foram removidos desta tela para evitar duplicação com o Hub;
  - adicionado bloco compacto **Resumo de crédito** com indicadores-chave e links para:
    - `/credito/visao-geral`
    - `/credito/emprestimos`
    - `/consultor-ia`
- Resultado: separação mais nítida entre:
  - **Hub de Crédito** (visão estratégica/consolidada)
  - **Crédito · Cartões** (execução operacional do dia a dia)

### Crédito — Fase 4 (13/04/2026)

- Novo arquivo compartilhado: `src/components/credit/CreditVisuals.tsx`
  - `pressurePillClasses(level)` para badges de pressão;
  - `pressurePanelClasses(level)` + `pressureLabel(level)` para painéis de status;
  - `CreditKpiGrid` para cards de métricas reutilizáveis.
- `CreditHub.tsx` e `Cards.tsx` passaram a usar os mesmos visuais de pressão/KPI (consistência total de UI).
- Correção de navegação no Hub: botão “Ver detalhes” agora navega para `/credito/cartoes` (sem estado local de aba).

### Crédito — Fase 5 (13/04/2026)

- Novo módulo de seções: `src/components/credit/CreditHubSections.tsx`
  - `CreditOverviewSection`
  - `CreditLoansSection`
  - `UtilBar` interno para barras de utilização.
- `CreditHub.tsx` foi simplificado:
  - remove blocos grandes de JSX das abas “Visão Geral” e “Empréstimos”;
  - passa a orquestrar seções por composição de componentes.
- Benefício: menor acoplamento e manutenção mais simples das seções do Hub sem impactar a tela operacional de cartões.

### Crédito — Fase 6 (13/04/2026)

- `CreditHubSections.tsx` expandido com:
  - `CreditPlanSection`
  - `CreditOpportunitiesSection`
- `CreditHub.tsx` deixa de conter blocos extensos de JSX para “Plano” e “Oportunidades”, passando a montar via componentes.
- Resultado: `CreditHub.tsx` mais enxuto e com melhor separação de responsabilidades por seção.

### Crédito — Fase 7 (13/04/2026)

- `CreditHubSections.tsx` ganhou `CreditEducationSection`.
- `CreditHub.tsx` remove bloco local de Educação (carrossel + glossário) e passa a compor a aba via `CreditEducationSection`.
- Com isso, todas as abas principais do Hub (`Visão Geral`, `Empréstimos`, `Plano`, `Oportunidades`, `Educação`) já estão em seções/componentes dedicados.

### Crédito — Fase 8 (13/04/2026)

- Novo arquivo `src/constants/creditHub.ts` para centralizar conteúdo/config:
  - `CREDIT_EDUCATION_CARDS`
  - `CREDIT_GLOSSARY_TERMS`
  - `buildCreditPlanItems(...)`
  - `buildCreditOpportunities(...)`
- `CreditHub.tsx` passa a consumir essas constantes/builders, ficando menos acoplado a texto/labels.
- `CreditEducationSection` agora recebe `glossaryTerms` por props (antes hardcoded no componente).

### Crédito — Fase 9 (13/04/2026)

- Testes unitários adicionados para proteger regras de conteúdo/contexto do Hub de Crédito:
  - Arquivo: `src/constants/creditHub.test.ts`
  - Cobertura:
    - presença mínima de cards de educação e glossário;
    - `buildCreditPlanItems(...)` gera 4 blocos na ordem esperada (`alert`, `reneg`, `clock`, `check`);
    - `buildCreditOpportunities('critico')` não exibe “Aumento de limite”;
    - `buildCreditOpportunities('controlado')` exibe “Seguro prestamista”.
- Ferramenta de teste adicionada: `vitest` (devDependency).
- Script novo: `npm run test:unit` (`vitest run src/constants/creditHub.test.ts`).
- Execução validada: `npm run test:unit -- src/constants/creditHub.test.ts` ✅ (4/4 testes).

### Crédito — Fase 10 (13/04/2026)

- **Benefícios de cartão (MVP)** adicionados ao domínio:
  - novo tipo `CardBenefits` em `src/types/userData.ts`;
  - `Card` agora aceita `cardBenefits` (sala VIP, seguros, proteção de compra, garantia estendida, concierge, pontos, cashback e notas).
- **Persistência**: `updateCard(...)` em `src/services/persistUserData.ts` passou a aceitar atualização de `cardBenefits`.
- **Crédito · Cartões (`src/pages/Cards.tsx`)**:
  - novo botão **Benefícios** em cada cartão;
  - modal dedicado para editar benefícios manualmente;
  - atalho “Sugerir benefícios pela bandeira” (regras iniciais por Visa/Mastercard/Amex/Elo);
  - chips de resumo exibidos no card (ex.: Sala VIP, Seguro viagem, Pontos, Cashback).
- **Hub de Crédito (`/credito/visao-geral`)**:
  - `CreditOverviewSection` recebe `benefitsSummary`;
  - novo bloco “Benefícios de cartões” com contadores (cartões com benefícios, com sala VIP, com proteção/seguro).

### Crédito — Fase 11 (13/04/2026)

- **Consultor IA agora considera benefícios dos cartões** no resumo estratégico enviado ao backend (`src/context/ConsultantSessionContext.tsx`):
  - novo helper `buildCardBenefitsSnapshot(cards)` inclui:
    - quantidade de cartões com benefícios preenchidos;
    - total com sala VIP;
    - total com proteções/seguros;
    - cartão com maior cashback informado.
- Objetivo: permitir recomendações mais contextuais (ex.: qual cartão usar por benefício, quando priorizar sala VIP/cashback/seguros) sem depender só de limite/fatura.

### Consultor — Bloco “Sugestão de cartão” (13/04/2026)

- **`src/utils/suggestBestCardForPurchase.ts`**: heurística local (texto do usuário + `cardBenefits`) — palavras-chave de viagem, online, refeições, eletrônicos; pontuação por cashback e benefícios; retorna `null` se não houver gatilho ou cartão com benefícios.
- **`src/components/consultant/CardPurchaseHint.tsx`**: card visual no thread do chat após a resposta da IA, com link para `/credito/cartoes`.
- **`ConsultantChatMessage.cardPurchaseSuggestion`**: preenchido ao concluir `handleSend` com sucesso em `ConsultantSessionContext.tsx`.

### Crédito — Catálogo de benefícios (referência) (13/04/2026)

- **`src/constants/cardBenefitsCatalog.ts`**: perfis típicos por bandeira (Visa, Mastercard, Elo, Amex, Hipercard, Outros) em níveis (básico → topo); textos de referência + dicas de rede VIP/pontos; **cashback não é fixado** (usuário informa).
- **`Cards.tsx` (modal Benefícios)**: seletor de perfil + **Aplicar perfil**; botão **Sugestão rápida (perfil intermediário)**; edição manual marca `source: manual`; perfil aplicado do catálogo salva com `source: catalog` quando ainda marcado como vindo do catálogo.

---

## 🏪 PLANO LOJA 2.0 — CHECKOUT NATIVO + EXPANSÃO DE CATÁLOGO

> Status: **Planejado** — nenhum código desta seção existe ainda.

### Visão
Transformar a Loja de vitrine de afiliados (usuário sai do app) em **canal de compra nativo** onde o usuário paga sem sair do Sibanki. Toda compra feita dentro do app entra automaticamente nos lançamentos financeiros com categoria, valor e Sv calculados antes da confirmação. Nenhum banco ou app financeiro brasileiro faz isso hoje.

### Arquitetura de Pagamento (sem licença do Banco Central)

**Facilitador escolhido: Pagar.me Marketplace (Stone) ou Mercado Pago Marketplace**
- Eles são a instituição de pagamento regulada; o Sibanki é apenas a plataforma de distribuição.
- Split automático configurado no painel do facilitador: X% vai para o lojista parceiro, Y% vai para o Sibanki como comissão de marketplace.
- Nenhum dinheiro fica em conta do Sibanki — fluxo direto facilitador → lojista.

**Fluxo de pagamento no crédito:**
1. Usuário seleciona produto na Loja → tela de checkout abre dentro do app.
2. SDK JS do Pagar.me/MP **tokeniza o cartão no browser** (dados nunca chegam nos nossos servidores — PCI-compliant).
3. Cloud Function `createOrder` recebe token + produtoId + userId → chama API do facilitador → confirma split.
4. Webhook de confirmação → credita SibCoin de cashback + cria lançamento automático em `entries` do usuário.
5. Sv calculado em tempo real antes do usuário confirmar (“Este gasto reduz seus Dias de Liberdade em X dias”).

**Fluxo Pix:**
- Mesmo fluxo, porém a Cloud Function gera um QR Code Pix via API do facilitador.
- Usuário paga no próprio app bancário, webhook confirma, lançamento criado automaticamente.

**SibCoin como desconto:**
- Antes de confirmar, o usuário pode aplicar SibCoins como desconto (ex: 500 SC = R$ 5,00 de desconto).
- Desconto deduzido do valor enviado ao facilitador; SibCoins consumidos registrados em `sibcoinHistory`.

### Cloud Functions necessárias

| Função | Tipo | O que faz |
|--------|------|-----------|
| `createOrder` | onCall | Cria pedido: tokeniza, chama facilitador, salva em `orders/{orderId}` |
| `confirmOrderWebhook` | onRequest | Webhook do facilitador: confirma pagamento, cria lançamento, credita SibCoin |
| `cancelOrder` | onCall | Cancela pedido pendente; estorna SibCoins se aplicado |
| `getOrderHistory` | onCall | Lista pedidos do usuário em `users/{uid}/orders` |

### Estrutura Firestore

```
/orders/{orderId}
  ├── uid, productId, merchantId, network
  ├── amount, currency (BRL)
  ├── sibcoinApplied, sibcoinDiscount
  ├── paymentMethod: 'credit_card' | 'pix'
  ├── status: 'pending' | 'confirmed' | 'cancelled' | 'refunded'
  ├── facilitator: 'pagarme' | 'mercadopago'
  ├── externalOrderId (ID no facilitador)
  ├── entryId (lançamento criado no Firestore após confirmação)
  └── createdAt, confirmedAt
```

### Expansão de catálogo — Redes a integrar

| Rede | Tipo | Prioridade | Observação |
|------|------|-----------|------------|
| Lomadee `/affiliate/products` | Produtos físicos | 🔴 Alta | Requer ativação no painel (task operacional) |
| **Awin** | Físicos + digitais | 🔴 Alta | API REST bem documentada, centenas de anunciantes BR |
| **B2W Afiliados** (Americanas/Submarino) | Físicos | 🟡 Média | Direto dos maiores varejistas BR |
| **Magalu Afiliados** | Físicos | 🟡 Média | API própria, grande catálogo |
| **Hotmart** | Infoprodutos/cursos | 🟡 Média | Complementa o catálogo físico |
| **Eduzz** | Infoprodutos | 🟢 Baixa | Similar ao Hotmart |
| Monetizze | Infoprodutos | ✅ Já integrado (webhook) | Adicionar catálogo |

### Recomendações contextuais (diferencial Sibanki)

A Loja deve usar os dados do `IntelligenceContext` para personalizar o catálogo:
- Se `catTotals['Eletrônicos'] > 500` → destacar ofertas de eletrônicos com cashback.
- Se `spread < 0` (dívida cara) → destacar portabilidade de crédito nas Soluções.
- Se `freedom.days > 180` → destacar investimentos e cursos financeiros.
- Componente `LojaContextualBanner` na aba principal da Loja mostrando “Você gasta R$X/mês em Y — veja ofertas com cashback”.

### Parceiros piloto para checkout nativo
Selecionar 2-3 lojistas com API própria para o primeiro checkout nativo:
- Farmácia (Droga Raia, Ultrafarma — APIs abertas)
- Livraria (Amazon BR via Associates API)
- Supermercado (Rappi API para pedidos)

---

## 🎯 PRÓXIMAS PRIORIDADES (13/04/2026)

### 🔴 CRÍTICO — resolver agora

1. **Ativar `/affiliate/products` no painel Lomadee**
   - Acesso: painel.lomadee.com → Meus Aplicativos → Catálogo de Produtos
   - Sem isso a Loja mostra poucos anunciantes (o endpoint products retorna 404 sem ativação)
   - **Não é código — é tarefa operacional do João**

2. **Verificar se `lomadeeCatalogService.js` reescrito está retornando dados reais**
   - Após ativação da Lomadee, testar no app se a cascata `products → brands → v3` retorna conteúdo
   - Checar logs no Firebase Console → Functions → `affiliateStoreCatalogApi`

3. **Wire `validators.ts` ao `persistUserData.ts`** — os validadores existem mas não estão sendo chamados antes das escritas no Firestore

4. **Recorrentes automáticos** — ✅ implementado no código (`aplicarRecorrentesDoMes` + `aplicarRecorrentesManual` + botão no front); pendente apenas deploy/validação em produção

### 🟡 PRÓXIMO SPRINT — Core do produto

5. **Race condition em `updateUserDoc`** — implementar `requestId` + idempotência para evitar escritas duplicadas em reconexões
6. **Error handling em `Cards.tsx`** (1253 linhas, crashes silenciosos) — wrappers try/catch + `logClientError`
7. **Integrar Awin** — `awinCatalogService.js` com `AWIN_PUBLISHER_ID` + `AWIN_API_KEY`
8. **Recomendações contextuais na Loja** — `LojaContextualBanner.tsx` usando `catTotals` do `IntelligenceContext`

### 🟢 MÉDIO PRAZO — Loja 2.0 e crescimento

9. **Checkout nativo Fase 1 (Pix)** — Cloud Function `createOrder` + `confirmOrderWebhook` + integração Pagar.me
10. **Checkout nativo Fase 2 (Crédito)** — SDK de tokenização Pagar.me no React + fluxo completo
11. **Sv pré-compra** — mostrar impacto da compra nos Dias de Liberdade antes do usuário confirmar
12. **Lançamento automático pós-compra** — compras na Loja entram automaticamente em `entries`
13. **Testes Playwright para Loja e Onboarding** — adicionar rotas `/loja` e fluxo de cadastro nos smoke tests
- **Nota:** o TLD `.com.br` da Lomadee não obriga a região da Cloud Function; o que importa é **mesma região** entre deploy da callable e `getFunctions` no front.
### Pipeline multi-agente APOSENTADO (jun/2026)

O pipeline assíncrono Antigravity ↔ Cursor ↔ Cowork (TASK_QUEUE.md, `.cursor/rules/`,
`scripts/task-watcher.mjs`, `scripts/start-pipeline.bat`, `.pipeline/`) foi
**descontinuado**. O desenvolvimento passou a ser **inteiramente pelo Claude**.
As regras de engenharia vivem em `AGENTS.md` (v2.0, Claude-only).

### Análise do sibanki.com.br + quick wins (11/06/2026)

**Contexto:** análise completa do domínio público `sibanki.com.br` (Cloudflare na frente do Firebase Hosting) sob três lentes: comercial, usuário e dev. Relatórios/screenshots em `analise-sibanki/` (não versionado).

**Achados principais (ainda abertos):**
- 🔴 **Sem landing page pública** — toda rota deslogada cai no login; funil de aquisição inexistente (maior alavanca comercial pendente).
- `/sitemap.xml` cai no rewrite do SPA (soft-404); robots.txt é o gerenciado da Cloudflare; título estático único em todas as rotas.
- Health check: tudo verde exceto `monetizzeToken: missing`.

**Correções aplicadas (branch `claude/brave-chebyshev-3d8df8`, rebased em `audit/analise-360` — commit `d45c08c`):**
- **`firebase.json`**: headers de HTML com `source: "**"` em vez de `"**/*.html"` — no Firebase Hosting o match é contra o **path da requisição**, não o arquivo do rewrite; CSP/no-cache **nunca eram aplicados** nas rotas do SPA (produção servia `max-age=3600` default → risco de tela branca pós-deploy). Adicionados `frame-ancestors`, `X-Frame-Options: SAMEORIGIN` (DENY quebraria self-framing previsto no frame-src), `Referrer-Policy`, `nosniff`. Vale para targets `app` e `staging`. **Requer deploy de hosting para valer.**
- **`useMarketRates.ts`**: gate de auth via `onAuthStateChanged` — antes toda visita anônima gerava 401 + invocação paga de `fixedIncomeCatalogApi`.
- **`Login.tsx`**: "senha bancaria" → "senha bancária".
- **`index.html`**: OG/Twitter tags (preview WhatsApp) + splash estático pulsante dentro de `#root` (mata a tela preta de ~5s da 1ª visita; React substitui ao montar).
- **`scripts/generate-og-image.mjs`** gera `public/og-image.png` (1200×630); `prepare-dist.mjs` copia para `dist/`. `scripts/verify-splash.mjs` valida o splash com JS bloqueado.
- Validado: `tsc --noEmit` OK, `npm run build` OK, splash verificado por screenshot. **Sem deploy nesta sessão.**

---

## Design System — Primitivos Pierre (rebase sobre audit/analise-360 · 14/06/2026)

### Achado critico de branch
O `main` (25/abr) estava **obsoleto e sem buildar**: `App.tsx`/`Accounts.tsx`/`Cards.tsx` importavam 12 modulos inexistentes nele. A linha real do produto e a **`audit/analise-360`** (12/jun, 60 commits a frente). Trabalho de DS foi rebaseado sobre ela.

### Entregue
- **`src/utils/cn.ts`** — helper `cn` unico (clsx+tailwind-merge).
- **`src/constants/sovereigntyScale.ts`** — fonte unica de cor/label Ld (`FREEDOM_TIERS`) e Sv (`SV_TIERS`/`getSvTier`); `SovereigntyHero` e `SovereigntyBadge` consomem.
- **Primitivos** `src/components/ui/`: `Button` (+`buttonClasses`; **primary = botao branco** alinhado ao CTA da audit; secondary/ghost/danger), `Card` (+`CardHeader`), `Badge`, `Field`/`Input`/`Select`. Barrel `primitives.ts`.
- **Telas existentes NAO migradas** (decisao 14/06): para nao desviar do design em producao, as migracoes cosmeticas (`EmptyState`/`FeedbackCallout`/`NotFound`/`ErrorBoundary` + icone do Modal) foram revertidas ao pixel exato da producao. Primitivos ficam como ferramenta para telas NOVAS (com revisao visual). `SovereigntyHero`/`Badge` refatorados para a escala central = pixel-identico. Modal mantem so focus-trap (a11y, sem efeito visual).
- **`Modal`** — merge: prop `size` (da audit) + focus trap + icone lucide `X` + `title: ReactNode`.
- **`.si-label`** util em `index.css`.
- **Ratchet** `src/constants/designSystem.guard.test.ts` (vitest, gate de deploy): proibe crescer botao colorido solido. Baseline **29** (audit ja fez varredura de cor; era 164 no main morto).

### Conflitos resolvidos a favor da audit
`creditSnapshot.ts` (audit ja tinha fallback dueDay superior), `AccountCard.tsx` (cn local exportado), `Login.tsx` (brand surface redesenhada).

### Verificacao pos-rebase
`tsc --noEmit`: **0 erros**. `vitest`: **128/128**. `vite build`: **OK** (antes quebrado). Sem deploy/push nesta sessao.
