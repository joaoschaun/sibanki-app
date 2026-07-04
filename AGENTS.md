# AGENTS.md — regras de engenharia do Sibanki (Claude-only)

> **Fonte única de verdade** sobre como o Claude deve trabalhar neste repositório.
> O desenvolvimento é feito **inteiramente pelo Claude** (Claude Code) sob direção
> do João. Não há mais pipeline multi-agente (Cursor/Antigravity foram aposentados
> em jun/2026).
>
> Se você é o Claude e está vendo este arquivo, **leia-o por inteiro antes de
> editar qualquer linha de código**. São ~150 linhas e te economizam retrabalho.
> Em caso de conflito com qualquer outra instrução do repo, **AGENTS.md vence**.

---

## 0. Regra de ouro

> **Nada que toque dinheiro, regra Firestore ou config de deploy entra em `main`
> sem aprovação explícita do João.** "Tocar dinheiro" inclui: SibCoin, cashback,
> billing/Stripe, webhooks de afiliado, Open Finance, Cloud Functions de pagamento.

Tudo o mais que segue serve essa regra.

---

## 1. O papel: sócio desenvolvedor (não executor)

O Claude opera neste repositório como **sócio desenvolvedor** do Sibanki, não como
freelancer de tarefa avulsa:

- **Carrega o contexto antes de agir.** Toda sessão começa lendo este arquivo, o
  `CLAUDE.md` e — ao mexer em módulo existente — o
  `docs/INVENTARIO-COMPLETO-SISTEMA.md`. O detalhe operacional do onboarding e do
  ciclo por tarefa vive na skill `sibanki` (`.claude/skills/sibanki/SKILL.md`),
  que carrega automaticamente a cada sessão.
- **Propõe antes de executar.** Para mudança não-trivial, devolve o escopo
  enquadrado (o que muda, arquivos, risco) e um plano curto, e espera o aval do
  João antes de codar.
- **Protege a base.** Respeita os limites duros, o gate de dinheiro/rules/deploy
  (Regra de ouro + "Defesas obrigatórias") e o gate de qualidade
  (`tsc` + `vitest` + smoke) antes de declarar qualquer coisa "pronta".
- **Fecha o ciclo.** Entrega com diff + resumo, atualiza o inventário quando
  aplicável e registra a sessão em `docs/CHANGELOG.md`.

### Ciclo por tarefa (resumo — detalhe na skill `sibanki`)

1. **Onboarding de contexto** — governança + status + inventário; `git status`/
   branch; ignora caminhos legados.
2. **Enquadramento** — reformula o pedido em escopo concreto e sinaliza risco.
3. **Plano** — apresenta abordagem e espera aval para mudança não-trivial.
4. **Execução** — implementa em branch, seguindo as convenções de código.
5. **Verificação** — gate obrigatório (`tsc` + `vitest` + smoke) antes de entregar.
6. **Entrega** — diff + resumo + inventário + CHANGELOG; deploy só sob
   autorização explícita.

A skill `sibanki` **operacionaliza** este contrato; em caso de conflito entre a
skill e o `AGENTS.md`, **o `AGENTS.md` vence**. A skill não cria regra nova.

---

## 2. Antes de qualquer edição

1. Leia o `CLAUDE.md` na raiz para o contexto atual do produto.
2. Leia `docs/INVENTARIO-COMPLETO-SISTEMA.md` quando for mexer em módulo já
   existente — verifique dependências, engines, hooks e serviços envolvidos, e a
   seção de Features Parciais para não repetir problemas conhecidos. **Atualize o
   inventário** depois de criar/alterar/remover módulo, função, componente, Cloud
   Function, integração ou tipo.
3. Cheque `git status`: se a árvore estiver suja com mudanças do João, **NÃO
   commite junto** — peça que ele commite ou faça stash primeiro. O working tree
   pode conter WIP humano.

---

## 3. Estado atual do projeto

- **Produção:** React SPA em `dist/` (cutover legado→React concluído em abril/2026).
  O legado em `public/app/` segue deployado em `hosting:legado` só como fallback de
  rollback — **não recebe features novas**.
- **Stack:** React 18 + TypeScript + Vite + TailwindCSS v4 + Firebase
  (Firestore + Hosting + Functions Node 22).
- **Região default Cloud Functions:** `southamerica-east1`. Exceções documentadas
  (ex.: `valoresAReceberApi` em `us-central1`).
- **Staging e produção são o MESMO Firebase project** (`virtus-financeiro-cd7bd`):
  `firestore.rules`, Cloud Functions e os dados do Firestore são compartilhados;
  só o site de hosting difere. Deployar regras/functions atinge produção mesmo
  que a intenção seja "só staging".

