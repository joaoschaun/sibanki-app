# Blueprint do Dashboard Adaptável (journeyStage × healthLevel)

Este documento estabelece as regras de design e a especificação técnica para o comportamento adaptável do Dashboard Principal do Sibanki. 

O motor de classificação residente em `src/utils/financialProfile.ts` avalia o perfil do usuário em tempo real a cada render. Este blueprint define como a interface do Dashboard se reorganiza visualmente em resposta às variáveis `journeyStage` (Estágio da Jornada) e `healthLevel` (Nível de Saúde Financeira).

---

## 1. Regra de Ouro da Interface

> [!IMPORTANT]
> **Defesa Obrigatória contra Ocultação de Risco:**
> Em hipótese alguma a interface adaptável ocultará alertas de risco crítico (`healthLevel === 'critico'` ou `journeyStage === 'pressionado'`). 
> Drenos de Spread Gap negativos, faturas de cartão acima do limite ideal, contas negativas (cheque especial) ou saldo mensal negativo assumem o topo da tela em área de destaque visual (Widgets de Intervenção), empurrando ferramentas discricionárias e promoções para baixo ou ocultando-as para manter o usuário focado na soberania financeira.

---

## 2. A Matriz JourneyStage × HealthLevel

Abaixo está o mapeamento dos widgets e seções em evidência no Dashboard com base na combinação de estados do usuário:

