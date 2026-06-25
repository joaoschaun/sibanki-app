# Roadmap — Gestão Autônoma do Sibanki (empresa de 1 pessoa)

> Consolidação feita por Claude em 16/06/2026. Fontes: sessões anteriores
> ("Sibanki operational setup", "Complete Financial OS Architecture"),
> `docs/ANALISE-360-SISTEMA-2026-06-10.md`, `docs/ANALISE-COMERCIAL-PRODUTO.md`,
> `docs/ARQUITETURA-FUTURA-ECOSSISTEMA.md`, `docs/CAMPANHA-BENFEITORIA.md`,
> `docs/CHANGELOG.md` + verificação direta no código.
> Atualizado em 16/06/2026 com o "Pacote do operador-solo" (FinOps, continuidade,
> KPIs, suporte com IA, conteúdo/SEO, marca, confiabilidade).
>
> Objetivo deste documento: dar ao operador-solo (João) uma visão única e
> priorizada de tudo que falta para **rodar e fazer crescer** o Sibanki sozinho,
> separando o que é "produto" do que é "operação da empresa".

---

## 0. O que significa "gestão autônoma" aqui

Não é o produto (o app que o usuário usa). É a **camada de operação da empresa**:
captar e ver leads, ativar receita, monitorar saúde do sistema e dos custos,
automatizar tarefas repetitivas, atender, publicar conteúdo, proteger a marca e
manter compliance — tudo operável por uma pessoa, de preferência a partir de um
único cockpit (o painel `/admin`) + automações que rodam sozinhas.

O princípio guia da ANÁLISE 360°:

> **A pergunta central não é "o que falta construir" — é "o que parar de construir
> para ativar o que já existe".**

---

## 1. Estado atual (o que JÁ existe)

### Stack operacional externa
| Ferramenta | Função | Status |
|---|---|---|
| Brevo | Lista de espera / e-mail marketing | ✅ ativo |
| Contentsquare (ex-Hotjar) | Heatmaps + session replay | ✅ na landing |
| Crisp | Chat ao vivo (ID `d0b41370-…`) | ✅ na landing |
| Make | Automações | 🟡 conta criada, sem cenário montado |
| Buffer | Agendamento de redes sociais | ⬜ não conectado |
| WhatsApp Business | Suporte/captura por mensagem | ⬜ burocracia pendente |

### Produto / backend (relevante para operar)
- **Billing**: Stripe com **priceIds REAIS já criados** (modo TEST): Pro R$19,90/mês
  e R$178,80/ano; Família R$29,90/mês e R$274,80/ano. Checkout + portal + webhook
  existem. *(Corrige docs antigos que diziam "placeholder".)*
- **Feature flags**: todas abertas para todos os planos ("fase de construção").
- **Health**: endpoint `/health` existe nas Functions (não há painel que o leia).
- **Admin `/admin`**: Dashboard, Usuários, Feature Flags, Feedbacks, Social IA,
  Calendário de Conteúdo, Brand Intelligence funcionam.
- **52 Cloud Functions**, qualidade alta (tsc limpo, ~118 unit + 35 Playwright).
- **E-mail transacional**: Resend já integrado nas Functions.

---

## 2. Gaps do cockpit `/admin` (verificados no código)

| Gap | Severidade | Por que importa para 1 pessoa |
|---|---|---|
| **Painel de Waitlist / Leads** | 🔴 | Não há onde ver quem entrou no Brevo, quantos, quando, crescimento |
| **Painel de Health Check** | 🔴 | 52 Functions sem visibilidade — quando algo quebra, você só descobre pelo usuário |
| **Painel de custos (FinOps)** | 🔴 | Não há visão de quanto cada usuário queima em LLM/Pluggy/BigDataCorp/Firebase |
| **KPIs de negócio do fundador** | 🔴 | Admin tem métricas de produto, não MRR/churn/CAC/LTV/runway |
| **UI de admin do SibCoin** | 🔴 | `adminCreditSibcoin` existe na Function, mas sem botão no painel |
| **Social → Buffer** | 🟡 | O botão "Agendar" não publica de verdade (não fala com a Buffer API) |
| **Analytics da landing** | 🟡 | Sem gráfico de crescimento da waitlist nem métricas de `sibanki.com.br` |
| **Changelog dinâmico** | 🟡 | Datas hardcoded de março/2026 — deveria ler do Firestore |
| **Painel de afiliados/cashback** | 🟢 | Sem visão de conversões Lomadee/Monetizze |
| **Inbox do Crisp no admin** | 🟢 | Sem aba para ver conversas do chat ao vivo |

