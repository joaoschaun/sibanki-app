# _legacy — arquivos antigos preservados (não usar)

Pasta para guardar código legado fora do caminho de build/deploy, mantendo o
histórico recuperável sem poluir a raiz.

## Conteúdo
- `index.js.cloud-functions-legado` — monólito de Cloud Functions **antigo** (fev/2026),
  que vivia na **raiz** do repositório. Foi **substituído por `functions/index.js`**
  (o `firebase.json` declara `"functions": { "source": "functions" }`, então este
  arquivo nunca era deployado). Movido para cá na limpeza de 17/06/2026.

## Regra
Nada aqui é importado, buildado ou deployado. **Não edite nem leia como verdade.**
Mantido só por segurança histórica — pode ser apagado quando o João confirmar.
