# WhatsApp Business (Meta Cloud API) — Sibanki

MVP: receber mensagens de texto no WhatsApp, extrair lançamento (IA + regex) e gravar no Firestore; resposta automática.

## O que foi implementado

1. **Backend (Cloud Functions)**
   - `whatsappWebhook`: HTTP GET (verificação do Meta) e POST (recebimento de mensagens).
   - `generateWhatsAppCode`: callable para o app gerar código de 6 dígitos e vincular número ao usuário.
   - Serviço `services/whatsapp/whatsappService.js`: parser com Gemini + fallback regex, `addEntryToUser`, `sendWhatsAppText`.

2. **App (Configurações)**
   - Seção "WhatsApp": gerar código, instruções para enviar no WhatsApp, estado "WhatsApp vinculado" / desvincular.

3. **Fluxo**
   - Usuário em Configurações > WhatsApp > Gerar código.
   - Envia o código de 6 dígitos para o número do Sibanki no WhatsApp.
   - Backend associa o número ao `uid` e grava em `users/{uid}.whatsappPhone`.
   - Mensagens seguintes: parser extrai tipo, valor, descrição, categoria; grava em `users/{uid}.entries`; responde ex.: "Lancei: - R$ 120,00 em Supermercado (Alimentação)."

## Variáveis de ambiente (Firebase / .env)

| Variável | Descrição |
|----------|------------|
| `WHATSAPP_TOKEN` | Token de acesso da API do WhatsApp (Meta). Obrigatório para enviar respostas. |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número de telefone no Meta (Phone Number ID). Usado para enviar mensagens. |
| `WHATSAPP_VERIFY_TOKEN` | String que você define; o Meta envia no GET de verificação. Padrão: `sibanki_wa_verify`. |
| `GEMINI_KEY` | Chave do Gemini (já usada no app). Usada para extrair lançamento do texto (fallback: regex). |

Configurar no Firebase:

```bash
firebase functions:config:set whatsapp.token="SEU_TOKEN" whatsapp.phone_number_id="ID_DO_NUMERO" whatsapp.verify_token="sibanki_wa_verify"
```

Ou em `.env` (emulador / local):

```
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=sibanki_wa_verify
GEMINI_KEY=...
```

**Nota:** O `config.js` atual lê apenas `process.env`. Para usar `functions.config()` no WhatsApp, é preciso adicionar o mesmo padrão usado em BRAPI/Gemini (ler de config se env não estiver definido).

## Meta / Facebook Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com) e crie ou use um app.
2. Adicione o produto **WhatsApp** > **API Setup**.
3. Obtenha:
   - **Token temporário** (ou token permanente via App Review): use em `WHATSAPP_TOKEN`.
   - **Phone number ID**: em "From" (número de teste ou número conectado), use em `WHATSAPP_PHONE_NUMBER_ID`.
4. Em **Configuration** > **Webhook**:
   - **Callback URL:** `https://REGION-PROJECT.cloudfunctions.net/whatsappWebhook` (substitua REGION e PROJECT).
   - **Verify Token:** o mesmo valor de `WHATSAPP_VERIFY_TOKEN` (ex.: `sibanki_wa_verify`).
   - Assine **messages** (e opcionalmente outros).
5. Número de teste: adicione seu número em "To" para receber mensagens de teste sem aprovação.

## Firestore

- **whatsappCodes/{code}**: `uid`, `expiresAt`, `createdAt` — códigos de vinculação (6 dígitos); apagado após uso.
- **users/{uid}**: campo `whatsappPhone` (string do número, ex.: 5511999999999) quando vinculado.

## Deploy

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:whatsappWebhook,functions:generateWhatsAppCode
```

Depois de configurar o webhook no Meta, envie uma mensagem de teste para o número do Sibanki; se estiver vinculado, envie por exemplo "Gastei 50 no mercado" e verifique o lançamento no app e a resposta no WhatsApp.
