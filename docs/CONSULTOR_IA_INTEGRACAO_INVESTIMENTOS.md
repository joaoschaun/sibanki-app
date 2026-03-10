# Evolução do Módulo e Integração do Consultor IA

## 1. Evolvemos? Sim — e ainda há espaço para crescer

### O que já evoluímos

| Área | Antes | Depois |
|------|-------|--------|
| **Layout Minha Carteira** | KPIs duplicados, gráficos repetidos, fluxo confuso | Resumo → Registrar → Análise → Detalhamento → Ferramentas |
| **Análise** | Dispersa, sem seção clara | Seção "Análise da Carteira" com evolução, alocação, rentabilidade |
| **Rentabilidade** | Só nos KPIs | Resumo no header da Análise + KPIs (Melhor/Pior) |
| **Estado vazio** | Mensagem simples | Card explicativo quando não há investimentos |
| **Documentação** | Pouca | Docs de visão abrangente, sistema inteligente, integração IA |

### O que ainda falta evoluir

- Autocomplete de ticker
- Auto-categoria e cálculo de quantidade
- Decomposição do retorno (valorização vs proventos vs juros)
- RF com campos específicos (taxa, vencimento, liquidez)
- Integração Consultor IA ↔ Investimentos

---

## 2. Estado atual da integração Consultor IA ↔ Investimentos

### O que o Consultor recebe hoje

No `getFinancialContext()`, o campo `investimentos` é montado assim:

```javascript
// ATUAL (com bug!)
var invInfo = _i.map(function(i){
  return (i.name||'?')+': R$'+(i.value||0).toFixed(2)+' ('+(i.type||'?')+')'
}).join('; ');
```

**Problema:** Os investimentos usam `nome`, `valor` e `tipo`, mas o código usa `name`, `value` e `type`. O resultado tende a ser `"?: R$0.00 (?)"` para todos.

**Correção necessária:** Usar `i.nome`, `i.valor` (ou `i.atual`) e `i.tipo`.

### O que o Consultor faz com investimentos

Quando o usuário clica em **"Consultoria Investimentos"**:

1. Monta mensagem inicial com `ctx.investimentos` (string resumida)
2. Envia prompt genérico: *"Sugira estratégias de investimento adequadas. Considere saldo, metas e tolerância a risco."*
3. Se não há investimentos: avisa e dá dicas gerais
4. Se há: mostra a string e dicas genéricas (reserva, diversificação, perfil)

**Limitações atuais:**
- Contexto muito pobre (só uma string)
- Sem alocação por classe
- Sem rentabilidade por ativo
- Sem proventos
- Sem decomposição valorização vs rendimentos
- Sem perfil do investidor (suitability)

---

## 3. Como integrar o Consultor no módulo de Investimentos

### 3.1 Enriquecer o contexto de investimentos

Em vez de uma única string, o Consultor pode receber um bloco estruturado:

```
INVESTIMENTOS:
- Patrimônio total: R$ 125.430
- Total investido: R$ 118.200
- Resultado: +R$ 7.230 (+6,1%)
- Alocação: Ações 35%, FIIs 20%, Renda Fixa 40%, Cripto 3%, Outros 2%
- Proventos recebidos (12m): R$ 1.200
- Ativos: PETR4 (Ações) R$ 15.000 +12%; VALE3 (Ações) R$ 8.000 -5%; CDB Inter (Renda Fixa) R$ 50.000 +8%; ...
- Perfil do investidor: Moderado (se preenchido)
```

### 3.2 Pontos de entrada do Consultor no módulo

| Local | Ação | Objetivo |
|-------|------|----------|
| **Resumo da Carteira** | Botão "Perguntar ao Consultor" | Análise geral da carteira |
| **Após registrar investimento** | Sugestão "Quer uma análise da sua carteira?" | Engajar no uso da IA |
| **Tabela de detalhamento** | Ícone "?" ou "Analisar" em cada ativo | Perguntas sobre PETR4, alocação etc. |
| **Aba Proventos** | "Como otimizar meus dividendos?" | Foco em renda passiva |
| **Metas de Alocação** | "Estou fora da meta em Ações. O que fazer?" | Rebalanceamento |

### 3.3 Prompts contextuais por contexto

| Contexto | Prompt sugerido |
|----------|-----------------|
| **Carteira vazia** | "O usuário ainda não tem investimentos. Sugira primeiros passos considerando reserva de emergência, perfil e metas." |
| **Carteira com dados** | "Analise a carteira: alocação, rentabilidade, concentração. Sugira ajustes conforme perfil de risco." |
| **Foco em ativo** | "O usuário perguntou sobre [PETR4]. Dados: valor R$ X, rentabilidade Y%. Dê análise objetiva (não é recomendação de compra/venda)." |
| **Proventos** | "Proventos recebidos: R$ X. Sugira como reinvestir ou usar, considerando metas." |
| **Rebalanceamento** | "Alocação atual vs meta: Ações 28% (meta 40%), RF 55% (meta 30%). Sugira estratégia de rebalanceamento." |

### 3.4 Fluxo de integração proposto

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MÓDULO INVESTIMENTOS                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  [Resumo] [Registrar] [Análise] [Proventos] [Simuladores] [Perfil]      │
│                                                                          │
│  Em cada aba:                                                            │
│  • Botão flutuante ou inline: "Perguntar ao Consultor"                   │
│  • Ao clicar: abre modal do Consultor com contexto pré-preenchido       │
│    - Na Carteira: "Analise minha carteira"                               │
│    - Em Proventos: "Como otimizar dividendos?"                            │
│    - Em Perfil: "Minha alocação está adequada?"                           │
│                                                                          │
│  Na tabela de ativos:                                                    │
│  • Botão [lâmpada] ou [chat] em cada linha → "Analisar [PETR4]"          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CONSULTOR IA                                                            │
│  Recebe: ctx_investimentos (enriquecido) + aba_atual + pergunta           │
│  Responde: análise personalizada com base nos dados reais do usuário      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Ações prioritárias

### Imediato (correção)
1. Corrigir `invInfo` em `getFinancialContext()` para usar `nome`, `valor`/`atual`, `tipo`.

### Curto prazo
2. Enriquecer o contexto de investimentos (totais, alocação, rentabilidade, proventos).
3. Adicionar botão "Perguntar ao Consultor" na seção Resumo da Carteira.
4. Criar prompt específico para `tipo === 'investimentos'` usando o contexto enriquecido.

### Médio prazo
5. Botão de análise por ativo na tabela.
6. Contexto dinâmico conforme a aba (Carteira, Proventos, Perfil).
7. Incluir perfil do investidor (suitability) no contexto quando preenchido.

---

## 5. Resumo

**Evolvemos?** Sim: organização, análise e documentação. Ainda falta autocomplete, decomposição de retorno e integração mais profunda com o Consultor.

**Integração Consultor ↔ Investimentos:** Hoje é fraca (contexto incorreto e genérico). A evolução passa por:
- Corrigir o bug do contexto
- Enriquecer os dados enviados à IA
- Colocar o Consultor dentro do módulo (botões, prompts contextuais)
- Usar o Consultor para análise de ativos e rebalanceamento
