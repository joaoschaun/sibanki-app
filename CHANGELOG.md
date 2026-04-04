# CHANGELOG — Virtus Financeiro / Sibanki

Registro de implementações realizadas com base no documento
**SIBANKI_MODULOS_EXPANSAO.docx** (30 ações de expansão).

---

## [29/03/2026] — Sessão 2: Ações 11, 12, 16

### Ação 16 — Cripto v1: preços ao vivo via CoinGecko API

**Status anterior:** PARCIAL (preços simulados hardcoded)

**Arquivos modificados:**
- `src/pages/Cripto.tsx`

**O que mudou:**
- Removidas as constantes `BASE_PRICES`, `buildAssets()` e `initialFluctuation()`
- Adicionado `COINGECKO_URL` apontando para a API pública gratuita (sem key)
  com `vs_currency=brl` e os 8 principais ativos
- Adicionado hook `fetchPrices()` com `useCallback` que mapeia a resposta para
  o tipo `Asset` interno, incluindo `imageUrl` (logo oficial da CoinGecko)
- `useEffect` faz fetch inicial + refresh a cada **60 s** (respeita rate limit free tier)
- Substituída a simulação de preços (interval de 4 s com random walk) por dados reais
- Novo sub-componente `CryptoLogo` exibe a logo real do ativo com fallback textual
- Banner atualizado: "preços simulados" → "Cotações ao vivo em BRL via CoinGecko" com
  ícone `Wifi`; mostra `WifiOff` em caso de falha de API
- Tab Staking: logos reais dos ativos via `CryptoLogo`
- Trade: spread dinâmico baseado no preço real do BTC (quando disponível)

**Por quê:**
Dados ao vivo são essenciais para credibilidade do módulo Cripto. A CoinGecko API
gratuita cobre todos os ativos da fase 1 sem custo e sem autenticação.

---

### Ação 12 — Hub de Crédito (`/credito`)

**Status anterior:** NÃO FEITO

**Arquivos criados:**
- `src/pages/CreditHub.tsx`

**Arquivos modificados:**
- `src/App.tsx`

**O que mudou em `CreditHub.tsx` (novo):**
Tela dedicada `/credito` com 6 abas conforme `HUB-CREDITO-ARQUITETURA.md`:

1. **Visão Geral** — KPIs (limite total, utilizado, compromisso mensal, vence em
   breve), barra de utilização geral, resumo de contas, banner de pressão de
   crédito colorido por nível (controlado/atenção/elevado/crítico)
2. **Cartões** — detalhe de cada cartão: fatura atual, disponível, limite, dueDay/
   closeDay, barra de utilização, botões de ação
3. **Empréstimos** — saldo devedor, parcela, taxa a.a., barra de progresso do
   contrato, botões "Simular antecipação" e "Renegociar"
4. **Plano** — 4 cards contextuais: prioridade #1 para quitar, renegociação
   pendente, vencimentos próximos, progresso recente. Ação recomendada gerada
   dinamicamente pelo `pressureLevel`
5. **Oportunidades** — filtradas por saúde financeira: não exibe produto agressivo
   quando pressão é elevada/crítica; portabilidade, aumento de limite, consolidação
6. **Educação** — carrossel de 4 cards contextuais + glossário rápido (CET,
   utilização, portabilidade, amortização)

Dados: usa `creditAccounts` e `creditSnapshot` do Firestore (`useAppContext`);
fallback para dados demo quando não há dados reais.

**O que mudou em `App.tsx`:**
- Adicionado `lazy(() => import('./pages/CreditHub'))` no bloco de novos módulos
- Adicionada rota `<Route path="/credito" ...>` antes de `/cripto`

**Por quê:**
Crédito é um dos pilares do produto. A arquitetura separa claramente a visão macro
(Hub de Crédito) da operação de cartão (Cartões), conforme o documento de arquitetura.

---

### Ação 11 — WhatsApp bot: comandos `/boletos` e `/score-cpf`

**Status anterior:** PARCIAL (webhook existia com saldo/resumo/metas/consórcio/
credi amigo/lançamento, mas faltavam os comandos de DDA e CPF)

**Arquivos modificados:**
- `functions/index.js`

**O que mudou:**
- Adicionado **comando `/boletos`** (aceita: `boleto`, `boletos`, `dda`,
  `vencimento`, `vencimentos`) — step 9 do handler:
  - Consulta subcollection `users/{uid}/ddaBoletos` com status `pendente`,
    ordenado por `vencimento asc`, limit 5
  - Formata lista com beneficiário, valor e data de vencimento
  - Fallback quando DDA não está conectado: orienta o usuário a conectar o banco
    via Open Finance
- Adicionado **comando `/score-cpf`** (aceita: `cpf`, `score`, `score-cpf`,
  `credito`) — step 10 do handler:
  - Lê `userData.cpfMonitoring` do Firestore
  - Exibe score, banda (Muito Baixo/Regular/Bom/Excelente), contagem de
    negativações e alertas não lidos
  - Fallback quando CPF não está conectado: orienta a ativar em Meu CPF > bureau
- Renumerados os steps seguintes: wizard → step 11, Consultor IA → step 12

**Por quê:**
Ação 11 especifica: "lançamento por texto, /saldo, /resumo, /boletos, /score-cpf".
Os dois últimos eram os únicos ausentes — agora o bot está completo conforme spec.

---

## [29/03/2026] — Sessão 1: Ações 6, 8, 17, 18

### Ação 6 — Multi-tenant: TenantProvider ativo no App.tsx
**Arquivos:** `src/App.tsx`
Toda a árvore envolvida em `<TenantProvider>` para branding antes do AppProvider.

