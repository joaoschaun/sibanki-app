# HANDOFF-0009 — SovereigntyHero em Dark-Glass + Espectro de tiers

> Primeira tela real na linguagem v2 (§10): o `SovereigntyHero` do Painel ganha a camada de
> profundidade da fundação 0008 e o **espectro de tiers** (§10.3) — o único elemento visual
> net-new do protótipo do Painel (11/07). **Props e caller INALTERADOS** (o Dashboard não muda).
> Escopo deliberadamente estreito: NÃO inclui o card "No Radar" nem o Horizonte (isso é 0010/0011).
>
> Review: Dev + UIUX. Não toca dinheiro/rules/deploy.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` (§12) · `docs/DESIGN-SYSTEM-RUBRIC.md` **v2** — em especial §1 (cor=estado; glow
  sancionado), §10.3 (padrão **Espectro de tiers (Ld)**), §10.4 (movimento + reduced-motion),
  §10.5 (modo claro), §2 (WCAG).
- `src/constants/sovereigntyScale.ts` — **fonte única** dos tiers (`FREEDOM_TIERS`: label/numClass/
  badgeClass/glow por `FreedomStatus`). É um `Record` **sem ordem** — você vai adicionar a ordem.
- `src/components/ui/SovereigntyHero.tsx` — o componente a reskinnar. Já consome `FREEDOM_TIERS`
  (glow radial + numClass + badge) e trata `noLdData` (sentinela 9999). **Preserve todo o
  comportamento**; o diff é profundidade + espectro, não reescrita de lógica.
- `src/components/ui/Card.tsx` — fundação 0008: `<Card surface="raised" glow=…>` + tokens
  `--si-surface-grad`/`--si-elev`/`--si-glow-*` em `index.css`. **Requer 0008 mergeado na main** (ver pré-flight).

## Pré-flight

- **Dependência dura:** `HANDOFF-0008` mergeado na `main` (Card variants + tokens de profundidade).
  Se `src/components/ui/Card.tsx` na `main` não tiver as props `surface`/`glow` → PARE e avise (0008 não mergeou).
- Lock `.pipeline/EXECUTION.lock.md` em `free`; adquira.
- `git status` limpo exceto pelo que o Claude escreveu (este handoff + STATE); outro WIP → PARE e pergunte.
- Branch: `pipe/0009-hero-espectro`, a partir da `main` (pós-0008).

---

## 1. Objetivo

Transformar o herói do Painel na linguagem Dark-Glass **sem mudar dados nem props**: superfície
elevada da §10.1 + o **espectro de tiers** (§10.3) mostrando a posição do usuário na régua
Frágil → Inabalável. É o "mock→produto" da §10.6 na tela mais visível do app.

---

## 2. Escopo

**Dentro:**
- `src/constants/sovereigntyScale.ts` — **adicionar** (aditivo, sem alterar o existente): a ordem
  dos tiers e a cor de segmento do espectro.
- `src/components/ui/FreedomSpectrum.tsx` — **novo** componente do espectro.
- `src/components/ui/FreedomSpectrum.test.tsx` — **novo** teste.
- `src/components/ui/SovereigntyHero.tsx` — reskin de profundidade + montar o `FreedomSpectrum`.
- `docs/CHANGELOG.md` — entrada da sessão.
- `.pipeline/*` — protocolo.

**Fora (NÃO tocar):**
- **Props e assinatura** do `SovereigntyHero` — o caller (`src/pages/Dashboard.tsx`) NÃO pode mudar.
- **Nenhum dado novo** (patrimônio/receita/etc.): a faixa inferior atual (receita/despesa/saldo/
  spread) permanece com os MESMOS dados — só reskin. (O strip "patrimônio/burn" do protótipo pede
  props novas → fica para outro handoff.)
- **Card "No Radar"** e **Horizonte** no Painel → **0010 / 0011** (dependem de `anticipationEngine`
  + tom §9.3). Não crie nada disso aqui.
- Outros componentes/telas, `Button`/`Field`/`Badge`, tokens existentes, `designSystem.guard.test.ts`.
- Backend, rules, deploy.

---

## 3. Arquivos-alvo (só estes)

- `src/constants/sovereigntyScale.ts` *(editar — aditivo)*
- `src/components/ui/FreedomSpectrum.tsx` *(novo)*
- `src/components/ui/FreedomSpectrum.test.tsx` *(novo)*
- `src/components/ui/SovereigntyHero.tsx` *(editar)*
- `docs/CHANGELOG.md` *(editar)*
- `.pipeline/STATE.md` + `.pipeline/EXECUTION.lock.md` + `.pipeline/reports/HANDOFF-0009.report.md` *(protocolo)*

> Tocar algo fora da lista = reprovação imediata.

---

## 4. Passos

### 4.1 `sovereigntyScale.ts` — ordem + cor de segmento (aditivo)

Sem alterar `FREEDOM_TIERS`/`SV_TIERS`, adicione:

```ts
/** Ordem canônica do pior ao melhor — usada pelo espectro (FreedomSpectrum). */
export const FREEDOM_ORDER: readonly FreedomStatus[] = [
  'fragil', 'em-construcao', 'resiliente', 'soberano', 'inabalavel',
] as const;

