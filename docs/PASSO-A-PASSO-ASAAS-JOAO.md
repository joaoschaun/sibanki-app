# PASSO A PASSO — ATIVAR O ASAAS (guia para o João, sem pressa, ~20 min)

> Tudo que está em caixa de código você **copia e cola inteiro** no PowerShell
> e aperta Enter. Faça na ordem. Se algo der errado, pare e veja a seção
> "Se der problema" no final.

---

## PARTE 0 — Abrir o terminal no lugar certo (1 min)

1. Abra a pasta `C:\Users\jscha\virtus-financeiro` no Explorador de Arquivos.
2. Clique na **barra de endereço** (onde aparece o caminho), digite `powershell` e aperte Enter.
3. Vai abrir uma janela azul/preta já dentro da pasta do projeto. É aqui que você cola os comandos.

Teste se o Firebase está logado:

```powershell
firebase projects:list
```

- **Se aparecer** `virtus-financeiro-cd7bd` na lista → ok, siga.
- **Se pedir login** → rode `firebase login`, entre com sua conta Google no navegador que abrir, e repita o comando acima.

---

## PARTE 1 — Criar o token do webhook (2 min)

O webhook precisa de uma "senha" combinada entre o Asaas e o nosso servidor.
Gere uma agora:

```powershell
node -e "console.log('TOKEN GERADO: ' + require('crypto').randomBytes(24).toString('hex'))"
```

Vai aparecer algo como `TOKEN GERADO: 3f8a1c...`.

📋 **Copie esse token (só a parte depois de "TOKEN GERADO: ") e cole num bloco
de notas** — você vai usá-lo 2 vezes (Parte 2 e Parte 3).

---

## PARTE 2 — Colocar as chaves no servidor (3 min)

1. Abra o arquivo de configuração no Bloco de Notas:

```powershell
notepad functions\.env
```

2. Vá até o **final do arquivo** e adicione estas 3 linhas (cole a SUA chave
   do Asaas na primeira — aquela que começa com `$aact_hmlg_...` — e o token
   da Parte 1 na segunda):

```
ASAAS_API_KEY=$aact_hmlg_SUACHAVEAQUI
ASAAS_WEBHOOK_TOKEN=cole_aqui_o_token_da_parte_1
ASAAS_ENV=sandbox
```

3. **Salvar** (Ctrl+S) e fechar o Bloco de Notas.

> Por que no `.env` e não no Secret Manager? Porque é assim que TODAS as outras
> chaves do projeto já funcionam (Stripe, Gemini, Pluggy…) — o Firebase empacota
> esse arquivo no deploy. Quando formos para produção de verdade, migramos tudo
> para o Secret Manager de uma vez.

---

## PARTE 3 — Cadastrar o webhook no painel do Asaas (5 min)

1. Entre em **https://sandbox.asaas.com** com seu login.
2. No menu, procure **Integrações** (geralmente em Configurações ⚙️ → aba
   "Integrações" → **Webhooks**). Se não achar, use a busca do painel por
   "webhook".
3. Clique em **Adicionar webhook** (ou "Novo webhook") e preencha:

| Campo | Valor |
|---|---|
| Nome | `Sibanki` |
| URL | `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/asaasWebhook` |
| E-mail | seu e-mail (avisa se o webhook falhar) |
| Versão da API | `v3` |
| Token de autenticação | **o token da Parte 1** (igualzinho ao que você pôs no .env) |
| Tipo de envio / fila | **Sequencial** |
| Status | Ativo |

4. Em **Eventos**, marque os de **Cobrança** (pelo menos estes 5):
   - `PAYMENT_CONFIRMED` (pagamento confirmado)
   - `PAYMENT_RECEIVED` (pagamento recebido)
   - `PAYMENT_OVERDUE` (cobrança vencida)
   - `PAYMENT_REFUNDED` (estornado)
   - `PAYMENT_CHARGEBACK_REQUESTED` (chargeback)
5. Salvar.

---

## PARTE 4 — Subir tudo (5 min)

Cole no PowerShell (um de cada vez, espere terminar):

```powershell
firebase deploy --only functions:createAsaasCheckout,functions:cancelAsaasSubscription,functions:asaasWebhook
```

```powershell
firebase deploy --only firestore:rules
```

```powershell
npm run deploy:app
```

- O 1º demora uns minutos e termina com `Deploy complete!`.
- O 3º roda os testes antes — se aparecer `127 passed` e depois
  `Deploy complete!`, está tudo certo.

---

## PARTE 5 — Testar de verdade (5 min)

1. Abra **https://virtus-financeiro-cd7bd.web.app** numa **janela anônima**.
2. Crie uma **conta nova de teste** (e-mail qualquer seu) e complete o
   cadastro **com CPF** (pode ser o seu — é sandbox, não cobra nada).
3. Vá em **Configurações → Meu plano → "Pro mensal"**.
4. Vai abrir a fatura do Asaas (sandbox). Escolha **Pix** → no sandbox aparece
   um botão tipo **"Simular pagamento" / "Pagar"** que confirma na hora, sem
   dinheiro real.
5. Volte ao app e recarregue (F5). Em até ~1 min:
   - Configurações deve mostrar **Plano atual: PRO**;
   - O botão vira **"Cancelar assinatura"**.

✅ **Verificação extra (opcional):** no [Firebase Console → Firestore](https://console.firebase.google.com/project/virtus-financeiro-cd7bd/firestore),
abra `users` → o documento do usuário de teste → o campo `plan` deve estar
`pro` e `planProvider` = `asaas`.

6. Para fechar o ciclo: clique **"Cancelar assinatura"** → plano volta a
   `gratuito`.

---

## SE DER PROBLEMA

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Pagamentos ainda não configurados" ao clicar no plano | `.env` sem a chave ou deploy não rodou | Confira a Parte 2 e repita o 1º deploy da Parte 4 |
| "Complete seu cadastro (CPF)" | a conta de teste não tem CPF no perfil | Perfil → preencher CPF (ou refazer o wizard) |
| Pagou no sandbox mas o plano não virou `pro` | webhook não configurado ou token diferente | Parte 3: confira URL e se o token é IDÊNTICO ao do `.env`; no painel Asaas → Webhooks dá para ver os envios e erros |
| Erro 401 nos logs do `asaasWebhook` | token do painel ≠ token do `.env` | Iguale os dois e rode de novo o 1º deploy |
| Quer ver os logs | — | [Console → Functions → Logs](https://console.firebase.google.com/project/virtus-financeiro-cd7bd/functions/logs) e filtre por `asaas` |

---

## QUANDO FOR PRA VALER (produção — deixar para depois do teste)

1. No painel **produção** do Asaas (asaas.com, não o sandbox): gerar a API key
   de produção (`$aact_prod_...`) e cadastrar o MESMO webhook (pode usar outro
   token, desde que atualize o `.env`).
2. No `functions\.env`: trocar `ASAAS_API_KEY` pela de produção e
   `ASAAS_ENV=sandbox` → `ASAAS_ENV=production`.
3. Repetir a Parte 4 (os 3 deploys).
4. Fazer UMA assinatura real de R$ 19,90 com seu próprio cartão/Pix para
   validar, depois cancelar.
