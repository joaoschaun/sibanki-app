# Documentação para investidores — doc-investidor.web.app

Esta pasta contém a documentação completa do Sibanki para apresentação a possíveis investidores.

- **Conteúdo:** `index.html` — documento único com visão geral, módulos, diferenciais, comparativo, modelo financeiro, roadmap e proposta de investimento.
- **URL após deploy:** https://doc-investidor.web.app

## Deploy

Na raiz do projeto:

```bash
npm run deploy:doc-investidor
```

Ou:

```bash
firebase deploy --only hosting:doc-investidor
```

Para alterar o conteúdo, edite o `index.html` nesta pasta e rode o deploy novamente.
