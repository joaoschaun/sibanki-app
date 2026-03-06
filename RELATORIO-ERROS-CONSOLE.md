# Relatório de Erros do Console - Sibanki

## Resumo da análise

O script Playwright navegou pelas telas principais (Dashboard, Lançamentos, Investimentos, Metas, Configurações) e analisou o código-fonte. Abaixo estão os erros identificados e suas correções.

---

## 1. Erros de HTML (painel de notificações)

**Tela:** Todas (estrutura global)

**Problema:**
- Linha 2029: `<div <div` — tag duplicada e malformada
- Linha 2030: `<div ="notif-bd"` — atributo `class` ausente

**Correção aplicada:**
```html
<!-- Antes -->
<div <div style="padding:8px 12px;...">...</div>
<div ="notif-bd" id="nBody"></div>

<!-- Depois -->
<div style="padding:8px 12px;...">...</div>
<div class="notif-bd" id="nBody"></div>
```

---

## 2. autoClassify — API retornando HTML em vez de JSON

**Tela:** Lançamentos (ao preencher o campo Descrição e sair do campo)

**Problema:**
```
autoClassify backend err: SyntaxError: Unexpected token '<'
```

**Causa:** A rota `/api/chat` pode retornar HTML (ex.: página 404 ou erro) em vez de JSON. O `response.json()` falha ao encontrar `<` no início da resposta.

**Como corrigir:**
- Verificar se a Cloud Function `/api/chat` está deployada e respondendo corretamente
- Adicionar checagem de `Content-Type` e status antes de fazer `response.json()`:

```javascript
// Em autoClassify(), antes de .then(r => r.json())
.then(function(r) {
  if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) {
    throw new Error('API não retornou JSON');
  }
  return r.json();
})
```

---

## 3. Stripe — ERR_NAME_NOT_RESOLVED

**Tela:** Configurações / checkout (se houver integração Stripe)

**Problema:**
```
POST https://m.stripe.com/6 net::ERR_NAME_NOT_RESOLVED
```

**Causa:** Bloqueio de rede, extensão de privacidade ou DNS.

**Como corrigir:**
- Verificar se o domínio `m.stripe.com` não está bloqueado
- Desativar temporariamente extensões como uBlock, Privacy Badger
- Garantir que o Stripe está carregado apenas quando necessário (lazy load)

---

## 4. Content Security Policy (CSP)

**Tela:** Todas

**Problema:** CSP pode bloquear `eval()` em alguns contextos.

**Status:** O meta tag já inclui `'unsafe-eval'`. Se o erro persistir, conferir os headers em `firebase.json` e no painel do CDN (ex.: sibanki.com.br).

---

## 5. Erros históricos (já corrigidos)

Conforme conversa anterior, estes já foram tratados:

| Erro | Correção |
|------|----------|
| `SyntaxError: Unexpected end of input` | Chave `}` faltante no script — corrigida |
| `Firebase: No Firebase App '[DEFAULT]' has been created` | Inicialização do Firebase antes do uso |
| `ReferenceError: showAuth is not defined` | Função `showAuth` definida (linha 5333) |
| `ReferenceError: renderAll/addE/addInv/addMeta` | Escopo global ajustado com a chave `}` |
| Botão "Entrar" travando | `resetLoginBtn()` adicionado |

---

## Como testar novamente

1. Executar o script de captura:
   ```bash
   node check-console-errors.js
   ```
2. Fazer login manualmente nos primeiros 12 segundos (se necessário)
3. O script navegará pelas telas e registrará erros no console

---

## Recomendações adicionais

1. **API /api/chat:** Garantir que a Cloud Function está deployada e que o CORS está configurado
2. **Tratamento de erros:** Envolver chamadas à API em try/catch e exibir mensagens claras ao usuário
3. **Service Worker:** Cache em `sibanki-v4` — após alterações, considerar incrementar a versão
