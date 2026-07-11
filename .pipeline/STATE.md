# Pipeline State

- **Handoff atual:** 0008
- **Turno:** claude
- **Estado:** report_ready
- **Próxima ação:** Claude reviews the report in .pipeline/reports/HANDOFF-0008.report.md and diff, then sets Turno=joao and Estado=reviewed.
- **Escopo 0008:** fundação Dark-Glass ADITIVA — tokens de profundidade (`--si-surface-grad`/
  `--si-glass`/`--si-elev`/`--si-glow-*`) nos dois temas + utilities + variantes opcionais
  `surface`/`glow` no `Card`, retrocompatível. SEM rebuild de tela (isso é 0009+), SEM dependência
  nova (nada de shadcn — estende os primitivos existentes), SEM deploy. Gate 3 MANTIDO em 0
  (glow via canal sancionado `--si-glow-*`, não `shadow-{hue}` inline).
- **0007:** CONCLUÍDO (merged + deploy exercido pelo João).
- **Atualizado em:** 2026-07-10T23:36:00-03:00

> Review 0007 (Claude) = **APROVADO** — diff real extraído do commit 06a6925 (pai a65fb2cd):
> só os 4 arquivos do §3; gate verde 205 testes (199+6); 4 testes antigos intactos; 6 novos
> conforme §4.6; legado preservado (nit benigno: refactor estrutural no addTransfer, comportamento
> idêntico); recorrentesService migrado=batch / legado=arrayUnion, controller intocado. Deploy = gate humano pendente.

> Nota (registro): review do HANDOFF-0006 pelo Claude = **APROVADO** (report conferido
> contra a spec; arquivos do §3 exatos; gate verde 199 testes). A transição
> reviewed→merged do 0006 ficou órfã porque o Claude não commita — João valida
> este registro no commit desta spec (ajuste de fluxo já no backlog).
