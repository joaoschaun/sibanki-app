# Carteira de Investimentos: Visão Abrangente e Completa

## 1. O que pode estar na carteira do usuário

Uma carteira real contém **diversas fontes de retorno**, não apenas dividendos. O sistema precisa representar e demonstrar **tudo** que compõe o patrimônio e sua evolução.

---

## 2. Mapa completo de ativos e fontes de retorno

### 2.1 RENDA VARIÁVEL

| Classe | O que gera retorno | Como medir | Dados necessários |
|--------|--------------------|------------|--------------------|
| **Ações** | Valorização (preço sobe/desce) + Dividendos + JCP | (Preço atual × qtd) − valor investido; proventos à parte | Ticker, qtd, preço compra, preço atual, dividendos recebidos |
| **FIIs** | Valorização da cota + Dividendos (rendimentos mensais) | Idem ações | Idem |
| **ETFs** | Valorização + Dividendos (quando distribuem) | Idem ações | Idem |
| **BDRs** | Valorização + Dividendos (em USD, convertidos) | Idem ações | Idem |
| **Cripto** | Apenas valorização (não há dividendos) | Preço atual × qtd − valor investido | Ticker, qtd, preço compra, preço atual |

**Retorno total renda variável = Ganho/Perda de capital + Proventos recebidos**

---

### 2.2 RENDA FIXA

| Classe | O que gera retorno | Como medir | Dados necessários |
|--------|--------------------|------------|--------------------|
| **Tesouro Selic** | Juros diários (Selic) | Valor investido × (1 + taxa)^tempo | Valor, data, taxa (Selic) |
| **Tesouro IPCA+** | IPCA + taxa fixa; marcação a mercado se vender antes | Cálculo ou cotação TD | Valor, data, taxa real, vencimento |
| **Tesouro Prefixado** | Taxa fixa; marcação a mercado | Idem | Valor, data, taxa, vencimento |
| **CDB** | % CDI ou prefixado ou IPCA+ | Valor × (1 + taxa)^tempo | Valor, data, % CDI, liquidez |
| **LCI/LCA** | % CDI (isento IR) | Idem CDB | Valor, data, % CDI |
| **Debêntures** | Juros + possível valorização | Complexo | Valor, data, taxa, vencimento |
| **CRI/CRA** | Rendimento + valorização | Complexo | Idem |
| **Poupança** | 70% Selic (regra antiga) ou TR + 0,5% | Valor × (1 + taxa)^tempo | Valor, data |
| **Previdência** | Mix (RF + RV conforme fundo) | Varia | Valor, data, tipo de fundo |
| **Fundos RF** | Cotas × valor da cota | Cota atual × qtd | Valor, qtd, cota |

**Retorno total renda fixa = Juros acumulados** (ou variação da cota, em fundos)

---

### 2.3 OUTROS

| Classe | O que gera retorno | Como medir |
|--------|--------------------|------------|
| **Fundos multimercado** | Gestão (RF + RV + derivativos) | Cota × qtd |
| **Fundos de ações** | Valorização da cota + dividendos do fundo | Cota × qtd |
| **COE** | Estruturado (cap + piso) | Valor de resgate |
| **Ouro** | Valorização do metal | Preço × qtd |
| **Imóveis** (FII ou direto) | Valorização + aluguel | Avaliação + receita |

---

## 3. Fontes de retorno unificadas

Para **qualquer** ativo, o retorno pode vir de:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  RETORNO TOTAL = A + B + C                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  A) VALORIZAÇÃO / DEPRECIAÇÃO (ganho ou perda de capital)                │
│     • Renda variável: (preço atual − preço compra) × quantidade          │
│     • Renda fixa: (valor atual − valor investido) por juros              │
│     • Fundos: (cota atual − cota compra) × quantidade                    │
│                                                                          │
│  B) RENDIMENTOS (juros, dividendos, aluguéis)                            │
│     • Dividendos (ações, FIIs, ETFs)                                     │
│     • JCP (ações)                                                        │
│     • Juros (CDB, Tesouro, LCI, LCA) — geralmente capitalizados          │
│     • Rendimentos de FIIs (mensais)                                      │
│                                                                          │
│  C) OUTROS                                                                │
│     • Bonificações, subscrições, desdobramentos                          │
│     • Resgates parciais com ganho                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. O que o sistema precisa demonstrar

### 4.1 Visão consolidada da carteira

| Bloco | Conteúdo |
|-------|----------|
| **Patrimônio total** | Soma de todos os ativos (valor atual) |
| **Total investido** | Soma do que foi aportado |
| **Resultado bruto** | Patrimônio − Total investido |
| **Rentabilidade %** | (Resultado / Total investido) × 100 |

### 4.2 Decomposição do retorno

| Métrica | Descrição | Exemplo |
|---------|-----------|---------|
| **Ganho/perda de capital** | Valorização ou desvalorização dos ativos | PETR4: +R$ 500; VALE3: −R$ 200 |
| **Proventos recebidos** | Dividendos, JCP, rendimentos já creditados | R$ 1.200 no ano |
| **Juros acumulados (RF)** | Crescimento por juros em CDB, Tesouro etc. | R$ 800 no ano |

### 4.3 Por classe de ativo

Para cada tipo (Ações, FIIs, RF, Cripto...):

- Valor investido
- Valor atual
- Resultado (R$ e %)
- Participação no total (%)

### 4.4 Por ativo individual

Para cada posição:

- Nome/ticker
- Tipo
- Valor investido
- Valor atual
- Quantidade (quando aplicável)
- Preço médio
- Preço atual
- Resultado (R$ e %)
- Proventos recebidos (se houver)
- % da carteira

