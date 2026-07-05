# Masterplan Sibanki

Este documento consolida a direcao de produto e arquitetura para evoluir o Sibanki no React sem perder a visao de plataforma: consultoria inteligente, ecossistema de parceiros, Open Finance, colaboracao, afiliados, loja e SibCoin.

## 1. Tese do produto

O Sibanki nao deve evoluir como "mais um gerenciador financeiro com IA".

Ele deve se tornar um **sistema operacional financeiro pessoal**, capaz de:

- consolidar a vida financeira real do usuario;
- entender comportamento, contexto e momento;
- orientar a proxima melhor acao;
- abrir jornadas de produtos quando houver encaixe real;
- recompensar evolucao, colaboracao e indicacao com SibCoin;
- transformar dados financeiros em progresso financeiro e comercial.

## 2. Principios de arquitetura

### 2.1. Um nucleo financeiro canonico

Toda feature nova deve ler e escrever a partir de um nucleo canonico comum:

- fluxo de caixa;
- contas e saldos;
- cartoes e uso de limite;
- metas e orcamentos;
- investimentos;
- contratos e obrigacoes de credito;
- recompensas e produtos contratados.

Nao devemos continuar espalhando regras em strings, arrays avulsos e telas isoladas.

### 2.2. Event-driven por padrao

Tudo importante precisa virar evento:

- abriu consultor;
- perguntou sobre orcamento;
- conectou Open Finance;
- estourou categoria;
- recebeu salario;
- contratou produto;
- ganhou SibCoin;
- ignorou insight;
- aceitou CTA.

Esses eventos sao o insumo do consultor, do motor de recomendacao e das analises de produto.

### 2.3. Consultor como orquestrador

O consultor nao deve ser tratado como "chat". Ele deve ser o orquestrador de jornada.

Funcoes:

- diagnosticar situacao;
- priorizar dores;
- sugerir a proxima melhor acao;
- conduzir o usuario no app;
- oferecer produtos com contexto e adequacao;
- saber quando nao falar.

### 2.4. Vendas sem poluicao

O sistema so pode abrir ofertas quando houver:

- relevancia;
- adequacao;
- momento;
- consentimento;
- explicabilidade.

Primeiro ajudar. Depois conduzir. So entao vender.

## 3. Dominios da plataforma

### 3.1. Financial Core

Responsavel por dados brutos, normalizados e derivados:

- transacoes;
- contas;
- cartoes;
- metas;
- orcamentos;
- investimentos;
- patrimonio;
- score e indicadores.

### 3.2. Credit Intelligence

Novo dominio estrategico.

Objetivo: dar ao usuario uma visao macro do credito, algo que a maioria dos apps nao entrega bem.

Objetos-alvo:

- `credit_accounts`: cartoes, emprestimos, financiamentos, cheque especial, consignado;
- `credit_obligations`: parcela, vencimento, juros, CET, saldo devedor, atraso;
- `credit_profile`: limite total, limite usado, comprometimento da renda, custo medio do credito;
- `credit_opportunities`: consolidacao, portabilidade, refinanciamento, quitação antecipada.

Perguntas que o sistema deve responder:

- quanto credito eu tenho;
- quanto do meu mes ja esta comprometido;
- qual divida custa mais caro;
- qual divida devo atacar primeiro;
- qual produto de credito faz sentido para aliviar ou organizar minha vida.

### 3.3. Open Finance Intelligence

Open Finance nao deve entrar apenas como importador de extrato.

Ele deve enriquecer:

- renda real;
- gastos fixos reais;
- obrigacoes recorrentes;
- saldo e liquidez;
- padrao de comportamento;
- risco e estabilidade.

Pipeline recomendado:

1. ingestao em colecoes proprias;
2. normalizacao em entidades canonicas;
3. consolidacao em indicadores;
4. exposicao para consultor e motor de recomendacao.

### 3.4. Partner Commerce

Todos os produtos de parceiros devem ser enxergados como jornadas e nao como banners.

Categorias iniciais:

- credito;
- consorcio;
- seguro;
- investimentos;
- futura loja de servicos e beneficios.

Cada produto parceiro precisa ter:

- elegibilidade;
- score de adequacao;
- score de momento;
- tracking de clique;
- tracking de conversao;
- vinculo com reward;
- explicacao do motivo da recomendacao.

### 3.5. Rewards, Loja e SibCoin

SibCoin deve operar em duas camadas:

- **off-chain** para UX, velocidade, regras de produto e IA;
- **on-chain** em Polygon para registro, interoperabilidade e evolucao de tokenomics.

