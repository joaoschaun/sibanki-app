# Pipeline Lock & Execution Guard

Esta pasta gerencia o lock de execução mecânica do repositório, garantindo que apenas um executor (seja o Antigravity ou o Claude) realize alterações por vez na base de código do Sibanki, conforme especificado em `docs/PIPELINE-DESIGN.md`.

## Regras de Execução

1. **Um Executor por Vez:** A execução de qualquer tarefa não-trivial só é iniciada se o arquivo `EXECUTION.lock.md` estiver no estado `free`.
2. **Ciclo do Lock:**
   - O executor (ou o humano) altera o estado de `EXECUTION.lock.md` para `busy`, preenchendo as informações de executor, branch e handoff.
   - O trabalho é realizado em uma branch dedicada.
   - Após a validação (passando pelo `npm run gate` e review), o merge é feito e o lock é retornado para `free`.
3. **Convenção de Branches:** As branches de execução do pipeline devem seguir o formato:
   `pipe/<NNNN>-<slug>` (onde `<NNNN>` é o número do handoff e `<slug>` é a identificação curta da tarefa).

## Como Ativar os Git Hooks Locais

Para ativar o bloqueio mecânico que impede pushes quando o gate falhar localmente, execute o seguinte comando na raiz do projeto:

```bash
git config core.hooksPath .githooks
```

Isso fará com que o Git passe a executar o script de hook localizado em `.githooks/pre-push` sempre que você tentar fazer um push de branches, executando as checagens un-skippable automaticamente.
