# AGENTS.md — regras universais para qualquer IA editando o Sibanki

> Este arquivo é a **fonte única de verdade** sobre como qualquer agente de IA
> deve se comportar dentro deste repositório. Vale para Claude (Cowork), Cursor
> (IDE), Antigravity, Codex, ou qualquer ferramenta futura.
>
> **Quem lê isto:** Cursor (via `.cursorrules`), Claude Cowork (via `CLAUDE.md`),
> Antigravity (via `.cursor/rules/antigravity-pipeline.mdc`).
>
> Se você é um agente de IA e está vendo este arquivo, **leia-o por inteiro
> antes de editar qualquer linha de código**. Tem ~150 linhas e te economiza
> retrabalho.

---

## 0. Regra de ouro

> **Nada que toque dinheiro, regra Firestore ou config de deploy entra em main
> sem PR humano aprovado pelo João.** "Tocar dinheiro" inclui: SibCoin, cashback,
> billing/Stripe, webhooks de afiliado, Open Finance, Cloud Functions de pagamento.

Tudo o mais que segue serve essa regra.

---

## 1. Antes de qualquer edição

1. Leia o `CLAUDE.md` na raiz para o contexto atual do produto.
2. Leia `docs/INVENTARIO-COMPLETO-SISTEMA.md` quando for mexer em módulo
   já existente (a regra `.cursor/rules/inventario.mdc` exige isso).
3. Verifique o status no `docs/TASK_QUEUE.md` — se houver tarefa atribuída a
   você (`status: WAITING_CURSOR` para Cursor, `WAITING_ANTIGRAVITY` ou
   `CLAUDE_REVIEWING` para Claude), respeite o pipeline (`.cursor/rules/pipeline.mdc`).
4. Rode `git status` mentalmente: se a árvore estiver suja com mudanças do João,
   **NÃO commite junto** — peça que ele commite ou faça stash primeiro.

---

## 2. Estado atual do projeto (pinned em 26/04/2026)

- **Produção:** React SPA em `dist/` é a produção atual (cutover concluído em
  abril/2026). O legado em `public/app/` ainda está deployado em
  `hosting:legado` como fallback de rollback, **mas não é alvo de novas features**.
- **Stack:** React 18 + TypeScript + Vite + TailwindCSS v4 + Firebase
  (Firestore + Hosting + Functions Node 22).
- **Região default Cloud Functions:** `southamerica-east1`. Exceções
  documentadas (ex: `valoresAReceberApi` em `us-central1`).
- **Estado:** dados financeiros vêm de `AppContext` + `IntelligenceContext`
  (Context API). NÃO crie novos `onSnapshot` direto em página/hook — use o
  contexto. Zustand é usado em `src/store/useUiStore.ts` para UI state apenas.

> Há regras em `.cursor/rules/global.mdc` que dizem "use Zustand, evite Context API
> para dados financeiros". Essa regra está desatualizada e contradiz o código real.
> Se houver conflito, **AGENTS.md vence**.

---

## 3. Convenções de código

### 3.1 TypeScript

- `tsconfig.json` está em `strict: true`. Mantenha.
- **Não use `as any` nem `: any`** sem comentário justificativo. Hoje há ~115
  ocorrências em 39 arquivos — não cresça esse número. Quando for inevitável,
  marcar com `// FIXME(any): <razão>`.
- Quando o tipo apertar, prefira `unknown` + narrowing em vez de `any`.
- `@ts-ignore` está liberado apenas com comentário `// @ts-ignore — <motivo>`.

### 3.2 React

- Componentes funcionais com hooks. Nada de class components.
- Páginas em `src/pages/`, lazy-loaded em `App.tsx`. Cada `<Route>` envolve seu
  componente em `<ErrorBoundary>` — se você adicionar uma rota nova, **NÃO esqueça** disso.
- Componentes em `src/components/<dominio>/<Componente>.tsx`. Não despeje tudo
  em `src/components/ui/`.
- Estilo: Tailwind v4. Sem CSS-in-JS, sem CSS modules. Variáveis em `index.css`
  (CSS vars `--si-*`).

### 3.3 Cloud Functions

- Estilo de export: `exports.fnName = functions.https.onCall(async (data, context) => …)`.
  Estamos pinados em `firebase-functions ^4.5.0` (sintaxe v1).
- **Sempre** valide `context.auth` no início de callable. Sempre.
- **Sempre** valide o input antes de gravar no Firestore. Use `services/validators.ts`
  no front e checagens server-side complementares.
- **Nunca confie em `data.uid`** — use `context.auth.uid` quando o callable opera
  sobre os dados do próprio usuário. Quando o callable opera sobre OUTRO usuário
  (admin → user), valide claims explicitamente E leia `data.uid` validando que
  é string não-vazia.
- Webhooks (`onRequest` sem auth Firebase) **devem** validar secret na primeira
  linha. Política: **fail-CLOSED** se secret não estiver configurado.
- Logs estruturados: use `logEvent`, `logError`, `logWarn`, `timer` de
  `functions/logger.js`. Não use `console.log` direto (tudo bem para CLI scripts).

### 3.4 Firestore

- Regras em `firestore.rules` cobrem schema validation para `users/{uid}` e
  `entriesOverflow`. Quando criar nova subcoleção em `users/{uid}/<x>/`, ADICIONE
  regra explícita em vez de depender do wildcard `{subCollection}/{docId}`.
- Multi-tenant: o path canônico para dados novos é
  `tenants/{tenantId}/users/{userId}/...`. O path legado `users/{uid}` ainda
  existe em paralelo durante o rollout — qualquer coleção nova vai SÓ no path
  multi-tenant.
