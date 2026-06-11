# SPEC — CHECKOUT TRANSPARENTE ASAAS (pagar sem sair do Sibanki)

> Evolução do billing Asaas (10/06/2026). Hoje o usuário é redirecionado para a
> fatura hospedada (`invoiceUrl`). Esta spec traz o pagamento para DENTRO do
> app, no design Pierre — começando por **Pix (Fase 1)** e depois cartão
> (Fase 2). O contrato não muda: **webhook Asaas continua sendo o único
> escritor de `users/{uid}.plan`**.

---

## FASE 1 — PIX DENTRO DO APP (escopo da task 20260610-010)

### Fluxo do usuário
1. Configurações → "Meu plano" → clica em "Pro mensal".
2. `createAsaasCheckout` roda como hoje (cria assinatura + 1ª cobrança).
3. Em vez de redirecionar, abre o **modal `AsaasPixModal`**:
   - QR Code Pix renderizado inline + botão **"Copiar código Pix"** (copia-e-cola);
   - contador de expiração;
   - estado "Aguardando pagamento…" com spinner discreto;
   - link discreto "Prefere cartão ou boleto? Abrir fatura completa →" (`invoiceUrl`).
4. Usuário paga no app do banco. O webhook confirma → `users/{uid}.plan = 'pro'`.
5. O `AppContext` (onSnapshot já existente) propaga a mudança → o modal detecta
   `data.plan !== 'gratuito'` e troca para o estado de sucesso
   ("Bem-vindo ao Pro 🎉") → fecha em 3s. **Zero polling novo** — a detecção é
   o listener que já existe.

### Backend — 1 callable nova
`getAsaasPixQr` (`functions/services/billing/asaasService.js`):
- Auth obrigatório (`context.auth`).
- Input: `{ paymentId?: string }` — se ausente, resolve a 1ª cobrança PENDING
  da `users/{uid}.asaasSubscriptionId`.
- Valida que o payment pertence ao customer do uid (comparar
  `asaasCustomerId`) — nunca confiar em id vindo do cliente sem checar dono.
- Chama `GET /payments/{id}/pixQrCode` → retorna
  `{ encodedImage, payload, expirationDate, value, dueDate }`.
- `createAsaasCheckout` passa a retornar também `paymentId` (além de `url`).

### Frontend
- **`src/components/billing/AsaasPixModal.tsx`** (novo, < 300 linhas):
  - props: `{ open, onClose, paymentId, invoiceUrl, planLabel }`;
  - chama `getAsaasPixQr` ao abrir; exibe `<img src={data:image/png;base64,...}>`;
  - botão copiar com `navigator.clipboard.writeText(payload)` + feedback "Copiado ✓";
  - sucesso: lê `data.plan` via `useAppContext()`;
  - design: tokens `si-*`, paleta semântica (`si-positive-*` no sucesso),
    labels 11px — `docs/DESIGN-PALETA-SEMANTICA.md` é lei.
- **`Settings.tsx`**: no provider asaas, troca `window.location.assign(url)`
  por estado `pixModal = { paymentId, invoiceUrl, planLabel }`.

### Critérios de aceitação (Fase 1)
- [ ] `getAsaasPixQr` rejeita payment de outro usuário (teste manual sandbox).
- [ ] Modal exibe QR + copia-e-cola reais do sandbox.
- [ ] Pagamento Pix simulado no sandbox → modal troca para sucesso sozinho
      (sem F5), via onSnapshot existente.
- [ ] Link de fallback abre a `invoiceUrl` (boleto/cartão continuam possíveis).
- [ ] `tsc --noEmit` zero erros; nenhum `console.log` em functions (usar logger).
- [ ] Sem deploy (João aprova e deploya).

### Fora do escopo da Fase 1
- Cartão transparente, retry de Pix expirado (gerar nova cobrança), upgrade
  Pro→Família, tela de paywall fora de Configurações.

---

## FASE 2 — CARTÃO DENTRO DO APP (especificada, NÃO implementar ainda)

- Formulário de cartão no app → callable `tokenizeAsaasCard` →
  `POST /creditCard/tokenize` (com `remoteIp` do usuário, exigido pelo
  antifraude Asaas) → retorna `creditCardToken`.
- `createAsaasCheckout` ganha variante: assinatura com
  `billingType: CREDIT_CARD` + `creditCardToken` → cobrança imediata sem fatura.
- **Segurança (inegociável):** PAN/CVV nunca tocam Firestore nem logs; o dado
  trafega client → callable (TLS) → Asaas e morre ali; mascarar qualquer echo;
  rate-limit na callable (3 tentativas/10 min por uid) contra card testing.
  Avaliar SAQ A-EP antes de ativar em produção.
- Pré-requisito: Fase 1 estável em produção + decisão de João.

---

## Segurança e governança (AGENTS.md §6)
- Nenhum valor monetário vem do cliente (catálogo server-side já existente).
- Idempotência do webhook já cobre replay.
- Toda mudança desta spec toca dinheiro → PR com aprovação do João, sem deploy
  por agente.
