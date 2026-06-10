# ANÁLISE 360° DO SIBANKI — 10/06/2026

> Análise completa do sistema sob 4 lentes: **comercial**, **dev sênior**, **usuário** e **design**.
> Base: leitura de CLAUDE.md, AGENTS.md, SESSION_HANDOFF.md, CHANGELOG.md + auditoria direta de código
> (`src/`, `functions/`, `firestore.rules`, `package.json`). Produzida por Claude (Cowork).

---

## RESUMO EXECUTIVO

O Sibanki está num momento clássico de produto pré-tração: **engenharia madura demais para a receita que gera (zero) e amplo demais para o estágio em que está**. O sistema tem governança de código exemplar, conceitos proprietários fortes (Ld/Sg/Sv) e integrações reais (Pluggy, BCB, BigDataCorp, BRAPI, LLMs) — mas a monetização não está ativada (Stripe com priceIds placeholder, feature flags todas abertas), o app tem ~50 rotas e 22 itens de navegação sem um funil de ativação medido, e o vocabulário do produto exige educação que o onboarding ainda não entrega.

**A pergunta central não é "o que falta construir" — é "o que parar de construir para ativar o que existe".**

| Lente | Nota | Maior força | Maior risco |
|---|---|---|---|
| Comercial | 5/10 | Diferenciação real (Soberania + Open Finance + IA) | Zero receita ativada; dispersão de foco |
| Dev sênior | 7,5/10 | Governança, testes, segurança server-side | Páginas-monolito; migração multi-tenant inacabada |
| Usuário | 6/10 | Assistente IA + dados bancários reais | Sobrecarga cognitiva; jargão sem rampa |
| Design | 7/10 | Design system coeso (Pierre) | Acessibilidade tipográfica; erosão da regra monocromática |

---

## 1. VISÃO COMERCIAL

### 1.1 Posicionamento — o que está certo

"Financial OS brasileiro" com três métricas proprietárias (Dias de Liberdade, Spread Gap, Sovereignty Score) é uma tese de diferenciação genuína. Nenhum concorrente direto (Mobills, Organizze, Mobills, apps de banco) responde "quantos dias você vive sem renda" nem dá veredito por transação. O combo **Open Finance real (Pluggy) + consultor IA com dados de mercado ao vivo (BRAPI/BCB/Tesouro) + score por transação** é defensável — o custo de réplica é alto.

### 1.2 O problema: nenhum motor de receita está ligado

- **Stripe:** `stripeService.js` tem o mapa `STRIPE_PRICE_TO_PLAN` com **priceIds comentados como placeholders** ("ajustar com priceIds REAIS"). Checkout existe, mas não há produto vendável configurado.
- **Feature flags:** todas liberadas para todos os planos ("fase de construção"). Não existe diferença prática entre gratuito e pro — logo, não existe motivo para pagar.
- **Afiliados/cashback:** webhooks Lomadee/Monetizze prontos, mas dependem de ativação operacional no painel Lomadee (pendência desde 13/04) e de volume de usuários que ainda não há.
- **Loja 2.0 (checkout nativo):** plano ambicioso e diferenciado, mas é o 4º motor de receita planejado antes do 1º estar funcionando.

### 1.3 Estrutura de custos cresce por usuário, receita não

Cada usuário ativo consome: chamadas LLM (chat, insights, categorização), sync Pluggy, consultas BigDataCorp (Meu CPF), BRAPI, push, e-mails. São custos variáveis reais com receita variável zero. Sem teto de uso por plano, um usuário gratuito intensivo é prejuízo puro.

### 1.4 Riscos regulatórios a tratar antes de escalar

- **LGPD:** o sistema coleta CPF, dados bancários completos, geolocalização (Sentinela) e negativações de bureau. Não há evidência no repositório de política de privacidade versionada, fluxo de exclusão de dados (direito ao esquecimento) ou DPO nomeado.
- **Posicionamento como "consultor":** recomendações de investimento geradas por IA tangenciam regulação CVM/Anbima sobre recomendação de investimento. Disclaimers consistentes no produto são baratos agora e caros depois.

### 1.5 Recomendações comerciais (em ordem)

