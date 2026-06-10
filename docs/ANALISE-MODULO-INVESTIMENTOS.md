# ANÁLISE PROFUNDA — MÓDULO DE INVESTIMENTOS (CRESCIMENTO)

> **Propósito:** Documento de engenharia e produto analisando o módulo de Investimentos
> do Sibanki sob a ótica de engenharia de software (Desenvolvedor), experiência e
> matemática financeira (Usuário Investidor) e viabilidade de mercado (Analista Comercial).
>
> **Data:** 09 de Junho de 2026

---

## 1. Visão do Desenvolvedor (Engenharia & Arquitetura)

### 💻 Engenharia de Código e Integração com API (B3/Brapi)
- **Mecanismo de Cache Local**: A implementação do cache local com expiração controlada `CLIENT_CACHE_TTL = 2 * 60_000` (2 minutos) em `src/services/brapi.ts` é uma excelente defesa contra requisições consecutivas duplicadas. A lógica de limpeza quando o mapa cresce além de 100 chaves (`_clientCache.delete(oldest)`) protege contra o vazamento de memória por acúmulo de buscas.
- **Debounce de Autocomplete**: O autocomplete de ativos em Renda Variável possui um debounce de 350ms controlado via `useRef` para seu temporizador. Isso é ideal, pois previne múltiplas chamadas consecutivas à Cloud Function `brapiSearch` no servidor, mitigando latência e economizando limites de cota da API Brapi.
- **Cálculo de Perfil Acoplado**: Atualmente, em `Growth.tsx`, a lógica de cálculo do perfil do investidor (`perfilCalculado`) está inserida diretamente no fluxo de renderização do componente principal.
  - **Recomendação**: Desacoplar este cálculo e movê-lo para a engine central de regras financeiras em `src/utils/sovereigntyEngine.ts` ou criar um módulo helper específico para o perfil. Isso facilita a implementação de testes unitários robustos e isola regras de negócios de estados de renderização do React.

### 🔐 Segurança e Confiabilidade
- **Topologia de Cloud Functions**: O roteamento das chamadas de cotações para servidores baseados nos EUA (`fnsUS` / `us-central1`) está correto por razões de latência de infraestrutura externa, enquanto a base de dados sensível do usuário permanece sob a égide local (`fnsBR` / `southamerica-east1`), mantendo a integridade de tempo de resposta.
- **Tratamento de Exceções**: Em `selectTicker`, o tratamento de falhas da cotação B3 utiliza um bloco `catch { /* ignore */ }` vazio. Embora previna travamentos na tela, dificulta auditoria de tickers falsos ou instabilidades do provedor.
  - **Recomendação**: Adicionar telemetria leve utilizando `platformEvents.ts` para capturar e monitorar falhas nas consultas de cotação.

---

## 2. Visão do Usuário Investidor (Matemática & Experiência)

### 📊 Rigor da Matemática Financeira e Indicadores
- **Expectativa de Renda Passiva**: O cálculo de renda passiva projetada aplica uma taxa linear estática de 0,8% a.m. (equivalente a ~10% a.a. líquida de CDI). Trata-se de uma métrica de simulação conservadora excelente para o investidor iniciante, mas que diverge do mundo real.
  - **Crítica**: Um portfólio majoritariamente alocado em renda variável (ações e criptoativos) não gera receitas sob uma taxa mensal linear estável. Projetar 0,8% fixo sobre posições de alta volatilidade pode induzir o usuário a uma falsa sensação de previsibilidade de fluxo de caixa.
  - **Recomendação**: Obter o Dividend Yield real do ticker via cotação da API Brapi para os ativos de renda variável catalogados e a rentabilidade real declarada da renda fixa para ponderar a taxa.
- **Conexão Ld (Dias de Liberdade) com Proventos**: A integração dos proventos no cálculo de Dias de Liberdade (Ld) no Sentinel desconta os dividendos declarados do custo médio de vida. Isso é brilhante em termos de valor percebido, pois traduz um novo aporte como uma diminuição prática no tempo até a independência financeira do usuário.
- **Visualização do FIRE**: A barra de progresso baseada na regra clássica dos 4% (Gasto Anual / 0,04) dá ao usuário um objetivo de longo prazo visualmente tangível.

### 📱 Experiência de Registro (UX)
- **Preenchimento Inteligente**: O preenchimento automático do preço médio ao buscar o ticker (ex: `VALE3`) poupa fricção no cadastro manual de ativos.
- **Dificuldade de Automação de Dividendos**: A lista de proventos consolida o histórico de dividendos recebidos, mas exige digitação manual. Como o Open Finance da Pluggy suporta sincronização automática de contas de investimento, o usuário real pode sentir atrito ao ter que registrar cada dividendo manualmente.

---

## 3. Visão do Analista Comercial (Monetização & Conversão)

### 💎 Funil de Vendas e Proposta de Valor
- **Engajamento e Gamificação**: O trigger de SibCoins (`investment_added`) atrelado ao registro de novos aportes de investimentos é um incentivo gamificado brilhante para gerar o hábito de uso da ferramenta.
- **Gating de Recomendações (Conversão Pro)**: Atualmente, os relatórios avançados de curadoria e recomendações de alocação de carteira (`InvestmentInsights`) estão expostos.
  - O aviso de alinhamento de carteira ("*Perfil conservador mas 45% em renda variável — acima do recomendado*") é o melhor gancho comercial de conversão.
  - **Recomendação Comercial**: Gatar as recomendações de rebalanceamento do "Raio X da Carteira" sob o plano **Pro**, exibindo um blur sutil de "Conteúdo Pro" com CTA para upgrade.

### 🤝 Monetização Cruzada (Cross-selling) e Assessoria
- **Mapeamento de Perfil para Produtos**: O perfil do investidor (conservador, moderado, arrojado) e a liquidez declarada permitem que a aba de Soluções exiba ofertas qualificadas altamente contextuais de parceiros:
  - Investidores **conservadores** recebem ofertas de blindagem patrimonial (como planos de previdência privada ou consórcios).
  - Investidores **arrojados** recebem convites para abertura de contas em corretoras parceiras ou assessoria ativa integrada.
- **White Label (Consultores/B2B)**: A visualização consolidada de investimentos é um atrativo comercial gigante para escritórios de assessoria. A cobrança B2B de licenças de consultor baseadas no volume de clientes sob gestão (AUM cadastrado) é uma via de monetização escalável e sustentável.
