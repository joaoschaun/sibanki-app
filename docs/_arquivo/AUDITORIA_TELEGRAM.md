# Auditoria: Telegram bot

> Gerada em 26/04/2026. Cobre `functions/telegramBot.js` (~933 linhas).
>
> Telegram bot recebe mensagens em texto livre e cria entries financeiras.
> Webhook é endpoint público — bug de validação aqui = qualquer um forja
> mensagens em nome de qualquer usuário vinculado.

---

## Achados

### TLG-1 — Webhook NÃO valida origem (CRÍTICO) — FECHADO

**Antes:** `exports.telegramWebhook = functions.https.onRequest(...)` aceitava
qualquer POST na URL pública. Telegram envia secret_token via header
`X-Telegram-Bot-Api-Secret-Token` quando configurado em `setWebhook`, mas
o handler ignorava.

**Cenário de ataque:** atacante descobre a URL do webhook (logs públicos,
dorking, etc.) e envia:
```json
POST /telegramWebhook
Content-Type: application/json

{
  "message": {
    "chat": { "id": 123456789 },  // chatId de outro usuário
    "from": { "username": "victim" },
    "text": "/lancar 100000 hack"
  }
}
```
O handler executa o comando como se fosse a vítima — entry de R$ 100.000
criado via `parseLancamentoRegex` + `tryLancamentoNatural` (validateEntry
no fluxo permite até R$ 1B no servidor).

**Fix aplicado:**
- Nova env `TELEGRAM_WEBHOOK_SECRET` em `config.js`.
- Webhook valida `X-Telegram-Bot-Api-Secret-Token` no início.
- Em DEV (`NODE_ENV=development` ou `SIBANKI_ALLOW_UNSAFE_WEBHOOK=1`), libera
  para testes locais.
- Sem env configurada em prod: retorna 503 (fail-CLOSED) com log explícito
  apontando o problema.

**Setup operacional:** ao registrar webhook no Telegram:
```bash
curl "https://api.telegram.org/bot$TELEGRAM_TOKEN/setWebhook" \
  -d "url=https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/telegramWebhook" \
  -d "secret_token=<MESMO_VALOR_DA_ENV>"
```
E configurar a env:
```bash
firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET
```

---

### TLG-3 — `linkCode` não é deletado após uso (ALTO) — FECHADO

**Antes:** `getUserByLinkCode` checava `expiresAt` mas o doc em
`telegramCodes/{code}` continuava ali até expirar. Mesmo código vincula
múltiplas vezes (não-bloqueia, mas inconsistente — abre janela de race).

**Fix aplicado:** após vincular com sucesso, `db.collection("telegramCodes").doc(code).delete()`. Try/catch para não bloquear o usuário se o delete falhar.

---

### TLG-4 — `chatId` pode ser sequestrado (ALTO) — FECHADO

**Antes:** `handleStart` aplicava o `update` em `users/{user.uid}` sem
verificar se aquele `chatId` já estava vinculado a OUTRO uid.

**Cenário:** atacante consegue um linkCode legítimo de uma conta SEM Telegram
vinculado (via XSS, social engineering, ou sniffing); abre o bot no SEU
próprio Telegram (chatId já em uso por OUTRA conta atacada antes); vincula.
Resultado: o `chatId` agora está em 2 documentos `users/`. Mensagens
direcionadas via `getUserByChatId` retornam o primeiro (`limit(1)` arbitrário).

**Fix aplicado:** antes do update, `getUserByChatId(chatId)` checa se já existe
algum vínculo. Se sim e for outro uid → bloqueia com mensagem clara.

---

### TLG-6 — `where("telegramChatId", "!=", "")` ignora campos undefined (MÉDIO) — FECHADO

**Antes:** mesmas 3 ocorrências de `checkPriceAlerts`, `dailyNews`,
`weeklyReport`. Firestore `!=` exige existência do campo — usuários antigos
sem o campo NUNCA entram nos schedules.

**Fix aplicado:** trocado para `where(..., ">", "")` + filtro defensivo
pós-get. `replace_all` aplicado nas 3 ocorrências.

---

### TLG-2 — Output `parse_mode: "HTML"` sem escape em todos os paths (MÉDIO) — PENDÊNCIA

**Onde:** `sendMessage` usa `parse_mode: "HTML"`. Vários handlers ecoam
inputs do usuário (descrição de lançamento, ticker, query) sem escape.
Se Telegram client renderizar tag `<a>` ou `<script>`, há risco visual.

**Fix recomendado:** helper `escapeHtmlForTelegram(s)` que faz `&` → `&amp;`,
`<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, antes de embutir em mensagem.

**Custo:** ~30min.

---

### TLG-5 — Sem rate limit por chatId (MÉDIO) — PENDÊNCIA

**Onde:** `telegramWebhook`. Spam de mensagens dispara muitas chamadas
Gemini (handlePerguntaIA) — drena custo.

**Fix recomendado:** usar `chatRateLimiter` genérico (criado no SEG-12) com
`uid` mapeado de `getUserByChatId`. Para mensagens não-vinculadas, rate por
`chatId` direto.

**Custo:** ~1h.

---

### TLG-7 — `parseLancamentoRegex` cria entry sem cap explícito (BAIXO) — PENDÊNCIA

**Onde:** linhas 583-604. Regex extrai valor do texto livre. `validateEntry`
no front cobre cap de 1B mas o backend regrava direto via Admin SDK
(bypass das rules Firestore). Sem cap explícito aqui, valor maluco
(`R$ 999999999`) vai direto.

**Fix recomendado:** cap de R$ 1.000.000 explícito em `parseLancamentoRegex`
com warning log.

**Custo:** 30min.

---

## Resumo

| ID | Severidade | Status |
|---|---|---|
| TLG-1 | CRÍTICO | ✅ Fechado |
| TLG-3 | ALTO | ✅ Fechado |
| TLG-4 | ALTO | ✅ Fechado |
| TLG-6 | MÉDIO | ✅ Fechado |
| TLG-2 | MÉDIO | Pendência (escape HTML) |
| TLG-5 | MÉDIO | Pendência (rate limit) |
| TLG-7 | BAIXO | Pendência (cap em regex) |

**Risco residual:** baixo. TLG-1 era a porta da frente aberta — agora está
fechada. As pendências são polish.

---

## Recomendação operacional

1. **Antes de fazer deploy:** registrar o webhook no Telegram com `secret_token` e
   configurar a env `TELEGRAM_WEBHOOK_SECRET` com o mesmo valor (comando no
   bloco TLG-1 acima). Sem isso, todas as mensagens passam a retornar 503 e
   o bot para de funcionar.

2. **Auditoria retroativa:** se TLG-1 esteve aberto em produção, vale rodar
   query no Firestore por entries com `_provider` ausente OU criadas em
   horários estranhos (madrugada, feriados) com valores fora do padrão do
   usuário. Possível abuso histórico.

3. **TLG-4 fix bloqueia "religação":** se um usuário legítimo trocar de número
   Telegram (mesmo chatId, novo plan), agora precisa `/desconectar` na conta
   antiga antes. Documentar em FAQ.