Casos de uso:

- missoes;
- ativacao;
- indicacao;
- colaboracao;
- contratacao de parceiros;
- upgrades;
- loja;
- campanhas.

### 3.6. Social e Colaboracao

O ecossistema colaborativo deve conectar:

- familia;
- comunidade;
- colaboradores;
- afiliados;
- mentoria;
- desafios em grupo.

### 3.7. Advisor & Recommendation Engine

Camada responsavel por:

- diagnostico;
- proxima melhor acao;
- trilha de evolucao;
- insight;
- notificacao;
- oferta;
- supressao anti-poluicao.

### 3.8. Milhas e programas de fidelidade (visao)

Objetivo de longo prazo: o Sibanki deixar de ser apenas **visor de saldo** e evoluir para **plataforma que transaciona milhas** nos canais **permitidos pelos programas** (parceria comercial, agencia/consolidador, ou fluxos oficiais de compra/resgate).

**Nao** faz parte do nucleo desta visao: marketplace P2P informal, automacao (RPA) em conta do usuario nos sites das cias, ou cessao de milhas fora das regras dos programas — alto risco juridico, de ToS e operacional.

O desenho desejado alinha **Partner Commerce** (3.4), **Open Finance / agregacao** (3.3) e **SibCoin** (3.5): dados consolidados + jornada de compra/emissao **on-brand** onde houver acordo.

## 4. Modelo de dados de referencia

### 4.1. Dado bruto

- transacoes manuais;
- transacoes Open Finance;
- contratos externos;
- cliques e eventos;
- rewards;
- eventos sociais.

### 4.2. Dado normalizado

- `cashflow_profile`
- `credit_profile`
- `investment_profile`
- `product_profile`
- `engagement_profile`
- `reward_profile`

### 4.3. Dado derivado

- saude financeira;
- estagio de jornada;
- risco de estresse;
- prontidao para crescer;
- propensao a contratar;
- propensao a churn;
- propensao a colaborar.

## 5. Papel do React

O React deve ser a nova casca modular do ecossistema, e nao apenas a reescrita visual do legado.

Toda feature nova em React precisa responder:

1. Que dado canonico ela usa?
2. Que eventos ela emite?
3. Como o consultor enxerga isso?
4. Como isso se conecta com produtos, rewards ou colaboracao?

## 6. Roadmap recomendado

### Fase 1. Fundacao

- criar contratos de dominio para perfil financeiro, eventos e recomendacao;
- expor perfil consolidado no React;
- unificar telemetria do consultor e insights;
- preparar contexto do consultor para evolucao futura;
- documentar dominios e trilhas de dados.

### Fase 2. Credito e Open Finance

- modelar contas de credito e obrigacoes;
- consolidar limites, uso, parcelas e comprometimento;
- conectar Open Finance em colecoes dedicadas;
- enriquecer perfil financeiro com dados externos.

### Fase 3. Motor de recomendacao

- criar ranking de proxima melhor acao;
- introduzir supressao anti-poluicao;
- abrir recomendacoes explicaveis;
- medir aceites, rejeicoes e ignorados.

### Fase 4. Parceiros, rewards e loja

- transformar solucoes em jornadas;
- integrar reward por contratacao;
- alinhar loja com utilidade real do SibCoin;
- permitir campanhas segmentadas por momento e perfil.

### Fase 5. Polygon e tokenomics

- consolidar ledger interno de rewards;
- introduzir wallet vinculada;
- espelhar saldos e eventos on-chain;
- abrir futuras regras de tokenomics sem travar a UX principal.

### Fase 6. Milhas e fidelidade (transacionalidade)

**Ideia no roadmap:** tornar o Sibanki capaz de **orquestrar transacoes de milhas** (compra, pacotes oficiais, resgates ou emissoes) **apenas** via relacionamento contratual com **programas de fidelidade** e/ou **parceiros credenciados** (ex.: agencias, consolidadores, APIs B2B ja existentes), com UX unificada no app e eventual reforco com SibCoin (recompensa/campanha), sem mercado secundario nao autorizado.

**Pontos que precisam ser resolvidos para dar certo:**

1. **Comercial e juridico**
   - definir modelo: parceiro direto do programa vs. parceiro de agencia/consolidador;
   - negociar ou aderir a programa de parceiros/APIs oficiais (termos de uso, marca, comissao);
   - parecer juridico sobre papel do Sibanki (intermediacao, SCD/IF se aplicavel, responsabilidade por emissao/cancelamento).

