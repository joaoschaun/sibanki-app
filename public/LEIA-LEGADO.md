# ⚠ PASTA LEGADO — NÃO É A PRODUÇÃO

Esta pasta (`public/`) é o alvo de deploy **`hosting:legado`** (site Firebase
`sibanki-legado`), mantido apenas como **fallback/rollback**. O conteúdo aqui é um
**build React congelado e antigo** — não reflete o app atual.

## Onde está a versão atual
- **App de produção:** `src/` → `npm run build` → `dist/` → `hosting:app` → **https://sibanki.com.br**
- **Cloud Functions atuais:** `functions/index.js`
- **Painel admin atual:** `src/admin/` (deploy separado `hosting:admin`), não o `public/admin/` daqui.

## Para o Claude / qualquer dev
- **Não leia arquivos desta pasta como fonte de verdade.**
- **Não edite nada aqui** esperando que mude o app — não muda.
- Só mexa em `public/` se for explicitamente atualizar o deploy de fallback `legado`.

_Marcador criado na auditoria/limpeza de 17/06/2026._
