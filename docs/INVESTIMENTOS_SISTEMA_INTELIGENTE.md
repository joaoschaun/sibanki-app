# Análise: Sistema Inteligente de Investimentos

## Visão Geral

Este documento analisa como transformar o módulo de investimentos em um **sistema inteligente** que:
1. Autocomplete de ticker com sugestões em tempo real
2. Detecção automática de categoria (Ações, FIIs, ETFs, BDRs)
3. Cálculo automático de quantidade e preço para renda variável
4. Gráfico de evolução/desenvolvimento dos investimentos
5. Integração de dividendos/proventos
6. Fluxo unificado e organizado

---

## 1. Referências de Mercado (Modelos que já fazem isso)

### Apps/Plataformas de referência

| Sistema | Autocomplete | Auto-categoria | Qtd automática | Dividendos | Evolução |
|---------|--------------|----------------|----------------|------------|----------|
| **Portseido** | ✅ | ✅ (via import) | ✅ | ✅ Projeção | ✅ MWR/TWR |
| **DivTracker** | ✅ | ✅ | ✅ | ✅ Calendário | ✅ |
| **Dividend.watch** | ✅ | ✅ | ✅ | ✅ Safety score | ✅ |
| **Kinvo** (BR) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **TradingView** | ✅ | ✅ | - | Parcial | ✅ |

**Padrões comuns:**
- Campo de ticker com dropdown de sugestões ao digitar (min 2–3 caracteres)
- Tipo inferido pela API (stock/fund/bdr) ou padrão B3 (11=FII/ETF, 3/4=ação)
- Para renda variável: valor investido + preço atual → quantidade calculada
- Dividendos: calendário, histórico, projeção
- Evolução: gráfico de patrimônio ao longo do tempo (requer histórico de preços ou snapshots)

---

## 2. Estado Atual do Sibanki

### O que já existe
- **fetchTickerQuote()**: busca cotação no blur/input quando ticker é válido (4 letras + 1–2 dígitos)
- Preenche `invAtual` com o preço
- **addInv()**: salva `{id, date, tipo, nome, valor, atual, conta}` — **não salva qtd nem precoCompra**
- **refreshPortfolio()**: atualiza preços via brapiMulti; se `inv.qtd` existe usa `price*qtd`, senão usa `valor*(price/oldPrice)`
- **Proventos**: aba separada, array `proventos`, pode buscar da BRAPI ou registrar manualmente

### O que falta
1. **Autocomplete**: não usa `/api/quote/list?search=` no frontend
2. **Auto-categoria**: usuário escolhe manualmente
3. **Campo quantidade**: não existe; não calcula qtd a partir de valor ÷ preço
4. **precoCompra**: não é salvo; refreshPortfolio usa `inv.valor` como proxy
5. **Evolução real**: gráfico usa data de registro, não histórico de preços
6. **Integração dividendos**: proventos em aba separada, sem vínculo direto com a carteira

---

## 3. Proposta de Implementação

### 3.1 Autocomplete de Ticker

**API BRAPI:** `GET /api/quote/list?search=ITUB&limit=10&token=...`

**Resposta:** `{ stocks: [{ stock, name, close, change, type, sector }], ... }`

**Implementação:**
- Listener `input` no campo Nome/Ticker com debounce 300ms
- Se `value.length >= 2`, chamar API
- Exibir dropdown abaixo do input com sugestões (ticker + nome)
- Ao selecionar: preencher ticker, disparar busca de cotação e auto-categoria

```javascript
// Exemplo de chamada
fetch('https://brapi.dev/api/quote/list?search='+encodeURIComponent(termo)+'&limit=8&token='+token)
```

### 3.2 Auto-detecção de Categoria

**Mapeamento BRAPI → Sibanki:**
- `type: "stock"` → Ações
- `type: "fund"` → FIIs
- `type: "bdr"` → BDRs (adicionar opção ou mapear para "Ações" com badge BDR)

**Fallback por padrão B3** (quando API não retorna type):
- Ticker termina em `11` → FII ou ETF (difícil distinguir sem API; preferir buscar na list)
- Ticker termina em `3` ou `4` → Ações
- Ticker termina em `34` (BDR) → BDRs

**Comportamento:** Ao selecionar ticker no autocomplete ou ao validar cotação, preencher `invTipo` automaticamente e opcionalmente travar (ou permitir override).

### 3.3 Valor → Quantidade (Renda Variável)

**Fluxo:**
1. Usuário digita ticker → sistema busca cotação e preenche preço
2. Usuário digita **Valor Investido (R$)** → sistema calcula:
   - **Quantidade** = valor ÷ preço (arredondar para inteiro em ações/FIIs)
   - Exibir: "≈ X cotas a R$ Y cada"

**Interface sugerida:**
```
Valor Investido (R$)  [  1000.00  ]
Preço atual: R$ 32,50  |  Quantidade: ~31 cotas
```

