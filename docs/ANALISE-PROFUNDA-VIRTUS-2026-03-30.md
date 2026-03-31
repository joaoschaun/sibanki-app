# Análise Profunda do Projeto Virtus Financeiro (Sibanki)

**Data:** 30 de Março de 2026  
**Autor:** Manus AI (revisão técnica contra o repositório em 30/03/2026)  
**Escopo:** Estrutura, código, arquitetura, segurança, performance e recomendações.

---

## 1. Visão geral do projeto

O **Virtus Financeiro (Sibanki)** é um aplicativo de controle financeiro pessoal avançado, com recursos como inteligência artificial (Consultor IA via Gemini), integração com bots (**Telegram** e **WhatsApp** — presentes nas Cloud Functions, em evolução contínua), Modo Família, gestão de investimentos, metas e relatórios.

O projeto está em **transição arquitetural** forte. O legado é uma SPA com lógica concentrada em **Vanilla JS** (principalmente `public/app/app.js`, monólito de ordem de **~19.000 linhas**; `public/app/index.html` tem ordem de **~4.000 linhas** e estrutura/markup). A migração segue para **React + Vite** (`src/`), mantendo **Firebase** como backbone (Auth, Firestore, Functions, Hosting).

---

## 2. Arquitetura e stack

A arquitetura atual prepara múltiplos módulos (investimentos, crédito, seguros) e **multi-tenant** / white-label.

| Componente | Tecnologia | Observações |
| :--- | :--- | :--- |
| **Front-end (novo)** | React 18, TypeScript, Vite, Tailwind CSS | `src/` modular; lazy loading de rotas; **Zustand** (ex.: UI) e **Context** (`AppContext`) para auth + dados financeiros com um único listener Firestore. |
| **Front-end (legado)** | HTML/CSS/Vanilla JS | `public/app/app.js` como núcleo lógico; substituição gradual pelo React. |
| **Backend** | Firebase Cloud Functions (Node.js 22) | HTTP e agendadas: Stripe, BRAPI, Telegram, Gemini, WhatsApp, etc. |
| **Dados** | Firestore | Namespace multi-tenant em `tenants/{tenantId}/users/{userId}` (ver regras); legado `users/{uid}` na raiz bloqueado. |
| **Testes E2E** | Playwright | Curadoria legado vs React, staging, comparação visual. |

---

## 3. Análise do código e estrutura

### 3.1. Front-end (React)

- **Modularização:** `src/components`, `src/pages`, `src/hooks`, `src/services`, `src/context`.
- **Estado:** `AppContext` centraliza auth + `useFinancialData` **uma vez**, evitando vários `onSnapshot` no mesmo documento. **Zustand** cobre estado de UI (ex.: sidebar) e outros casos, alinhado às convenções do repositório.
- **Code splitting:** `React.lazy` e `Suspense` no roteamento reduzem o bundle inicial.

### 3.2. Modelagem de dados (Firestore)

O fluxo atual ainda reflete **documento de usuário denso** em parte do desenho (arrays como `entries` em `persistUserData` com `setDoc` + `merge`). **Atenção:** arrays que crescem sem limite aproximam o teto de **1 MB por documento** no Firestore e degradam leitura e escrita.

### 3.3. Backend (Cloud Functions)

`functions/index.js` (e serviços em `functions/services/`) orquestram IA, mercado, pagamentos, Telegram, WhatsApp e telemetria.

---

## 4. Segurança

### 4.1. Regras do Firestore

As regras cobrem multi-tenant (`isSuperAdmin`, papéis, `tenantId` em token), acesso por tenant e bloqueio explícito do **namespace legado**:

```text
match /users/{userId} {
  allow read, write: if false;
}
```

Isso evita vazamento cross-tenant no caminho antigo enquanto o produto migra para `tenants/{tenantId}/...`.

### 4.2. XSS e Consultor IA

No legado, `innerHTML` sem sanitização é risco conhecido. No React, o escape padrão ajuda; porém **`Consultant.tsx`** usa `dangerouslySetInnerHTML` para mensagens da IA.

**Mitigação já presente:** a função `formatReply` escapa `<` e `>` **antes** de aplicar markdown simples (`**bold**`, quebras de linha), o que reduz XSS se **todas** as respostas da IA passarem por `formatReply` e não houver outro caminho que injete HTML bruto.

**Recomendação:** manter auditoria de qualquer `setMessages` / conteúdo HTML; para paranoia operacional, considerar **allowlist** (ex.: DOMPurify) no HTML final.

---

## 5. Performance

### 5.1. Gargalos

1. **Documento único / payload grande:** carregar todo o histórico de uma vez pesa banda e CPU (ex.: score iterando lançamentos no cliente).
2. **Reescrita de arrays:** atualizar o documento inteiro com listas grandes é custoso em writes e conflitos.

### 5.2. Otimizações já adotadas

- **Manual chunks** no Vite (`vendor-react`, `vendor-firebase`, `vendor-pdf`, `vendor-ui`) para cache de terceiros.
- **Lazy routes** para reduzir JS inicial.

---

## 6. Recomendações priorizadas

### Prioridade alta (curto prazo)

1. **Migração de dados para subcoleções** — Ex.: `users/{uid}/entries/{entryId}` (ou equivalente no path multi-tenant), para fugir do limite de 1 MB e permitir queries por intervalo.
2. **Paginação / janela inicial** — Carregar só últimos 30–60 dias (ou N documentos) no primeiro paint; buscar o restante sob demanda.
3. **Plano de desligamento do legado** — Paridade com `docs/PARIDADE-REACT.md` (e testes de comparação visual); depois remover dependência do monólito em `public/app` para reduzir superfície XSS e manutenção dupla.

### Prioridade média (médio prazo)

4. **BFF** — Camada nas Functions para agregar dados pesados antes do cliente (alinhado a `docs/ARQUITETURA-FUTURA-ECOSSISTEMA.md`), útil para Consultor e dashboards.
5. **Debounce / batch de escrita** — Agrupar edições rápidas antes de persistir no Firestore.

### Prioridade baixa (longo prazo)

6. **Micro-frontends** — Avaliar Module Federation se o produto virar super-app com módulos muito independentes.
7. **Testes unitários** — Vitest (ou similar) para `calculateScore`, `financialProfile`, regras de negócio; complementa Playwright.

---

## 7. Referências no repositório

| Documento | Uso |
| :--- | :--- |
| `docs/PARIDADE-REACT.md` | Paridade legado × React |
| `docs/ARQUITETURA-FUTURA-ECOSSISTEMA.md` | Visão de ecossistema / BFF |
| `docs/COMPARACAO-VISUAL-PLAYWRIGHT.md` | Testes visuais |
| `firestore.rules` | Modelo de segurança atual |
| `vite.config.ts` | Chunks manuais |

---

*Fim do relatório (revisão incorporando tamanhos reais do legado, status WhatsApp, nuance Context/Zustand e mitigação parcial no Consultor).*