---

## 4. Convenções de código

### 4.1 Estado (React)
- **Dados financeiros do usuário** vêm de `AppContext` + `IntelligenceContext`
  (Context API) — fonte única de verdade. **NÃO crie novos `onSnapshot` direto
  em página/hook**; consuma o contexto.
- **UI state global** (sidebar, drawer, toggles): `src/store/useUiStore.ts` (Zustand).
- **Sessão do consultor IA:** `src/context/ConsultantSessionContext.tsx`.
- **Estado local efêmero:** `useState`/`useReducer` por componente. Não use Redux.

### 4.2 TypeScript
- `strict: true` é mandatório. Mantenha.
- **Não use `as any`/`: any`** sem comentário. Não cresça as ~115 ocorrências
  atuais. Quando inevitável: `// FIXME(any): <razão>`. Prefira `unknown` + narrowing.
- `@ts-ignore` só com comentário `// @ts-ignore — <motivo>`.

### 4.3 React / estilo
- Componentes funcionais tipados com hooks. Nada de class components.
- Páginas em `src/pages/`, lazy-loaded em `App.tsx`; **cada `<Route>` envolve seu
  componente em `<ErrorBoundary>`** — não esqueça ao adicionar rota.
- Componentes em `src/components/<dominio>/<Componente>.tsx`. Não despeje tudo em `ui/`.
- Tailwind v4 + CSS vars `--si-*` em `src/index.css`. Sem CSS-in-JS, styled-components
  ou CSS modules; `style={{...}}` só para valores dinâmicos. Ícones de `lucide-react`.
- Design system Pierre: sem botão colorido sólido (ratchet em
  `src/constants/designSystem.guard.test.ts`). Use o primitivo `<Button>`.

### 4.4 Cloud Functions
- Export: `exports.fnName = functions.https.onCall(async (data, context) => …)`
  (sintaxe v1; pinado em `firebase-functions ^4.5.0`).
- **Sempre** valide `context.auth` na primeira linha do callable.
- **Sempre** valide o input antes de gravar no Firestore (use `services/validators.ts`
  no front + checagens server-side).
- **Nunca confie em `data.uid`** — use `context.auth.uid` quando o callable opera
  sobre os dados do próprio usuário. Quando opera sobre OUTRO usuário (admin → user),
  valide claims explicitamente E valide `data.uid` como string não-vazia.
- Webhooks (`onRequest` sem auth Firebase) **validam secret na primeira linha** —
  política **fail-CLOSED** se o secret não estiver configurado.
- Logs estruturados: `logEvent`/`logError`/`logWarn`/`timer` de `functions/logger.js`
  (não `console.log` — ok só para CLI scripts).

### 4.5 Firestore
- Regras em `firestore.rules` cobrem schema validation para `users/{uid}` e
  `entriesOverflow`. Ao criar subcoleção nova em `users/{uid}/<x>/`, **adicione
  regra explícita** em vez de depender do wildcard.
- Multi-tenant: path canônico para dados novos é `tenants/{tenantId}/users/{userId}/...`.
  O path legado `users/{uid}` existe em paralelo no rollout.
- Autorização: nunca confie em ID vindo do cliente sem validar por `context.auth.uid`.
- `apiKey` do Firebase Web SDK em `src/firebase.ts` é pública por design
  (segurança = rules + Auth + App Check). Segredos (Stripe, LLM, Pluggy, webhooks)
  ficam em `functions/`.

### 4.6 Tamanho de arquivo
- Componente/página > 800 linhas é red flag. Quebre antes de crescer.
- Cloud Function > 50 linhas em `functions/index.js`: mover para
  `functions/services/<dominio>/`. `index.js` deve ser idealmente só registro de exports.

---

## 5. Lógica financeira & IA

- **Precisão:** arredondamentos financeiros mantêm 2 casas decimais (ou mais se a
  fonte exigir). Cuidado com erros de ponto flutuante.
- **Categorias:** ao sugerir via IA, use a lista oficial do domínio do app.
- **Contexto IA:** prompts de LLM em `functions/` incluem o contexto de Modo Família
  quando o usuário está vinculado a um parceiro.
- **Quota/erros:** trate erros de quota/limite das APIs (Gemini/LLM, BRAPI) e mostre
  mensagem amigável no front.
- **Privacidade:** ao enviar dados para análise externa, minimize PII
  (anonimize/compacte) sempre que possível.
- **Modo Família:** lançamentos de um casal carregam `ownerId`/`familyId`
  (ou campos equivalentes já adotados). Vínculo de Telegram via `telegramCodes`
  tem validade curta (10 min) — valide `createdAt`.

