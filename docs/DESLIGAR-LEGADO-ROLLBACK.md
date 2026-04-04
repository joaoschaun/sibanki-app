# Desligar o legado com segurança (e rollback)

Este documento resume como trocar o front principal para o app React e o que fazer em caso de rollback.

## 1. Pré‑requisitos antes de trocar o front

- **Build React atualizado**: `npm run build` deve gerar um `dist/` válido.
- **Sintaxe do legado ok**: `npm run syntax-check` precisa passar, garantindo que `public/app/app.js` não está quebrado.
- **Testes E2E básicos**:
  - `npm test` (ou pelo menos `npm run test:smoke` e `npm run test:fluxo`).
  - `npm run test:compare` para garantir paridade visual entre legado (`/app`) e React (raiz) em staging.
- **Staging saudável**:
  - `npm run deploy:staging`.
  - Validar manualmente os fluxos principais na URL de staging:
    - Login / logout.
    - Dashboard, Lançamentos, Contas, Cartões, Orçamento, Crescimento (incluindo Análise B3 e simuladores), Social, Perfil, Configurações.

## 2. Estratégia de troca de front (Firebase Hosting)

Hoje:
- Target **`app`**: serve `public/` (legado) com rewrites para `/app/**` e raiz.
- Target **`staging`**: serve `dist/` (React) na raiz.

Estratégia recomendada:

1. **Manter staging como canário**:
   - Continue usando `hosting:staging` como ambiente de validação completa do React.
2. **Criar um target separado só para o legado (opcional)**:
   - Se ainda não houver, separar no `firebase.json` o hosting do legado em um subdomínio (ex.: `legacy-...web.app`) para manter um fallback mesmo após a troca.
3. **Atualizar `firebase.json` para que o target principal sirva `dist/`**:
   - Apontar o hosting principal (atual `app`) para `dist` em vez de `public`.
   - Manter rewrites adequados (`**` → `/index.html`) para que o React funcione como SPA.
4. **Deploy controlado**:
   - Rodar `npm run deploy:app` **apenas quando**:
     - Staging estiver estável.
     - Testes e comparação visual ok.

## 3. Manter fallback do legado

Mesmo após a troca:

- **Não apague `public/app/` nem o código legado imediatamente.**
- Mantenha uma rota/ferramenta interna que permita:
  - Testar o legado em produção (`https://virtus-financeiro-cd7bd.web.app/app`).
  - Opcionalmente, servir o legado em um subdomínio separado (novo target de hosting), só para suporte/rollback emergencial.

## 4. Plano de rollback rápido

Se, após a troca, surgir um problema grave no React (ex.: bug crítico em fluxo de Lançamentos ou falha de carregamento):

1. **Paulo de fogo**: documentar rapidamente o problema (print, steps).
2. **Rollback simples**:
   - Voltar o target principal de Hosting a servir `public/` em vez de `dist/` (reverter alterações de `firebase.json` ou usar uma versão anterior do arquivo).
   - Rodar novamente `npm run deploy:app`.
3. **Dados intactos**:
   - Como o backend é o mesmo (`users/{uid}` no Firestore default), nenhum dado é perdido ao alternar entre React e legado.
4. **Correção e nova tentativa**:
   - Corrigir o bug no React.
   - Validar em staging e só então repetir o processo de troca do front.

## 5. Comunicação com usuários

- Antes de desligar o legado:
  - Incluir um aviso discreto no app atual (legado) sugerindo “Use o novo app” quando o React estiver estável.
- Após a troca:
  - Manter mensagem em algum lugar de Configurações/Perfil explicando que o visual foi atualizado, mas os dados e a segurança permanecem os mesmos.

