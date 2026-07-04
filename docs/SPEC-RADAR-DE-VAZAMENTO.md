# SPEC — Radar de Vazamento

**Data:** 01/07/2026 · **Status:** Rascunho para revisão do João · **Origem:** `docs/ANALISE-360-PRODUTO-20260701.md` (adendo)

---

## Problem Statement

O brasileiro perde dinheiro sem perceber: juros de dívida cara enquanto tem investimento rendendo menos, seguros embutidos em financiamentos com coberturas nunca usadas, benefícios de cartão pagos via anuidade e ignorados, assinaturas fantasma, dinheiro esquecido em bancos, e a escolha errada de cartão por data de fechamento. O Sibanki já construiu detectores para a maioria desses vazamentos — mas eles estão espalhados em 5+ módulos que o usuário precisa descobrir sozinho. O custo de não resolver: o produto tem 23 entradas de navegação e nenhuma resposta única à pergunta "o que o Sibanki faz por mim?", o que trava clareza, aquisição e retenção simultaneamente.

O Radar de Vazamento compõe os detectores existentes num único motor de diagnóstico que responde: **"Você está perdendo R$ X/mês. Aqui está o caminho para recuperar."**

## Goals

1. **Clareza:** todo usuário que completa o onboarding vê UM número (vazamento em R$/mês) com detalhamento por fonte — meta: ≥90% dos onboardings completos terminam na tela de diagnóstico.
2. **Valor imediato:** ≥60% dos diagnósticos encontram pelo menos 1 vazamento com valor > R$ 30/mês (se ficar abaixo disso na validação com dados reais, revisar detectores antes de lançar — ver Pré-trabalho).
3. **Ativação:** ≥30% dos usuários diagnosticados executam a primeira ação do "caminho" em 7 dias (ex.: resgatar BCB, cancelar assinatura, marcar dívida para quitação).
4. **Retenção (lagging):** usuários com Open Finance conectado que viram diagnóstico retornam na semana seguinte a uma taxa ≥1,5× a dos que não viram.
5. **Aquisição (fase 2):** landing pública ancorada no radar converte ≥8% de visitantes em cadastros iniciados.

## Non-Goals

1. **Não criar módulo novo na sidebar.** O radar é uma camada de composição sobre módulos existentes — adicionar 24º item de menu destruiria o propósito.
2. **Não construir detectores novos no v1.** Seguro embutido em financiamento e tarifas bancárias invisíveis são P2 — v1 compõe apenas o que já existe.
3. **Não recomendar produtos financeiros no diagnóstico.** O radar diagnostica; ofertas de parceiros (Soluções) só aparecem depois, como resposta opcional a um vazamento — nunca dentro do número.
4. **Não substituir Ld.** Ld continua sendo a métrica de longo prazo (norte); o vazamento é o gancho de entrada e o driver de curto prazo. Os dois convivem: "recupere R$ X/mês → ganhe Y dias de liberdade".
5. **Não fazer diagnóstico 100% sem cadastro.** A versão da landing é um teaser/estimativa; o diagnóstico real exige conta (LGPD + dados via Open Finance).

## User Stories

**Persona A — Apertado (vários cartões, rotativo, escolhe cartão por data):**
- Como usuário endividado, quero ver quanto minhas dívidas caras me custam por mês em relação ao que tenho guardado, para entender o tamanho real do problema.
- Como usuário com vários cartões, quero saber qual cartão usar hoje considerando datas de fechamento, para ganhar prazo sem pagar juros.
- Como usuário diagnosticado, quero um passo único e concreto ("quite primeiro a dívida X"), para não me perder em opções.

**Persona B — Otimizador (paga anuidade, quer benefícios):**
- Como usuário com cartões premium, quero saber quais benefícios eu pago e não uso (sala VIP, seguros, cashback), para decidir se uso ou cancelo.
- Como usuário organizado, quero descobrir assinaturas recorrentes que não uso, para cortá-las.

**Persona C — Conservador (só débito, dinheiro parado):**
- Como usuário sem dívidas, quero saber se tenho dinheiro esquecido em bancos (BCB) e quanto meu dinheiro parado perde para o CDI/inflação, para não sentir que o app "não é para mim".

