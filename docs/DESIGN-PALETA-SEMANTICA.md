# DESIGN — PALETA SEMÂNTICA + TIPOGRAFIA MÍNIMA (Ação #9 da Análise 360)

## 1. Regra monocromática — atualização formal

O Pierre Finance segue monocromático como base. A partir de 10/06/2026, cor é
permitida APENAS para comunicar estado financeiro, via os tokens semânticos de
`src/index.css` (dark + light):

| Token | Uso | Cor |
|---|---|---|
| `si-positive-*` | conquista, spread positivo, meta batida | emerald |
| `si-warning-*` | atenção, orçamento perto do teto | amber |
| `si-risk-*` | perigo, dívida cara, auto-sabotagem | rose |
| `si-projection-*` | projeções e futuro (Portal do Tempo) | violet |
| `si-info-*` | neutro informativo | blue |

Classes utilitárias: `bg-si-positive-bg`, `text-si-risk-text`, etc.

**Proibido:** gradientes coloridos, botões coloridos (exceto rose para ação
destrutiva), cor decorativa sem significado de estado. Os simuladores do
CreditHub (08/06) usam gradientes — migrar para painéis chapados com tokens
acima na próxima passada.

## 2. Tipografia mínima

Sweep aplicado em 10/06/2026 (50 arquivos): `text-[8px]`/`text-[8.5px]`/
`text-[9px]` → `text-[10px]`; `text-[10px]`/`text-[10.5px]` → `text-[11px]`.

**Regra daqui em diante:** nenhum texto de UI abaixo de 10px; labels padrão
ALL CAPS passam a ser `text-[11px] font-bold tracking-[0.18em] uppercase`.
Validar contraste de `--si-text-4`/`--si-text-5` em ambos os temas (WCAG AA
para texto pequeno = 4.5:1).

## 3. Auditoria de modo claro — pendências encontradas

Superfícies hardcoded que ignoram `[data-theme="light"]` (corrigir gradualmente
trocando por tokens `si-*`):

- `src/components/ui/InvestmentInsights.tsx` — `bg-[#0d0d0f]`, `text-white`,
  `border-white/[0.07]`, escala `zinc-*` inteira.
- Buscar restantes: `grep -rn "bg-\[#0\|text-white\|bg-black\|border-white/" src/`
  (priorizar Cards.tsx, Growth.tsx, CreditHub.tsx, Dashboard.tsx).

Ferramenta de verificação: projeto Playwright de comparação visual
(`npm run test:compare`) — adicionar screenshots em tema claro.

## 4. Sistema de logos de marca (pendente)

Hoje existem dois sistemas: Simple Icons branco sobre círculo colorido
(`MerchantLogo`) vs. logo oficial sobre fundo branco/temático (`bankData`/
contas/cartões). Unificar em um componente único com uma regra de fundo.