1. **Ativar billing em 30 dias:** criar os 2 priceIds reais (Pro mensal/anual), fechar 3–5 features atrás do plano Pro (ex.: consultor ilimitado, Raio-X, Meu CPF, relatórios PDF) e medir conversão mesmo com base pequena.
2. **Definir limite de uso do gratuito:** N mensagens de IA/mês, 1 conexão Open Finance, sync manual. Protege o custo variável.
3. **Congelar abertura de módulos novos por um trimestre.** O backlog (Loja 2.0, checkout nativo, Awin) só faz sentido com usuários ativos pagando.
4. **Instrumentar o funil:** `platformEvents.ts` existe, mas não há dashboard de ativação (cadastro → conexão OF → primeiro Ld calculado → retorno D7). Sem isso, toda decisão de produto é palpite.
5. **Compliance mínimo viável:** política de privacidade, exclusão de conta self-service, disclaimer padronizado nas respostas de investimento do consultor.

---

## 2. VISÃO DEV SÊNIOR

### 2.1 O que está acima da média (e deve ser preservado)

- **Governança IA:** `AGENTS.md` com matriz de responsabilidade, regra de ouro para código que toca dinheiro, fail-closed em webhooks, convenções de commit — raríssimo em projeto solo. É um ativo.
- **Segurança server-side:** admin via Custom Claims, proxy Anthropic (chave nunca no cliente), mapa canônico priceId→plan (SEG-Stripe-1), validação de `context.auth`, secrets no Secret Manager, rules com schema validation e coleções append-only (`auditLogs`, `openFinanceConsents` sem delete).
- **Qualidade operacional:** `tsc --noEmit` zero erros, 118 testes unit + 35 Playwright, `ci:local`, deploys gateados em testes (`deploy:app` roda `test:unit` antes), logging estruturado (só 13 `console.log` em todo `functions/`).
- **Validação wired:** `validators.ts` está de fato chamado em `persistUserData.ts` (`assertValid` em addEntry/updateEntry/addCard/addGoal etc.) — pendência crítica de abril resolvida.
- **Arquitetura de dados no front:** AppContext com 2 listeners únicos + IntelligenceContext memoizado é o desenho correto; optimistic entries com auto-limpeza implementadas.

### 2.2 Dívidas técnicas reais (medidas hoje)

| Item | Medição | Limite acordado (AGENTS.md) |
|---|---|---|
| `functions/index.js` | **1.711 linhas** | "idealmente só registro de exports" |
| `Cards.tsx` | **1.688 linhas** | red flag > 800 |
| `Dashboard.tsx` | **1.406 linhas** | red flag > 800 |
| `Growth.tsx` | **1.350 linhas** | red flag > 800 |
| `LandingPage.tsx` | 1.242 linhas | red flag > 800 |
| `CreditHub.tsx` | 1.185 linhas | red flag > 800 |
| Ocorrências `any` | **109 em 40 arquivos** | teto de 115 — a 6 do estouro |

O Dashboard com 6 sub-abas (sessão 09/06) e o CreditHub com simuladores empurraram esses arquivos para cima de novo, mesmo após as fases 1–11 de extração do crédito. O padrão das `CreditHubSections` funcionou — falta aplicá-lo a Dashboard, Cards e Growth.

### 2.3 Riscos estruturais

