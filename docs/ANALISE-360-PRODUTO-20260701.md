# Análise 360 do Sibanki — Produto, Comercial e Técnica

**Data:** 01/07/2026 · **Autor:** Claude (análise solicitada por João) · **Base:** código em `main` (commit `5acdda5`) + CLAUDE.md + inventário

**Pedido:** análise honesta sobre (1) se as informações estão sendo apresentadas com clareza, (2) se o Sibanki está se tornando um produto de valor.

---

## Tese central

O Sibanki tem uma proposta de valor genuinamente diferenciada — Ld, Sg e Sv são conceitos que nenhum concorrente brasileiro oferece — mas está construindo um banco inteiro antes de provar que uma pessoa muda de comportamento financeiro por causa desses três números. O produto hoje sofre menos de falta de valor e mais de excesso de superfície: o valor existe, mas está diluído em 23 entradas de navegação e ~45 rotas que competem pela atenção do usuário. A resposta curta às duas perguntas é: **não, a informação não está clara** — não por má execução de telas individuais, mas por falta de hierarquia editorial no produto como um todo; e **o valor ainda é uma hipótese não testada** — não há funil de aquisição, não há diferenciação de planos ativa e não há evidência citável de retenção.

---

## Parte 1 — Produto e UX: a informação está clara?

### 1.1 O problema não é a tela, é o mapa

As telas individuais são bem executadas. O `SovereigntyHero` explica Ld com tooltip, o empty state do Dashboard educa sobre Ld/Sg antes de pedir dados, o design system Pierre é consistente e disciplinado (ratchet de botões coloridos, escala central de cores em `sovereigntyScale.ts`). O problema é o nível acima: o que o usuário deveria olhar primeiro?

Evidência dura: a sidebar hoje tem **6 itens principais + 15 secundários + 2 de rodapé = 23 entradas**. O CLAUDE.md (atualizado 29/06) ainda documenta 13. Em poucas semanas a navegação cresceu 77% e a documentação não acompanhou — isso é sintoma, não detalhe: o produto está crescendo mais rápido do que a capacidade de decidir o que ele é.

Entre as 15 entradas secundárias estão módulos de peso e maturidade completamente distintos: Orçamento e Metas (core de qualquer app financeiro) dividem o mesmo menu com Credi Amigo, Consórcio Amigo, Filiados, FIRE, SibCoin e Loja. Para o usuário, tudo tem o mesmo peso visual. Um produto que apresenta empréstimo entre amigos com a mesma proeminência que orçamento mensal está dizendo ao usuário que não sabe qual dos dois importa mais.

### 1.2 Três "visões gerais" competindo

Existem hoje pelo menos três superfícies que respondem "como estou financeiramente?": o Dashboard (`/dashboard`), a página Home (`/home`, 639 linhas) e a aba Visão do Assistente (`ConsultantVisionPanel` em `/consultor-ia`). A entrada padrão do app é o chat. Isso significa que o usuário novo cai numa interface de conversa, com um painel escondido atrás de uma aba, e mais dois painéis alternativos acessíveis pela sidebar. Cada superfície dessas foi bem intencionada individualmente; juntas, elas dizem que o produto não decidiu qual é a resposta canônica para a pergunta mais importante do usuário.

A aposta de chat como entrada é ousada e defensável — se o assistente for excepcional, é diferencial real. Mas ela só funciona se as outras superfícies forem rebaixadas explicitamente. Hoje não são.

### 1.3 Carga conceitual: três siglas + uma moeda + cinco tiers

O usuário precisa aprender: Ld (com 5 tiers de "Frágil" a "Inabalável"), Sg (com 4 verdicts), Sv (score 0–100 com 4 faixas por transação), SibCoin (com 5 tiers de Bronze a Diamante) e ainda o Sovereignty Score geral. São quatro sistemas de pontuação simultâneos. Cada um isoladamente é bom; empilhados, competem entre si. Um teste honesto: se você perguntar a um usuário depois de uma semana "qual número do Sibanki você olha?", a resposta provável é nenhum — porque quatro sistemas de score é o mesmo que nenhum sistema de score.

A recomendação aqui não é remover conceitos, é sequenciar: Ld como número único do produto nos primeiros 30 dias do usuário; Sv aparece contextualmente nos lançamentos; Sg só quando existe dívida + investimento; SibCoin como camada silenciosa até o usuário ter hábito formado. Hoje tudo é apresentado de uma vez porque as feature flags estão todas liberadas ("fase de construção") — o que era decisão de conveniência de desenvolvimento virou decisão de UX por omissão.

### 1.4 O que está bom e deve ser preservado

O redirect de `/` para o Assistente com onboarding recente por coach tasks (commits de junho: gating de sidebar durante onboarding, checklist progressivo, teaser no dashboard) mostra que a direção correta já começou — os últimos commits (`7a7ae0e` "CPO audit recommendations and reduce visual noise", `1f340f5` gating de navegação) indicam que o problema de ruído já foi percebido internamente. Isso é o trabalho certo; a questão é se ele vai até o fim (cortar/esconder módulos) ou para no meio (só reorganizar o menu).

