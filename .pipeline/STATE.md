# Pipeline State

- **Handoff atual:** 0009
- **Turno:** antigravity
- **Estado:** spec_ready
- **Próxima ação:** (1) João faz merge de pipe/0008 na main [PRÉ-REQUISITO do 0009] + commita a spec 0009 + este STATE, e dá o "roda". (2) Antigravity executa `docs/handoffs/HANDOFF-0009-hero-espectro.md` em `pipe/0009-hero-espectro` (a partir da main pós-0008), roda `npm run gate`, escreve o report.
- **Escopo 0009:** SovereigntyHero em Dark-Glass (superfície elevada da fundação 0008) + novo `FreedomSpectrum` (§10.3 espectro de tiers) + ordem/segmento aditivos em `sovereigntyScale.ts`. **Props/caller INALTERADOS** (Dashboard.tsx fora do diff). SEM card "No Radar" nem Horizonte (0010/0011), SEM deploy, Gate 3 mantido.
- **Descoberta (grounding):** o Painel realizado do screenshot (No-Radar/Horizonte/espectro) é PROTÓTIPO — não está no código. Lógica-base já existe (`sovereigntyScale.ts`, `anticipationEngine.ts`, `HorizonBriefing.tsx`); o que falta é a apresentação no Painel. 0009 faz o espectro; 0010=card No-Radar (anticipationEngine+§9.3), 0011=Horizonte no Painel.
- **0008:** review Claude = APROVADO (diff 9b5504e; ver nota abaixo). Aguarda merge do João.
- **0007:** CONCLUÍDO (merged + deploy exercido pelo João).
- **Escopo 0008:** fundação Dark-Glass ADITIVA — tokens de profundidade (`--si-surface-grad`/
  `--si-glass`/`--si-elev`/`--si-glow-*`) nos dois temas + utilities + variantes opcionais
  `surface`/`glow` no `Card`, retrocompatível. SEM rebuild de tela (isso é 0009+), SEM dependência
  nova (nada de shadcn — estende os primitivos existentes), SEM deploy. Gate 3 MANTIDO em 0
  (glow via canal sancionado `--si-glow-*`, não `shadow-{hue}` inline).
- **0007:** CONCLUÍDO (merged + deploy exercido pelo João).
- **Atualizado em:** 2026-07-11T00:00:00-03:00

> Review 0008 (Claude) = **APROVADO** — diff real do commit 9b5504e (pai ee0ba7c4): só os 4
> arquivos do §3; package.json e guard.test.ts intocados (Gate 3 = 0 mantido, glow via canal
> sancionado --si-glow-*); index.css aditivo nos dois temas; Card retrocompatível (default idêntico)
> com surface/glow opcionais; 4 testes; gate verde 209 (205+4). Nit não-bloqueante: testes usam
> (Card as any).render() em vez de Testing Library.

> Review 0007 (Claude) = **APROVADO** — diff real extraído do commit 06a6925 (pai a65fb2cd):
> só os 4 arquivos do §3; gate verde 205 testes (199+6); 4 testes antigos intactos; 6 novos
> conforme §4.6; legado preservado (nit benigno: refactor estrutural no addTransfer, comportamento
> idêntico); recorrentesService migrado=batch / legado=arrayUnion, controller intocado. Deploy = gate humano pendente.

> Nota (registro): review do HANDOFF-0006 pelo Claude = **APROVADO** (report conferido
> contra a spec; arquivos do §3 exatos; gate verde 199 testes). A transição
> reviewed→merged do 0006 ficou órfã porque o Claude não commita — João valida
> este registro no commit desta spec (ajuste de fluxo já no backlog).