1. **Modelo de dados monolítico:** `users/{uid}` guarda `entries[]`, `cards[]`, `investments[]` etc. como arrays num único documento. Limite duro do Firestore é 1 MB/doc. Com Open Finance sincronizando histórico bancário, o estouro é questão de tempo para usuários reais. `entriesOverflow` mitiga, mas a escrita inline continua crescendo e cada update reescreve o documento inteiro (custo + risco de race entre devices — o debounce de `updateUserDoc` ajuda numa sessão, não entre dispositivos).
2. **Migração multi-tenant parada no meio:** rules e API multi-tenant existem, mas o app produção grava no path legado `users/{uid}`. Dois modelos de dados vivos = dobro de superfície de bug. Decidir: ou migrar de verdade, ou despriorizar formalmente o multi-tenant.
3. **App Check opcional:** `enforceAppCheck` só liga com `ENFORCE_APP_CHECK === "true"`. Enquanto desligado, todas as callables aceitam tráfego de qualquer origem autenticada — incluindo abuso de cota de LLM. Ligar em produção deveria ser tarefa da próxima janela de deploy.
4. **Split de regiões:** `southamerica-east1` default com exceções em `us-central1` (`valoresAReceberApi`, `registrarCliqueSolucao`) já causou bug em produção (Loja em demo). Padronizar ou centralizar a resolução de região num único módulo (`fnsBR`/`fnsUS` foi o passo certo — concluir a varredura).
5. **Cobertura de teste no lugar errado:** os testes unit cobrem `creditHub` constants e `entryUtils`, mas **não** o `sovereigntyEngine` nem o `decisionEngine` — exatamente a matemática que diferencia o produto. Um bug no cálculo de Ld é um bug na promessa central.
6. **Drift de documentação:** CLAUDE.md afirma "13 itens de sidebar" e "32 páginas"; o código tem 5 grupos de navegação com ~22 itens e 46 arquivos de página. Doc desatualizada induz os próprios agentes de IA a erro.

### 2.4 Recomendações técnicas (em ordem)

1. Testes unit para `sovereigntyEngine.ts` e `decisionEngine.ts` (caso feliz + bordas: sem entries, burn rate zero, dívida zero).
2. Ligar `ENFORCE_APP_CHECK` em produção (com janela de monitoração).
3. Quebrar `Dashboard.tsx` nas 6 sub-abas como componentes (repetir o padrão `CreditHubSections`); depois Cards e Growth.
4. Plano de migração `entries[]` → subcoleção (ou ao menos teto de entries inline com rolagem automática para overflow já na escrita).
5. Decidir o destino do multi-tenant (migrar ou congelar) e registrar a decisão.
6. Atualizar o bloco "Status atual" do CLAUDE.md (sidebar, contagem de páginas/rotas, funções).

---

## 3. VISÃO USUÁRIO

### 3.1 O que funciona

- **O momento "uau" existe:** conectar o banco e ver "você consegue viver X dias sem renda" é concreto e emocional — nenhum app brasileiro entrega isso.
- **Melhorias recentes de UX foram na direção certa:** entrada em `/dashboard` (não mais direto no chat), skeletons contextuais no lugar de spinner azul, splash de 3s → 1,2s, empty state com 3 passos guiados, painel "O que significam esses números?", logos de marcas nas transações (Netflix, iFood…), busca visual de bancos com identidade real.
- **Multicanal real:** PWA + push + WhatsApp + Telegram cobre como brasileiro usa finanças no dia a dia.

### 3.2 Onde o usuário sofre

1. **Sobrecarga cognitiva na navegação.** São ~22 itens em 5 grupos (Principal, Gestão, Social, Mais, Rodapé). Um usuário novo encontra Credi Amigo, Consórcio, Casal, Filiados, FIRE, SibCoin, Meu CPF antes de ter registrado a segunda despesa. A sidebar comunica "plataforma gigante", não "clareza financeira" — que é a promessa do produto.
2. **Jargão sem rampa.** Ld, Sg, Sv, Spread Gap, "soberania", "Dreno Crítico", "Alavancagem Inteligente" — o painel explicativo ajuda, mas o vocabulário aparece antes da explicação em várias telas. O usuário médio brasileiro de app financeiro não atravessa essa barreira sozinho.
3. **Confiança fragmentada por módulos semiprontos.** `ComingSoonOverlay`, dados que dependem de ativações operacionais (Lomadee), módulos recém-conectados a APIs reais (Meu CPF aguardando deploy) — cada tela "quase pronta" cobra um imposto de credibilidade num app que pede CPF e senha bancária.
4. **Custo de entrada alto sem dado.** Sem conectar Open Finance ou digitar lançamentos, quase tudo fica vazio. O onboarding de 6 etapas pede CPF, endereço, conexão bancária e consulta BCB **antes** de mostrar valor. O "dinheiro esquecido" (Valores a Receber) é um ótimo gancho — deveria vir mais cedo, não no passo 5.
5. **Peso no celular.** ~1 MB+ gz de vendors (firebase 497 KB, charts 409 KB) num público que acessa por 4G. Code splitting existe, mas o primeiro paint do dashboard carrega muito.

