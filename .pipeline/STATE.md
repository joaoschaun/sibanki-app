# Pipeline State

- **Handoff atual:** 0017 (sistêmico — largura por tipo)
- **Turno:** free
- **Estado:** merged
- **Próxima ação:** Aguardando a próxima spec de Handoff ser definida pelo João.
- **0016/0015 SUPERSEDED** (não mergear). **0014:** aprovado, entra junto no merge do 0017. **0013/0012…0007:** CONCLUÍDOS.
- **Escopo 0017 (largura por TIPO — §11.6):** helper no App.tsx — telas de LEITURA (Consultor, Configurações, Educação, Perfil) mantêm cap 1180; TODO o resto (dados/funcional) usa `w-full`. Uma decisão, um lugar (o wrapper global L269). + Dashboard container w-full. Conferência visual obrigatória (blast radius: muda a largura de todas as telas de dados); tela que quebrar no full-width volta pro READING set (tunável) e registra no report.
- **Rubric §11.6 codificada:** "Largura do container por tipo de tela — decidida num só lugar" (dados=largura útil; leitura=cap ~1180). Vai junto no commit do João.
- **0015/0016 SUPERSEDED** (não mergear). **0014/0013/0012…0007:** CONCLUÍDOS.
- **RAIZ do vão lateral (achada lendo a cadeia inteira):** App.tsx L269 tem um wrapper GLOBAL `max-w-[1180px] mx-auto` que envolve TODAS as rotas → capava o Painel em 1180 centrado, acima de qualquer w-full/padding abaixo. Por isso 0015 (w-full) e 0016 (padding do main) NÃO reduziram o vão — miravam camada errada.
- **Escopo 0017:** condicionar a className do wrapper (L269) por rota — `/dashboard` solta o teto (`w-full`), demais rotas mantêm o cap de 1180 (legibilidade). `useLocation` já existe no App (L143). Só a className do wrapper + 1 const. + garantir Dashboard container w-full.
- **0015/0016 SUPERSEDED** (não mergear). **0014:** insight no sino — merged. **0013:** Painel v9 — merged.
- **Escopo 0016 (conserto definitivo do espaçamento lateral):** (A) container do Painel `w-full` (absorve o 0015); (B) padding horizontal do `<main>` no App.tsx `lg:p-8`→`lg:px-4` (32→16px) — conteúdo perto das bordas. Só a className do `<main>` no App.tsx (nada de sidebar/nav). Outras páginas são centralizadas → não quebram.
- **0015 (SUPERSEDED):** executou o `w-full`, mas isso fez o conteúdo respeitar o padding do `<main>` e o vão lateral AUMENTAR (hipótese do Claude confirmada pelo João). O 0016 corrige juntando fluido + padding menor. Não mergear o 0015.
- **0014:** insight no sino + largura parcial — merged. **0013:** Painel v9 bento — merged. **0012…0007:** CONCLUÍDOS.
- **Escopo 0015 (correção do 0014):** o teto `max-w-[1360px]` do container do Painel (Dashboard.tsx L352) → `w-full` (fluido). Preenche a largura útil em qualquer estado da sidebar (fim dos gutters laterais que sobraram no 0014). Padding vem do `<main>` do App (intocado). Diff = essencialmente 1 linha. Sem deploy.
- **0014:** CONCLUÍDO (largura parcial + insight no sino) — merged. **0013:** Painel v9 bento — merged. **0012…0007:** CONCLUÍDOS.
- **Escopo 0014 (polimento do Painel, feedback do João olhando o app):** (A) alargar o container do conteúdo (fim dos gutters laterais); (B) tirar o insight (InsightDoDia/"Arquiteto Soberano") do CORPO do Painel → surfacar como notificação no SINO (Header já tem dropdown), reusando a geração existente. §8.1 (insight=CUIDADO, não no Painel) + §9.2. RadarCard (decisão) permanece. Motor/blueprint/Sidebar/App.tsx INTOCADOS. Sem deploy. (Obs: 0014 mudou de "nav-no-topo" para "polimento" a pedido do João; nav-no-topo fica pra depois.)
- **0013:** CONCLUÍDO — Painel v9 (conteúdo bento completo, sidebar mantida) merged.
- **0012/0011/…/0007:** CONCLUÍDOS.
- **Escopo 0013 (Painel v9 — a evolução, não fatia):** a aba Visão geral do Painel vira o bento completo do v8/v9 NA LARGURA DO CONTEÚDO, **mantendo a sidebar** (App.tsx/Sidebar INTOCADOS). 4 cards de módulo novos (ContasConectadas, CreditoEmFormacao c/ "= N dias" §8.3, ParaOndeFoi, FluxoResumo) reusando dados dos contexts; reusa Hero(0012)/Radar/Horizonte. **dashboardBlueprint (Regra de Ouro) INTOCADO** — anatomia v9 = estado saudável, override crítico do blueprint vence. Sem tela cheia, sem trocar nav (isso é outro handoff). Handoff GRANDE, review reforçada Dev+UIUX. Sem deploy.
- **Direção travada com o João:** "v9 = na direção do v8, mas mantendo a sidebar, com layout novo". Mock de referência: outputs/sibanki-v9-sidebar-bento.html + docs/design/mocks/painel.html (v8).
- **0013/0012/0011/…/0007:** CONCLUÍDOS (merged).
- **Escopo 0012 (FATIA 1/5 do v8):** bento do topo do Painel — reorganiza SÓ o slot `sovereignty-hero` (hero compacto + RadarCard lado a lado, HorizonStrip full-width abaixo) + número §8.6a (fino/neutro, tier só no espectro/badge). Props do Hero inalteradas. **buildDashboardBlueprint (adaptativo + Regra de Ouro), sidebar, tabs, coach, editor, coluna direita — INTOCADOS.** Sem nav-no-topo, sem módulos novos, sem remover Arquiteto/SibCoin (isso é 0013-0015). Sem deploy.
- **Roadmap v8 (fatiado):** 0012 bento-topo · 0013 módulos novos (contas/fluxo/crédito) · 0014 nav-no-topo (App-shell, todas as telas) · 0015 SibCoin-na-nav + Arquiteto-sai-do-Painel · 0016 estado-vazio-premium + polimento §11.
- **Rubric:** §8 item 6 (layout Painel v8) + §11 (craft premium) já codificados; mock canônico `docs/design/mocks/painel.html` = v8.
- **0011/0010/0009/0008/0007:** CONCLUÍDOS (merged; trio do protótipo 100% produto).
- **Descoberta (grounding):** o Painel realizado do screenshot (No-Radar/Horizonte/espectro) é PROTÓTIPO — não está no código. Lógica-base já existe (`sovereigntyScale.ts`, `anticipationEngine.ts`, `HorizonBriefing.tsx`); o que falta é a apresentação no Painel. 0009 faz o espectro; 0010=card No-Radar (anticipationEngine+§9.3), 0011=Horizonte no Painel.
- **0008:** CONCLUÍDO (merged pelo João).
- **0007:** CONCLUÍDO (merged + deploy exercido pelo João).
- **Atualizado em:** 2026-07-12T01:42:00-03:00

