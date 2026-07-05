# Criar e-mail institucional @sibanki.com.br

Para ter endereços como **contato@sibanki.com.br**, **suporte@sibanki.com.br**, etc., você precisa de um serviço de **e-mail corporativo** que use o seu domínio. Abaixo estão as opções mais usadas.

---

## 1. Google Workspace (recomendado para uso profissional)

- **O que é:** Gmail e Google Drive com seu domínio (@sibanki.com.br).
- **Vantagens:** Interface familiar, armazenamento, calendário, Meet; aceito como “e-mail sério” por usuários e parceiros.
- **Custo:** Pago por usuário/mês (ex.: plano Business Starter ~US$ 6/usuário).
- **Como criar:**
  1. Acesse [workspace.google.com](https://workspace.google.com) e clique em **Começar**.
  2. Preencha nome da empresa (Sibanki) e número de funcionários.
  3. Quando pedir o domínio, use **sibanki.com.br** (já existente).
  4. O Google vai mostrar os **registros DNS** que você deve criar no painel do domínio (Registro.br ou onde estiver):
     - Registros **MX** (prioridade e servidores que o Google indicar).
     - Opcional: **TXT** para verificação.
  5. Depois que o domínio for verificado, crie os usuários (ex.: contato@sibanki.com.br, contatosibanki@gmail.com pode ser um alias ou você acessa pelo Workspace).
  6. Para **encaminhar** contato@ para um Gmail pessoal: em Gmail (Workspace) → Configurações → Encaminhamento, adicione contatosibanki@gmail.com.

**Resumo:** Você “cria” o e-mail institucional ao assinar o Workspace e configurar o domínio; cada endereço (contato@, suporte@, etc.) é um usuário ou um alias.

---

## 2. Zoho Mail (opção com plano gratuito)

- **O que é:** Serviço de e-mail com seu domínio.
- **Vantagens:** Plano gratuito para 1 domínio e até 5 usuários (com limitações); pago barato se precisar de mais.
- **Como criar:**
  1. Acesse [zoho.com/mail](https://www.zoho.com/mail/) e crie conta.
  2. Adicione o domínio **sibanki.com.br**.
  3. Siga as instruções para colocar os **registros MX** (e TXT, se pedido) no DNS do domínio.
  4. Depois da verificação, crie as caixas (ex.: contato@sibanki.com.br) e, se quiser, configure encaminhamento para contatosibanki@gmail.com.

---

## 3. Microsoft 365 (Outlook com seu domínio)

- **O que é:** E-mail (Outlook), OneDrive, Teams com @sibanki.com.br.
- **Custo:** Pago por usuário/mês.
- **Como criar:** Em [microsoft.com/microsoft-365](https://www.microsoft.com/microsoft-365), escolha um plano, adicione o domínio sibanki.com.br e configure os registros MX/TXT que a Microsoft mostrar no painel do domínio.

---

## 4. E-mail no provedor do domínio (Registro.br, Locaweb, etc.)

- **Registro.br:** Oferece apenas **encaminhamento** (redirecionamento) de e-mail, não caixa de entrada com login. Ou seja: você pode fazer contato@sibanki.com.br → contatosibanki@gmail.com, mas não “criar” uma caixa contato@ para abrir no navegador.
- **Outros provedores (Locaweb, Hostinger, etc.):** Muitos vendem “e-mail profissional” ou “e-mail do domínio”: você contrata o pacote, aponta os MX para os servidores deles e cria os endereços no painel. Aí sim você tem login (webmail ou IMAP) para contato@sibanki.com.br.

Se o seu objetivo for só **receber** em contatosibanki@gmail.com o que as pessoas mandam para contato@sibanki.com.br, o encaminhamento (no Registro.br ou onde o domínio estiver) já resolve, sem criar “conta institucional”.  
Se quiser **ter** a caixa contato@sibanki.com.br (entrar nela, responder por esse endereço), aí precisa de um serviço como Workspace, Zoho ou 365 (itens 1–3).

---

## O que fazer no DNS (em qualquer opção acima)

No painel onde o domínio **sibanki.com.br** está (Registro.br, Cloudflare, etc.):

1. **Adicionar os registros MX** exatamente como o provedor de e-mail (Google, Zoho, Microsoft ou seu host) indicar.  
   Exemplo para Google:
   - Prioridade 5: `aspmx.l.google.com`
   - Prioridade 10: `alt1.aspmx.l.google.com`
   - (etc. – use sempre a lista oficial do Google para o seu tipo de conta.)
2. Se pedirem **TXT** para verificação ou segurança, crie também.
3. Aguarde a propagação (minutos a algumas horas) e finalize a verificação no painel do provedor de e-mail.

Depois disso, o “e-mail institucional” estará criado: você poderá usar contato@sibanki.com.br (e outros) conforme o plano que escolheu (criar usuários, aliases, encaminhamento, etc.).

---

## Resumo

| Objetivo | Solução |
|----------|--------|
| Só receber em contatosibanki@gmail.com o que chega em contato@ | Encaminhamento no Registro.br (ou onde está o domínio). |
| Ter caixa contato@sibanki.com.br com login (Gmail/Outlook) | Google Workspace, Zoho Mail ou Microsoft 365 + configurar domínio. |
| Ter vários endereços (contato@, suporte@) e parecer profissional | Google Workspace ou Zoho (Zoho tem plano gratuito limitado). |

Se disser qual opção prefere (ex.: “quero o mais barato” ou “quero Google”), dá para detalhar só os passos dessa.
