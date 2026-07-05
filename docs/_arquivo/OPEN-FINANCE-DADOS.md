# Open Finance (Pluggy) — dados vs Soluções

## O que é o quê

| | Descrição |
|---|-----------|
| **Soluções** (`/solucoes/*`) | Páginas comerciais com parceiros (crédito, seguro, consórcio, investimentos parceiros). São **ofertas e conteúdo de produto**, não a ingestão automática de dados do banco via Open Finance. |
| **Dados Open Finance** | Informação devolvida pela **API Pluggy** após o usuário conectar e consentir. Tratada na Cloud Function **`pluggySyncAccounts`** e gravada em `users/{uid}` (e subcoleções quando aplicável). |

Não confundir as duas coisas no código nem na comunicação com o usuário.

## Onde está o inventário técnico

- **`functions/services/pluggy/openFinanceResourceCatalog.js`** — lista recursos Pluggy (método, descrição, onde guardamos no Sibanki, status: `synced` / `partial` / `planned` / `not_connector`).
- **`functions/services/pluggy/pluggySyncService.js`** — orquestração da sync (contas, lançamentos, cartões, investimentos, empréstimos, identidade, faturas de cartão `bills`, consentimentos).
- **`functions/services/pluggy/syncOpenFinanceExtras.js`** — identidade (documentos mascarados), faturas de cartão, consentimentos.
- **`functions/services/pluggy/entryOverflow.js`** — quando o documento do usuário chega ao limite, lançamentos Pluggy antigos vão para `users/{uid}/entriesOverflow/`.

## Campos principais no Firestore (`users/{uid}`)

| Campo | Conteúdo |
|-------|-----------|
| `openFinanceItems` | IDs dos itens Pluggy conectados |
| `openFinanceSyncedAt` / `openFinanceLastSyncSummary` | Última sync e contagens |
| `openFinanceDataSchemaVersion` | Versão do esquema (migrações) |
| `openFinanceIdentityByItem` | Snapshot de identidade por item (CPF/CNPJ mascarados) |
| `openFinanceCreditBills` | Faturas de **cartão** (API `bills`), não boletos DDA de concessionária |
| `openFinanceConsentsByItem` | Resumo de consentimentos por item |
| `accounts`, `accountBalances`, `accountMeta`, `entries`, `cards`, `investments`, `creditAccounts`, `creditObligations` | Demais dados já descritos no catálogo |

Tipos TypeScript: **`src/types/openFinance.ts`**, **`src/types/userData.ts`**.

## Boletos DDA e seguros “de API”

- **DDA / boletos de água, luz, etc.** — produto bancário específico; não é o mesmo que `fetchCreditCardBills`. Modelo preparado em `DdaBoleto` / `ddaStatus`; integração futura conforme fonte de dados.
- **Seguros via Open Finance Brasil** — depende de disponibilidade no conector; não misturar com a página Solução Seguro (parceiro).

## Deploy da sync

```bash
firebase deploy --only functions:pluggySyncAccounts
```

Regras Firestore para `entriesOverflow`: ver **`firestore.rules`** (`users/{userId}/entriesOverflow/{docId}`).
