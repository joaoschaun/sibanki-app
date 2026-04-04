# Hub de Credito do Sibanki

## Objetivo

Transformar credito em um modulo proprio do produto, separado de contas e saldo em caixa, para consolidar:

- cartoes de credito;
- emprestimos e financiamentos;
- renegociacao e amortizacao;
- acompanhamento de estrategia;
- oportunidades comerciais relacionadas a credito;
- educacao financeira contextual.

O objetivo nao e apenas "mostrar dividas", mas dar ao usuario uma visao macro do seu passivo, da sua capacidade de pagamento e do proximo passo recomendado.

## Principio de produto

Credito nao deve morar apenas dentro de `Cartoes`.

`Cartoes` continua sendo uma area operacional de cartao:

- limite;
- compras;
- fatura;
- cartoes virtuais;
- pagamento da fatura.

`Credito` passa a ser uma visao consolidada de:

- curto prazo: cartoes e limite rotativo;
- medio e longo prazo: emprestimos, financiamentos e parcelamentos;
- pressao mensal;
- exposicao total;
- estrategia recomendada;
- oportunidades de reorganizacao e novos produtos.

## Estrutura recomendada do front

### Navegacao principal

Adicionar um item proprio no menu:

- `Credito`

No dashboard, manter um widget-resumo com CTA:

- `Abrir Hub de Credito`

### Tela principal: `Meu Credito`

Hierarquia sugerida:

1. Visao geral
2. Cartoes de credito
3. Emprestimos e financiamentos
4. Plano de acao
5. Oportunidades
6. Educacao financeira

## Wireframe funcional recomendado

### 1. Visao geral

Bloco de maior destaque no topo.

Deve mostrar:

- limite total disponivel;
- total utilizado;
- percentual comprometido;
- compromisso mensal com dividas;
- proximos vencimentos;
- pressao do credito;
- principal acao sugerida agora.

Observacao:

Nao tratar limite disponivel como "dinheiro do usuario". A linguagem deve sempre deixar claro que credito e capacidade emprestada, nao caixa.

### 2. Cartoes de credito

Subsecao voltada ao curto prazo.

Deve concentrar:

- fatura atual;
- data de vencimento;
- limite do cartao;
- valor disponivel;
- compras recentes;
- CTA para pagar fatura;
- CTA para ver resumo das compras;
- cartoes virtuais;
- pedido de novo cartao, se existir.

Essa parte pode reaproveitar quase tudo que ja existe hoje em `Cartoes`, mas como subbloco do hub.

### 3. Emprestimos e financiamentos

Subsecao de compromissos estruturados.

Cada item deve mostrar:

- nome da linha;
- instituicao;
- saldo devedor;
- parcela mensal;
- proximo vencimento;
- juros;
- CET;
- progresso do contrato, quando existir;
- botoes de acao: `Ver`, `Simular`, `Antecipar`, `Renegociar`.

### 4. Plano de acao

Esse bloco e o diferencial do Sibanki.

Deve responder:

- o que quitar primeiro;
- o que renegociar;
- o que revisar hoje;
- onde ha progresso;
- onde a estrategia travou.

Conteudos recomendados:

- prioridade numero 1;
- renegociacao pendente;
- revisoes vencidas;
- progresso recente da exposicao;
- historico curto de checkpoints.

### 5. Oportunidades

Bloco comercial e de monetizacao.

Deve ficar abaixo da gestao do passivo para evitar a sensacao de empurrar produto antes de ajudar o usuario.

Exemplos:

- aumento de limite;
- consolidacao de dividas;
- refinanciamento;
- cheque especial / credito emergencial;
- novos produtos financeiros aderentes ao perfil.

Regra de produto:

Oferecer produto novo apenas quando fizer sentido para a saude financeira do usuario.

### 6. Educacao financeira

Carrossel curto e contextual.

Exemplos:

- impacto do pagamento minimo;
- como melhorar perfil de credito;
- quando vale antecipar parcelas;
- quando renegociar piora o custo total.

## Ajustes importantes ao wireframe original

### Nao usar score de forma enganosa

Se nao houver score oficial de bureau ou metodologia robusta, evitar exibir um numero como se fosse score formal.

Usar no lugar:

- `Saude do Credito`
- `Indicador Sibanki`
- `Nivel de pressao`

### Separar dinheiro de credito

O topo do modulo deve deixar claro:

- `Saldo em conta` pertence ao dominio de contas;
- `Limite disponivel` pertence ao dominio de credito.

Esses valores podem coexistir no dashboard, mas nunca devem ser confundidos.

### Priorizar o proximo passo

O usuario precisa sair da tela sabendo o que fazer.

Por isso, o hub precisa sempre destacar:

- pagar;
- renegociar;
- revisar;
- amortizar;
- aguardar.

## Como encaixar no legado agora

## Objetivo no legado

Nao reescrever tudo de uma vez.

A estrategia recomendada e criar o Hub de Credito como nova aba/tela do legado, reaproveitando a logica ja implementada em `public/app/app.js`.

### O que ja existe e pode ser reaproveitado