---

## Parte 2 — Comercial: estamos nos tornando um produto de valor?

### 2.1 Valor para quem? Ainda não há funil para descobrir

O achado mais grave da análise de junho continua verdadeiro no código: **não existe landing page pública roteada**. Existe uma `LandingPage.tsx` de 1.242 linhas em `src/pages/` que não é importada em lugar nenhum do `App.tsx` — é código morto. Toda visita deslogada a `sibanki.com.br` cai no login. Isso significa que o Sibanki hoje é estruturalmente incapaz de adquirir um usuário que não foi convidado pessoalmente. Nenhuma análise de proposta de valor importa enquanto o funil tem taxa de entrada zero.

### 2.2 Monetização: quatro modelos, nenhum provado

O produto carrega simultaneamente: (a) planos Stripe (gratuito/pro/família), (b) afiliados Lomadee/Monetizze com cashback em SibCoin, (c) plano de Loja 2.0 com checkout nativo e split de marketplace, (d) parcerias de soluções (crédito, consórcio, seguro, investimentos). Com feature flags todas liberadas, o plano pago não tem nenhum benefício exclusivo — logo a receita de assinatura é hoje impossível por construção. Os afiliados dependem da Loja ter tráfego, que depende do app ter usuários, que depende do funil que não existe. É uma cadeia de dependências onde o elo zero está quebrado.

A pergunta comercial honesta não é "qual modelo escolher" — é "qual métrica de valor precisa ser verdadeira antes de qualquer modelo funcionar". Provavelmente: retenção semanal de usuários que conectaram Open Finance. Se essa métrica não existe ou não é olhada, todo o resto é especulação.

### 2.3 O diferencial real está subvendido

O que o Sibanki tem que Mobills, Organizze e Guiabolso (in memoriam) não têm: (1) o conceito de soberania quantificada — Ld é um número que qualquer pessoa entende visceralmente ("quantos dias eu sobrevivo sem salário"); (2) assistente IA com contexto financeiro completo e captura por voz/foto; (3) Open Finance integrado no onboarding com consulta de dinheiro esquecido no BCB — este último é um gancho de aquisição excepcional ("descubra em 30 segundos se algum banco te deve dinheiro") que hoje está enterrado no passo 5 de um wizard que ninguém deslogado consegue alcançar. O ativo de marketing mais forte do produto está atrás do login.

### 2.4 Risco de posicionamento

"Financial OS" é posicionamento para investidor, não para usuário. Usuário não quer sistema operacional; quer parar de se sentir perdido no dia 20 do mês. A comunicação do produto (nomes de módulos, textos internos) fala a língua do fundador — soberania, spread, alavancagem — e isso seleciona um público pequeno e financeiramente educado, que é exatamente o público que menos precisa do produto. Há uma tensão não resolvida entre o Sibanki aspiracional (soberania para investidores) e o Sibanki útil (clareza para endividados) — e o Hub de Crédito, ironicamente um dos módulos mais maduros do app, sugere que o segundo público é onde está a dor real.

---

## Parte 3 — Técnica: a fundação aguenta?

### 3.1 O que está sólido

Para um produto pré-PMF desenvolvido em ritmo acelerado, a base técnica é acima da média: arquitetura de contexts bem separada (Auth/FinancialData/Intelligence com memoização em 3 níveis e apenas 2 listeners Firestore), 171+ testes unitários e 35 smoke tests Playwright, health checks, TypeScript sem erros, segurança corrigida nos pontos críticos (custom claims no admin, proxy para Anthropic, secrets fora do cliente, schema validation nas Firestore rules), e um ratchet de design system que impede regressão visual. O trabalho de qualidade de abril (validators, logging, timeouts) foi real.

### 3.2 Dívidas conhecidas e ainda abertas

Boa notícia verificada no código: `validators.ts` **já está ligado** ao `persistUserData.ts` (`assertValid(validateEntry(...))` e afins) — o CLAUDE.md lista isso como pendente, mas foi resolvido. Seguem abertas: race condition em `updateUserDoc` mitigada por debounce mas sem `requestId`/idempotência real; região das Cloud Functions hardcoded em múltiplos lugares.

### 3.3 Arquivos que viraram risco

`Cards.tsx` tem 1.719 linhas (cresceu desde as 1.253 documentadas), `CreditHub.tsx` 1.527, `Growth.tsx` 1.453, `Accounts.tsx` 1.116, `Education.tsx` 1.002. Cinco páginas acima de mil linhas num codebase mantido por uma pessoa + IA é onde os bugs silenciosos vão morar. A refatoração do Crédito em fases (CreditModuleTabs, CreditHubSections) foi o padrão certo — precisa ser aplicado a Growth e Accounts.

### 3.4 Superfície operacional desproporcional

52 Cloud Functions ativas, integrações com WhatsApp, Telegram, Stripe, Pluggy, BRAPI, BCB, Tesouro, Lomadee, Monetizze, Resend, FCM, 5 provedores de LLM com fallback em cascata, multi-tenant, Capacitor para iOS/Android. Cada integração é um contrato de manutenção perpétuo. A pergunta técnica não é "funciona?" (os health checks dizem que sim) — é "quantas dessas 52 funções serviram um usuário real no último mês?". As que não serviram são custo puro: superfície de ataque, custo de deploy, ruído cognitivo.