---

## 3. Roadmap priorizado

Organizado em blocos por objetivo. Dentro de cada bloco, ordem de execução sugerida.

### 🟥 Bloco A — Ativar receita (maior alavanca, ~30 dias)
> Engenharia está madura demais para a receita (zero). Ligar o motor que já existe.

1. **Subir Stripe para modo LIVE** — criar os 4 priceIds em produção e setar
   `STRIPE_PRICE_TO_PLAN` via `firebase functions:secrets:set`.
2. **Fechar 3–5 features atrás do plano Pro** — ex.: consultor IA ilimitado,
   Raio-X de ativos, Meu CPF, relatórios PDF. Hoje gratuito = pago, logo não há
   motivo para pagar.
3. **Definir limites do plano gratuito** — N mensagens de IA/mês, 1 conexão Open
   Finance, sync manual. Protege o custo variável.
4. **Decidir: Stripe vs. Benfeitoria recorrente** — já existe material completo de
   campanha recorrente (`CAMPANHA-BENFEITORIA.md`) com tiers R$15–R$600/mês.

### 🟥 Bloco B — Cockpit do operador-solo: admin + saúde da empresa (~3–4 semanas)
> Você não pode operar — nem sobreviver — o que não enxerga.

5. **Painel de Waitlist/Leads** — via Make (webhook Brevo → Firestore) ou API Brevo
   direta; total, novos/dia, gráfico de crescimento.
6. ~~**Painel de Health Check** — bate em `/health` + status por função crítica.~~
   ✅ **Feito (16/06/2026)** — `src/pages/admin/AdminHealth.tsx` no admin **React**
   (`sibanki-admin.web.app`), lê `/api/health` e mostra status geral + por serviço.
   Falta só deploy (`npm run deploy:app`).
7. ~~**UI de admin do SibCoin** — form (email + quantidade + motivo) → `adminCreditSibcoin`.~~
   ✅ **Feito (16/06/2026)** — `src/pages/admin/AdminSibcoin.tsx` no admin **React**.
   Falta só deploy (`npm run deploy:app`).
8. **Changelog dinâmico** — ler do Firestore em vez de datas hardcoded.
9. **FinOps — custo por usuário (o "Spread Gap" da própria empresa).** Painel ou,
   no mínimo, alertas de budget no GCP/Firebase mostrando custo de LLM, Pluggy,
   BigDataCorp, Firebase **vs. receita**, por usuário ativo. Sem isso, um pico de
   uso vira susto de fatura. Começar barato: budget alerts + 1 cartão no admin.
10. **KPIs de negócio do fundador.** Cartão no topo do admin com **MRR, churn,
    CAC, LTV e runway** — os números que decidem se a empresa vive, separados das
    métricas de produto (DAU/cohort) que já existem.
11. **Continuidade / bus factor (você é o ponto único de falha).** Três peças:
    (a) cofre de credenciais (Bitwarden/1Password) com todas as chaves e acessos;
    (b) **backup automatizado do Firestore** — export agendado para o Cloud Storage;
    (c) runbook curto "como tudo funciona e como restaurar".

### 🟧 Bloco C — Automação (Make, contínuo)
> Tarefas repetitivas rodando sozinhas = tempo do fundador liberado.

12. **Cenário 1 (mais útil agora):** novo lead Brevo → notificação no Telegram
    (bot Sibanki já existe nas Functions) e/ou e-mail.
13. **Social → Buffer** — conectar o botão "Agendar" do admin à Buffer API.
14. **Cenários de apoio** — feedback crítico → Telegram; erro em Function → alerta;
    novo assinante Stripe → boas-vindas.

### 🟧 Bloco D — Aquisição e funil (~contínuo)
> Sem medir ativação, toda decisão de produto é palpite.

15. **Instrumentar o funil de ativação** — `platformEvents.ts` existe; faltam os
    eventos: cadastro → conexão OF → primeiro Ld calculado → retorno D7.
16. **Landing page de aquisição** — hoje toda rota deslogada cai no login; reforçar
    a `landing/`.
17. **Onboarding até o "aha moment"** — levar ao primeiro Ld/insight na 1ª sessão.

### 🟨 Bloco E — Suporte que escala com IA (quando o volume crescer)
> Uma pessoa não atende tudo manualmente.

18. **Central de ajuda / FAQ pública** — base de conhecimento dos temas recorrentes.
19. **Auto-resposta no Crisp usando a própria IA do produto** — primeira linha de
    triagem; escala para o fundador só o que precisar.
