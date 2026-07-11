# Pipeline State

- **Handoff atual:** 0007 — **CONCLUÍDO** (merged + deploy exercido pelo João).
- **Turno:** joao
- **Estado:** idle — rubric v2 pronta, 0008 destravado
- **Próxima ação:** João commita a rubric v2 (`docs/DESIGN-SYSTEM-RUBRIC.md` + `docs/design/mocks/{painel,credito,consultor}.html`). Depois, Claude escreve HANDOFF-0008 (Fase 0 fundação shadcn + tokens de profundidade §10 + Dashboard piloto), executado pelo Antigravity. Backend intocado, sem deploy. Bloqueio anterior (código do Lovable) RESOLVIDO — o norte visual foi desenhado no próprio repo (mocks v4-v6 → rubric §10), sem dependência do Lovable.
- **Nota (loosening de ratchet):** a rubric v2 revisa o Gate 3 (glow) de "colorido=0" para "fora-de-estado-ou-dado=0". É um afrouxamento DELIBERADO de ratchet (normalmente só cai) — ciência do fundador registrada. A mudança do teste em si vive no HANDOFF-0008 (código).
- **Atualizado em:** 2026-07-10T10:30:00-03:00

> Review 0007 (Claude) = **APROVADO** — diff real extraído do commit 06a6925 (pai a65fb2cd):
> só os 4 arquivos do §3; gate verde 205 testes (199+6); 4 testes antigos intactos; 6 novos
> conforme §4.6; legado preservado (nit benigno: refactor estrutural no addTransfer, comportamento
> idêntico); recorrentesService migrado=batch / legado=arrayUnion, controller intocado. Deploy = gate humano pendente.

> Nota (registro): review do HANDOFF-0006 pelo Claude = **APROVADO** (report conferido
> contra a spec; arquivos do §3 exatos; gate verde 199 testes). A transição
> reviewed→merged do 0006 ficou órfã porque o Claude não commita — João valida
> este registro no commit desta spec (ajuste de fluxo já no backlog).
