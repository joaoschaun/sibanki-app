# Design System Rubric — Sibanki (Pierre Finance)

> Contrato do design system. Cada regra abaixo é a fonte de verdade de UI/UX.
> As que dá para checar por máquina viram gate em `src/constants/designSystem.guard.test.ts`
> (o "ratchet" — números só podem cair). As demais são checklist de PR.
>
> Versão 2 · 10/07/2026 · Lead UX/UI.
> **Versão 1** (04/07/2026) foi austera por reação a um fracasso concreto (gradiente-arco-íris
> e neon decorativos). A **v2 evolui conscientemente** para a linguagem **Pierre Dark-Glass**:
> passa a permitir **profundidade** (glass, elevação, glow, gradiente de superfície) como
> camada de execução premium — SEM abandonar o princípio (restrição, significado sobre
> decoração). A alma é preservada: **cor ainda = estado** (§1), WCAG AA (§2), e §8/§9
> (assinatura + anti-ansiedade) intactos — a nova linguagem *serve* essas seções, não as revoga.
> Isto **revisa** duas regras da v1 (marcadas com ⚠︎v2 abaixo): §1 (glow/gradiente) e §4
> (movimento). O **Gate 3 do ratchet permanece em 0** — não afrouxamos: o glow ganha um **canal
> sancionado** via token `--si-glow-*` (que o gate de `shadow-{hue}-{n}/{n}` cru não enxerga),
> então disciplina intacta E profundidade liberada. Referência canônica visual: [`docs/design/mocks/`](design/mocks/) — `painel.html`
> (Painel), `credito.html` (Crédito), `consultor.html` (Consultor). A especificação completa da
> linguagem está na **§10**.

---

## 1. Cor

**Base monocromática.** Fundo `--si-bg`, cards `--si-card`, texto/UI em cinza (`si-1…si-5`).
Cor com hue só é permitida para **estado financeiro** (Ld/Sg/Sv) via a paleta semântica
(`si-positive` / `si-warning` / `si-risk` / `si-projection` / `si-info`, sempre par bg+text
com opacidade) — nunca para decoração. **Gate 1** (sem `bg-*-500` sólido) protege isso.

**⚠︎v2 — profundidade permitida, cor ainda presa a estado.** A regra "monocromático" nunca foi
"sem profundidade"; era "sem cor decorativa". A v2 mantém isso e destrava a profundidade:
- **Glow/gradiente NEUTRO** (branco-alpha, cinza) é livre — é elevação, não cor.
- **Glow/gradiente COLORIDO** só vale se a cor **carregar significado**: (a) hue da paleta de
  estado num elemento que É aquele estado (ex.: glow esmeralda no card-herói de soberania), ou
  (b) **dado** — categoria (`--si-cat-*`) ou posição numa régua (o espectro do score, §10).
- **Continua proibido:** glow/gradiente multicor decorativo, neon, hue fora de estado/dado.

Ou seja: a pergunta não é "tem cor?", é **"a cor está dizendo algo?"**. Detalhe operacional e
tokens na **§10**; o gate correspondente foi revisto (§6, Gate 3 ⚠︎v2).

**Escala de cinzas em OKLCH.** Os tokens `--si-text-1…5` são `oklch(L 0 0)`, com lightness
*resolvida* para um alvo de contraste (não escolhida a olho). Para cinza OKLCH, `Y = L³`, então
o contraste é previsível. **Nunca** hex num token de texto (**Gate 5**).

| token | alvo de contraste (pior superfície do tema) | uso |
|---|---|---|
| `si-1` | ~16:1 | texto primário |
| `si-2` | ~11:1 | texto forte |
| `si-3` | ~7.5:1 | texto secundário |
| `si-4` | ~4.6:1 | **mínimo para texto pequeno informativo (AA)** |
| `si-5` | ~3.0:1 | só UI/decorativo/desabilitado — **nunca texto pequeno** |

**Marca é exceção.** Cores de bandeira/banco (logos, faixa do CardTile) são hue legítimo —
devem viver em constantes de marca, não espalhadas. Não contam como violação de cor.

---

## 2. Acessibilidade (WCAG 2.1 AA — inegociável)