**Ao salvar:** `{ ..., valor, qtd: 31, precoCompra: 32.50, atual: 31 * precoAtual }`

**Renda fixa:** manter fluxo atual (valor + atual opcional); sem quantidade.

### 3.4 Gráfico de Desenvolvimento/Evolução

**Problema:** Hoje só temos data de compra e valor atual. Não temos histórico de preços por data.

**Opções:**

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **A) Snapshots periódicos** | Preciso | Requer job salvar total mensal; mais dados |
| **B) Histórico BRAPI por ticker** | Dados reais | Muitas chamadas; complexo agregar |
| **C) Simulação por data de aporte** | Simples | Aproximado; cada aporte "congela" até hoje |
| **D) Linha acumulada por mês** (atual) | Já existe | Eixo X = mês do aporte, não tempo real |

**Recomendação:** 
- **Curto prazo:** Melhorar o gráfico atual (D) com labels mais claros: "Patrimônio acumulado por data de aporte"
- **Médio prazo:** Implementar (B) para ativos com `qtd`: para cada mês, somar `qtd_i * preco_historico_i` — exige cache de preços históricos (ex.: 1x/dia)

### 3.5 Integração de Dividendos

**Estado atual:** Aba Proventos com array `proventos`, busca opcional na BRAPI.

**Melhorias:**
1. **Vínculo com carteira:** Ao registrar investimento em PETR4, sugerir "Buscar dividendos de PETR4" ou exibir próximos proventos
2. **Registro rápido:** Botão "Recebi dividendo" na linha do ativo na tabela de detalhamento
3. **Dashboard unificado:** Card "Proventos recebidos (12m)" na seção Resumo da Carteira
4. **Timeline:** Manter timeline atual, mas permitir filtrar por ativo

**Fluxo sugerido:** 
- Na tabela "Detalhamento da Carteira", cada linha tem botão "➕ Provento"
- Ao clicar: modal com ticker pré-preenchido, campos data e valor

### 3.6 Fluxo Unificado Proposto

```
┌─────────────────────────────────────────────────────────────────┐
│  REGISTRAR INVESTIMENTO (fluxo inteligente)                      │
├─────────────────────────────────────────────────────────────────┤
│  1. Nome/Ticker [PETR________]  ← autocomplete ao digitar        │
│     └─ Dropdown: PETR4 Petróleo, PETR3 Petróleo ON...           │
│                                                                  │
│  2. Tipo [Ações ▼]  ← preenchido automaticamente ao selecionar  │
│                                                                  │
│  3. Valor Investido (R$) [1000.00]  ← usuário digita             │
│     └─ Sistema busca cotação → Preço: R$ 32,50 | ~31 cotas       │
│                                                                  │
│  4. (Opcional) Ajustar quantidade [31] se quiser                 │
│                                                                  │
│  5. Conta/Corretora [Nubank ▼]                                   │
│                                                                  │
│  [Registrar Investimento]                                        │
└─────────────────────────────────────────────────────────────────┘

Ao salvar → Salva: valor, qtd, precoCompra, tipo, nome, date, conta
```

---

## 4. Ordem de Implementação Sugerida

| # | Funcionalidade | Esforço | Impacto |
|---|----------------|---------|---------|
| 1 | Autocomplete com BRAPI /quote/list | Médio | Alto |
| 2 | Auto-categoria ao selecionar ticker | Baixo | Alto |
| 3 | Campo quantidade + cálculo valor÷preço | Médio | Alto |
| 4 | Salvar qtd e precoCompra no addInv | Baixo | Alto |
| 5 | Botão "Recebi dividendo" na tabela | Baixo | Médio |
| 6 | Card proventos no Resumo | Baixo | Médio |
| 7 | Gráfico evolução com histórico (fase 2) | Alto | Médio |

---

## 5. Considerações Técnicas

### BRAPI
- `/api/quote/list?search=X` — autocomplete (requer token)
- `/api/quote/TICKER` — cotação atual
- Resposta inclui `type` (stock, fund, bdr) para auto-categoria

### Armazenamento
- `investments[]`: adicionar `qtd`, `precoCompra` (opcional para renda fixa)
- Manter retrocompatibilidade: se `qtd` ausente, usar lógica atual (valor * ratio)

### Limites
- BRAPI: rate limit com token gratuito
- Autocomplete: debounce 300–500ms para evitar excesso de chamadas

---

## 6. Conclusão

O Sibanki já tem boa base (cotação, proventos, análise). As melhorias propostas seguem padrões de apps como Portseido, DivTracker e Kinvo, adaptados ao contexto B3 e à stack atual. A prioridade deve ser o **fluxo inteligente de registro** (autocomplete + auto-categoria + quantidade), pois reduz fricção e melhora a qualidade dos dados para análises futuras.