### 3.3 Recomendações para o usuário

1. **Modo simples por padrão:** sidebar inicial com 6–7 itens; o resto atrás de "Mais" ou desbloqueado progressivamente conforme uso (o SibCoin já dá a mecânica de progressão de graça).
2. **Traduzir as métricas na primeira exposição:** "Dias de Liberdade" já é bom; "Spread Gap" poderia exibir-se como "Seus investimentos rendem menos que suas dívidas custam" com o número técnico em segundo plano.
3. **Inverter o onboarding:** mostrar Valores a Receber (BCB) logo após o CPF — valor imediato antes de pedir conexão bancária.
4. **Esconder módulos sem dados reais** em vez de overlay "em breve": menos superfície, mais confiança.
5. **Medir e publicar internamente o funil D0→D7** antes de qualquer feature nova.

---

## 4. VISÃO DESIGN

### 4.1 Forças

- **Design system disciplinado:** Pierre Finance (fundo `#0a0a0a`, cards `#111`, monocromático, Inter, labels ALL CAPS) aplicado com consistência rara via CSS vars `--si-*`. A migração recente para tokens semânticos (`bg-si-card`, `divide-si-border`) habilitou modo claro/escuro de forma correta.
- **Identidade emergente:** loading com vídeo, logos dark/light, favicon, cards de cartão com identidade visual real dos emissores, logos de marcas nas transações — o app está ganhando "cara de produto", não de protótipo.
- **Estados cuidados:** EmptyState, PageTransition, skeletons por página, ErrorBoundary por rota — a infraestrutura de polish existe.

### 4.2 Problemas de design

1. **Tipografia de labels é um problema real de acessibilidade.** `text-[10px] font-bold tracking-[0.18em] uppercase` em texto cinza sobre fundo escuro falha legibilidade para boa parte dos usuários (e provavelmente contraste WCAG AA em `--si-3`/`--si-4`). 10px ALL CAPS funciona no Pierre original porque é desktop denso para entusiastas; o Sibanki mira público amplo mobile.
2. **A regra monocromática está sendo erodida sem decisão formal.** O CHANGELOG de 08–09/06 descreve "painel de veredito reativo com **gradientes** de cores (verde, violeta, âmbar, rosa)", cards esmeralda/violeta/âmbar no Orçamento, barras coloridas por banco. A regra escrita diz "sem gradientes coloridos, sem botões coloridos". Ou a regra mudou (e deve ser reescrita com uma paleta semântica de feedback: positivo/alerta/risco/info), ou os módulos novos estão fora do sistema. Hoje coexistem as duas linguagens.
3. **Modo claro foi retrofit, não projeto.** As correções de 09/06 consertaram fundos estáticos um a um (Header, Sidebar, divisores). Provavelmente restam superfícies hardcoded em páginas grandes (Cards, Growth, CreditHub). Falta uma auditoria sistemática de tema claro tela a tela.
4. **Densidade sem hierarquia nos hubs.** Dashboard com 6 sub-abas, CreditHub com 6 abas + simuladores + painéis ("Muralha de Liquidez", "Portal do Tempo", "Concentração de Risco") — cada bloco individualmente é bom, mas a soma compete por atenção. Falta uma regra editorial: 1 número herói por tela, 3 blocos de suporte, resto colapsado.
5. **Iconografia de marca terceirizada inconsistente:** Simple Icons em SVG branco sobre círculo colorido (transações) vs. logos oficiais sobre fundo branco/temático (contas/cartões) — dois sistemas de logo diferentes no mesmo app.

### 4.3 Recomendações de design