- **Contraste:** texto pequeno ≥ 4.5:1 (use `si-4`+). Grande/UI ≥ 3:1 (`si-5` ok). Garantido pela escala OKLCH.
- **Foco visível (2.4.7):** anel global `:focus-visible` no `index.css` cobre tudo. Foco por-componente é neutro (`focus:border-si-border-lg`) — **nunca colorido** (**Gate 2**).
- **Touch target (2.5.5):** alvos icon-only ≥ 44px via `.min-touch-target`.
- **Formulários:** todo campo passa pelos primitivos `Input`/`Select`/`Field` → herda `aria-invalid`/`aria-describedby`, erro com `role="alert"`, e 16px no mobile (sem zoom iOS).
- **Label:** `.si-label` (ALL CAPS, 10px, tracking 0.18em) em `si-4`. Nunca `si-5` (**Gate 4**).

---

## 3. Componentes

- **Primitivos primeiro.** Botão → `<Button>`; campo → `<Input>`/`<Select>`/`<Field>`; nunca `<input>`/`<select>` cru em tela nova.
- **Estados obrigatórios:** `default / hover / active / disabled / focus / loading`.
- **CTA primário:** branco (`<Button variant="primary">`) — o único contraste. Destrutivo: `danger` (rose).
- **Densidade > enfeite** em telas operacionais (lista de cartões = tiles compactos, não cartões realistas).

---

## 4. Layout & movimento

- Spacing na escala **4/8px**. Cards `rounded-xl/2xl`, borda `0.5px si-border`.
- Mobile-first: colunas empilham (`grid-cols-1 md:grid-cols-2`); nada quebra < md.
- **⚠︎v2 — Movimento com propósito, profundidade cirúrgica.** O movimento deixa de ser só
  "entrada discreta": ganha vocabulário definido (count-up no número-herói, draw em linha/
  sparkline, fill em barras, reveal em stagger, sheen no cartão, pulse no "ao vivo") — sempre
  **subordinado a `prefers-reduced-motion`** (§10). Glass, elevação e glow **neutros ou de
  significado** passam a ser permitidos (a regra de cor da §1 continua valendo). Especificação:
  **§10**.

---

## 5. Checklist de PR (o que a máquina não pega)

- [ ] Usou primitivos (`Button`/`Input`/`Select`/`Field`) em vez de markup cru?
- [ ] Todos os estados do componente cobertos (incl. `loading` e `disabled`)?
- [ ] Empilha e é tocável (44px) no mobile?
- [ ] Cor só para estado **ou dado** (categoria/espectro)? (nada decorativo colorido — §1 ⚠︎v2)
- [ ] Todo glow/gradiente é neutro **ou** carrega significado? Nenhum neon/multicor decorativo? (§10)
- [ ] Movimento respeita `prefers-reduced-motion`? (§10)
- [ ] Cada padrão dark-glass tem seu equivalente em **modo claro** (glow→sombra suave, glass→frost claro)? (§10)
- [ ] Rodou `npm run test:unit` (os 5 gates passam)?
- [ ] Validou visualmente nos **dois temas** (dark + light)?

---

## 6. Ratchet — o que é automático

`src/constants/designSystem.guard.test.ts`:

1. Fundo sólido colorido ≤ 29 (só cai).
2. Foco colorido = 0.
3. **Glow colorido cru (`shadow-{hue}-{n}/{n}`) = 0 — MANTIDO.** O ratchet **não** afrouxa. A
   profundidade da v2 NÃO usa `shadow-emerald-500/20` inline (isso continua proibido e = 0); usa
   o **canal sancionado** — a utility/token `--si-glow-*` definida em `index.css` (§10.1), que o
   regex do Gate 3 não casa. Assim há **um** jeito certo de dar glow (de estado/neutro), e ad-hoc
   colorido segue barrado. Recomendado no HANDOFF-0008: **Gate 6** garantindo que glow só apareça
   via `--si-glow-*` (ratchet novo, aditivo).
4. Label `text-si-5 uppercase` = 0.
5. Token `--si-text-*` em hex = 0 (só OKLCH).

