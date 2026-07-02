# Deploy em ambiente de testes (staging)

Use o site **staging** para testar mudanças antes de publicar no domínio principal.

## 1. Criar o site "staging" no Firebase (só uma vez)

1. Abra: [Firebase Console → Hosting](https://console.firebase.google.com/project/virtus-financeiro-cd7bd/hosting)
2. Clique em **"Adicionar outro site"** / **"Add another site"**
3. **ID do site:** use exatamente `staging-13a0b` (já criado neste projeto)
4. Confirme com **"Criar site"** / **"Create site"** (se ainda não existir)

URL do ambiente de testes (site **staging-13a0b**):
- `https://staging-13a0b.web.app`
- ou `https://staging-13a0b--virtus-financeiro-cd7bd.web.app` (veja no Console)

## 2. Deploy para testes (staging)

Na pasta do projeto:

```bash
npm run deploy:staging
```

ou:

```bash
firebase deploy --only hosting:staging
```

O app de testes fica na URL do site **staging** (veja no Console após o primeiro deploy).

## 3. Deploy para produção (domínio principal)

Só depois de validar no staging:

```bash
npm run deploy:app
```

ou:

```bash
firebase deploy --only hosting:app
```

## 4. Subdomínio próprio (opcional)

Para usar algo como `staging.seudominio.com`:

1. No Firebase Console → Hosting, selecione o site **staging-13a0b**
2. **"Conectar domínio"** / **"Add custom domain"**
3. Informe o subdomínio (ex.: `staging.seudominio.com`)
4. Siga as instruções para adicionar os registros no seu provedor de DNS (TXT e A/CNAME)

---

**Resumo:** sempre que fizer mudanças (ex.: IA, regras, UI), faça primeiro `npm run deploy:staging`, teste na URL do staging e só então rode `npm run deploy:app`.
