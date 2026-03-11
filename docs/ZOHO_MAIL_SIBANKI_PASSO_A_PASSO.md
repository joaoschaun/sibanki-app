# Zoho Mail para sibanki.com.br – Passo a passo

Guia para criar e-mail institucional (contato@sibanki.com.br, etc.) com Zoho Mail.

---

## 1. Criar conta no Zoho Mail

1. Acesse **[zoho.com/mail](https://www.zoho.com/mail/)**.
2. Clique em **Sign Up Free** (ou “Criar conta gratuita”).
3. Preencha:
   - Nome da organização: **Sibanki**
   - E-mail de administrador: use um e-mail que você já acesse (ex.: contatosibanki@gmail.com).
   - Senha e país (Brasil).
4. Confirme o e-mail clicando no link que o Zoho enviar.
5. Faça login no **Zoho Mail Admin** (admin.zoho.com ou pelo painel do Zoho Mail).

---

## 2. Adicionar o domínio sibanki.com.br

1. No painel do Zoho (Admin Console do Zoho Mail), vá em **Domains** (Domínios) ou **Add Domain**.
2. Digite **sibanki.com.br** e clique em **Add** / **Adicionar**.
3. O Zoho vai pedir **verificação do domínio**. Escolha um dos métodos:
   - **TXT** (mais comum): o Zoho mostra um valor tipo `zoho-verification=xxxxxxxx`. Você vai usar isso no passo 3.
   - **CNAME**: o Zoho mostra um nome e um valor; você cria um CNAME no DNS.
4. Anote o valor de verificação (TXT ou CNAME) que aparecer na tela.

---

## 3. Configurar DNS no provedor do domínio

Onde o **sibanki.com.br** está (Registro.br, Cloudflare, etc.), entre no gerenciamento de **DNS** e adicione os registros abaixo.

### 3.1 Verificação do domínio (TXT)

- **Tipo:** TXT  
- **Nome/Host:** `@` ou `sibanki.com.br` (conforme o painel pedir; em alguns é só deixar em branco para o domínio raiz).  
- **Valor/Conteúdo:** o que o Zoho mostrou (ex.: `zoho-verification=xxxxxxxx`).  
- **TTL:** 3600 ou padrão.

Salve e aguarde alguns minutos. No Zoho, clique em **Verify** (Verificar). Se der certo, siga para os MX.

### 3.2 Registros MX (receber e-mail)

Adicione **três** registros MX (um por linha):

| Prioridade | Servidor / Apontamento        |
|------------|------------------------------|
| 10         | mx.zoho.com                  |
| 20         | mx2.zoho.com                 |
| 50         | mx3.zoho.com                 |

- **Nome/Host:** `@` ou vazio (para o domínio principal).  
- Em alguns painéis o “servidor” é só `mx.zoho.com` (sem ponto no final); outros pedem com ponto. Use o que o seu provedor aceitar.

### 3.3 SPF (melhor entrega e menos spam)

- **Tipo:** TXT  
- **Nome/Host:** `@` (ou domínio raiz).  
- **Valor:** `v=spf1 include:zoho.com ~all`

Se já existir um registro TXT de SPF para o domínio, não crie outro; edite o existente e adicione `include:zoho.com` antes do `~all`.

### 3.4 DKIM (opcional, recomendado)

Depois que o domínio estiver verificado, no Zoho Mail em **Domains** → **sibanki.com.br** deve aparecer a opção de **DKIM**. O Zoho gera um valor (ex.: para `zoho._domainkey`). Crie no DNS:

- **Tipo:** TXT  
- **Nome/Host:** `zoho._domainkey` (ou o que o Zoho indicar).  
- **Valor:** o valor longo que o Zoho mostrar.

Salve tudo no DNS. A propagação pode levar de alguns minutos a 1–2 horas.

---

## 4. Criar o e-mail institucional

1. No Zoho Mail Admin, vá em **Users** (Usuários) ou **Email Accounts**.
2. Clique em **Add User** / **Add Mail Account**.
3. Crie o primeiro usuário, por exemplo:
   - **Endereço:** contato@sibanki.com.br  
   - **Nome:** Sibanki Contato (ou o que preferir).  
   - **Senha:** defina uma senha segura (ou use “gerar senha” e guarde).
4. Repita para outros endereços se quiser (ex.: suporte@sibanki.com.br).

A partir daí você já pode acessar o webmail do Zoho com contato@sibanki.com.br e a senha definida.

---

## 5. Encaminhar para contatosibanki@gmail.com (opcional)

Se quiser que tudo que chegar em contato@sibanki.com.br também vá para contatosibanki@gmail.com:

1. Entre no **Zoho Mail** com contato@sibanki.com.br (webmail).
2. Vá em **Settings** (Configurações) → **Mail Accounts** ou **Forwarding**.
3. Ative **Forward** e coloque **contatosibanki@gmail.com**.
4. Opcional: marque “Keep a copy” para manter cópia na caixa do Zoho.

Ou no **Admin Console** do Zoho, em **Users** → contato@sibanki.com.br, procure por **Forwarding** / **Encaminhamento** e configure o mesmo endereço Gmail.

---

## 6. Resumo dos registros DNS (Registro.br ou outro)

| Tipo | Nome      | Valor / Apontamento        | Prioridade (só MX) |
|------|-----------|----------------------------|--------------------|
| TXT  | @         | (valor de verificação Zoho)| –                  |
| MX   | @         | mx.zoho.com                | 10                 |
| MX   | @         | mx2.zoho.com               | 20                 |
| MX   | @         | mx3.zoho.com               | 50                 |
| TXT  | @         | v=spf1 include:zoho.com ~all | –                |

No **Registro.br**, a tela de DNS pode chamar “Nome” de “Host” e usar `@` para o domínio raiz. Para MX, há campo “Prioridade” e “Servidor”.

---

## Problemas comuns

- **“Domínio não verificado”:** confira se o TXT de verificação está exatamente igual ao do Zoho (sem espaços extras) e espere alguns minutos.
- **E-mails não chegam:** confira se os três MX estão com prioridades 10, 20 e 50 e se o nome está para o domínio raiz (@). Use [MX Toolbox](https://mxtoolbox.com/) ou a ferramenta do Zoho para testar.
- **E-mails caem em spam:** adicione SPF e DKIM (passos 3.3 e 3.4).

Se disser em qual provedor está o DNS (Registro.br, Cloudflare, etc.), dá para detalhar os cliques exatos na tela deles.
