# Migração para React – sem perder nada

## Princípio

- **Dados:** continuam no mesmo Firebase (projeto `virtus-financeiro-cd7bd`) e no **mesmo Firestore (default)**. Documento `users/{uid}` com `entries`, `accountBalances`, `accounts`, `cards`, `goals`, `budgets`, etc. **Nada é apagado nem duplicado.**
- **Auth:** mesmo Firebase Auth (email/senha, Google). Nenhum login anônimo.
- **Funcionalidades:** cada tela do app atual ganha uma versão em React. Até lá, o app antigo (`public/`) continua disponível (ex.: em uma rota ou subpath).

## O que não se perde

| Área | Onde está hoje | Na migração |
|------|----------------|-------------|
| Lançamentos | `entries[]` em `users/{uid}` | React lê/escreve o mesmo doc |
| Contas e saldos | `accountBalances`, `accounts`, `accountMeta` | Idem |
| Cartões | `cards[]` | Idem |
| Metas, orçamento, calendário | `goals`, `budgets`, `orcamentosByMonth` | Idem |
| Investimentos, Raio X | `investments` + Cloud Functions (brapiQuote) | React chama as mesmas Functions |
| Consultor IA, insights | Cloud Functions (chatApi, proactiveInsightApi) | Idem |
| Comunidade, Credi Amigo, Consórcio | `commProfile`, `commPosts`, dados em Firestore | Migrar telas e ler mesmo modelo |
| Perfil, avatar | `users/{uid}` + Storage `avatars/` | Idem |

## Estratégia em fases

### Fase 1 – Base (sem trocar o app atual)
- Adicionar no repo: `src/` com React, Vite, TypeScript, Tailwind.
- Rotas: `/` (Dashboard), `/lancamentos` (Transações), etc.
- Firebase: **mesmo** `firebaseConfig` do app atual; Firestore **default** (sem `firestoreDatabaseId` do AI Studio).
- Auth: email/senha + Google (como hoje), sem anônimo.
- Hook `useFinancialData`: ler do documento **único** `users/{uid}` (entries, accountBalances, score derivado, etc.) em vez de coleções separadas.
- Build: `vite build` gera `dist/`. Opção A: Hosting passa a servir `dist/` (React vira o app principal). Opção B: servir React em `/app` e manter `public/` na raiz durante a transição.

### Fase 2 – Migrar tela a tela
Ordem sugerida (pode ajustar):
1. Dashboard (resumo, KPIs, widgets)
2. Lançamentos (lista, filtros, add/edit/delete)
3. Contas (lista de contas, saldos)
4. Cartões (carrossel, faturas)
5. Metas, Orçamento, Calendário
6. Investimentos + Raio X (chamar brapiQuote)
7. Consultor IA (chatApi, proactiveInsightApi)
8. Educação, Família, Credi Amigo, Consórcio, Comunidade
9. Perfil (avatar, nome, ajustes)

Cada tela: criar página + componentes em React que leem/escrevem os **mesmos** campos no Firestore e chamam as **mesmas** Cloud Functions quando fizer sentido.

### Fase 3 – Trocar o front único
- Hosting passa a servir só o build React (ou redireciona raiz para o React).
- App antigo (`public/`) fica em backup ou só para fallback; usuários usam só o React.

## Onde fica cada coisa no repo

```
virtus-financeiro/
├── public/                 # App atual (mantido até fim da migração)
│   └── app/
├── src/                    # Novo app React
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── store/
│   ├── services/
│   ├── App.tsx
│   └── main.tsx
├── firebase.json           # Hosting: decidir se serve dist/ ou public/
├── package.json            # Scripts: dev (Vite), build (Vite), deploy (Firebase)
└── docs/
    └── MIGRACAO-REACT.md   # Este arquivo
```

## Resumo

- **Sim, dá para migrar para essa estrutura e modelo sem perder nada:** dados e auth continuam iguais; só a “casca” (HTML/JS) vira React, tela a tela.
- **Não perdemos:** nenhum dado, nenhuma funcionalidade; no máximo desativamos o app antigo quando o React tiver tudo que você usa.
