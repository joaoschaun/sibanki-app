# Firebase App Check — Checklist de ativação

> **Atualização 10/06/2026 (Ação #5 — Análise 360):** o React SPA agora
> inicializa App Check automaticamente quando `VITE_APPCHECK_SITE_KEY` está
> definida no build (`src/firebase.ts`, dynamic import de `firebase/app-check`).
> Plano de ativação em 2 fases:
> 1. Criar chave reCAPTCHA v3 → `VITE_APPCHECK_SITE_KEY` em `.env.production`
>    → `npm run deploy:app` → validar em App Check → Metrics (modo Monitoring).
> 2. `ENFORCE_APP_CHECK=true` nas Functions (secret/env) → deploy das callables
>    → tráfego sem token passa a ser rejeitado.

O App Check protege as Cloud Functions (em especial a `chatApi`) contra abuso: só requisições do seu app (com token válido) são aceitas.

## 1. Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com) → seu projeto (virtus-financeiro-cd7bd).
2. No menu lateral: **App Check**.
3. Clique em **Registrar** (ou **Get started**).
4. Na seção **Apps**, selecione seu **app Web** (ou adicione um se ainda não existir).
5. Escolha o provedor **reCAPTCHA v3** (recomendado para web).
6. Se ainda não tiver uma chave reCAPTCHA v3:
   - Acesse [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin).
   - Crie um site com **reCAPTCHA v3**, domínios do seu app (ex.: `virtus-financeiro-cd7bd.web.app`, `localhost` para testes).
   - Copie a **Site key** (chave do site).
7. No App Check, cole a **Site key** e salve.
8. Em **Enforcement** (Aplicação), você pode:
   - Deixar em **Monitoring** primeiro (não rejeita; só registra) para validar.
   - Depois mudar para **Enforced** para Cloud Functions (ou usar a variável `ENFORCE_APP_CHECK` nas Functions, veja abaixo).

## 2. Cliente (app Web)

1. O script já está carregado: `firebase-app-check-compat.js`.
2. A ativação já está no código (após `firebase.initializeApp`), desde que a chave esteja definida:
   ```js
   if (typeof firebase.appCheck !== 'undefined' && window.APP_CHECK_RECAPTCHA_SITE_KEY) {
     firebase.appCheck().activate(window.APP_CHECK_RECAPTCHA_SITE_KEY, { isTokenAutoRefreshEnabled: true });
   }
   ```
3. Defina a chave no seu app. Opções:
   - **Build / deploy:** definir uma variável global antes do script principal, por exemplo no `index.html` (ou no seu bundler):
     ```html
     <script>window.APP_CHECK_RECAPTCHA_SITE_KEY = "SUA_SITE_KEY_RECAPTCHA_V3";</script>
     ```
   - Ou injetar via ambiente no build (ex.: `process.env.VITE_APP_CHECK_SITE_KEY` e usar no HTML/JS).
4. Teste em produção (ou em staging): abra o app, use o Consultor (FAB); no Console do navegador não deve aparecer erro de App Check. No Firebase Console → App Check → Metrics, você pode ver se os tokens estão sendo emitidos.

## 3. Cloud Functions (backend)

1. No código, a `chatApi` já usa:
   ```js
   const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";
   const chatApiOptions = enforceAppCheck ? { enforceAppCheck: true } : {};
   exports.chatApi = functions.runWith(chatApiOptions).https.onCall(...);
   ```
2. Para **ativar** a exigência de App Check na `chatApi`:
   - Defina a variável de ambiente das Functions:
     ```bash
     firebase functions:config:set appcheck.enforce="true"
     ```
     e no código leia `functions.config().appcheck?.enforce === "true"` **ou**
   - Use variável de ambiente no deploy (Firebase normalmente usa `.env` ou Secrets). Ex.: no seu ambiente de deploy, defina `ENFORCE_APP_CHECK=true`.
3. **Importante:** assim que `enforceAppCheck: true` estiver ativo, toda chamada à `chatApi` **sem** token válido do App Check será rejeitada. Garanta que o cliente já está enviando o token (passo 2) antes de ativar.

## 4. Ordem recomendada

1. Registrar o app no App Check com reCAPTCHA v3 e obter a Site key.
2. Colocar a Site key no cliente (`APP_CHECK_RECAPTCHA_SITE_KEY`) e fazer deploy.
3. Deixar enforcement em **Monitoring** no Console (ou **sem** `ENFORCE_APP_CHECK=true`) e usar o app normalmente por alguns dias; conferir em App Check → Metrics se os tokens aparecem.
4. Ativar enforcement: definir `ENFORCE_APP_CHECK=true` (ou equivalente) nas Functions e fazer deploy.
5. Opcional: estender `runWith({ enforceAppCheck: true })` a outras callables sensíveis (ex.: que cobram ou consomem IA).

## 5. Troubleshooting

- **Erro "App Check token invalid" ou chamada rejeitada:** confira se a Site key no cliente é a mesma do app registrado no App Check e se o domínio está autorizado no reCAPTCHA.
- **Em desenvolvimento local:** você pode usar o [Debug Token do App Check](https://firebase.google.com/docs/app-check/web/debug-provider) no Console e no cliente para não precisar de reCAPTCHA em localhost.
- **Firebase Functions:** é necessário `firebase-functions` >= 4.x para `enforceAppCheck` em callable. O projeto já usa 4.5.0.
