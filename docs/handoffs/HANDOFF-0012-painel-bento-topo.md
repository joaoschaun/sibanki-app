# HANDOFF-0012 — Painel: bento do topo + número §8.6a

> **Fatia 1 de 5** da convergência pro v8 (`docs/design/mocks/painel.html`). Reorganiza só a
> **região do topo** do Painel em bento — hero compacto + a decisão ao lado + Horizonte full-width —
> e aplica o **tratamento de número da §8.6a** (fino/neutro, dono da célula). **Mantém intactos**:
> sidebar, `buildDashboardBlueprint` (adaptativo + Regra de Ouro), tabs, coach, editor, coluna direita.
> NÃO faz nav-no-topo, módulos novos, nem remove Arquiteto/SibCoin (isso é 0013-0015).
>
> Review: Dev + UIUX. Não toca dinheiro/rules/deploy.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` (§12) · `docs/DESIGN-SYSTEM-RUBRIC.md` — **§8 item 6** ("O teto do Painel — os 4
  movimentos", em especial **(a) número-herói** peso ~200 / cor neutra + espectro, e a **anatomia**),
  **§11** (craft: microinterações, movimento ≤500ms, a11y cor+ícone+texto, reduced-motion), §10, §2.
- Mock canônico: `docs/design/mocks/painel.html` (v8) — a **região do topo** (linhas ~223-274: hero
  compacto à esquerda + decisão à direita; Horizonte full-width logo abaixo).
- `src/components/ui/SovereigntyHero.tsx` — o hero a reformar (hoje: centralizado, número em cor de
  tier, strip receita/despesa/saldo/spread, espectro `FreedomSpectrum` + `Card surface="raised"` do 0009).
- `src/pages/Dashboard.tsx` — o slot `'sovereignty-hero'` (≈ L172-197) hoje empilha
  `<>{SovereigntyHero}{RadarCard}{HorizonStrip}</>` na coluna `lg:col-span-8`. É o que você reorganiza.
- `src/components/ui/RadarCard.tsx` / `HorizonStrip.tsx` — **reuse como estão** (não altere).

## Pré-flight

- `HANDOFF-0011` mergeado na main. Lock `free` → adquira. `git status` limpo exceto pelo que o Claude
  escreveu. Branch: `pipe/0012-painel-bento-topo`, a partir da main.

---

## 1. Objetivo

Fazer a **primeira dobra** do Painel virar o bento do v8: o estado (hero) e a decisão (Radar) lado a
lado, o Horizonte como faixa — sem rolar pra achar o que importa — e o número-herói no tratamento
§8.6a (fino/neutro). Tudo **dentro** da estrutura atual (coluna esquerda do grid), sem tocar
sidebar/blueprint/nav.

---

## 2. Escopo

**Dentro:**
- `src/components/ui/SovereigntyHero.tsx` — **§8.6a + compactação:** número peso ~200-300, cor neutra
  (`text-si-1`, não a cor de tier), tamanho grande, `tabular-nums`; alinhamento à **esquerda** (saudação
  + score no topo, Ld abaixo), não centralizado; a strip inferior vira **microlabels compactas**. Espectro,
  `noLdData`, confiança e "O que significam" **preservados**. **Props/assinatura inalteradas.**
- `src/pages/Dashboard.tsx` — reorganizar **só o slot `'sovereignty-hero'`**: de pilha vertical para
  bento — `[Hero | RadarCard]` lado a lado (grid interno `md:grid-cols-2`, empilha no mobile) e
  `HorizonStrip` full-width abaixo. Nada mais no Dashboard muda.
- `src/components/ui/SovereigntyHero.test.tsx` (novo ou estende) — cobre o §8.6a.
- `docs/CHANGELOG.md` · `.pipeline/*`.

**Fora (NÃO tocar) — é 0013-0016:**
- **Nav** (sidebar→topo), **SibCoin**, **remover Arquiteto/InsightDoDia do Painel** → App-shell / 0014-0015.
- **`buildDashboardBlueprint`** e a ordenação adaptativa — **preservada** (a Regra de Ouro continua;
  o bento do topo é o tratamento do widget `sovereignty-hero`, não uma anatomia fixa que substitui o motor).
- Módulos novos (Contas conectadas, Fluxo, Crédito em formação, Para onde foi) → 0013.
- Coluna direita (Próximas Ações, Alertas, RoundUp, Sibcoin), tabs, coach, editor — intactos.
- Mudar a **métrica** patrimônio (o v8 mostra Patrimônio; hoje o hero não recebe esse prop) → **defer p/ 0013**
  (mantenha os dados atuais: receita/despesa/saldo/spread, só recompactados como microlabels).
- `anticipationEngine`, backend, rules, deploy.

---

## 3. Arquivos-alvo (só estes)

- `src/components/ui/SovereigntyHero.tsx` *(editar)*
- `src/components/ui/SovereigntyHero.test.tsx` *(novo ou estender)*
- `src/pages/Dashboard.tsx` *(editar — só o slot sovereignty-hero)*
- `docs/CHANGELOG.md` *(editar)*
- `.pipeline/STATE.md` + `.pipeline/EXECUTION.lock.md` + `.pipeline/reports/HANDOFF-0012.report.md` *(protocolo)*

> Fora da lista = reprovação. Em especial: `Dashboard.tsx` só pode diferir no bloco do slot `'sovereignty-hero'`.

---

## 4. Passos

### 4.1 `SovereigntyHero.tsx` — número §8.6a + compactação (preserva lógica)

1. **Número (§8.6a):** troque o `font-black` + `${FREEDOM_TIERS[status].numClass}` do Ld por
   **peso leve** (`font-extralight`/`font-light` ~200-300) e **cor neutra** `text-si-1` (o tier some do
   número). Mantenha tamanho grande, `tabular-nums`, tracking negativo. **A cor de tier continua** no
   `FreedomSpectrum` e no badge — não no número (é a correção "verde-bold-em-caixa → fino-neutro").
2. **Alinhamento:** de centralizado (`items-center`) para **esquerda** — saudação + `Sv {score}` no topo
   (como já é), Ld e espectro alinhados à esquerda, ocupando a largura da célula (v8 hero).
3. **Métricas:** a grid 2×2 de receita/despesa/saldo/spread vira uma **linha compacta de microlabels**
   (cap 9-10px + valor ~16px), estilo v8 (`.metrics`). **Mesmos dados** — não adicione patrimônio (0013).
4. Preserve **tudo**: `noLdData` (sem espectro, CTA conectar), badges de confiança, "O que significam",
   `Card surface="raised"`. Movimento do count-up (se houver) respeita `motion-reduce` (§11.2).
5. **Props/assinatura inalteradas** → o caller no Dashboard não muda os props.

### 4.2 `Dashboard.tsx` — bento só no slot `'sovereignty-hero'`

Substitua o fragmento atual do slot (`<>{SovereigntyHero}{RadarCard}{HorizonStrip}</>`) por:
```tsx
<div className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
    <SovereigntyHero …props atuais… />
    <RadarCard item={horizon.item} onMontarPlano={…} onSnooze={…} />
  </div>
  <HorizonStrip item={horizon.item} incomeDate={horizon.incomeDate} />
</div>
```
- Hero e Radar **lado a lado** no desktop (empilham no mobile via `grid-cols-1`), Horizonte full-width abaixo.
- `items-stretch` pra as duas células terem a mesma altura (§11.6 consistência).
- **Nada mais** no Dashboard muda (props, blueprint, coluna direita, tabs).

### 4.3 `SovereigntyHero.test.tsx`

1. O número do Ld usa classe de **peso leve** e **`text-si-1`** (não `text-emerald`/tier).
2. Com dados (`!noLdData`): renderiza `FreedomSpectrum` e as microlabels.
3. `noLdData`: sem espectro, com CTA "Conectar banco" (não regrediu).
4. Nenhuma classe `shadow-{hue}` nova.

### 4.4 `docs/CHANGELOG.md`

"Painel bento do topo (HANDOFF-0012, fatia 1/5 do v8): hero compacto + decisão lado a lado + Horizonte
full-width no slot sovereignty-hero; número §8.6a (fino/neutro). Blueprint adaptativo, sidebar, tabs e
coluna direita intactos. Sem deploy."

---

## 5. Critério de aceite

- [ ] Nenhum arquivo fora do §3; `Dashboard.tsx` difere **só** no bloco do slot `'sovereignty-hero'`.
- [ ] `npm run gate` verde (tsc + test:unit incl. 5 gates; smoke = watch-item).
- [ ] Ld: peso leve + `text-si-1` (número neutro §8.6a); tier **só** no espectro/badge.
- [ ] Hero à esquerda + microlabels; espectro/noLdData/confiança/"O que significam" preservados.
- [ ] Props do `SovereigntyHero` inalteradas.
- [ ] Slot: Hero | Radar lado a lado (desktop), empilha no mobile; Horizonte full-width abaixo.
- [ ] `buildDashboardBlueprint`, coluna direita, tabs, coach, editor **inalterados** (fora do diff).
- [ ] Gate 3 = 0; `motion-reduce` respeitado (§11.2).
- [ ] Testes do §4.3 passam.

---

## 6. Gate de risco

- **Dinheiro / rule / deploy?** NÃO. Presentational.
- Risco: (a) quebrar o adaptativo/Regra de Ouro → mitigado (não toca o blueprint); (b) regressão do
  `noLdData`/props → coberto pelo aceite; (c) número neutro é mudança visível **aprovada** (§8.6a, v8).
- Review Dev + UIUX; §8 item 6 + §11 são o gabarito.

---

## 7. Instrução de bloqueio

Se o bento do slot exigir quebrar o grid 8/4 (full-width de verdade), se o `SovereigntyHero` no disco
divergir do citado, ou se compactar exigir prop novo (patrimônio) — **PARE e registre no report** (o
full-width e o patrimônio são 0013, não force aqui). `AGENTS.md` vence conflitos.