**Transversais:**
- Como usuário novo, quero terminar o onboarding vendo meu diagnóstico, para entender em 1 tela por que o Sibanki vale meu tempo.
- Como usuário recorrente, quero que o radar rode de novo quando meus dados mudarem, para acompanhar a recuperação ("você já recuperou R$ Z desde que entrou").
- Como usuário sem Open Finance, quero um diagnóstico parcial com os dados manuais que informei, com aviso claro do que a conexão bancária destravaria.

## Requirements

### P0 — Must-Have (v1: motor + onboarding + app)

**R1. Serviço de composição `leakRadarService`** (novo, `functions/services/radar/` ou front em `src/utils/` — decidir; ver Open Questions Q1)
Compõe os detectores existentes num payload único:

| # | Detector | Fonte existente | Tipo de valor |
|---|----------|-----------------|---------------|
| D1 | Dívida cara vs. investimento | `calculateSpread` — vazamento mensal já calculado quando Sg < 0 | R$/mês |
| D2 | Dinheiro esquecido BCB | `valoresAReceberApi` + `users/{uid}.valoresAReceber` | R$ único |
| D3 | Assinaturas/recorrentes suspeitas | `recurrents[]` + transações OF recorrentes sem uso correspondente | R$/mês |
| D4 | Benefícios de cartão não usados | `cardBenefits` + `cardBenefitsCatalog` — cartão com anuidade > 0 e benefícios marcados sem uso | R$/mês (anuidade/12 proporcional) |
| D5 | Cartão errado por data/benefício | `cardSuggestionService` (Sentinela) | informativo v1 (sem R$; ver Q2) |
| D6 | Dinheiro parado perdendo do CDI | saldos em conta × (CDI mensal via `useMarketRates`) − rendimento informado | R$/mês |

Aceite:
- [ ] Retorna `{ totalMonthly, totalOneTime, leaks: LeakItem[] }` onde cada `LeakItem` tem `id, detector, label, valueMonthly|valueOneTime, confidence: 'alta'|'media'|'estimada', actionRoute, actionLabel`
- [ ] Cada detector falha isoladamente sem derrubar o diagnóstico (resultado parcial + flag)
- [ ] Detector sem dados suficientes retorna `locked: true` com o que destravaria (ex.: "conecte Open Finance")
- [ ] Nenhum valor de parceiro/afiliado entra no cálculo do número

**R2. Tela de diagnóstico no fim do onboarding**
Último passo do `RegistrationWizard` (substitui/absorve o atual passo de Valores a Receber, que vira detector D2 dentro do diagnóstico).
Aceite:
- [ ] Mostra número total em destaque (padrão Pierre: hero monocromático), breakdown por vazamento, e 1 ação primária ("Começar pelo maior vazamento")
- [ ] Caso zero vazamentos: mensagem positiva + Ld como métrica ("seu dinheiro está saudável — agora vamos aumentar seus dias de liberdade") — nunca tela vazia
- [ ] Caso sem Open Finance: diagnóstico parcial + card do que a conexão destravaria
- [ ] Ao concluir, persiste snapshot em `users/{uid}.leakRadar` (histórico para "quanto você já recuperou")

**R3. Radar no app (usuários existentes)**
Card de radar na aba Visão do Assistente e no Dashboard (mesma fonte, mesmo componente).
Aceite:
- [ ] Componente único `LeakRadarCard` reutilizado nas duas superfícies
- [ ] Cada vazamento clica para o módulo-resposta (`actionRoute`): D1→`/credito/plano`, D2→link BCB, D3→`/recorrentes`, D4→`/credito/cartoes` (modal benefícios), D6→`/crescimento`
- [ ] Vazamento marcado como resolvido sai do total e entra no acumulado "recuperado"

**R4. Telemetria do funil**
Aceite:
- [ ] Eventos via `platformEvents`: `radar_diagnostico_visto`, `radar_vazamento_clicado`, `radar_acao_concluida`, com valor e detector
- [ ] Métricas dos Goals 1–4 calculáveis a partir desses eventos

### P1 — Nice-to-Have (v2: aquisição)

