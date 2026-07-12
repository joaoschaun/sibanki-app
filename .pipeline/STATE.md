# Pipeline State

- **Handoff atual:** 0012
- **Turno:** claude
- **Estado:** report_ready
- **Próxima ação:** Claude reviews the report in .pipeline/reports/HANDOFF-0012.report.md and diff, then sets Turno=joao and Estado=reviewed.
- **Escopo 0012 (FATIA 1/5 do v8):** bento do topo do Painel — reorganiza SÓ o slot `sovereignty-hero` (hero compacto + RadarCard lado a lado, HorizonStrip full-width abaixo) + número §8.6a (fino/neutro, tier só no espectro/badge). Props do Hero inalteradas. **buildDashboardBlueprint (adaptativo + Regra de Ouro), sidebar, tabs, coach, editor, coluna direita — INTOCADOS.** Sem nav-no-topo, sem módulos novos, sem remover Arquiteto/SibCoin (isso é 0013-0015). Sem deploy.
- **Roadmap v8 (fatiado):** 0012 bento-topo · 0013 módulos novos (contas/fluxo/crédito) · 0014 nav-no-topo (App-shell, todas as telas) · 0015 SibCoin-na-nav + Arquiteto-sai-do-Painel · 0016 estado-vazio-premium + polimento §11.
- **Rubric:** §8 item 6 (layout Painel v8) + §11 (craft premium) já codificados; mock canônico `docs/design/mocks/painel.html` = v8.
- **0011/0010/0009/0008/0007:** CONCLUÍDOS (merged; trio do protótipo 100% produto).
- **Escopo 0011:** Horizonte no Painel (§8.5) — novo `HorizonStrip` (apresentacional: régua dos 15 dias, renda esmeralda + despesa âmbar + janela de ação como vão) + `useHorizonTop` passa a devolver `incomeDate` (aditivo) + mount no Dashboard. REUSO PURO do `anticipationEngine` (nextIncomeDate/daysBetween/HORIZON_DAYS). Motor/Consultor/Radar/HorizonBriefing INTOCADOS. §9: strip só atrela à decisão ativa (item!=null); dia calmo sem timeline. Gate 3=0, sem deploy. Fecha o conjunto do protótipo (Hero+Radar+Horizonte).
- **0010:** CONCLUÍDO — merged na main (commit 7887fb1), gate verde 217, lock free. (Review Claude+CISO = APROVADO.)
- **0009:** CONCLUÍDO (merged 2c46c68). **0008/0007:** CONCLUÍDOS (merged; 0007 c/ deploy).
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
