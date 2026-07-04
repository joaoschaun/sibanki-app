# DOCUMENTAÇÃO COMPLETA: MÓDULO DE INVESTIMENTOS (CRESCIMENTO)

> **Propósito:** Documento de engenharia e produto consolidando a arquitetura técnica, modelo de dados, integrações de API, motores de cálculo financeiro e design de UX do Módulo de Investimentos do Sibanki.
> **Versão:** 2.1 — Junho de 2026

---

## 1. Visão Geral & Posicionamento

O módulo **Crescimento** (`/crescimento`) do Sibanki é projetado para entregar uma experiência premium de consolidação patrimonial com baixíssima carga cognitiva. Inspirado no minimalismo utilitário (Design System Pierre), ele evita o excesso de caixas e cores berrantes presentes em dashboards tradicionais de mercado, focando em métricas soberanas fundamentais (Dias de Liberdade e Spread de Juros).

### Objetivos Principais:
1. **Consolidação Híbrida**: Permitir o cadastro manual de ativos (renda fixa e variável) com a mesma riqueza de dados e cálculo de um usuário integrado via Open Finance.
2. **Cálculo de Soberania (Ld)**: Converter ativos líquidos e seus respectivos rendimentos em "dias de vida pagos", conectando aportes diretamente à liberdade do usuário.
3. **Automatização e Inteligência**: Minimizar o atrito de entrada por meio de autocomplete de tickers (B3) e auto-categorização.

---

## 2. Arquitetura de Dados & Firestore

Os dados de investimentos são armazenados de forma multi-tenant dentro do Firestore.

### Coleções do Firestore
- `/tenants/{tenantId}/users/{userId}/investments`: Coleção contendo cada ativo do portfólio.
- `/tenants/{tenantId}/users/{userId}/entries`: Registros de proventos (dividendos/JCP) sob o tipo `receita` e categoria `Investimento`.

### Interfaces TypeScript (`src/types/userData.ts`)

```typescript
export interface Investment {
  id: number;
  date: string;       // Data de aquisição (YYYY-MM-DD)
  tipo: string;       // "Renda Fixa" | "Ações" | "FIIs" | "Cripto" | "ETFs"
  nome: string;       // Ticker ou nome amigável do ativo
  valor: number;      // Valor de compra / aporte inicial (R$)
  atual: number;      // Valor de mercado atualizado (R$)
  conta?: string;     // Corretora ou banco custodiante (opcional)
  entryId?: number;   // ID da transação correspondente (opcional)
  precoCompra?: number; // Preço médio de compra por cota (opcional)
  qtd?: number;       // Quantidade de cotas (opcional)
  
  // Taxa de juros anualizada equivalente calculada pelo sistema
  taxaAnual?: number; // % a.a. (Ex: 12.5)

  // Configurações do indexador original (específico de Renda Fixa)
  indexer?: 'pre' | 'cdi' | 'ipca' | 'mensal';
  indexerValue?: number;

  // Renda passiva mensal estimada declarada pelo usuário ou via cotações
  proventosMensais?: number; 
  
  // DY anual real retornado pela API de mercado (opcional)
  dy?: number;
}
```

---

## 3. Fluxo de Registro Inteligente & Indexadores

O formulário de cadastro em `Growth.tsx` reduz a fricção usando dados em tempo real da API de cotações.

### A. Renda Variável (Ações, FIIs, ETFs, BDRs)
1. **Autocomplete**: Ao digitar no campo de Ticker, um listener com debounce de 350ms busca sugestões na API da B3.
2. **Auto-categoria**: Ao selecionar o ticker (ex: `HGLG11`), o sistema infere o tipo:
   - `stock` $\rightarrow$ "Ações"
   - `fund` $\rightarrow$ "FIIs"
   - Final `11` (fallback) $\rightarrow$ "FIIs" ou "ETFs"
3. **Cálculo de Cotas**: A cotação atual preenche o campo de preço unitário. Quando o usuário insere o valor em dinheiro (R$), o sistema exibe a estimativa correspondente de cotas a comprar (`Quantidade = Valor / Preço Atual`).

### B. Renda Fixa (CDI, IPCA+, Prefixado, Mensal)
Para ativos de Renda Fixa, o usuário configura o indexador e a taxa correspondente. Ao registrar ou editar, o sistema converte a taxa para base equivalente anual (`taxaAnual` % a.a.) para alimentar de forma homogênea os motores de inteligência.

