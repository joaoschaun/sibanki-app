# Handoff Specifications (Specs)

Esta pasta contém as especificações executáveis (Specs) de handoff. Cada arquivo representa uma tarefa que foi planejada, deliberada e entregue a um executor (geralmente o Antigravity) para implementação no repositório.

## Ciclo de Vida de um Handoff

1. **Ideação & Deliberação:** O comitê de agentes discute o pedido do humano (conforme `docs/PIPELINE-DESIGN.md`).
2. **Criação da Spec:** O Claude gera o arquivo de especificação em `docs/handoffs/HANDOFF-<NNNN>-<slug>.md` usando o template `HANDOFF-TEMPLATE.md`.
3. **Revisão Humana:** O João revisa a especificação e aprova (colocando seu aval no chat).
4. **Execução:**
   - O executor adquire o lock no `.pipeline/EXECUTION.lock.md`.
   - Cria-se a branch `pipe/<NNNN>-<slug>`.
   - O executor realiza apenas as edições listadas na seção **Arquivos-alvo** da spec.
5. **Gates:** O gate mecânico (`npm run gate`) roda para validar tipos e testes.
6. **Entrega & Fechamento:** O Claude revisa o diff contra a spec. O merge é feito para a branch principal (com aval do João se envolver dinheiro/rules/deploy) e o lock é liberado.

Para criar uma nova especificação, utilize o arquivo [HANDOFF-TEMPLATE.md](file:///c:/Users/jscha/virtus-financeiro/docs/handoffs/HANDOFF-TEMPLATE.md) como ponto de partida.