Ja foi implementado no legado:

- cadastro de contas de credito e obrigacoes;
- calculo de snapshot consolidado;
- prioridade de credito;
- recomendacoes automaticas;
- simulacao e aplicacao de renegociacao;
- amortizacao;
- marcacao de estrategia;
- acompanhamento continuo;
- historico curto e checkpoints;
- widget de plano de credito;
- respostas contextuais no consultor.

### O que falta no legado

1. Criar uma aba ou tela dedicada `Credito`
2. Mover a experiencia de `Credito Estruturado` para esse hub
3. Manter `Cartoes` focado em operacao de cartao
4. Reorganizar a interface em blocos:
   - visao geral
   - cartoes
   - emprestimos
   - plano de acao
   - oportunidades
   - educacao

### Estrategia de transicao no legado

Fase 1:

- criar nova aba `Credito`;
- manter em `Cartoes` apenas um resumo com CTA `Ver Hub de Credito`;
- renderizar no novo hub o conteudo hoje espalhado entre `Cartoes`, widget e consultor.

Fase 2:

- separar visualmente cartoes de emprestimos;
- transformar o plano de credito em bloco fixo do hub;
- conectar oportunidades e educacao ao contexto do credito.

Fase 3:

- reduzir dependencias antigas do bloco de cartoes;
- deixar o hub como fonte principal da experiencia de credito;
- manter `Cartoes` apenas como visao operacional.

## Estrutura alvo para React

### Rota principal

Criar rota dedicada:

- `/credito`

### Estrutura sugerida em `src/`

```text
src/
  pages/
    CreditHub.tsx
  components/
    credit/
      CreditOverviewCard.tsx
      CreditCardsSection.tsx
      CreditLoansSection.tsx
      CreditActionPlanSection.tsx
      CreditOpportunitiesSection.tsx
      CreditEducationSection.tsx
      CreditMonitoringList.tsx
      CreditHistoryMiniChart.tsx
  hooks/
    useCreditHub.ts
    useCreditMonitoring.ts
  utils/
    credit/
      buildCreditSnapshot.ts
      buildCreditRecommendations.ts
      buildCreditActionPlan.ts
      buildCreditMonitoring.ts
  types/
    credit.ts
```

### Estado e dados

No React, o ideal e tirar a inteligencia de dentro da tela e centralizar em utilitarios e hooks.

A pagina deve consumir:

- dados crus do usuario;
- snapshot consolidado;
- recomendacoes;
- plano de acao;
- historico;
- oportunidades elegiveis.

### Contrato de dados recomendado

O dominio de credito deve ter quatro camadas:

1. `creditAccounts`
2. `creditObligations`
3. `creditSnapshot`
4. `creditMonitoringHistory`

E pode evoluir para:

5. `creditOffers`
6. `creditProductsEligibility`
7. `creditEducationMoments`

## Regras de UX

### Topo da tela

Sempre responder:

- quanto estou comprometido;
- o que vence agora;
- qual o proximo passo.

### Tom visual

- nao usar vermelho por padrao;
- usar vermelho e laranja apenas para atraso, vencimento critico ou pressao elevada;
- usar a cor primaria da marca para a visao geral;
- usar verde apenas para progresso real, nao para estimular uso de credito.

### Linguagem

Preferir textos como:

- `compromisso mensal`
- `pressao do credito`
- `proxima revisao`
- `acao recomendada`

Evitar:

- `dinheiro disponivel` quando for limite;
- `liberado para usar` sem contexto;
- qualquer linguagem que incentive endividamento impulsivo.

## Regras de negocio para oportunidades

O bloco `Para voce` deve respeitar contexto.

Exemplos:

- se o usuario esta sob alta pressao, priorizar renegociacao e consolidacao;
- se esta controlado, pode aparecer aumento de limite;
- se ha atraso ou estrategia parada, esconder ofertas agressivas;
- se o usuario esta evoluindo, mostrar produtos premium de forma mais inteligente.

## O que define o modulo como pronto

O Hub de Credito estara pronto quando:

1. existir tela propria no front;
2. cartoes e dividas estiverem separados visualmente;
3. o usuario enxergar visao geral, plano e acoes num mesmo lugar;
4. o consultor falar a mesma lingua do hub;
5. o dashboard apontar para o hub, e nao concorrer com ele;
6. oportunidades comerciais respeitarem a saude financeira;
7. a estrutura ja nascer compativel com a migracao para React.

## Proxima implementacao recomendada

Ordem sugerida:

1. criar a aba `Credito` no legado;
2. mover o bloco de credito estruturado para essa aba;
3. adicionar cabecalho e blocos da nova hierarquia;
4. manter `Cartoes` com CTA para o novo hub;
5. depois replicar a arquitetura no React com rota propria.

## Decisao recomendada

Decisao de produto:

- aprovar `Credito` como modulo proprio do sistema.

Decisao de implementacao:

- no legado, criar uma nova experiencia dedicada;
- no React, nascer com rota propria;
- usar `Cartoes` apenas como subdominio operacional.