Ao migrar telas e reduzir um número, **abaixe o teto correspondente** para travar o ganho.

---

## 7. Dívida conhecida (não é defeito — é polimento)

Depois das varreduras globais de a11y/marca, as telas estão tratadas nos defeitos. Resta
consistência cosmética, a fazer por página **com validação visual**: ~209 `<input>` crus a
unificar no primitivo, ~600 grays `zinc` a mapear para tokens `si-*`, acentos `text-blue`
informativos → `si-info`. Ordem: CreditHub → Accounts → Growth → Planning/Budget/Transactions → resto.


---

## 8. Assinatura — dos defeitos ao desejo (o teto)

Correcao (secoes 1-7) e o piso. Estes principios sao o que faz o Sibanki ser desejavel,
nao so correto. Referencia canonica: entrada do Consultor IA.

1. **Cada superficie tem seu papel — nunca duplique.**
   - **Dashboard = ESTADO.** Olhar de relance, passivo. E aqui que vive o numero-heroi
     (Ld, patrimonio, spread) com tratamento tipografico proprio: grande,
     `font-variant-numeric:tabular-nums`, tracking negativo, `si-1`. O tipo e o oficio.
   - **Consultor IA = CUIDADO.** Relacional, proativo. Nao re-exibe o numero que o Dashboard
     ja mostra — ele *fala com voce*: um briefing na voz do assistente ("passei seu dinheiro
     a limpo... uma coisa precisa de decisao hoje"). Aponta para o Dashboard, nao o repete.

2. **A unica coisa que importa agora.** Toda tela-heroi surface UMA decisao acionavel em
   destaque — nao seis cards competindo. Enquadre como decisao ("Precisa de decisao · hoje"),
   com acao primaria + saida que respeita a autonomia ("Depois").

3. **Dinheiro lido em Dias de Liberdade.** Todo valor financeiro relevante pode ser traduzido
   em Ld ("~R$ 900/mes em juros = 6 dias da sua liberdade"). E o POV do produto tornado
   visceral. Helper canonico: `reaisToFreedomDays(valor)` sobre o burn rate de `calculateFreedom`.

4. **Cor so para estado; austero != frio.** Verde/rose/ambar apenas para estado financeiro.
   O calor vem de outro lugar: prova de cuidado ("olhei agora ha pouco"), saudacao pessoal,
   a voz do assistente. Monocromatico nao pode virar sem-vida.

5. **Sempre a frente (antecipacao > reacao).** O Consultor rankeia por ALAVANCA RESTANTE,
   nao por urgencia — surface algo enquanto ainda e barato agir, nao quando ja e tarde. A
   pergunta que ordena o briefing: "onde o usuario ainda pode mudar o resultado, e quanto vale?".
   Motor: projecao de fluxo de 15 dias (modulo Contas) + recorrentes + *trajetoria* (velocidade)
   de credito/orcamento. Substitui o alerta reativo de 0-3 dias por antecipacao com janela de
   acao. Enquadre a decaida de alavanca ("barato agora, o rotativo depois"). Elemento-assinatura:
   o **Horizonte** (linha dos proximos 15 dias com a janela de acao destacada).

6. **O teto do Painel — os 4 movimentos (aprovado 11/07/2026, ref. Credit Pros/RonDesignLab).**
   O Painel desktop deixa de ser grid de cards e adota o formato "numero-dono-da-tela":
   - **(a) Numero-heroi com espectro de tiers.** O Ld vive solto na tela (nao dentro de card),
     peso ultraleve (~200), tamanho ~84px, `tabular-nums`. Embaixo dele corre a **regua de
     tiers**: 5 segmentos flat proporcionais (Fragil rose / Em construcao ambar / Resiliente
     azul / Soberano esmeralda / Inabalavel violeta) com marcador branco na posicao do usuario.
     E o canal "espectro do score" ja sancionado na §10 — cor = posicao na escala, nunca arco-iris
     decorativo. Metricas de apoio (patrimonio, burn diario, spread) em microlabels sob o hero.
   - **(b) Navegacao no topo, nao sidebar gorda.** Desktop usa nav horizontal (Painel ·
     Lancamentos · Credito · Investimentos · Mais) + botao Assistente + avatar. A largura
     inteira volta pro conteudo. SibCoin sai do corpo do Painel e vira icone com badge no topo
     (gamificacao e recompensa, nao estado).
   - **(c) A decisao flutua — nao disputa a grade.** A unica-decisao (§8.2) aparece como painel
     flutuante sobreposto ao hero, com borda/temperatura do estado (ambar = radar). Zero
     decisoes = painel limpo (calmo-por-padrao, §9.2). Sempre subordinada ao gate cash-aware
     da §9.1 (a sugestao chega DEPOIS da renda que a cobre).
   - **(d) Tempo tatil.** O Horizonte (§8.5) se materializa como fileira de 15 pilulas-dia:
     dias neutros apagados, entrada de renda em esmeralda, evento de credito em ambar, janela
     de acao com borda acesa. Legenda de 1 linha. (Credit Pros mostra o passado em pilulas;
     nos mostramos o futuro.)

   **Anatomia da pagina inteira (ordem fixa, do significado pro operacional):**
   (1) Hero + decisao flutuante → (2) Horizonte → (3) faixa de contas conectadas (tiles densos,
   estado Open Finance) → (4) fluxo do mes (coadjuvante, altura reduzida) → (5) credito em
   formacao (card compacto → Hub). Quanto mais perto do topo, mais "o que significa"; quanto
   mais embaixo, mais "numeros crus". Descartado conscientemente da referencia: glow colorido
   decorativo em icones e multiplos paineis simultaneos.

## 9. Contrato de "quando falar" (antecipacao sem ansiedade)

A antecipacao corta dos dois lados: bem feita reduz ansiedade ("esta tudo no meu radar,
eu controlo"); mal feita fabrica ansiedade ("o app que so traz ma noticia") e afasta justo
o usuario que mais precisa do Sibanki. Esta secao e a trava emocional da secao 8, item 5.

**Principio-raiz:** ansiedade = ameaca SEM alavanca. Mostrar um futuro que o usuario nao pode
mudar e angustia pura. E o gatilho nao e um countdown de "dias antes" — e a POSICAO DE CAIXA
(cash-aware): so fale quando o usuario tem como agir.

### 9.1 Arvore de decisao — o mesmo gate para push e para o briefing

1. **Tem alavanca?** (o usuario ainda pode mudar o resultado?) Nao -> **silencio no Consultor**
   (no maximo vira nota no Painel). Sem agencia, nao fala. Regra dura.
2. **Tem caixa para agir agora?** (a renda ja caiu, ou existe colchao?)
   - Sim -> sugestao **calma e ativa** ("quer ja separar esse valor?").
   - Nao -> **segura** ate a renda entrar; ai a coisa surge como a PRIMEIRA fala, em tom de
     alivio ("caiu seu salario; separo os R$ X do Itau?"). Nunca mostrar a conta antes do
     dinheiro que a cobre — e o que gera o "sinto que ja estou devendo".
3. **Ponto sem volta** (3-5 dias do fechamento/vencimento) e ainda nao resolvido -> sobe o
   tom para **ativo/urgente**. So aqui o vermelho pode dominar.
4. **Renda irregular / timing incalculavel** -> default de **7 dias** + o dial de autonomia
   (9.4) como rede de seguranca. E o publico de maior estresse (autonomo/PJ/gig): a trava de
   alavanca e o tom de planejamento importam ainda mais.

### 9.2 Travas de calma (execucao)

- **Liderar pela seguranca — visualmente, nao so na copy.** A tranquilizacao vem primeiro e
  com maior peso visual; a decisao e a excecao calma. O card de risco nao pode dominar a tela
  quando o texto diz "no geral, tranquilo".
- **Uma decisao por vez — nunca uma lista de perdicoes.** Lista rolavel de problemas futuros
  e gerador de panico.
- **Enquadramento de PRESERVACAO, nao de perda.** "Agir agora **preserva** 6 dias da sua
  liberdade" > "custa 6 dias". Mesma lente (secao 8.3), delta emocional grande. Da o ganho de
  agir, nao a culpa do custo.
- **Calmo-por-padrao e uma FEATURE.** O estado "nada precisa de voce hoje" e desenhado como
  conquista ("tudo sob controle — aproveite o fim de semana"), nunca como tela vazia. Muitos
  dias devem abrir calmos. Se o motor inventar urgencia para se justificar, ele vira a maquina
  de ansiedade.
- **Projete para o usuario ANSIOSO como restricao.** Se ficou calmo o suficiente para o
  evitativo, ainda entrega valor para o engajado. O contrario nao e verdade.
- **Tom de assistencia (IA que resolve), nunca de cobranca.**

### 9.3 Regua de temperatura (fallback quando o caixa nao pode ser lido)

- **Passivo / planejamento** (janela ~7-15 dias): tom neutro, sem urgencia, foco em preparar
  ("quer ja separar?"). So aparece quando ha acao possivel.
- **Ativo / decisao** (3-5 dias do ponto sem volta): tom destacado, resolucao imediata.
- **⚠︎v2 — O ROTULO segue a regua, nao so o corpo.** O verbo de urgencia ("AJA", "agora") e
  reservado ao ativo (3-5 dias). Um item no radar do Painel que ainda esta na janela passiva
  (>5 dias E com cobertura de caixa) usa rotulo de PLANEJAMENTO, mesmo em destaque: "no radar ·
  da pra resolver esta semana" > "AJA ESTA SEMANA". Surface cedo (§8.5) sem *soar* urgente cedo —
  senao a antecipacao vira a maquina de ansiedade (§9.2). Guardar "aja" para quando aperta mantem
  a palavra com peso. (Aprendizado da realizacao do Painel, 11/07: fatura a 9 dias com salario
  cobrindo no dia 14 = passivo, nao ativo.)

A regua e SUBORDINADA ao cash-aware (9.1): o countdown fixo e o fallback, nao a regra.

### 9.4 Gatilho do motor (esboco de engenharia)

- **Input:** projecao de fluxo de 15 dias (modulo Contas) + recorrentes (datas de RENDA e de
  despesa) + trajetoria (velocidade) de credito/orcamento.
- **Regra:** computa a data-de-renda mais proxima. Se a despesa-com-alavanca tem cobertura de
  caixa apos a renda -> agenda a fala para o dia pos-renda. Senao, segura. Sem alavanca -> nao
  fala. O score de alavanca (secao 8.5) ordena.
- **Substitui** `dailyPushAlerts` (disparo reativo 0-3 dias) por disparo cash-aware.
- **Fallback renda irregular:** sem data de renda confiavel (sem recorrente de entrada / sem
  Open Finance) -> default 7 dias e respeita o toggle do usuario.
- **Config (9.4a):** dial "quao a frente quer ser avisado?" — *so o urgente* / *a semana* /
  *tudo*. Default meio-termo (7 dias). Percepcao de ansiedade varia por pessoa; o dial devolve
  o controle ao usuario.

---

## 10. Linguagem visual — Pierre Dark-Glass (v2)

A evolução da execução: mesma alma (§1, §8, §9), acabamento premium. **Filosofia:** profundidade
comunica hierarquia e "sistema avançado que merece confiança"; a disciplina é que a profundidade
seja *cirúrgica* e a cor *signifique*. Referência canônica: [`docs/design/mocks/`](design/mocks/).
Os mocks são **glamour shots** (dark, estáticos, dados fictícios) — copie a *linguagem*, não os
números, e nunca ignore os estados reais (§10.6).

### 10.1 Tokens de profundidade (intent — os CSS vars nascem no HANDOFF-0008)

- **Superfícies em gradiente sutil:** card = `linear-gradient(180deg, --si-card, --si-card-2)`
  (~2 passos de luminância) + `inset 0 1px 0 rgba(255,255,255,.06)` (borda-luz superior) — dá
  volume sem cor. Fundo da página: radial-glows **neutros/estado** de baixa opacidade nos cantos.
- **Glass** (`--si-glass`): `rgba(20,27,35,.55)` + `backdrop-filter: blur(14–16px)` + borda
  `--si-border-2`. Uso: painéis-detalhe, tooltips, pílula de ação, input do Consultor.
- **Glow:** halo suave (`box-shadow` difuso, raio grande, baixa opacidade) **na cor do estado**
  do elemento. Ex.: card-herói de soberania → glow esmeralda. Neutro também vale.
- **Elevação:** sombra funcional `0 16px 46px -22px rgba(0,0,0,.8)` nos cards. Sem sombra dura.
- **Sheen:** brilho diagonal que varre (cartão-arte). Decorativo-permitido porque é **luz**, não hue.

### 10.2 Regras de profundidade (subordinadas à §1)

1. **Glow/gradiente segue a cor-de-significado.** Neutro (branco-alpha/cinza) livre; colorido só
   se for **estado** (elemento que É aquele estado) ou **dado** (categoria/espectro). Nunca decorativo.
2. **Glass é neutro por padrão.** O tom de vidro não introduz hue; se o painel-detalhe usa gradiente
   colorido (ex.: esmeralda→teal→violeta), é porque representa transição de estado/tempo — não enfeite.
3. **Profundidade não pode ferir contraste (§2).** Texto sobre glass/gradiente mantém ≥4.5:1 — teste
   no ponto mais claro do fundo.
4. **Modo claro não é opcional (§10.5).** Todo padrão dark tem equivalente claro definido.

### 10.3 Padrões nomeados (o léxico reutilizável)

- **Card-herói com glow-border.** Número-herói (§8.1: Ld, patrimônio) em degradê de estado + moldura
  luminosa 1px (mask-gradient) + glow difuso. Um por tela, no máximo. Ref: `painel.html`.
- **Espectro do score.** Régua gradiente **risco→atenção→soberano** (rose→âmbar→esmeralda) com
  marcador na posição do Sv. A cor = posição na escala (dado), não decoração. Ref: `credito.html`.
- **Cor-por-categoria.** Ícones/realces usam `--si-cat-*` (uma cor por categoria financeira). É a
  fonte legítima de "vida colorida" que o v1 subusava. Ref: `credito.html`, listas.
- **Painel-detalhe em glass.** Drill-down de um objeto (fatura, conta) em glass gradiente: valor,
  progresso, abas, **calendário de status** (✓/✕ por mês) e **pílula de ação flutuante**. Ref: `credito.html`.
- **Rail de "Contexto ao vivo" (Consultor).** Faixa que mostra o que a IA está lendo (Ld/Sg/Sv/Open
  Finance) — prova visual de §8.4 ("olhei agora há pouco"), gera confiança. Ref: `consultor.html`.
- **Card de decisão embutido (Consultor).** Resposta da IA não é parágrafo: é decisão quantificada
  (Ld antes→depois, Sv da ação, à vista vs parcelado). Materializa §8.2 e o `decisionEngine`. Ref: `consultor.html`.
- **Cartão-arte** (opcional, só para a conta/cartão **próprio** Sibanki). Gradientes em camadas +
  chip + sheen. **Não** substitui os cartões com marca das instituições, que já existem e permanecem.
- **Horizonte — a régua dos próximos 15 dias.** Elemento-assinatura da §8.5. Faixa de dias com
  marcadores de **RENDA** (esmeralda) e **DESPESA-com-alavanca** (âmbar), e a **janela de ação
  destacada como vão contínuo** entre a renda e a despesa (não só na legenda). É a §9.1 (cash-aware)
  tornada visível: renda ANTES da despesa = há cobertura, logo a fala é legítima. Ref: realização do
  Painel (11/07).
- **Card "No Radar" — a decisão da semana.** O card único da §8.2 no Painel: rótulo de estado
  (âmbar = atenção) com **glow-border sancionado** (`--si-glow`, não `shadow-{hue}`), corpo em
  **preservação** (§9.2: "preserva N dias da sua liberdade"), CTA primário + saída **"Depois"**
  (respeita autonomia). O tom do rótulo obedece a régua §9.3 (passivo vs ativo). Máx. um por tela.
  Ref: realização do Painel (11/07).
- **Espectro de tiers (Ld).** Variante do espectro-do-score para **escalas nomeadas**:
  Frágil → Em construção → Resiliente → Soberano → Inabalável (tiers do `calculateFreedom`), cada
  tier um segmento, marcador na posição atual. Segmentos inativos **apagados** para só o ativo pulsar
  (evita ruído de arco-íris). Cor = posição na escala (dado, não decoração — §1 ⚠︎v2). Ref: realização do Painel (11/07).

### 10.4 Vocabulário de movimento (com trava)

Count-up no número-herói · draw (stroke-dashoffset) em linha/sparkline · fill em barras/progresso ·
reveal em stagger (~85ms) na entrada dos cards · sheen no cartão · pulse no indicador "ao vivo".
**Trava dura:** tudo envolto em `@media (prefers-reduced-motion: reduce)` → sem animação, estado final
imediato. Movimento confirma ação/dá vida; nunca bloqueia leitura nem atrasa dado.

### 10.5 Modo claro (equivalências obrigatórias)

Glow colorido → sombra suave neutra + borda de estado. · Glass escuro → frost claro
(`rgba(255,255,255,.6)` + blur). · Gradientes de superfície → passos claros equivalentes. ·
Espectro e categorias mantêm hue (são dado). Validar §5 nos dois temas — o dark-glass **não pode**
existir só no escuro.

### 10.6 O que os mocks NÃO mostram (e o produto exige)

Os glamour shots escondem o trabalho real que o HANDOFF-0008 e seguintes precisam entregar:
**estados** (vazio/loading/erro/`hideValues`), **dados reais** via contexts (não fictícios),
**responsividade** de verdade (não só o breakpoint do mock), **modo claro**, **a11y** (foco, touch,
leitor de tela). Um mock bonito é hipótese visual validada — não é a tela pronta.

---

## 11. Craft premium (UX/UI) — o que separa "correto" de "desejável"

§2 (a11y) e §10 (dark-glass/movimento) são o **piso**. §11 é o **acabamento** que faz parecer produto
premium — e a regra-mãe é que cada detalhe sirva à **confiança e à calma** (§9), nunca ao show. Craft
sem propósito vira ruído. Aplica-se a toda tela nova (0012 em diante).

### 11.1 Microinterações — todo toque responde

- **Quatro estados sempre visíveis** em tudo que é interativo: `rest / hover / press / focus-visible`.
  Press = `scale(.98)` ~120ms; hover = mudança de superfície/borda **neutra** (nunca cor decorativa,
  §1); focus = o anel global do §2. Sem estado "morto".
- **Feedback < 100ms**: toda ação confirma visualmente na hora, mesmo que o dado demore. **Optimistic
  UI** onde é seguro (o lançamento aparece já e reconcilia depois; se falhar, desfaz com aviso calmo).
- **Confirmação sóbria**: "Salvo", não "Salvo com sucesso!". Erro = o que aconteceu + o que fazer,
  sem stack trace, sem "Erro:".

### 11.2 Movimento premium (estende §10.4)

- Além do vocabulário do §10.4: **transição de página/tab** com fade+rise curto (150–250ms, ease-out);
  stagger de entrada **só na primeira pintura**, nunca a cada re-render (senão pisca).
- **Timing:** micro 120–250ms, layout 300–450ms, **nunca >500ms** (trava percepção). Curva padrão
  `cubic-bezier(.2,.7,.2,1)`. Stack: `framer-motion` (já no repo) para orquestração; CSS para o simples.
- **Trava dura §10.4:** `prefers-reduced-motion` → estado final imediato. Movimento **nunca** atrasa a
  leitura do dado nem bloqueia input.

### 11.3 Fricção zero e antecipação

- **Defaults inteligentes:** a tela já chega com o provável preenchido (data=hoje, conta=principal,
  categoria sugerida pela IA). O usuário **confirma**, não digita do zero.
- **Undo > confirmação:** ação reversível **executa e oferece "desfazer"** (~5s); só o **irreversível**
  pede confirmação. Menos modais, mais fluxo.
- **Sem becos sem saída:** todo estado vazio tem **uma** ação clara (enquadrada como conquista, §9.2,
  não erro); todo erro tem saída.
- **Antecipação (§8.5/§9):** a próxima ação provável é oferecida **antes de pedida** — mas só quando há
  alavanca (o gate cash-aware §9.1). Antecipar sem alavanca = ansiedade (§9), não fricção-zero.

### 11.4 Microcopy empático e claro (estende §9 para toda a copy)

- **Assistência, nunca cobrança** (§9.2): "vamos revisar juntos" > "você gastou demais".
- **Preservação, não perda** (§9.2): "preserva 6 dias" > "custa 6 dias" — enquadramento canônico de
  toda copy financeira.
- **Concreto e curto:** número **+ significado** ("R$ 900 em juros = 6 dias da sua liberdade", §8.3),
  nunca jargão nu. Sentence case; sem "!", sem "com sucesso", sem "por favor", sem "simplesmente".
- **Estado vazio = convite** ("Seu índice de liberdade aparece aqui. Registre uma despesa pra começar")
  — nunca "nada aqui". (O `SovereigntyHero` já é o padrão canônico.)
- **Voz:** pt-BR, próximo mas respeitoso. **1ª pessoa só no Consultor**; o Painel fala como produto
  (2ª pessoa — "você/seu"), reforçando a separação §8.1.

### 11.5 Acessibilidade integrada (estende §2 — não repete)

- §2 é o piso (contraste OKLCH, foco, touch 44px, forms). §11 soma o premium:
  **ordem de foco lógica**; **landmarks** (`nav`/`main`/`aside`); **`aria-live`** no número que atualiza
  (o count-up do Ld anuncia **o valor final**, não cada tick); decorativo `aria-hidden`, funcional com
  `aria-label`; espectro/horizonte com `role="img"` + resumo textual (já feito no `FreedomSpectrum`).
- **Cor nunca é o único canal:** estado financeiro = cor **+ ícone + texto** (o daltônico lê "Soberano",
  não só o verde). Vale para tiers, decisão e horizonte.
- **Testável:** 100% navegável por teclado; leitor de tela conta a história na ordem **estado → decisão
  → horizonte** (a mesma da §8).

### 11.6 Consistência sistêmica

- **Um jeito de fazer cada coisa:** um botão (`<Button>`), um card (`<Card>`), um número (`.num`
  tabular), um label (`.si-label`), um glow (`--si-glow`). Precisou reinventar? O sistema tem um buraco
  — **preenche o primitivo, não a tela** (§3).
- **Tokens > valores mágicos:** espaçamento 4/8, raio e cor via token; zero hex solto (Gate 5).
- **Mesmo conceito, mesma cara:** Ld sempre com o mesmo tratamento; tier sempre a mesma cor
  (`sovereigntyScale` é fonte única — já é lei). O usuário nunca reaprende um padrão entre telas.

### 11.7 Desempenho e velocidade percebida

- **Skeleton, não spinner:** telas carregam com a **forma** do conteúdo (`PageSkeleton` já existe) →
  layout shift ~0 (CLS baixo). O número pinta primeiro; o detalhe reconcilia.
- **Lazy no peso:** rotas lazy (já é), PDF/charts `dynamic import` (já é), imagens dimensionadas.
- **Metas:** <100ms para responder ao toque; <1s para a primeira pintura útil; dado lento aparece
  **progressivamente**, nunca uma tela branca esperando tudo.
- **Sem re-render em cascata:** memoizar cálculos caros (o `IntelligenceContext` já memoiza);
  virtualizar listas >100 itens.

### 11.8 A régua do craft (checklist de PR — soma ao §5)

- [ ] Todo interativo tem hover/press/focus e responde <100ms?
- [ ] Movimento respeita `prefers-reduced-motion` e nenhum passa de 500ms?
- [ ] A ação provável já vem como default; reversível usa "desfazer" em vez de modal?
- [ ] Copy em preservação, assistência, sentence case, sem "!"/"com sucesso"? Estado vazio é convite?
- [ ] Estado financeiro comunicado por cor **+ ícone + texto**? Navega por teclado? `aria-live` no número vivo?
- [ ] Usou os primitivos (nenhum botão/card/label reinventado)? Zero hex solto?
- [ ] Carrega com skeleton (sem layout shift)? Primeira pintura <1s?