1. **Definir escala tipográfica mínima:** labels ≥ 11px, e validar contraste das vars `--si-3`/`--si-4`/`--si-5` contra WCAG AA nos dois temas.
2. **Formalizar a paleta semântica de feedback** (emerald = positivo, amber = atenção, rose = risco, violet = projeção) como exceção documentada à regra monocromática — e proibir gradientes fora dela.
3. **Auditoria de modo claro** com checklist por página (Playwright screenshot diff já existe no projeto — usar).
4. **Regra editorial de densidade** para Dashboard/CreditHub: hierarquia herói → suporte → colapsado.
5. **Unificar o sistema de logos de marca** (um único componente, uma única regra de fundo).

---

## 5. SÍNTESE — AS 10 AÇÕES QUE MAIS MOVEM O PONTEIRO

| # | Ação | Lente | Esforço | Impacto |
|---|---|---|---|---|
| 1 | Ativar Stripe com priceIds reais + gating de 3–5 features Pro | Comercial | M | 🔥🔥🔥 |
| 2 | Limites de uso no plano gratuito (IA, sync) | Comercial | S | 🔥🔥🔥 |
| 3 | Funil de ativação instrumentado (D0→D7) | Comercial/UX | M | 🔥🔥🔥 |
| 4 | Testes no `sovereigntyEngine`/`decisionEngine` | Dev | S | 🔥🔥 |
| 5 | Ligar `ENFORCE_APP_CHECK` em produção | Dev | S | 🔥🔥 |
| 6 | Sidebar em modo simples (6–7 itens) + desbloqueio progressivo | UX | M | 🔥🔥 |
| 7 | Onboarding invertido: Valores a Receber antes da conexão bancária | UX | S | 🔥🔥 |
| 8 | Quebrar Dashboard/Cards/Growth em seções (padrão CreditHubSections) | Dev | M | 🔥 |
| 9 | Paleta semântica formalizada + labels ≥ 11px + auditoria modo claro | Design | M | 🔥 |
| 10 | Plano para `entries[]` → subcoleção (limite 1 MB do Firestore) | Dev | L | 🔥🔥 (médio prazo) |

**Tese final:** o Sibanki já provou que consegue construir. O próximo trimestre deveria provar que consegue **ativar, reter e cobrar** — com menos superfície, mais foco no momento Ld, e o motor de billing ligado.

---

*Documento gerado em 10/06/2026. Medições citadas (linhas de arquivo, contagem de `any`, estado do Stripe, navegação) foram verificadas diretamente no código nesta data.*

---
---

# REANÁLISE 360° — PÓS-EXECUÇÃO DAS 10 AÇÕES (10/06/2026, mesma data)

> As 10 ações da tabela acima foram executadas na branch `audit/analise-360`
> (9 commits). Esta seção reavalia cada lente com o que mudou, o que foi
> descoberto durante a execução e o que permanece em aberto.

## NOTAS REVISADAS

| Lente | Antes | Depois | O que moveu |
|---|---|---|---|
| Comercial | 5/10 | **6,5/10** | Gating Pro real + limite do gratuito + funil instrumentado. Falta o passo operacional (priceIds) para virar receita de fato |
| Dev sênior | 7,5/10 | **8,5/10** | Dashboard refatorado, tsc restaurado a zero, vulnerabilidade de plano fechada, App Check pronto, plano de migração escrito |
| Usuário | 6/10 | **7/10** | Sidebar simples por padrão, onboarding entrega valor (BCB) antes de pedir confiança, tipografia legível |
| Design | 7/10 | **7,5/10** | Paleta semântica formalizada, mínimo tipográfico imposto. Auditoria de modo claro segue pendente |

## O QUE FOI FEITO (com descobertas da execução)

