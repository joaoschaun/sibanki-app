# Caixa-postal do Pipeline (Relatórios de Handoff)

Este diretório armazena os relatórios de execução de cada especificação de handoff. O fluxo de caixa-postal funciona da seguinte forma:

1. **Claude (Especificador/Revisor):** Escreve a especificação de handoff em `docs/handoffs/HANDOFF-<NNNN>-<slug>.md` e atualiza o arquivo [.pipeline/STATE.md](file:///c:/Users/jscha/virtus-financeiro/.pipeline/STATE.md) com `Turno=antigravity` e `Estado=spec_ready`.
2. **Antigravity (Executor):** Adquire o lock de execução, realiza o trabalho mecânico na branch correspondente, escreve o relatório de encerramento em `.pipeline/reports/HANDOFF-<NNNN>.report.md` seguindo o template, atualiza o [.pipeline/STATE.md](file:///c:/Users/jscha/virtus-financeiro/.pipeline/STATE.md) para `Turno=claude` e `Estado=report_ready`, e libera o lock.
3. **Claude:** Lê o relatório em `.pipeline/reports/HANDOFF-<NNNN>.report.md`, confere o diff, realiza as validações de design/compliance necessárias, e atualiza o estado para `Turno=joao` e `Estado=reviewed`.
4. **João (Gatilho e Gate Humano):** Realiza a homologação manual final (gate obrigatório se a alteração tocar em dinheiro, regras do Firestore ou deploys), faz o merge da branch para `main`, e limpa o estado para `Estado=merged` e `Turno=idle`.

Com este fluxo, a comunicação de escopo e status é feita de forma assíncrona e versionada diretamente no repositório, dispensando a colagem de textos extensos no chat.
