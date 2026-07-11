# Pipeline State

- **Handoff atual:** 0011
- **Turno:** antigravity
- **Estado:** spec_ready
- **Próxima ação:** João commita a spec 0011 + este STATE e dá o "roda". Antigravity executa `docs/handoffs/HANDOFF-0011-horizonte-painel.md` em `pipe/0011-horizonte-painel` (a partir da main), roda `npm run gate`, escreve o report.
- **Escopo 0011:** Horizonte no Painel (§8.5) — novo `HorizonStrip` (apresentacional: régua dos 15 dias, renda esmeralda + despesa âmbar + janela de ação como vão) + `useHorizonTop` passa a devolver `incomeDate` (aditivo) + mount no Dashboard. REUSO PURO do `anticipationEngine` (nextIncomeDate/daysBetween/HORIZON_DAYS). Motor/Consultor/Radar/HorizonBriefing INTOCADOS. §9: strip só atrela à decisão ativa (item!=null); dia calmo sem timeline. Gate 3=0, sem deploy. Fecha o conjunto do protótipo (Hero+Radar+Horizonte).
- **0010:** CONCLUÍDO — merged na main (commit 7887fb1), gate verde 217, lock free. (Review Claude+CISO = APROVADO.)
- **0009:** CONCLUÍDO (merged 2c46c68). **0008/0007:** CONCLUÍDOS (merged; 0007 c/ deploy).
- **Escopo 0010:** card "No Radar" (§8.2) no Painel via `useHorizonTop` (hook novo) + `RadarCard` (apresentacional dark-glass) + mount no Dashboard, REUSANDO `anticipationEngine`/§9. Motor + Consultor + HorizonBriefing INTOCADOS. Rótulo segue régua §9.3 (sem "AJA ESTA SEMANA"); dia calmo = conquista. Cor de estado por borda/acento, profundidade por Card glow=neutral (Gate 3=0). **Review reforçada Dev+UIUX+Security (CISO valida o §9 "quando falar").** Sem deploy.
- **0009:** CONCLUÍDO — merged na main (commit 2c46c68), gate verde 212, lock free. (Review Claude = APROVADO; ver histórico.)
- **0008:** CONCLUÍDO (merged). **0007:** CONCLUÍDO (merged + deploy pelo João).
- **Descoberta (grounding):** o Painel realizado do screenshot (No-Radar/Horizonte/espectro) é PROTÓTIPO — não está no código. Lógica-base já existe (`sovereigntyScale.ts`, `anticipationEngine.ts`, `HorizonBriefing.tsx`); o que falta é a apresentação no Painel. 0009 faz o espectro; 0010=card No-Radar (anticipationEngine+§9.3), 0011=Horizonte no Painel.
- **0008:** CONCLUÍDO (merged pelo João).
- **0007:** CONCLUÍDO (merged + deploy exercido pelo João).
- **Atualizado em:** 2026-07-11T18:20:00-03:00

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