/** Cor sólida do segmento no espectro (dado = posição na escala; §10.3 / §1 ⚠︎v2). */
export const FREEDOM_SEGMENT: Record<FreedomStatus, string> = {
  fragil:        'bg-rose-500/70',
  'em-construcao':'bg-amber-500/70',
  resiliente:    'bg-blue-500/70',
  soberano:      'bg-emerald-500/70',
  inabalavel:    'bg-violet-500/70',
};
```

### 4.2 `FreedomSpectrum.tsx` — novo (o padrão §10.3 "Espectro de tiers")

Props: `{ status: FreedomStatus }`. Render:
1. Uma faixa de **5 segmentos** na ordem `FREEDOM_ORDER`, cada um com `FREEDOM_SEGMENT[tier]`.
   O segmento do `status` atual fica em **opacidade cheia**; os inativos **apagados** (`opacity-30`)
   — "só o ativo pulsa" (§10.3, evita ruído de arco-íris).
2. Um **marcador** (barrinha branca vertical) centralizado no segmento ativo (posição = índice do
   tier em `FREEDOM_ORDER`; centro do segmento = `(idx + 0.5) / 5`).
3. Labels dos 5 tiers abaixo (`FREEDOM_TIERS[t].label`), o ativo em `si-1`/cor do tier, os demais em `si-4`.
4. **Sem `shadow-{hue}`** (Gate 3). Transição do marcador envolta em `motion-reduce:transition-none` (§10.4).
5. Acessível: `role="img"` + `aria-label` tipo "Nível de liberdade: Soberano (4 de 5)".

### 4.3 `SovereigntyHero.tsx` — reskin de profundidade + montar espectro

**Preserve toda a lógica atual** (greeting, `noLdData`, confiança, glossário, strip, CTA). Mudanças:
1. Troque o wrapper externo
   `<div className="relative overflow-hidden bg-si-card rounded-2xl border border-si-border">`
   por `<Card surface="raised" padding="none" className="relative overflow-hidden">` (import de
   `./primitives` ou `./Card`). Mantém `rounded-2xl border` (o `Card` já traz) + a superfície elevada da §10.1.
   O overlay de **glow radial por tier** (o `<div>` com `FREEDOM_TIERS[status].glow`) **permanece** —
   é glow de estado, inline, não `shadow-{hue}` (ok §1/§10).
2. Monte `<FreedomSpectrum status={freedom.status} />` **logo abaixo do badge do tier** (após o
   `<span>` do `FREEDOM_TIERS[status].label`), dentro do bloco `!noLdData`. Em `noLdData`, **não** renderize o espectro.
3. Não altere props, dados, nem o strip inferior. Nenhuma cor nova fora de estado/tier.

### 4.4 `FreedomSpectrum.test.tsx`

1. Renderiza 5 segmentos na ordem `FREEDOM_ORDER`.
2. `status="soberano"` → o segmento/label "Soberano" está ativo (sem `opacity-30`) e os outros apagados.
3. `aria-label` contém "Soberano".

### 4.5 `docs/CHANGELOG.md`

Entrada: "Hero Dark-Glass + espectro de tiers (HANDOFF-0009): SovereigntyHero em superfície
elevada (fundação 0008) + novo FreedomSpectrum (§10.3), props/caller inalterados. Sem No-Radar/
Horizonte (0010/0011), sem deploy."

---

## 5. Critério de aceite

- [ ] Nenhum arquivo fora do §3.
- [ ] `npm run gate` verde (tsc + test:unit incl. os 5 gates **inalterados**; smoke = watch-item).
- [ ] Props/assinatura do `SovereigntyHero` inalteradas → `src/pages/Dashboard.tsx` **não** aparece no diff.
- [ ] `FREEDOM_TIERS`/`SV_TIERS` inalterados (só adição em `sovereigntyScale.ts`).
- [ ] Espectro: 5 segmentos, ativo cheio + inativos apagados, marcador no tier certo, `aria-label` presente.
- [ ] Zero `shadow-{hue}-{n}/{n}` novo (Gate 3 segue = 0, sem editar o teste).
- [ ] Movimento do marcador respeita `prefers-reduced-motion` (§10.4).
- [ ] `noLdData` continua sem espectro e sem regressão (o "—" e o CTA "Conectar banco" intactos).
- [ ] 3 casos de `FreedomSpectrum.test.tsx` passam.

---

## 6. Gate de risco

- **Dinheiro / rule / deploy?** NÃO. Presentational, front-end.
- Risco = (a) mudar props e quebrar o `Dashboard` (coberto pelo aceite); (b) espectro introduzir
  cor decorativa (é dado/tier — §10.3, ok) ou `shadow-{hue}` (proibido, use tier via bg/opacity).
- Review Dev + UIUX; a §10.3 "Espectro de tiers" é o gabarito.

---

## 7. Instrução de bloqueio

Se o `Card` da `main` não tiver `surface`/`glow` (0008 não mergeado), se o `SovereigntyHero` no
disco divergir das linhas citadas, ou se o setup de teste não bater — **PARE e registre no report**.
Em conflito com `AGENTS.md`, o `AGENTS.md` vence.
