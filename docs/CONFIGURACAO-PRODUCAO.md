# Configuração de Produção — Passos Manuais

> Itens que exigem acesso ao Firebase Console ou configuração manual.

---

## 1. DEEPSEEK_KEY (LLM fallback)

O serviço de IA (`functions/services/llm/llmService.js`) usa DeepSeek como fallback quando Gemini/Claude estão indisponíveis.

### Passos:

1. Acesse https://platform.deepseek.com/api_keys
2. Crie uma nova API Key
3. No Firebase Console:
   - Vá em **Project Settings → Service accounts** → ou use o CLI:
   ```bash
   firebase functions:secrets:set DEEPSEEK_KEY
   ```
   - Cole a chave quando solicitado
4. Verifique que `functions/config.js` já lê `process.env.DEEPSEEK_KEY`
5. Redeploy: `firebase deploy --only functions`

### Validação:
```bash
# Testar via curl (substitua YOUR_TOKEN pelo idToken do Firebase Auth)
curl -X POST https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/chatApi \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"message":"Qual a melhor forma de investir R$1000?"}}'
```

---

## 2. VAPID_KEY (FCM Web Push)

Necessário para que o hook `usePushNotifications.ts` consiga registrar tokens FCM no navegador.

### Passos:

1. Acesse o **Firebase Console** → Project Settings → **Cloud Messaging**
2. Na seção **Web Push certificates**, clique em **Generate key pair**
3. Copie a chave pública (VAPID key) gerada
4. Crie o arquivo `.env` na raiz do projeto (ou atualize o existente):
   ```
   VITE_VAPID_KEY=BPxx...sua_chave_aqui
   ```
5. Rebuild e redeploy:
   ```bash
   npx vite build
   npm run deploy:staging
   ```

### Validação:
1. Abra https://staging-13a0b.web.app
2. Faça login
3. Vá em **Configurações → Notificações e integrações**
4. Clique em "Ativar notificações push"
5. Aceite a permissão do navegador
6. Verifique no Firestore → `users/{uid}` → campo `fcmTokens` (deve ter um token)

---

## 3. Variáveis de Ambiente para Testes

Para rodar os testes Playwright com credenciais reais:

```bash
# PowerShell
$env:TEST_EMAIL="seu_email@example.com"
$env:TEST_SENHA="sua_senha"
npx playwright test --project=react-smoke
```

```bash
# Bash/Linux
TEST_EMAIL=seu_email@example.com TEST_SENHA=sua_senha npx playwright test --project=react-smoke
```

---

## 4. Stripe (já configurado)

- `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` já estão ativos
- Webhook endpoint: `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/stripeWebhook`

## 5. Pluggy / Open Finance (já configurado)

- `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` ativos
- Funções: `pluggyCreateConnectToken`, `pluggySyncAccounts`

## 6. WhatsApp Cloud API (já configurado)

- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` ativos
- Webhook: `whatsappWebhook`

## 7. Resend Email (já configurado)

- `RESEND_API_KEY` ativo
- Usado em: `weeklySummary`, `sendFamilyInviteEmail`, `sendVerificationEmail`