### Ação 8 — SibCoin: evento `dda_boleto_detected` + missão DDA
**Arquivos:** `functions/services/sibcoin/rewardEngine.js`, `src/pages/MeusBoletos.tsx`
Novo evento no rewardEngine + missão "Primeiro Boleto DDA" (80 SC) +
`useEffect` com guard localStorage em MeusBoletos.tsx.

### Ação 17 — IA: categorização em lote de CSV via Gemini Flash
**Arquivos:** `functions/services/llm/csvCategorizerService.js` (novo),
`functions/index.js`, `src/pages/Settings.tsx`
Cloud Function `aiCategorizeCsv` com prompt batch pipe-delimitado; 2 passes no
import de CSV; UI com spinner e contagem de itens categorizados por IA.

### Ação 18 — Modo Sugestivo (InsightDoDia proativo on/off)
**Arquivos:** `src/hooks/useSuggestiveMode.ts` (novo),
`src/components/ui/InsightDoDia.tsx`, `src/pages/Settings.tsx`
Hook com localStorage; guard no useEffect de fetch proativo; toggle com
`aria-pressed` na tela de configurações.

---

## Resumo acumulado de implementações

| # | Ação | Status | Sessão |
|---|------|--------|--------|
| 6  | Multi-tenant TenantProvider              | ✅ COMPLETO | Sessão 1 |
| 8  | SibCoin evento DDA + missão              | ✅ COMPLETO | Sessão 1 |
| 11 | WhatsApp bot: /boletos + /score-cpf      | ✅ COMPLETO | Sessão 2 |
| 12 | Hub de Crédito (/credito)                | ✅ COMPLETO | Sessão 2 |
| 16 | Cripto ao vivo (CoinGecko API)           | ✅ COMPLETO | Sessão 2 |
| 17 | IA categorização CSV (Gemini Flash)      | ✅ COMPLETO | Sessão 1 |
| 18 | Modo Sugestivo (InsightDoDia)            | ✅ COMPLETO | Sessão 1 |

Para o status completo das 30 ações, ver:
`VERIFICACAO_30_ACOES_SIBANKI.docx`
---

## Ação: Versão Clara (Light Theme) — 30/03/2026

**Objetivo:** Implementar modo claro completo para o app React, com alternância persistida no localStorage.

### Arquivos modificados

#### `src/index.css`
- Adicionado sistema de tokens semânticos via CSS custom properties (`--si-bg`, `--si-card`, `--si-border`, `--si-text-1..5`, `--si-over-1..4`, `--si-zinc-8/9`)
- `:root` define os valores dark (padrão)
- `[data-theme="light"]` sobrescreve todos os tokens para a paleta clara
- `@theme inline` registra os tokens no Tailwind v4 como utilidades (`bg-si-bg`, `text-si-1`, `border-si-border`, etc.)
- `body` passou a usar `background-color: var(--si-bg)` e gradiente via variável

#### `src/hooks/useTheme.ts` (sem alteração)
- Já existia e já definia `document.documentElement.dataset.theme = theme`
- O atributo `data-theme` é exatamente o seletor usado pelo CSS — nenhuma mudança necessária

#### `src/components/layout/Header.tsx`
- Adicionado import de `Moon` (lucide-react)
- Toggle agora exibe `<Moon>` (indigo) no modo escuro e `<Sun>` (amber) no modo claro
- Logo `text-white` → `text-si-1`
- `border-[#0a0f18]` do ponto de notificação → `border-si-card`

#### `src/utils/chartTheme.ts` + `src/components/charts/chartConfig.ts`
- `backgroundColor`, `border`, `color`, `stroke`, `fill` dos tooltips e eixos do recharts
  substituídos por `var(--si-card)`, `var(--si-border-md)`, `var(--si-text-*)`, etc.
- CSS custom properties funcionam em objetos de estilo inline — recharts as resolve em runtime

#### `src/pages/Profile.tsx`
- `focus:ring-offset-[#0a0f18]` → `focus:ring-offset-si-card` no toggle de privacidade

### Scripts de automação executados

| Script | Replacements | Arquivos |
|---|---|---|
| `apply_light_theme.py` (pass 1) | 1.999 | 39 |
| `apply_light_theme2.py` (pass 2) | 119 | 33 |
| `patch_charts_theme.py` | 8 | 3 |
| **Total** | **2.126** | **39** |

### Mapeamento de classes

| Antes (dark hardcoded) | Depois (token semântico) |
|---|---|
| `bg-[#05080d]` | `bg-si-bg` |
| `bg-[#0a0f18]` | `bg-si-card` |
| `text-zinc-100` | `text-si-1` |
| `text-zinc-200` | `text-si-2` |
| `text-zinc-300` | `text-si-3` |
| `text-zinc-400` | `text-si-4` |
| `text-zinc-500` | `text-si-5` |
| `text-white` | `text-si-1` |
| `border-white/5` | `border-si-border` |
| `border-white/10` | `border-si-border-md` |
| `border-white/15` | `border-si-border-lg` |
| `border-white/20` | `border-si-border-xl` |
| `bg-white/[0.02]` | `bg-si-over-1` |
| `bg-white/5` | `bg-si-over-2` |
| `bg-white/10` | `bg-si-over-3` |
| `bg-white/15` | `bg-si-over-4` |
| `bg-zinc-800` | `bg-si-zinc-8` |
| `bg-zinc-900` | `bg-si-zinc-9` |

### Verificação final
`verify_theme.py` — zero ocorrências de cores hardcoded restantes no codebase.
