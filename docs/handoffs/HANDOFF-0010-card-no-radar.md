# HANDOFF-0010 — Card "No Radar" no Painel (a decisão da §8.2)

> Traz para o Painel o padrão **§10.3 "Card No-Radar"**: a ÚNICA decisão acionável da semana
> (§8.2), na linguagem dark-glass, **reusando o `anticipationEngine`** (o motor cash-aware que já
> codifica o §9). NÃO reimplementa decisão nem toca o Consultor. Handoff mais sensível da série —
> decide *quando falar de dinheiro* com o usuário.
>
> **Review reforçada: Dev + UIUX + Security (CISO).** O CISO valida o §9 (anti-ansiedade): a UI
> não pode inventar urgência nem furar o gate cash-aware do motor. Não toca dinheiro-real/rules/deploy.

---

## 0. Leia antes (obrigatório)

- `AGENTS.md` (§12) · `docs/DESIGN-SYSTEM-RUBRIC.md` **v2** — §8.2 (uma decisão), §8.3 (valor em Ld),
  **§9 inteiro** (contrato de quando falar; a trava emocional), **§9.3 ⚠︎v2** (o RÓTULO segue a régua:
  "aja" só no urgente), §10.3 (**Card "No Radar"**), §10.5 (modo claro), §2 (WCAG).
- `src/utils/anticipationEngine.ts` — **o motor. Fonte única da decisão.** Use `topHorizonItem(input)`
  → `HorizonItem | null`. O item já vem com `decision` (`plan`|`act`|`urgent`; `silence` já é
  filtrado fora), `reason` (frase de PRESERVAÇÃO §9.2) e `freedomDays`. **NÃO recalcule nada disso.**
- `src/pages/Consultant.tsx` **L77–98** — a fiação de referência (liquidCash + `topHorizonItem` +
  snooze) a **replicar no hook**; **L100–104 / L147** — o handoff via `initialMessage` para o Consultor.
- `src/components/consultant/HorizonBriefing.tsx` — o mesmo padrão já vivo no Consultor. **Os rótulos
  por decisão (o `TONE`) são o §9.3 tornado código — o RadarCard DEVE usar os mesmos rótulos.** Não o edite.
- `src/components/ui/Card.tsx` + `index.css` — fundação 0008 (na main): `<Card surface="raised"
  glow="neutral">` + `--si-glow-*`. Glow só pelo canal sancionado (Gate 3 = 0).

## Pré-flight

- `HANDOFF-0009` mergeado na main (o Painel/`SovereigntyHero` já dark-glass). Se não → PARE e avise.
- Lock `free` → adquira. `git status` limpo exceto pelo que o Claude escreveu. Outro WIP → PARE.
- Branch: `pipe/0010-card-no-radar`, a partir da `main`.

---

## 1. Objetivo

Renderizar no Painel a decisão única da semana, **exatamente o que o motor manda** — liderando pela
calma, em preservação, com o rótulo obedecendo a régua §9.3. Dia calmo (`null`) é **conquista**, nunca
tela vazia. É §8.2 + §9 no Painel, reusando a lógica que já existe.

---

## 2. Escopo

**Dentro:**
- `src/hooks/useHorizonTop.ts` — **novo** hook: monta o `AnticipationInput` a partir dos contexts
  (liquidCash + engine) e devolve `{ item, snooze }`. É a fonte de fiação DRY do Painel.
- `src/components/ui/RadarCard.tsx` — **novo** componente **apresentacional** (props-driven, como o
  `HorizonBriefing`): recebe `item` + callbacks, renderiza o card dark-glass. **Sem lógica de decisão.**
- `src/components/ui/RadarCard.test.tsx` — **novo** teste.
- `src/pages/Dashboard.tsx` — **editar (mínimo)**: montar `<RadarCard>` logo após `<SovereigntyHero>`,
  fiado pelo hook; "Montar plano" → `navigate('/consultor-ia', { state: { initialMessage } })`.
- `docs/CHANGELOG.md` — entrada.
- `.pipeline/*` — protocolo.