> Review 0008 (Claude) = **APROVADO** — diff real do commit 9b5504e (pai ee0ba7c4): só os 4
> arquivos do §3; package.json e guard.test.ts intocados (Gate 3 = 0 mantido, glow via canal
> sancionado --si-glow-*); index.css aditivo nos dois temas; Card retrocompatível (default idêntico)
> com surface/glow opcionais; 4 testes; gate verde 209 (205+4). Nit não-bloqueante: testes usam
> (Card as any).render() invez de Testing Library.

> Review 0007 (Claude) = **APROVADO** — diff real extraído do commit 06a6925 (pai a65fb2cd):
> só os 4 arquivos do §3; gate verde 205 testes (199+6); 4 testes antigos intactos; 6 novos
> conforme §4.6; legado preservado (nit benigno: refactor estrutural no addTransfer, comportamento
> idêntico); recorrentesService migrado=batch / legado=arrayUnion, controller intocado. Deploy = gate humano pendente.

> Nota (registro): review do HANDOFF-0006 pelo Claude = **APROVADO** (report conferido
> contra a spec; arquivos do §3 exatos; gate verde 199 testes). A transição
> reviewed→merged do 0006 ficou órfã porque o Claude não commita — João valida
> este registro no commit desta spec (ajuste de fluxo já no backlog).