- Nunca exponha `apiKey`/secret no cliente. A `apiKey` do Firebase Web SDK em
  `src/firebase.ts` é pública por design (segurança = rules + Auth + App Check).

### 3.5 Tamanho de arquivo

- Componente/página > 800 linhas é red flag. Quebre antes de adicionar mais.
- Cloud Function que cresce além de 50 linhas dentro de `functions/index.js`:
  mover para `functions/services/<dominio>/`.
- `functions/index.js` deve idealmente ser apenas registro de exports.
  Hoje tem 1500+ linhas — não amplifique o problema.

---

## 4. Convenções de commit / branch / PR

- **Branches:**
  - `main` — produção. Push direto **só** para hotfix urgente, com aprovação humana.
  - `feature/<curto>` — features novas.
  - `fix/<curto>` — bug fixes.
  - `audit/<topico>` — auditorias e refatorações estruturais (ex: `audit/fase-1-2`).
  - `refactor/<topico>` — refatorações sem mudança de comportamento.
- **Commits:** Conventional Commits — `feat(escopo): …`, `fix(escopo): …`,
  `refactor(escopo): …`, `chore(escopo): …`, `docs(escopo): …`, `test(escopo): …`,
  `security(escopo): …` (este último para os tópicos `SEG-*` da auditoria).
- **Mensagem:** primeiro linha < 80 chars. Se houver detalhe, parágrafo após
  linha em branco.
- **PR:** título igual ao commit principal. Descrição lista arquivos tocados
  e por quê. Linka issue/auditoria quando aplicável.
- **Sem `git commit -A` cego** — sempre `git add` específico. Working tree
  é compartilhado entre humano + IAs.

---

## 5. Quem faz o quê (matriz IA × responsabilidade)

| Domínio | Cursor (IDE) | Claude Cowork | Antigravity | João |
|---|---|---|---|---|
| UI / componentes < 300 linhas | ✅ executa | revisa | escreve tarefa | aprova PR |
| Hooks novos | ✅ executa | revisa | escreve tarefa | aprova PR |
| Refator de hook/contexto | revisa | ✅ executa | escreve tarefa | aprova PR |
| Cloud Functions novas | ⚠️ só com tarefa | ✅ executa | escreve tarefa | aprova PR |
| Edição de `firestore.rules` | ❌ | ✅ executa | escreve tarefa | aprova obrigatório |
| Edição de `firebase.json`, `package.json`, `tsconfig.json` | ❌ | ⚠️ com aviso | ✅ | aprova obrigatório |
| Migrações de dados (`scripts/migrate-*`) | ❌ | ⚠️ só dry-run | ✅ | executa (`--execute`) |
| Deploy (`firebase deploy ...`) | ❌ | ❌ | ✅ | ✅ |
| Edição de `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/*` | ❌ | ⚠️ propõe diff | ✅ | aprova obrigatório |

Legenda: ✅ pode fazer · ⚠️ pode com condição · ❌ NÃO faz.

> Quando estiver em dúvida: pergunte ao João antes. O custo de perguntar é zero;
> o custo de bagunçar produção financeira é alto.

---

## 6. Defesas obrigatórias antes de mexer em dinheiro

Antes de qualquer alteração em código que credita SibCoin, processa pagamento,
ou move dinheiro real:

1. Leia o caminho completo do dado: callable → service → Firestore → audit log.
2. Garanta idempotência (use `contratoId`/`transaction_id`/`externalId`).
3. Garanta auditoria (gravar `actorUid` quando o caller for diferente do alvo).
4. Verifique secret/auth na primeira linha — fail-closed em prod.
5. Adicione teste para o caso feliz E para "secret ausente"/"input inválido".

Os achados SEG-* da auditoria de 26/04/2026 estão em `docs/AUDITORIA_FASE_1_2.md`.
Se for mexer em algum desses pontos, leia o ID antes.

---

## 7. Limites duros

- **Deploys:** Antigravity está autorizado a rodar `firebase deploy ...` sob instrução/autorização direta do João no chat.
- **Nunca** rode `npm install` solto — use `npm ci` se precisar reinstalar.
  `package-lock.json` é commitado e canônico.
- **Nunca** edite `functions/.env` ou variáveis de produção. Para configurar
  segredo: `firebase functions:secrets:set NOME` (manual, pelo João).
- **Nunca** delete ou edite arquivos em `playwright/.auth/` ou `screenshots/`.
- **Nunca** apague `docs/SESSION_HANDOFF.md` — é estado vivo de sessão entre IAs.

---

## 8. Onde escrever histórico de sessão

- **Histórico estável** (decisões arquiteturais, mudanças permanentes): `CLAUDE.md`.
- **Changelog incremental** (features fechadas, bugs corrigidos por sessão):
  `docs/CHANGELOG.md` (formato Keep a Changelog).
- **Estado vivo da sessão atual** (entre handoffs IA): `docs/SESSION_HANDOFF.md`.
- **Tarefas em fila**: `docs/TASK_QUEUE.md`.

NÃO acumule narrativa de sessão dentro do `CLAUDE.md` — isso já aconteceu e
fez o arquivo passar de 600 linhas. CLAUDE.md fica enxuto; CHANGELOG é onde
o tempo passa.

---

## 9. Atualização deste arquivo

`AGENTS.md` é editado raramente. Cada mudança aqui é tratada como mudança de
contrato — precisa de aprovação humana e nota no `docs/CHANGELOG.md` na seção
`### Changed — Governança IA`.

Versão atual: `1.1` — atualizada em 06/06/2026 sob autorização direta do João (matriz atualizada para autorizar deploy por Antigravity).