20. **Inbox do Crisp dentro do admin** — ver e responder conversas sem trocar de app.

### 🟨 Bloco F — Motor de conteúdo / SEO (aquisição orgânica barata)
> O único canal de aquisição que escala sem custo por lead.

21. **Blog + SEO** — pauta recorrente sobre soberania financeira, Ld/Sg/Sv; tráfego
    orgânico que se acumula. O Social IA do admin já cobre redes; falta o orgânico.
22. **Newsletter via Brevo** — nutrir a waitlist e os usuários com conteúdo + updates.

### 🟨 Bloco G — Compliance, marca e jurídico (barato agora, caro depois)
23. **Política de privacidade versionada** + **exclusão de conta self-service**
    (LGPD — você coleta CPF, dados bancários, geolocalização, negativações).
24. **Disclaimer padronizado** nas respostas de investimento do consultor IA
    (tangencia regulação CVM/Anbima).
25. **Registro da marca "Sibanki" no INPI** + **termos de uso versionados** — proteger
    o nome antes que alguém o registre.

### 🟦 Bloco H — Confiabilidade e segurança (confiança = requisito de app financeiro)
26. **Status page pública** — uptime visível gera confiança.
27. **Ligar App Check em produção** (`ENFORCE_APP_CHECK=true`) — hoje as callables
    aceitam tráfego de qualquer origem autenticada (risco de abuso de cota LLM).
28. **2FA em todas as contas críticas** — Firebase, Stripe, registrador do domínio,
    Brevo, Make. (Anda junto com o cofre de credenciais do item 11.)

### 🟦 Bloco I — Dívida técnica que ameaça a operação (quando houver fôlego)
29. **Modelo de dados `users/{uid}`** — arrays inline num doc único; limite de 1 MB
    do Firestore. Com Open Finance, estouro é questão de tempo. `entriesOverflow`
    mitiga parcialmente.
30. **Testes do `sovereigntyEngine` e `decisionEngine`** — a matemática que
    diferencia o produto não tem cobertura. Bug no Ld = bug na promessa central.
31. **Quebrar páginas-monolito** (`Cards.tsx` 1.688, `Dashboard.tsx` 1.406,
    `Growth.tsx` 1.350) com o padrão `CreditHubSections` que já deu certo.

---

## 4. Sequência sugerida (próximos 30 / 60 / 90 dias)

**Próximos 30 dias — ativar, enxergar e blindar o essencial**
- Bloco A (1–3): Stripe live + gating + limites do gratuito.
- Bloco B (5–7, 9, 11): Waitlist, Health Check, SibCoin, FinOps básico (budget
  alerts) e Continuidade (cofre + backup Firestore).
- Bloco C (12): automação lead → Telegram no Make.

**60 dias — medir, captar e atender**
- Bloco B (10): KPIs de negócio no admin.
- Bloco D (15–16): funil instrumentado + landing reforçada.
- Bloco C (13): Social → Buffer publicando de verdade.
- Bloco E (18–19): central de ajuda + auto-resposta IA no Crisp.
- Bloco G (23, 25): privacidade + exclusão de conta + INPI.

**90 dias — crescer e endurecer**
- Bloco F (21–22): blog/SEO + newsletter.
- Bloco G (24) + Bloco H (26–28): disclaimers, status page, App Check, 2FA.
- Bloco I (29–31) conforme tração crescer.
- Reavaliar Loja 2.0 / checkout nativo **só** depois de receita ativada.

---

## 5. Decisões que dependem de você (não-código)

- **Stripe LIVE vs. Benfeitoria recorrente** como primeiro canal de receita.
- **Quais features** entram no paywall do Pro.
- **Destino das notificações** do Make (Telegram, e-mail, ou ambos).
- **Ferramenta de cofre de credenciais** (Bitwarden grátis vs. 1Password).
- **Ativar `/affiliate/products` no painel Lomadee** (pendência operacional antiga).
- **WhatsApp Business** — seguir com a burocracia agora ou adiar.
- **Registro INPI** — fazer direto ou via despachante.

---

## 6. Como retomar em qualquer sessão futura

Este roadmap + `docs/CHANGELOG.md` + `CLAUDE.md` são a memória persistente. Em
nova conversa, peça "leia o ROADMAP-GESTAO-AUTONOMA e me diga onde paramos" — o
Claude lê este arquivo e as transcrições de sessão para reconstituir o contexto.
