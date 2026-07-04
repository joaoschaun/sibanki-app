# Análise de Produto — Sibanki (30/06/2026)

> Auditoria de produto em altitude de PM, fundamentada no código real, na landing
> (`sibanki.com.br`) e nos artefatos do repositório. **Não** usa dados de uso real
> (analytics não conectado) — onde a resposta dependeria de métrica, está marcado
> como **hipótese a validar**.

## Veredito executivo

O Sibanki tem **alma rara e foco perigoso**. A visão — ativar valor oculto +
otimização consciente que aumenta a liberdade — é genuinamente diferenciada e
defensável. A execução de engenharia e design está **madura demais para o estágio**
(open beta). Mas o produto está **espalhado por 3 negócios diferentes** e cresce mais
rápido do que se valida. O risco nº1 não é técnico nem de design: é construir
profundidade em todas as direções **antes de provar que alguém volta**. A prioridade
não é construir mais — é **cortar, focar e medir retenção**.

## 1. Estado real (números)

- **57.069 linhas** no front, **40 páginas** (22.707 linhas), **92 exports** de Cloud Functions, **24 módulos** navegáveis, **~75 docs** de análise.
- Três produtos morando no mesmo app:
  - **A — OS de Soberania (alma):** Consultor, Dashboard, Home, FIRE, Ld/Sg/Sv. É o que a landing vende.
  - **B — Operacional (commodity):** Cards (1719), CreditHub (1527), Accounts (1116), Transactions, Budget, Recurring. É o sensor que alimenta A.
  - **C — Viral/monetização:** ConsorcioAmigo (736), CrediAmigo (671), Loja (686), Casal, Filhos, SibCoin, Filiados. **Muito investido para algo não validado.**
- **Drift de produto:** `AgentCouncil` (420 linhas, não roteado), `Envelope` (8 linhas, vazio), `Home` (roteado sem item de menu), `Placeholder`. Sintoma de *construir sem curar*.

## 2. Arquitetura de informação

24 módulos (6 core + 16 "Mais" + 2 rodapé). Dezesseis itens em "Mais" = sobrecarga de
escolha para o usuário-alvo (que tem medo de finanças). O "Modo Coach" (tranca o app em
~8 rotas) é prova de que a complexidade já é reconhecida internamente — a versão
reduzida deveria ser o **padrão**, não a exceção.

> **Desalinhamento crítico:** o módulo mais fiel à visão (Valores a Receber / Meu CPF)
> está enterrado no menu "Mais", no mesmo nível da Loja de afiliados (off-thesis).

## 3. Jornada do usuário — o risco real

Aquisição (landing forte ✅) → Onboarding (wizard 6 passos) → Ativação (ver Ld, "uau") →
**⚠️ LOOP DE HÁBITO (não comprovado)** → Retenção (?) → Monetização (4 apostas dispersas).

O elo não validado é o **loop de hábito**: por que a pessoa volta na terça? Um app de
insight entrega o insight e o usuário some. **Tudo a jusante é especulação até isso ser
provado.**

## 4. Modelo comercial

- Planos gratuito + pago, **sem preço público**, tudo liberado em beta — disposição a pagar não testada.
- Receita de comissão (crédito/seguro/investimento) é a mais forte e a mais perigosa.
- **Lei inviolável:** só vender o que comprovadamente faz o **Ld** subir, com a conta à mostra. É o que reconcilia honestidade e receita.
- **4 apostas simultâneas = nenhuma validada.** Escolher UMA tese de receita para o beta (recomendado: comissão de otimização — portabilidade / conta que rende, por ser a única alinhada com "o melhor pro usuário").

## 5. Design / UX

Bom sistema, bem executado (Pierre + paleta semântica disciplinada + glossário + empty
states maduros). Diferenciado num mar de roxo gamificado. Dois ajustes de **dosagem**
(não de sistema): densidade da primeira tela (revelação progressiva) e ALL CAPS a 10px
(legibilidade). Baixa prioridade — o produto não morre por isso.

## 6. Posicionamento competitivo

| Concorrente | Onde ganham | Onde o Sibanki ganha |
|---|---|---|
| Mobills / Organizze | Controle de gastos maduro | Inteligência, valor oculto, Ld |
| Nubank / bancos | Loop natural (saldo/pix) | Independência, "a verdade que o banco esconde" |
| Apps "premium" | Estética | Mercado BR, Open Finance, Sentinela |

**Fosso = tríade: valor oculto + Dias de Liberdade + Sentinela.** Nenhum concorrente tem
os três. Tudo que não alimenta a tríade é commodity copiável.

## 7. Riscos (ranqueados)

1. 🔴 **Conflito de interesse** (vender vs. ser honesto) — existencial. Mitigação: lei do Ld.
2. 🔴 **Loop de hábito não validado** — tudo depende disso.
3. 🟠 **Dispersão / falta de foco** — 3 produtos, 24 módulos, 4 monetizações.
4. 🟠 **Dependência de Open Finance** — inteligência depende de dado Pluggy ainda em construção.
5. 🟡 **Drift / código órfão** — dívida de produto.
6. 🟡 **Token + multinível** — bomba regulatória/reputacional (manter no freezer).

## 8. Forças reais

Visão diferenciada e emocionalmente potente; engenharia séria (92 functions, Open
Finance, IA com fallback em cascata); design maduro; o **Sentinela** (loop + confiança +
trilho de receita); telemetria já existente (`module_viewed`).

## 9. Priorização

**AGORA (provar que vale)**
- Rodar **concierge MVP** (5 usuários; testar se agem sobre uma otimização e se o Ld move).
- Definir e instrumentar a **North Star Metric**.
- **Podar** código órfão; **enxugar** a sidebar (24 → ~10).

**DEPOIS (escalar o validado)**
- Automatizar o motor de otimização; fortalecer dado Open Finance; escolher 1 monetização e testá-la.

**LATER (só com tração)**
- Camada viral; detecção de seguro por OCR; SibCoin-token.

## 10. Métricas (instrumentar já)

- **North Star sugerida:** usuários que **agiram** sobre uma recomendação de valor oculto/otimização nos últimos 30 dias.
- **Inputs:** retenção semana-4; % que conecta Open Finance; Δ Ld médio por usuário ativo; ativação (% que chega ao "uau"); abandono por passo do onboarding.

---

## Ações executadas nesta sessão (30/06/2026)

- **App em modo beta focado:** flags `config/modules` reduzindo a sidebar de 24 → 10 itens (Assistente, Painel, Lançamentos, Contas, Crédito, Investimentos, Recorrentes, Meu CPF, Perfil, Configurações). Reversível via admin.
- **Login com Google no painel admin** (`src/admin/AdminLogin.tsx`) — resolve o descompasso de contas Google sem senha. Deployado em `hosting:admin`.
- **Consultor alinhado à tese** — intro e prompts sugeridos reescritos (valor oculto + dias de liberdade) em `ConsultantSessionContext.tsx`, `Consultant.tsx`, `ConsultantDrawer.tsx`. Deployado em `hosting:app`.

## Próximo passo

**Concierge MVP** — validar com 5 usuários reais se uma recomendação concreta de
otimização gera ação e move o Ld, sem construir o motor automatizado. É o que transforma
metade das hipóteses acima em fato.