2. **Produto e escopo**
   - MVP em uma linha so (ex.: apenas compra de milhas oficial do programa X, ou apenas deep link + tracking);
   - politica explicita: o que o app **nao** fara (P2P informal, RPA em credenciais, etc.);
   - jornada do usuario: onde entra Open Finance (saldo/alerta) vs. onde abre checkout parceiro.

3. **Pagamentos e repasses**
   - gateway com split/escrow se houver multiplos recebedores;
   - reconciliacao e estorno alinhados a passagem aerea (prazos, chargeback).

4. **Dados e integracao tecnica**
   - fonte de verdade para saldo (agregador com consentimento vs. digitacao);
   - contratos de API ou links oficiais documentados;
   - eventos de plataforma (`miles_offer_viewed`, `miles_purchase_completed`, etc.) para consultor e metricas.

5. **Risco e confianca**
   - KYC/antifraude proporcional ao ticket;
   - suporte e SLAs com parceiro para disputa de bilhete ou milhas.

6. **SibCoin token (Fase 5)**
   - regra clara: SibCoin como **recompensa/cashback de campanha**, nao substituto do contrato com o programa de fidelidade;
   - se houver conversao milhas-token, apenas com **modelo acordado por escrito** com o emissor ou canal autorizado.

**Dependencias:** Fase 4 (parceiros e jornadas) e, para utilidade on-chain, Fase 5. A Fase 6 pode comecar por **descoberta** (prospeccao com 1-2 programas ou 1 agencia) em paralelo a entregas tecnicas menores (alertas de expiracao + links oficiais).

## 7. Mudancas iniciadas neste ciclo

Este ciclo abre a fundacao para a evolucao no React e no legado:

- criacao de tipos de plataforma em `src/types/platform.ts`;
- criacao de perfil financeiro consolidado em `src/utils/financialProfile.ts`;
- exposicao desse perfil no `AppContext`;
- inicio da telemetria de jornada do consultor e do insight;
- criacao da callable `trackPlatformEvent` para centralizar eventos do React;
- adaptacao do legado para enviar eventos e contexto enriquecido do consultor em `public/app/app.js`;
- adaptacao do legado para medir exibicao e clique de insights sem depender da migracao completa;
- introducao do dominio estruturado de credito em `UserData` com `creditAccounts`, `creditObligations` e `creditSnapshot`;
- consolidacao automatica desse snapshot para leitura por dashboard, cartoes, consultor e legado;
- base preparada para o proximo passo: credit intelligence e recommendation engine.

## 8. Como levar isso para a producao atual (legado)

A estrategia correta nao e esperar a migracao inteira para React. O legado em producao deve receber uma **camada de compatibilidade de plataforma**.

### 8.1. O que pode entrar imediatamente no legado

- telemetria unificada de consultor e insights;
- contexto consolidado adicional para `chatApi`;
- tracking de clique em CTAs importantes;
- perfil financeiro resumido para priorizar orientacao e futuras ofertas.

### 8.2. O que deve ficar compartilhado entre legado e React

- Cloud Functions de telemetria;
- modelo de eventos;
- modelo de perfil consolidado;
- regras de recommendation engine;
- elegibilidade de produtos;
- reward engine e SibCoin;
- consolidacao de Open Finance e credito.

### 8.3. O que deve nascer apenas no React

- novas jornadas complexas de parceiros;
- telas novas de credito macro;
- telas novas de Open Finance;
- experiences mais ricas de loja, rewards e colaboracao;
- modularizacao de dominios e UI.

### 8.4. Regra de rollout

1. backend e contratos primeiro;
2. legado recebe compatibilidade minima em producao;
3. React recebe a experiencia nova completa em staging;
4. quando maduro, React substitui a casca de UX sem perder historico, eventos e contexto.

Assim, o legado continua vendendo e operando hoje, enquanto o React passa a construir o futuro sem criar duas plataformas diferentes.

## 9. Proximas implementacoes prioritarias

1. Introduzir um dominio de credito no frontend e backend.
2. Adaptar o contexto do consultor para ler perfil consolidado em vez de apenas string textual.
3. Criar o recommendation engine com regras de relevancia e supressao.
4. Modelar Open Finance em colecoes dedicadas.
5. Migrar solucoes React de "placeholder" para jornadas reais orientadas por perfil.

## 10. Decisao de produto orientadora

Toda decisao futura deve passar por esta pergunta:

**isso ajuda o Sibanki a consolidar a vida financeira real do usuario, orientar a proxima melhor acao e abrir produtos com inteligencia e confianca?**

Se a resposta for "nao", a feature provavelmente esta entrando como silo.
