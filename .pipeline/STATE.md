# Pipeline State

- **Handoff atual:** 0013
- **Turno:** joao
- **Estado:** reviewed
- **Review 0013 (Claude) = APROVADO** — diff real main..pipe/0013 (commit c17da83): 4 cards novos (Contas/Credito/ParaOndeFoi/Fluxo) + Dashboard; App.tsx/Sidebar/blueprint/motor/Radar/Horizonte/Hero/guard TODOS fora do diff (sidebar mantida, Regra de Ouro viva); visao_geral = isCritical?blueprint:bento-v9 (anatomia §8 item 6); Crédito com §8.3 (reaisToFreedomDays "≈ N dias de liberdade"); estados vazios = convite calmo §9.2; dados reais dos contexts; cor só estado/categoria, Gate 3=0 (barras via style p/ não ferir Gate 1); gate verde 234 (226+8). Radar agora empilhado c/ ParaOndeFoi (some o quadrão vazio). Sem nits. Próxima ação: João faz merge de pipe/0013 na main + commita. Sem deploy.
- **Escopo 0013 (Painel v9 — a evolução, não fatia):** a aba Visão geral do Painel vira o bento completo do v8/v9 NA LARGURA DO CONTEÚDO, **mantendo a sidebar** (App.tsx/Sidebar INTOCADOS). 4 cards de módulo novos (ContasConectadas, CreditoEmFormacao c/ "= N dias" §8.3, ParaOndeFoi, FluxoResumo) reusando dados dos contexts; reusa Hero(0012)/Radar/Horizonte. **dashboardBlueprint (Regra de Ouro) INTOCADO** — anatomia v9 = estado saudável, override crítico do blueprint vence. Sem tela cheia, sem trocar nav (isso é outro handoff). Handoff GRANDE, review reforçada Dev+UIUX. Sem deploy.
- **Direção travada com o João:** "v9 = na direção do v8, mas mantendo a sidebar, com layout novo". Mock de referência: outputs/sibanki-v9-sidebar-bento.html + docs/design/mocks/painel.html (v8).
- **0012/0011/…/0007:** CONCLUÍDOS (merged).
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
