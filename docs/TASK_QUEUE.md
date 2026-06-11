---
pipeline_version: "1.0"
status: WAITING_CURSOR
task_id: "20260610-010"
priority: "alta"
created_at: "2026-06-10T15:30:00-03:00"
updated_at: "2026-06-10T15:30:00-03:00"
assigned_to: "cursor"
---

# 🔄 Sibanki AI Pipeline — Fila de Tarefas

---

## 📋 TAREFA ATUAL

### Tarefa `20260610-010` — Checkout transparente Asaas, Fase 1: Pix dentro do app 🔄

- **Status:** `WAITING_CURSOR`
- **Prioridade:** Alta
- **Atribuída a:** Cursor
- **Criada em:** 2026-06-10T15:30:00-03:00 (Claude Cowork)
- **Branch de trabalho:** `audit/analise-360` (onde está o billing Asaas)

**Descrição:**
Hoje o usuário é redirecionado para a fatura hospedada do Asaas. Implementar o
pagamento Pix DENTRO do app: modal Pierre com QR Code + copia-e-cola, detecção
de sucesso via onSnapshot existente (quando o webhook gravar `plan`).

**Spec completa (LER ANTES DE COMEÇAR):**
`docs/SPEC-CHECKOUT-TRANSPARENTE-ASAAS.md` — Fase 1 apenas. Fase 2 (cartão)
está especificada mas NÃO deve ser implementada.

**Contexto / Arquivos relevantes:**
- `functions/services/billing/asaasService.js` — adicionar `getAsaasPixQr`;
  `createAsaasCheckout` deve retornar também `paymentId`.
- `functions/index.js` — registrar a callable nova.
- `src/components/billing/AsaasPixModal.tsx` — NOVO (< 300 linhas, tokens si-*).
- `src/pages/Settings.tsx` — abrir o modal em vez de `window.location.assign`.
- Design: seguir `docs/DESIGN-PALETA-SEMANTICA.md` (labels 11px, paleta semântica).

**Critérios de aceitação:**
- [ ] `getAsaasPixQr` valida que o payment pertence ao uid (dono do customer).
- [ ] Modal exibe QR real do sandbox + botão copiar com feedback.
- [ ] Pix simulado no sandbox → modal vira sucesso SEM refresh (onSnapshot).
- [ ] Link fallback "Abrir fatura completa" preservado (boleto/cartão).
- [ ] `tsc --noEmit` exit 0; logger estruturado nas functions (sem console.log).
- [ ] SEM deploy — João aprova e deploya (toca dinheiro, AGENTS.md §0 e §6).

**Notas para o Cursor:**
- O webhook é o único escritor de `users/{uid}.plan` — não escrever plan no client.
- Nenhum valor monetário vem do cliente (catálogo server-side em PLAN_CATALOG).
- Sandbox: a conta/chave já existem; teste manual depende do deploy pelo João —
  entregue com instruções de teste no resultado.

---

## 📜 HISTÓRICO DE TAREFAS

| task_id | data | resumo | status final |
|---------|------|--------|-------------|
| 20260413-005 | 14/04/2026 | TS cleanup — 28 erros eliminados, tsc exit 0 | ✅ COMPLETED |
| 20260414-006 | 14/04/2026 | Cloud Function recorrentes | ✅ COMPLETED |
| 20260414-007 | 14/04/2026 | CreditObligation CRUD - modal de cadastro, lista, marking | ✅ COMPLETED |
| 20260414-008 | 14/04/2026 | Sentinela Geo com sugestão tática de cartão por cenário + ciclo | ✅ COMPLETED |
| 20260607-009 | 08/06/2026 | Regiões CF frontend, conta no modal IA, investimentos inteligentes (qtd/preço/autocomplete) | ✅ COMPLETED |