**Fora (NÃO tocar):**
- `src/utils/anticipationEngine.ts` — **a decisão é dele. Não altere o motor** (nem "melhore" o §9).
- `src/pages/Consultant.tsx` e `HorizonBriefing.tsx` — o Consultor fica intacto. (A migração do
  Consultor/`Accounts` para o `useHorizonTop` e a unificação do mapa de tom = **dívida registrada**,
  handoff futuro. Duplicar `liquidCash`/rótulos aqui é temporário e aceito.)
- Layout geral do Dashboard (só adicionar o card; nada de reestruturar as colunas existentes).
- `Button`/`Field`/`Badge`, tokens existentes, `designSystem.guard.test.ts`, backend, rules, deploy.

---

## 3. Arquivos-alvo (só estes)

- `src/hooks/useHorizonTop.ts` *(novo)*
- `src/components/ui/RadarCard.tsx` *(novo)*
- `src/components/ui/RadarCard.test.tsx` *(novo)*
- `src/pages/Dashboard.tsx` *(editar — só o mount)*
- `docs/CHANGELOG.md` *(editar)*
- `.pipeline/STATE.md` + `.pipeline/EXECUTION.lock.md` + `.pipeline/reports/HANDOFF-0010.report.md` *(protocolo)*

> Fora da lista = reprovação. Em especial: **um `+`/`-` no `anticipationEngine.ts` reprova.**

---

## 4. Passos

### 4.1 `src/hooks/useHorizonTop.ts` — fiação (replica Consultant L77–98)

1. `useAppContext()` → `accounts, accountBalances, accountMeta, recurrents, cards`;
   `useIntelligence()` → `freedom, creditObligations`.
2. `liquidCash` (memo) **idêntico a Consultant L77–87**: soma `accountBalances[name]` das contas com
   `accountMeta[name]?.incluirNaSoma !== false` e `tipo` ∉ {`Investimento`,`Poupança`}.
3. Estado `snoozedIds` (Set) + `snooze(id)` que o adiciona.
4. `item` (memo) = `topHorizonItem({ liquidCash, dailyBurnRate: freedom.dailyBurnRate, recurrents,
   creditObligations, cards })`; se `item && snoozedIds.has(item.id)` → `null`.
5. Retorne `{ item, snooze }`. **Nada além disso** (sem recomputar decisão).

### 4.2 `src/components/ui/RadarCard.tsx` — o Card No-Radar (apresentacional)

Props: `{ item: HorizonItem | null; onMontarPlano: (item: HorizonItem) => void; onSnooze: (item: HorizonItem) => void }`.

**Regras invioláveis (§9 — o CISO revisa isto):**
- Renderize **só o que `item` traz**. `item` já é o topo filtrado (nunca `silence`). Não invente item, não reordene, não recompute `decision`.
- **Rótulo segue `decision`** (§9.3), com os MESMOS rótulos do `HorizonBriefing`:
  `urgent` → "Precisa de decisão · hoje" · `act` → "Decida esta semana" · `plan` → "No radar · dá tempo".
  **Proibido** hardcodar "AJA ESTA SEMANA" (o rótulo do protótipo violava §9.3).
- **Cor só para estado, via borda + acento** (NÃO por `shadow-{hue}`): `urgent` → `border-rose-500/28`
  + acento `text-rose-400`; `act`/`plan` → borda neutra (`border-si-border-md`/`border-si-border`) +
  acento `text-si-2`/`text-si-3`. Elevação/profundidade pelo **`<Card surface="raised" glow="neutral">`**
  (canal sancionado 0008). Só no `urgent` a cor de estado ganha mais peso (§9.1 passo 3).
- **Corpo:** "{item.label} vence em {daysUntilDue} dia(s)" (ou "vence hoje" se 0) + `item.reason`
  (a frase de preservação, já pronta). Opcional: destacar `~{item.freedomDays} dias` (§8.3) — sem duplicar o reason.
- **Ações:** "Montar plano" (primário branco → `onMontarPlano(item)`) + "Depois" (neutro → `onSnooze(item)`).
- **Dia calmo (`item == null`):** renderize a CONQUISTA (§9.2), compacta e serena — ex.: um strip
  discreto "Tudo sob controle esta semana · nada precisa de você agora". **Nunca** um card de erro/vazio,
  **nunca** invente uma pendência para preencher.