| Nível de Saúde \ Estágio | Primeiros Passos (`primeiros-passos`) | Organizando a Base (`organizando-base`) | Pressionado (`pressionado`) | Estabilizando (`estabilizando`) | Pronto para Crescer (`pronto-para-crescer`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Crítico (`critico`)** | 1. Hero: Alerta de Caixa<br>2. Banner de Onboarding<br>3. Extrato Bancário Simplificado | 1. Alerta de Dreno de Spread<br>2. Widget de Lançamentos Rápidos<br>3. Conciliação Open Finance | 1. Hero: Plano de Sobrevivência<br>2. Consolidar Dívidas (Hub de Crédito)<br>3. Sugestões de Redução de Custo | 1. Alerta de Liquidez Crítica<br>2. Alerta de Reserva Rebaixada<br>3. Plano de Recuperação de Spread | 1. Hero: Dreno Inesperado<br>2. Auditoria de Despesas Recentes<br>3. Reajuste de Aportes |
| **Pressão (`pressao`)** | 1. Hero: Tour de Integração<br>2. Widget de Primeiras Metas<br>3. Conectar Banco (Open Finance) | 1. Alerta: Orçamento Estourado<br>2. Widget de Limites de Categoria<br>3. Dicas de Contenção IA | 1. Hero: Gestão de Contas<br>2. Organização de Faturas de Cartão<br>3. Simular Renegociação de Taxas | 1. Dashboard: Reserva de Emergência<br>2. Sugestão de Corte de Assinaturas<br>3. Widget Dias de Liberdade | 1. Análise de Diversificação<br>2. Monitoramento de Alavancagem<br>3. Dicas de Otimização Fiscal |
| **Atenção (`atencao`)** | 1. Checklist de Ativação<br>2. Widget de Cadastro de Saldos<br>3. Consultor IA em Destaque | 1. Widget de Metas Iniciais<br>2. Gráficos de Categoria (Despesas)<br>3. Configurar Alertas Mensais | 1. Alerta: Spread Negativo<br>2. Comparativo Yield vs Debt<br>3. Consultoria IA para Dívidas | 1. Hero: Dias de Liberdade (Ld)<br>2. Simulação de Poupança Selic/CDB<br>3. Aportes Recorrentes | 1. Graham & Bazin Valuation<br>2. Otimizar Alocação de Ativos<br>3. Consultor de Investimentos |
| **Saudável (`saudavel`)** | 1. Hero: Bem-vindo ao Sibanki<br>2. Tour do Design System<br>3. Conectar Open Finance | 1. Widget Metas (Progresso)<br>2. Relatório de Despesas Mensal<br>3. Gráfico de Evolução de Saldo | *(Estado contraditório — não ocorre pela lógica de `financialProfile.ts`)* | 1. Hero: Dias de Liberdade (Ld)<br>2. Simulador de Independência<br>3. Histórico de Proventos | 1. Portfólio de Crescimento (B3/Cripto)<br>2. Graham/Bazin/Solidez Scores<br>3. Missões SibCoin Ouro |

---

## 3. Especificação dos Widgets e Prioridade de Layout

O layout do Dashboard será governado por uma lista priorizada de widgets injetada dinamicamente com base na combinação de estados do perfil:

### A. Widgets de Intervenção (Alta Prioridade)
*   **`BoxAlertaCaixa` / `BoxDrenoCritico`**:
    *   *Gatilho:* `healthLevel === 'critico'` ou `balance < 0`
    *   *Conteúdo:* Card com borda `border-rose-500/20` e fundo `bg-rose-500/08` (estilo Pierre). Exibe o valor do vazamento mensal do Spread Gap ou o saldo negativo e um botão ALL CAPS em rose para o Consultor IA iniciar o fluxo de sobrevivência.
*   **`AccountSummaryStrip`** (estilo Pierre):
    *   *Gatilho:* `journeyStage === 'primeiros-passos'` ou `!hasOpenFinance`
    *   *Conteúdo:* Incentive de conexão rápida ao Open Finance (Pluggy) para aumentar a confiança do cálculo de Dias de Liberdade (Ld).

### B. Widgets de Evolução (Média Prioridade)
*   **`SovereigntyHero` (Dias de Liberdade)**:
    *   *Gatilho:* Ativo em todos os estágios a partir de `organizando-base`, exceto quando `healthLevel === 'critico'` (onde o foco passa a ser o dreno).
    *   *Conteúdo:* Dias de liberdade em destaque, progresso em direção ao tier subsequente e taxa de queima diária (burn rate).
*   **`SpreadGapCard` (Com Confiança)**:
    *   *Gatilho:* Relevante para usuários com investimentos ou dívidas ativas.
    *   *Conteúdo:* Exibe a barra de juros vs rendimento e o badge de confiança (`Estimativa` / `Estimativa parcial`) dependendo se as taxas reais foram inseridas ou se usam os proxies (CDI 1% ou Rotativo 14%).

### C. Widgets de Crescimento (Prioridade Otimizada)
*   **`PortfolioAssetAllocation`** (Recharts):
    *   *Gatilho:* `journeyStage === 'pronto-para-crescer'`
    *   *Conteúdo:* Alocação por tipo de ativo (Ações, FIIs, Tesouro, Cripto).
*   **`InvestmentInsights` (Scores Graham/Bazin)**:
    *   *Gatilho:* `journeyStage === 'pronto-para-crescer'` e `hasInvestments`
    *   *Conteúdo:* Tabela indicando se os ativos de Renda Variável cadastrados estão com preço acima do preço teto de Bazin ou desconto de Benjamin Graham.

---

## 4. Implementação Técnica Proposta para `Dashboard.tsx`

Para que o Dashboard obedeça ao cérebro do sistema, propomos encapsular a montagem do layout no seguinte hook estrutural de renderização no front:

```typescript
// Exemplo de estrutura de blocos para renderização em Dashboard.tsx
import { useIntelligence } from '../context/IntelligenceContext';

export function Dashboard() {
  const { journeyStage, healthLevel, freedom, spread } = useIntelligence();

  // 1. Determinar layout prioritário
  const isCritical = healthLevel === 'critico' || journeyStage === 'pressionado';
  const isOnboarding = journeyStage === 'primeiros-passos';
  const isGrower = journeyStage === 'pronto-para-crescer';

  return (
    <div className="space-y-6">
      {/* SEÇÃO 1: ALERTA CRÍTICO / ONBOARDING (Se houver) */}
      {isCritical && (
        <WidgetAlertaCritico spread={spread} />
      )}
      {isOnboarding && (
        <WidgetOnboardingAtivacao />
      )}

      {/* SEÇÃO 2: MÉTRICAS CENTRAIS (Reordenadas conforme saúde) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Se o usuário está em onboarding, incentivar conexão antes de mostrar Ld zerado */}
        {isOnboarding ? (
          <WidgetConexaoOpenFinance />
        ) : (
          <SovereigntyHero freedom={freedom} />
        )}
        
        <SpreadGapCard spread={spread} />
      </div>

      {/* SEÇÃO 3: WIDGETS ADAPTÁVEIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Se for Grower, exibe insights de valuation. Se for Base, exibe Orçamentos */}
        {isGrower ? (
          <WidgetInvestmentInsights />
        ) : (
          <WidgetBudgetsSummary />
        )}
        
        {/* Outros widgets secundários baseados no estágio */}
        <WidgetRecurrents />
        <WidgetGoalsProgress />
      </div>
    </div>
  );
}
```