#### Fórmulas de Conversão Equivalente (CDI e IPCA de Referência):
- **Prefixado**: Utiliza diretamente o valor inserido (Ex: `12% a.a.` $\rightarrow 12.0\%$ a.a.).
- **% do CDI**: Utiliza um CDI anual de referência conservador de **10.5% a.a.**
  $$\text{taxaAnual} = 10.5 \times \frac{\text{taxaCDI}}{100}$$
  *(Ex: 110% do CDI $\rightarrow 10.5 \times 1.10 = 11.55\%$ a.a.)*
- **IPCA + (% a.a.)**: Utiliza um IPCA anual de referência conservador de **4.5% a.a.**
  $$\text{taxaAnual} = \left( (1 + 0.045) \times \left(1 + \frac{\text{taxaIPCA}}{100}\right) - 1 \right) \times 100$$
  *(Ex: IPCA + 6% $\rightarrow (1.045 \times 1.06 - 1) \times 100 = 10.77\%$ a.a.)*
- **Rendimento Mensal**: Capitaliza a taxa mensal para base anualizada:
  $$\text{taxaAnual} = \left( \left(1 + \frac{\text{taxaMensal}}{100}\right)^{12} - 1 \right) \times 100$$
  *(Ex: 0.8% a.m. $\rightarrow (1.008^{12} - 1) \times 100 = 10.03\%$ a.a.)*

---

## 4. Integração com API B3 (Brapi)

A comunicação com a API Brapi para cotações em tempo real ocorre no arquivo `src/services/brapi.ts` por meio de endpoints do Firebase Functions que ocultam a chave de acesso.

### Defesas de Infraestrutura
1. **Cache Local no Cliente**: Evita requisições repetidas em curto período de tempo:
   - `CLIENT_CACHE_TTL = 2 * 60_000` (2 minutos).
   - O cache expulsa a entrada mais antiga quando atinge 100 chaves (`FIFO`).
2. **Debounce no Input**: A pesquisa possui debounce de 350ms em `Growth.tsx` via `useRef`, economizando cota do plano gratuito da API.
3. **Fallback Silencioso**: Caso a API de cotações falhe, o sistema mantém o último valor informado ou atualiza pelo indexador sem travar a interface do usuário.

---

## 5. Motores de Cálculo & Inteligência Financeira

Os cálculos são definidos centralizadamente em `src/utils/sovereigntyEngine.ts` para facilitar os testes unitários.

### A. Dias de Liberdade (Ld)
Indica quantos dias o usuário consegue pagar suas contas usando apenas seus ativos líquidos e a renda passiva gerada.

$$\text{Dias de Liberdade (Ld)} = \frac{\text{Liquidez Total}}{\frac{\text{Gasto Mensal} - \text{Renda Passiva Mensal}}{30}}$$

Onde:
- **Liquidez Total**: Saldo de contas de pagamento + Renda Fixa líquida (ativos D+0 a D+30).
- **Renda Passiva Mensal**:
  $$\text{Renda Passiva} = \sum (\text{Proventos Declarados}) + \sum (\text{Valor Renda Fixa Líquida} \times \text{Taxa Mensal Real})$$
- **Taxa Mensal Real**: Obtida a partir da `taxaAnual` customizada de cada ativo de Renda Fixa:
  $$\text{Taxa Mensal} = (1 + \text{taxaAnual} / 100)^{1/12} - 1$$
  *(Se o ativo não possuir taxa declarada, o motor aplica o fallback padrão `investmentYieldMonthly` [1.0% a.m.]).*

### B. Spread Gap
Mede a eficiência financeira calculando a diferença entre os juros recebidos nos investimentos e os juros pagos em obrigações de crédito (empréstimos e faturas).

$$\text{Spread Gap} = \text{Taxa de Rendimento Média da Carteira} - \text{Custo Médio da Dívida}$$

- **Dreno Crítico**: Se o Spread Gap for muito negativo, o sistema calcula o `monthlyLeakage` (vazamento financeiro mensal em R$) e emite um alerta sutil no cockpit aconselhando a quitação da dívida usando a liquidez disponível.

---

## 6. Governança e Testes Unitários

### Validação no Firestore (`firestore.rules`)
Qualquer operação de escrita na subcoleção de investimentos do usuário valida os tipos permitidos e impede a injeção de strings arbitrárias no campo `tipo`.

### Testes do Motor Financeiro (`src/utils/sovereigntyEngine.test.ts`)
A suite de testes cobre todos os fluxos de renderização de juros:
- Cálculo estático (fallback de 1% a.m.).
- Cálculo dinâmico e ponderado por ativo usando `taxaAnual`.
- Cenários de estresse de Spread Gap com taxas positivas, neutras e drenos operacionais.