- Movimento (se houver) com `motion-reduce`. Contraste AA (§2). Modo claro coberto (§10.5) via tokens.

### 4.3 `src/pages/Dashboard.tsx` — mount mínimo

1. Importe `useHorizonTop` e `RadarCard`.
2. Logo **após** `<SovereigntyHero … />` (≈ L189, antes do grid seguinte), renderize:
   ```tsx
   <RadarCard
     item={horizon.item}
     onMontarPlano={(it) => navigate('/consultor-ia', { state: { initialMessage: `Me ajuda a montar um plano para: ${it.label}` } })}
     onSnooze={(it) => horizon.snooze(it.id)}
   />
   ```
   (`const horizon = useHorizonTop();` no topo; `navigate` já está disponível no Dashboard — confirme o import.)
3. **Nada mais.** Não altere `SovereigntyHero`, colunas, nem outros widgets.

### 4.4 `RadarCard.test.tsx`

1. `decision:'plan'` → contém "No radar · dá tempo"; **não** contém "hoje" nem "AJA".
2. `decision:'urgent'` → contém "Precisa de decisão · hoje" e a borda/acento rose.
3. `item.reason` (preservação) é renderizado; botões "Montar plano" e "Depois" chamam os callbacks.
4. `item = null` → renderiza a conquista calma (texto de tranquilidade), **sem** botões de decisão.
5. Nenhuma classe `shadow-{hue}-{n}/{n}`.

### 4.5 `docs/CHANGELOG.md`

"Card No-Radar no Painel (HANDOFF-0010): a decisão única da §8.2 no Painel via `useHorizonTop` +
`RadarCard` (dark-glass), reusando `anticipationEngine`/§9. Rótulo segue a régua §9.3; dia calmo =
conquista. Consultor/motor intocados. Sem deploy."

---

## 5. Critério de aceite

- [ ] Nenhum arquivo fora do §3. **`anticipationEngine.ts`, `Consultant.tsx`, `HorizonBriefing.tsx` NÃO aparecem no diff.**
- [ ] `npm run gate` verde (tsc + test:unit incl. 5 gates inalterados; smoke = watch-item).
- [ ] `RadarCard` é apresentacional: não importa `topHorizonItem`/`buildHorizonItems` (a decisão vem por prop).
- [ ] Rótulos batem com o `HorizonBriefing` (`plan`/`act`/`urgent`); **zero** "AJA ESTA SEMANA".
- [ ] `item == null` → conquista calma (não vazio, não erro, sem botões de decisão).
- [ ] Cor de estado só por borda/acento; profundidade por `<Card glow="neutral">`; **zero `shadow-{hue}`** (Gate 3 = 0, sem editar o teste).
- [ ] `useHorizonTop` reproduz o `liquidCash` do Consultant (mesmo filtro) e devolve `{ item, snooze }`.
- [ ] Dashboard: só o mount do `RadarCard` no diff (nada de reestruturação).
- [ ] 5 casos de `RadarCard.test.tsx` passam.

---

## 6. Gate de risco

- **Dinheiro-real / rule / deploy?** NÃO (dados próprios; nenhuma mutação; front-end).
- **Sensível (§9 / CISO):** o risco é EMOCIONAL/ético — a UI fabricar ansiedade. Mitigado por:
  a decisão vem 100% do motor (não reimplementada); rótulo travado à régua §9.3 por teste; calmo =
  conquista; lidera pela calma. **O CISO confirma que o RadarCard não fura o gate cash-aware nem
  sobe o tom além do que `decision` autoriza.**
- Segundo risco: divergência de `liquidCash`/rótulos (duplicados) — **registrado como dívida** (DRY em handoff futuro).

---

## 7. Instrução de bloqueio

Se `topHorizonItem` exigir um input que os contexts do Painel não fornecem, se o `liquidCash` do
Consultant divergir do citado, ou se o mount no Dashboard não couber sem reestruturar — **PARE e
registre no report**. Nunca "melhore" o motor ou o §9 por conta própria. `AGENTS.md` vence conflitos.
