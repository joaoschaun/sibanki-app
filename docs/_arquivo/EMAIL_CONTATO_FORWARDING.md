# Encaminhar e-mails de contato@sibanki.com.br para contatosibanki@gmail.com

## Situação

- Os e-mails enviados **para** `contato@sibanki.com.br` devem chegar em `contatosibanki@gmail.com`.
- No projeto, o **Resend** é usado apenas para **enviar** e-mails (verificação de conta, convite família, resumo semanal). Não existe código que **receba** ou encaminhe e-mails no domínio.

O encaminhamento **contato@ → Gmail** é feito na configuração do domínio / provedor de e-mail, não no código do app.

---

## Configuração atual: Cloudflare Email Routing

O encaminhamento **contato@sibanki.com.br → contatosibanki@gmail.com** foi configurado no **Cloudflare** (Email Routing). Abaixo: como verificar se está correto e como testar.

### Onde verificar no Cloudflare

1. Acesse **[dash.cloudflare.com](https://dash.cloudflare.com)** e faça login.
2. Selecione o domínio **sibanki.com.br**.
3. No menu lateral: **Email** → **Email Routing** (ou **E-mail** → **Roteamento de e-mail**).
4. Confira:
   - **Custom addresses (Endereços personalizados):** deve existir uma regra tipo:
     - **Endereço:** `contato` (ou `contato@sibanki.com.br`, conforme a interface)
     - **Enviar para / Action:** `contatosibanki@gmail.com` (Forward to email address).
   - **MX records:** o Cloudflare deve mostrar que os MX estão ativos (geralmente `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, `route3.mx.cloudflare.net`). Esses registros precisam estar no DNS do domínio (no Cloudflare em **DNS** → **Records**).

### O que conferir no DNS (Cloudflare)

Em **DNS** → **Records** do domínio sibanki.com.br:

- Deve haver **registros MX** apontando para os servidores do Cloudflare Email Routing, por exemplo:
  - Prioridade 8 (ou a que o Cloudflare indicar) → `route1.mx.cloudflare.net`
  - Prioridade 9 → `route2.mx.cloudflare.net`
  - Prioridade 10 → `route3.mx.cloudflare.net`

Se o domínio usa DNS no Cloudflare, o próprio painel pode ter criado esses MX ao ativar Email Routing. Se os MX estiverem em outro provedor (ex.: Registro.br), eles precisam apontar para os servidores que o Cloudflare mostrar em Email Routing.

### Como testar

1. De outro e-mail (ex.: seu Gmail pessoal ou um amigo), envie um e-mail **para** `contato@sibanki.com.br` com assunto tipo “Teste encaminhamento”.
2. Verifique a caixa de entrada (e spam) de **contatosibanki@gmail.com**.
3. Se não chegar em alguns minutos: confira de novo as regras em **Email Routing** (endereço de destino correto, sem typo) e os MX no DNS; aguarde até 24 h de propagação se tiver alterado MX recentemente.

### Resumo rápido

| Onde | O que ver |
|------|-----------|
| Cloudflare → sibanki.com.br → **Email** → **Email Routing** | Regra: `contato` → encaminhar para `contatosibanki@gmail.com` |
| Cloudflare → sibanki.com.br → **DNS** → **Records** | MX apontando para `route*.mx.cloudflare.net` (prioridades conforme o painel) |

---

## Opção 1: Encaminhamento no provedor do domínio (alternativa)

Onde o domínio **sibanki.com.br** está registrado ou onde está o e-mail **contato@**:

1. **Registro.br** (se o domínio estiver lá)  
   - Acesse o painel do domínio.  
   - Use a opção de **Encaminhamento de e-mail** (ou “Redirecionamento”) se existir.  
   - Crie: `contato@sibanki.com.br` → `contatosibanki@gmail.com`.

2. **Outro provedor (GoDaddy, Hostinger, Locaweb, etc.)**  
   - No painel do domínio ou do “E-mail”, procure por **Encaminhamento**, **Redirecionamento** ou **Email Forwarding**.  
   - Configure: endereço `contato@sibanki.com.br` encaminhar para `contatosibanki@gmail.com`.

3. **Google Workspace** (se **contato@** for uma caixa Google)  
   - Em [Gmail → Configurações → Encaminhamento e POP/IMAP](https://mail.google.com/mail/u/0/#settings/fwdandpop).  
   - Adicione um endereço de encaminhamento: `contatosibanki@gmail.com`.  
   - Confirme pelo link que o Gmail envia para esse endereço.

Assim, tudo que chegar em **contato@sibanki.com.br** será reenviado para **contatosibanki@gmail.com**.

---

## Opção 2: Resend Inbound (receber no Resend e encaminhar)

O Resend tem recurso de **Inbound** (receber e-mails em um endereço do seu domínio). Em resumo:

1. No [dashboard do Resend](https://resend.com/domains), adicione o domínio **sibanki.com.br** (ou um subdomínio, ex.: `mail.sibanki.com.br`).
2. Configure os **registros MX** que o Resend indicar no DNS do domínio (no Registro.br ou onde estiver o DNS).
3. No Resend, ative **Inbound** para o endereço desejado (ex.: `contato@sibanki.com.br`).
4. O Resend pode enviar o e-mail recebido para um **webhook** (URL do seu backend).  
   Não há hoje no projeto nenhuma Cloud Function ou endpoint que receba esse webhook e reenvie para `contatosibanki@gmail.com`. Seria preciso criar essa função e, nela, usar a API do Resend (ou outro serviço) para enviar uma cópia ao Gmail.

Se você quiser seguir por esse caminho, o próximo passo é: criar uma função (ex.: Firebase HTTP function) que receba o webhook do Resend Inbound e envie o conteúdo para `contatosibanki@gmail.com`.

---

## Opção 3: Usar só o Gmail com “Enviar como”

Se o objetivo for **responder** como `contato@sibanki.com.br` a partir do Gmail:

- No Gmail (`contatosibanki@gmail.com`): **Configurações → Contas e Importação → Enviar e-mail como** e adicione `contato@sibanki.com.br`.  
- O provedor do domínio precisa permitir **envio** por SMTP com esse endereço (ou você usa o SMTP do Resend/Google Workspace, conforme o que estiver configurado).

Isso não resolve o **recebimento**: para que as mensagens enviadas **para** contato@sibanki.com.br cheguem no Gmail, ainda é necessário o encaminhamento (Opção 1 ou 2).

---

## Resumo

- **Configuração atual:** encaminhamento **contato@sibanki.com.br → contatosibanki@gmail.com** via **Cloudflare Email Routing**. Verifique em **Email** → **Email Routing** e em **DNS** (MX).
- Para outras opções: encaminhamento no provedor do domínio (Opção 1), Resend Inbound + função (Opção 2) ou “Enviar como” no Gmail (Opção 3).
- O Resend no projeto só **envia** e-mail; **receber** e **encaminhar** contato@ é configuração de domínio/serviço (Cloudflare, Registro.br, etc.).