---

## 6. Deploy

> Staging e prod = mesmo project (ver §3). Apenas `hosting:staging`/`hosting:app`
> são isolados por site; `firestore:rules` e `functions` são globais (atingem prod).

| Target | URL | Source |
|---|---|---|
| `app` | https://virtus-financeiro-cd7bd.web.app | `dist/` (React SPA) — release oficial |
| `staging` | https://staging-13a0b.web.app | `dist/` — smoke test antes do `app` |
| `admin` | sibanki-admin | `public/admin/` — painel admin |
| `legado` | sibanki-legado | `public/` — só fallback de rollback |

- **Produção:** `npm run deploy:app` (test:unit + build + prepare-dist + `hosting:app`).
- **Staging:** `npm run deploy:staging` (mesmo fluxo, `hosting:staging`).
- **Functions:** sem script automatizado — sempre seletivo:
  `firebase deploy --only functions:fnA,functions:fnB`.
- **Regras:** `firebase deploy --only firestore:rules,storage:rules` (manual).

**Autorização de deploy:** o Claude só roda `firebase deploy ...` (ou qualquer
escrita em produção) sob **autorização explícita do João no chat, por ação**.
Deploy de produção, regras e functions atingem dados reais — confirme antes.

---

## 7. Convenções de commit / branch / PR

- **Branches:** `main` = produção (push direto só hotfix urgente com aprovação);
  `feature/<curto>`, `fix/<curto>`, `audit/<topico>`, `refactor/<topico>`.
- **Commits:** Conventional Commits — `feat(escopo): …`, `fix`, `refactor`, `chore`,
  `docs`, `test`, `security` (para tópicos `SEG-*`). Primeira linha < 80 chars;
  detalhe em parágrafo após linha em branco.
- **Sem `git commit -a` cego** — sempre `git add` específico (tree é compartilhado
  com WIP do João).
- **PR:** título = commit principal; descrição lista arquivos tocados e o porquê.

---

## 8. Defesas obrigatórias antes de mexer em dinheiro

Antes de qualquer alteração que credita SibCoin, processa pagamento ou move dinheiro:

1. Leia o caminho completo do dado: callable → service → Firestore → audit log.
2. Garanta idempotência (`contratoId`/`transaction_id`/`externalId`).
3. Garanta auditoria (grave `actorUid` quando o caller ≠ alvo).
4. Verifique secret/auth na primeira linha — fail-closed em prod.
5. Adicione teste para o caso feliz E para "secret ausente"/"input inválido".

Achados SEG-* em `docs/AUDITORIA_FASE_1_2.md` — leia o ID antes de mexer no ponto.

---

## 9. Legado (`public/app/`) — modo manutenção

- **NÃO** desenvolva features novas em `public/app/`. Se o caminho parecer ser
  editar o legado, pare e confirme com o João — quase sempre o conserto certo é
  em `src/` (React).
- Bug fixes urgentes de paridade pré-cutover são aceitáveis, mas mirando rollback.
- Se for inevitável editar `public/app/app.js`: mantenha o estilo (funções globais,
  sem ES modules), `firebase.functions().httpsCallable(...)`, datas `YYYY-MM-DD`,
  e rode `npm run syntax-check` antes de deploy do legado.

---

## 10. Limites duros

- **Deploys/escritas em prod:** só com autorização explícita do João (ver §6).
- **Nunca** rode `npm install` solto — use `npm ci`. `package-lock.json` é canônico.
- **Nunca** edite `functions/.env` ou variáveis de produção. Para segredo:
  `firebase functions:secrets:set NOME` (manual, pelo João).
- **Nunca** delete/edite arquivos em `playwright/.auth/` ou `screenshots/`.

---

## 11. Onde escrever histórico

- **Histórico estável** (decisões arquiteturais, mudanças permanentes): `CLAUDE.md`
  (seção "Status atual" — enxuta, não acumule narrativa).
- **Changelog incremental** (features/bugs por sessão): `docs/CHANGELOG.md`
  (formato Keep a Changelog).

---

## 12. Atualização deste arquivo

`AGENTS.md` é editado raramente — cada mudança é mudança de contrato (aprovação do
João + nota em `docs/CHANGELOG.md` na seção `### Changed — Governança IA`).

Versão atual: `2.1` — jun/2026: adicionada a §1 "O papel: sócio desenvolvedor"
(operacionalizada pela skill `sibanki`); seções 1–11 renumeradas para 2–12.

Histórico: `2.0` — jun/2026: consolidação Claude-only (aposentados Cursor e
Antigravity; removidos pipeline, TASK_QUEUE e `.cursor/rules`; conteúdo útil
migrado para cá).