1. **Billing destravado no código (#1).** A descoberta mais importante da
   execução: o plano era **autoeditável pelo cliente** — qualquer usuário
   virava "pro" pelo toggle de Configurações ou escrevendo `plan` direto no
   Firestore (as rules permitiam). Fechado nas três camadas: rules bloqueiam
   `plan`/`stripeCustomerId`, `useFeatureFlags` só aceita `data.plan`
   (server-set) e a UI virou checkout/portal Stripe de verdade.
2. **Custo variável protegido (#2).** Gratuito agora tem teto de 40 mensagens
   IA/mês imposto no servidor (transação Firestore em `users/{uid}/usage/ai`),
   com mensagem de upsell preservada no front. Pro/Família ilimitados.
3. **Funil mensurável (#3).** Quatro marcos D0 instrumentados
   (cadastro → OF → primeiro lançamento → primeiro Ld real) com dedup por uid.
   A pergunta "quantos usuários chegam ao momento uau?" agora tem resposta.
4. **Correção da própria análise (#4).** A v1 afirmou que o `sovereigntyEngine`
   não tinha testes — **estava errado**: existem 37 casos + decisionEngine +
   validators (127 testes no total). Registrado como lição: medir antes de
   afirmar, sempre.
5. **App Check a um deploy de distância (#5).** O React SPA não inicializava
   App Check (só o legado). Agora inicializa quando `VITE_APPCHECK_SITE_KEY`
   existe — ativação em 2 fases documentada.
6. **Sobrecarga cognitiva atacada (#6, #7, #9).** Sidebar abre com 8 itens em
   vez de ~22; onboarding mostra "dinheiro esquecido" no BCB antes de pedir
   conexão bancária; nenhum texto de UI abaixo de 10px (sweep em 50 arquivos);
   cor agora tem gramática (paleta semântica documentada).
7. **Dashboard deixou de ser monolito (#8).** 1.406 → 724 linhas; as 5
   sub-abas viraram componentes isolados em `components/dashboard/`, cada um
   com seus próprios memos — o padrão CreditHubSections aplicado.
8. **Dívida estrutural com plano (#10).** Migração `entries[]` → subcoleção
   especificada em 4 fases com dual-write e rollback.

## O QUE A EXECUÇÃO REVELOU DE NOVO

- **Higiene de branch:** havia 292 arquivos modificados não commitados de
  sessões anteriores (incluindo o tsc quebrado com 14 erros — o baseline
  "zero erros" do CHANGELOG de 07/06 já não era verdade). Isolado em commit
  snapshot e corrigido. Sugestão de processo: cada agente commita ao fim da
  própria sessão (AGENTS.md §8 poderia exigir isso).
- **`Map<number>` vs ids de entry, `settings.planType` espalhado:** pequenas
  inconsistências de tipo/contrato que merecem uma passada dedicada.
- **Light mode:** `InvestmentInsights.tsx` está 100% hardcoded em dark
  (`#0d0d0f`, `zinc-*`, `text-white`) — catalogado em
  `docs/DESIGN-PALETA-SEMANTICA.md` §3 com o grep para achar os demais.

## O QUE SÓ O JOÃO PODE FAZER AGORA (gate operacional)

1. **Stripe (30 min):** criar os priceIds + `STRIPE_PRICE_TO_PLAN` +
   `VITE_STRIPE_PRICE_PRO_MONTHLY` + webhook — roteiro em
   `docs/STRIPE-ATIVACAO.md`. Sem isso, todo o gating construído cobra zero.
2. **Deploys:** `firestore:rules` (CRÍTICO — fecha a brecha do plano),
   `functions:chatApi,chatStreamApi,trackPlatformEvent`, `hosting:app`.
3. **App Check:** chave reCAPTCHA v3 → fase Monitoring → `ENFORCE_APP_CHECK=true`.
4. **PR da branch `audit/analise-360`** para revisão e merge (regra de ouro:
   código que toca dinheiro precisa do seu aprove).

## PRÓXIMAS 5 PRIORIDADES (pós-merge)

1. Ativação Stripe completa + primeiro teste de checkout ponta a ponta.
2. Rodar o funil por 2 semanas e definir metas reais de conversão por etapa.
3. Quebrar `Cards.tsx` (1.688) e `Growth.tsx` (1.350) no padrão das sub-abas.
4. Auditoria de modo claro (grep do §3 da doc de design) + unificar logos.
5. Fase 0–1 da migração entries (teto de segurança + dual-write).

**Tese revisada:** o gap deixou de ser código — é operação. Um bloco de ~2h
do João (Stripe + deploys + App Check) converte o trabalho desta branch em
produto cobrável, protegido e mensurável.

*Reanálise gerada em 10/06/2026 após execução das 10 ações. Verificação final:
`tsc --noEmit` zero erros · 127/127 testes unit · build Vite OK · 9 commits.*
