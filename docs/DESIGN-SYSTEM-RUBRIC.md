# Design System Rubric — Sibanki (Pierre Finance)

> Contrato do design system. Cada regra abaixo é a fonte de verdade de UI/UX.
> As que dá para checar por máquina viram gate em `src/constants/designSystem.guard.test.ts`
> (o "ratchet" — números só podem cair). As demais são checklist de PR.
>
> Versão 1 · 04/07/2026 · Lead UX/UI.

---

## 1. Cor

**Base monocromática.** Fundo `--si-bg`, cards `--si-card`, texto/UI em cinza (`si-1…si-5`).
Cor com hue só é permitida para **estado financeiro** (Ld/Sg/Sv) via a paleta semântica
(`si-positive` / `si-warning` / `si-risk` / `si-projection` / `si-info`, sempre par bg+text
com opacidade) — nunca para decoração. **Gate 1** (sem `bg-*-500` sólido) e a regra "sem glow"
(**Gate 3**, sem `shadow-cor/opacidade`) protegem isso.

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
- Movimento discreto: animações de entrada existentes; sem glow, sem gradiente colorido.

---

## 5. Checklist de PR (o que a máquina não pega)

- [ ] Usou primitivos (`Button`/`Input`/`Select`/`Field`) em vez de markup cru?
- [ ] Todos os estados do componente cobertos (incl. `loading` e `disabled`)?
- [ ] Empilha e é tocável (44px) no mobile?
- [ ] Cor só para estado financeiro? (nada decorativo colorido)
- [ ] Rodou `npm run test:unit` (os 5 gates passam)?
- [ ] Validou visualmente nos **dois temas** (dark + light)?

---

## 6. Ratchet — o que é automático

`src/constants/designSystem.guard.test.ts`:

1. Fundo sólido colorido ≤ 29 (só cai).
2. Foco colorido = 0.
3. Glow colorido = 0.
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