**R5. Landing pública ancorada no radar.** Rotear landing (reaproveitar/adaptar `LandingPage.tsx`, hoje código morto) com headline "Descubra quanto dinheiro você perde por mês sem perceber" + quiz de 3 perguntas (tem dívida no cartão? paga anuidade? quantas assinaturas?) que gera estimativa genérica → CTA cadastro → diagnóstico real no onboarding.
**R6. Radar recorrente.** Re-execução automática ao sync do Open Finance + push mensal ("seu vazamento mudou: R$ X → R$ Y") via `dailyPushAlerts` infra.
**R7. Sv pré-decisão conectado ao radar.** Sugestão de cartão (D5) com estimativa de R$ ganho por prazo/benefício.

### P2 — Future

**R8. Detector de seguro embutido** (o caso do João): perguntas guiadas sobre financiamentos + extração de contratos → coberturas pagas e não usadas.
**R9. Detector de tarifas invisíveis:** categorização de tarifas bancárias, IOF e juros em transações OF.
**R10. Radar como API multi-tenant** (white-label para parceiros).

## Success Metrics

| Métrica | Tipo | Alvo | Quando avaliar |
|---------|------|------|----------------|
| % onboardings que veem diagnóstico | leading | ≥90% | 2 semanas pós-launch |
| % diagnósticos com ≥1 vazamento > R$ 30/mês | leading | ≥60% | validação pré-launch + 2 semanas |
| Valor mediano detectado | leading | > R$ 100/mês (hipótese a validar) | pré-launch |
| % que executa 1ª ação em 7 dias | leading | ≥30% | 1 mês |
| Retenção semanal OF-conectados com diagnóstico vs. sem | lagging | ≥1,5× | 1–2 meses |
| Conversão landing → cadastro iniciado (P1) | lagging | ≥8% | 1 mês pós-landing |

## Pré-trabalho obrigatório (antes de qualquer tela)

**Validar o tamanho do número.** Rodar os detectores D1–D6 (script ou função de dev) contra os dados reais do João + 2–3 usuários conhecidos. Critério de decisão: se a mediana < R$ 30/mês, reforçar detectores (adiantar D5 com valor ou R9) antes de investir em UI. Isso mata ou confirma a hipótese central com ~1 dia de trabalho.

## Open Questions

- **Q1 (engenharia, bloqueante):** o motor roda no cliente (dados já estão no `IntelligenceContext`; zero custo de function) ou no backend (permite radar recorrente/push e snapshot server-side)? Sugestão: v1 no cliente com persistência do snapshot; mover para function no P1 (R6).
- **Q2 (produto):** como quantificar D5 (cartão por data) em R$? Prazo médio ganho × custo de oportunidade do rotativo? Se a fórmula não for defensável, manter informativo.
- **Q3 (produto):** vazamento "resolvido" é auto-detectado (dívida sumiu no sync) ou marcado manualmente? Sugestão v1: manual com confirmação, auto-detecção no P1.
- **Q4 (design):** o diagnóstico substitui o passo BCB do wizard ou vira passo adicional? Wizard já tem 6 passos — sugestão: substituir, não adicionar.
- **Q5 (legal, não-bloqueante para v1; bloqueante para P1):** quiz na landing coleta dados sensíveis antes do consentimento? Revisar LGPD para a versão pública.

## Timeline Considerations

Sem deadline externo. Faseamento sugerido: **Pré-trabalho** (1 dia) → **v1/P0** (1–2 semanas: motor + tela onboarding + cards + telemetria) → medir 2 semanas → **P1 landing** (1 semana) só se Goals 1–2 validados. Dependências: nenhuma externa; tudo compõe código existente. Regra de escopo: qualquer detector novo proposto durante a implementação vai para o parking lot (P2), não para o v1.

---

*Relacionados: `docs/ANALISE-360-PRODUTO-20260701.md` · `src/utils/sovereigntyEngine.ts` (D1, D6) · `functions/index.js#valoresAReceberApi` (D2) · `functions/services/sentinel/cardSuggestionService` (D5) · `src/constants/cardBenefitsCatalog.ts` (D4) · `src/pages/LandingPage.tsx` (base do R5, hoje sem rota).*