### 3.5 Drift de documentação

CLAUDE.md diz 13 itens de sidebar; o código tem 23. Diz 33 rotas; há ~45. `LandingPage.tsx` (1.242 linhas) é código morto não documentado. Para um fluxo de desenvolvimento Claude-only, onde o CLAUDE.md É a memória do desenvolvedor, drift de documentação é bug de produção: a próxima sessão de desenvolvimento toma decisões sobre um mapa errado.

---

## Parte 4 — Síntese e recomendações priorizadas

### As três perguntas que importam agora

**1. Qual é o número do Sibanki?** Escolher UM (recomendação: Ld) e subordinar todos os outros scores a ele. Isso resolve metade do problema de clareza sem apagar nenhuma linha de código — é decisão de hierarquia, não de feature.

**2. Como alguém descobre o Sibanki?** Rotear a landing page (o código já existe!) com o gancho do dinheiro esquecido do BCB como isca de conversão. É provavelmente a maior alavanca de valor por hora de trabalho disponível no backlog inteiro.

**3. Qual métrica prova o valor?** Definir e instrumentar: % de usuários com Open Finance conectado que voltam na semana seguinte. Enquanto esse número não existe, "estamos nos tornando um produto de valor" não tem resposta — só opinião.

### Ordem de ataque sugerida

**Semana 1–2 (funil):** rotear landing pública com CTA do dinheiro esquecido → cadastro → onboarding existente. Instrumentar funil com eventos (`platformEvents` já existe). Atualizar CLAUDE.md para o estado real do código.

**Semana 3–4 (clareza):** modo "essencial" da sidebar como default — 6 itens principais + Mais recolhido com no máximo 5 itens curados; o resto vai para um catálogo em Configurações. Eleger o Assistente como superfície canônica e rebaixar Home OU Dashboard (um dos dois, não manter ambos). Sequenciar scores: Ld primeiro, resto progressivo.

**Semana 5+ (confiança):** refatorar Growth.tsx e Accounts.tsx no padrão CreditHubSections, resolver idempotência do `updateUserDoc`, auditar as 52 functions por uso real e congelar as mortas.

**Não fazer agora:** Loja 2.0 checkout nativo, novas redes de afiliados, novos módulos de qualquer natureza. Cada um deles aumenta a superfície antes de o núcleo estar provado.

### O elogio honesto

A qualidade de execução por tela, a disciplina do design system, a arquitetura de dados e a segurança estão acima do que se espera de um produto nesta fase. O problema do Sibanki não é capacidade de construir — é excesso dela. A mesma energia que criou 45 rotas em meses pode consolidar o produto em semanas, se a decisão de cortar for tomada com a mesma coragem com que se decidiu construir.

---

---

## Adendo (01/07/2026) — Direção acordada na discussão: Radar de Vazamento

Discussão com João após o relatório convergiu numa reformulação da tese. A visão dele: sistema para todo cidadão brasileiro — do apertado com vários cartões ao otimizador de benefícios — com transparência como fio condutor ("o brasileiro perde dinheiro sem perceber": seguro embutido em financiamento nunca usado, benefícios de cartão ignorados, riscos de crédito invisíveis).

O reposicionamento aceito: o unificador do Sibanki não é um público nem os 23 módulos — é um motor único de diagnóstico, o **Radar de Vazamento**. Conecta Open Finance → detecta onde o usuário perde dinheiro → devolve um número em R$/mês → cada módulo aparece como resposta a um vazamento detectado, não como item de menu. "Servir a todos" passa a significar produto adaptativo, não interface enciclopédica.

Detectores que já existem no código, hoje espalhados em módulos distintos: valores a receber BCB (dinheiro esquecido), Sg/vazamento mensal (`sovereigntyEngine`), sugestão tática de cartão do Sentinela (`cardSuggestionService` — cobre o "escolher cartão por data boa"), catálogo de benefícios de cartão (falta o inverso: "você tem sala VIP e nunca usou"), recorrentes (assinaturas fantasma). O trabalho é de composição, não de construção.

Isso resolve simultaneamente: clareza (um número em R$/mês), aquisição (landing vira "descubra quanto você perde por mês") e o "para todos" (o diagnóstico se adapta a quem a pessoa é). Ld permanece como métrica de longo prazo; o vazamento em R$/mês é o gancho de entrada e o driver diário.

Próximos passos sugeridos: spec do Radar de Vazamento (detectores, fórmula do número, onde aparece no onboarding e na landing), e só então retomar a ordem de ataque da Parte 4 com a landing ancorada nesse gancho.

---

*Evidências: contagens via `wc -l` e `grep` no commit `5acdda5` de `main` em 01/07/2026. Sidebar: `src/components/layout/Sidebar.tsx` (6+15+2 itens). Rotas: `src/App.tsx`. LandingPage sem rota: `grep -rn "LandingPage" src/` retorna apenas o próprio arquivo.*