---

## 5. Renda fixa: complexidade e evolução

### 5.1 O que torna a RF complexa

| Aspecto | Detalhe |
|---------|---------|
| **Indexadores** | Selic, CDI, IPCA, TR, Prefixado |
| **Liquidez** | D+0, D+1, D+30, D+90, no vencimento |
| **IR** | Tabela regressiva (22,5% → 15%); LCI/LCA isentos |
| **Marcação a mercado** | Tesouro IPCA/Prefixado: valor varia antes do vencimento |
| **Vencimento** | Data de resgate impacta rentabilidade |
| **Taxa** | CDB 100% CDI, Tesouro IPCA+6%, etc. |

### 5.2 Dados ideais por ativo de RF

```
Tesouro Selic:
  - valor, data, (taxa = Selic)
  - liquidez: D+1
  - atual = valor × (1 + Selic)^tempo

CDB 120% CDI:
  - valor, data, taxa: 120% CDI
  - liquidez: D+0 ou carência
  - atual = valor × (1 + CDI×1.2)^tempo
  - IR: tabela regressiva

Tesouro IPCA+ 2029:
  - valor, data, taxa real: 6%
  - vencimento: 2029
  - atual: cotação ou fórmula (marcação a mercado)
```

### 5.3 Evolução do módulo RF

1. **Campos por tipo**
   - Tesouro: subtipo (Selic, IPCA+, Prefixado), vencimento, taxa
   - CDB/LCI/LCA: % CDI, liquidez, vencimento (se houver)
   - Poupança: apenas valor e data

2. **Cálculo automático**
   - Buscar Selic, CDI, IPCA no BCB (já existe)
   - Calcular valor atual por fórmula
   - Para Tesouro IPCA/Prefixado: cotação ou aproximação

3. **Exibição**
   - "Valor investido: R$ X | Valor atual: R$ Y | Juros: R$ Z (+W%)"
   - Gráfico de evolução da RF ao longo do tempo

---

## 6. Proposta de estrutura unificada

### 6.1 Modelo de dados por investimento

```javascript
{
  id, date, conta,
  tipo: "Ações" | "FIIs" | "ETFs" | "Tesouro Direto" | "CDB" | "LCI/LCA" | "Poupança" | "Previdência" | "Cripto" | "Outros",
  nome: "PETR4" | "Tesouro IPCA+ 2029" | "CDB Inter 120%",
  
  // Renda variável
  valor: 1000,        // valor investido (R$)
  qtd: 31,            // quantidade (ações, FIIs, cotas)
  precoCompra: 32.26, // preço na compra
  atual: 1050,        // valor atual (calculado ou cotação)
  
  // Renda fixa (opcional)
  taxa?: "100% CDI" | "Selic" | "IPCA+6",
  vencimento?: "2029-08-15",
  liquidez?: "D+0" | "D+1" | "D+30",
  
  // Metadados
  ticker?: "PETR4",   // para RV, facilita busca cotação
}
```

### 6.2 Tela "Resumo da carteira" proposta

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PATRIMÔNIO TOTAL                    R$ 125.430                         │
│  Total investido                     R$ 118.200                         │
│  Resultado                            R$ +7.230 (+6,1%)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  DECOMPOSIÇÃO DO RETORNO                                                │
│  • Valorização/Depreciação          R$ +5.100  (PETR +800, VALE -200…)   │
│  • Proventos recebidos (12m)        R$ +1.200  (dividendos, JCP)         │
│  • Juros acumulados (RF)            R$ +930    (CDB, Tesouro)            │
├─────────────────────────────────────────────────────────────────────────┤
│  POR CLASSE                                                            │
│  [Ações 35%] [FIIs 20%] [Renda Fixa 40%] [Cripto 3%] [Outros 2%]       │
│  Cada uma: valor, %, resultado, rentabilidade                           │
├─────────────────────────────────────────────────────────────────────────┤
│  EVOLUÇÃO (gráfico)                                                    │
│  Linha: patrimônio ao longo do tempo                                    │
│  Barras: aportes vs valorização vs proventos (stacked)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Detalhamento por ativo

Cada linha da tabela deve mostrar:

- **Renda variável:** Ticker | Tipo | Qtd | PM | Atual | Valor | Resultado % | Proventos | % Cart.
- **Renda fixa:** Nome | Tipo | Valor | Atual | Juros | Rentab. % | Venc. | % Cart.

---

## 7. Roadmap de evolução

| Fase | Escopo |
|------|--------|
| **1. Base** | Autocomplete, auto-categoria, qtd, precoCompra para RV |
| **2. Decomposição** | Card "Decomposição do retorno" (valorização + proventos + juros RF) |
| **3. RF avançada** | Campos taxa, vencimento, liquidez; cálculo por tipo |
| **4. Evolução** | Gráfico de patrimônio ao longo do tempo (histórico) |
| **5. Proventos** | Integração proventos ↔ carteira; projeção de dividendos |
| **6. Relatórios** | IR, performance por período, comparativo com índices |

---

## 8. Conclusão

O módulo precisa evoluir para:

1. **Cobrir todas as fontes de retorno**: valorização, proventos e juros.
2. **Tratar RF com a devida complexidade**: indexadores, vencimento, liquidez.
3. **Mostrar decomposição clara**: de onde veio o ganho (capital vs rendimentos).
4. **Unificar a visão**: uma única "carteira" com todos os ativos e métricas consistentes.

Assim o usuário enxerga o patrimônio completo e entende exatamente como cada parte contribui para o resultado total.
