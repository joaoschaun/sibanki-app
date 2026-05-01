# CHANGELOG — Sibanki / virtus-financeiro

Formato baseado em [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Datas no formato `YYYY-MM-DD` (ISO 8601). Linguagem: PT-BR.

> **Política:** este é o changelog incremental do projeto. Use-o para registrar
> features fechadas, bug fixes, mudanças de governança IA, etc., **por sessão**.
> Não use o `CLAUDE.md` para acumular histórico de sessão (a regra está em
> `AGENTS.md` §8).
>
> O histórico antigo, anterior à introdução deste arquivo (26/04/2026), pode
> estar em `CLAUDE.md` (seções "ATUALIZAÇÃO DE SESSÃO …") até que seja migrado
> manualmente para cá. O CHANGELOG raiz (`/CHANGELOG.md`) é o changelog
> orientado a usuário/produto; este aqui é orientado a engenharia.

---

## [Unreleased]

### Adicionado — Governança IA
- `AGENTS.md` (raiz) — regras universais para qualquer agente de IA
  (Claude Cowork, Cursor, Antigravity). Inclui matriz de responsabilidade,
  convenções de commit, limites duros, política de webhook fail-closed.
- `.cursorrules` (raiz) — entrada principal para Cursor IDE; aponta para
  `AGENTS.md` como fonte única de verdade.
- `.editorconfig` (raiz) — padroniza EOL/charset/indent entre Cursor e Claude.
- `docs/CHANGELOG.md` — este arquivo.

### Alterado — Governança IA
- `.cursor/rules/global.mdc` — refletir estado atual: dados financeiros vêm de
  Context API (`AppContext`/`IntelligenceContext`), Zustand é só para UI state.
  A regra antiga dizia "evite Context API para dados financeiros" — contradizia
  100% do código real. Adicionada nota explícita sobre precedência do
  `AGENTS.md`.
- `.cursor/rules/deploy.mdc` — refletir cutover concluído (React SPA é
  produção, legado é fallback de rollback). Tabela de targets atualizada.
- `.cursor/rules/legado.mdc` — modo manutenção; desencoraja features novas em
  `public/app/`.
- `.cursor/rules/segunda.mdc` — marcado obsoleto (DEEPSEEK_KEY já configurada).

### Segurança
- **SEG-02** `functions/services/affiliate/affiliateWebhookService.js` —
  webhook de afiliado agora é **fail-CLOSED** quando o secret não está
  configurado. Antes: `if (!expected) return { ok: true, mode: "disabled" }`
  (qualquer atacante forjava conversões e ganhava SibCoin). Agora: retorna
  `503 Webhook secret not configured`. Em DEV, libera com
  `NODE_ENV=development` ou `SIBANKI_ALLOW_UNSAFE_WEBHOOK=1`.
  - Mensagem `[SEG-02]` no log do Cloud Functions facilita identificar a causa
    quando produção rejeitar requests por falta de secret.
- **SEG-03** `functions/index.js` — `creditarCashbackSibCoin` corrigida:
  agora lê `data.uid` (alvo do crédito) em vez de `context.auth.uid` (admin).
  Antes: admin só conseguia auto-creditar SibCoin. Adicionada validação de
  uid alvo + verificação que o usuário existe + auditoria com `actorUid` e
  `actorEmail` no `cashback_log`.
- **SEG-04** `functions/config.js` — `WHATSAPP_VERIFY_TOKEN` perde o default
  público `"sibanki_wa_verify"`. Agora defaulta para empty string.
  - `functions/index.js` `whatsappWebhook` — retorna `503 WhatsApp webhook
    not configured` quando o env não estiver setado, em vez de aceitar o
    default público.
- **SEG-06** `scripts/migrate-to-multitenant.js` — `SUBCOLLECTIONS` ampliado
  de 5 para 11 itens. Adicionados: `entriesOverflow`, `errorLogs`,
  `openFinanceConsents`, `auditLogs`, `sibcoin`, `filiado`. Sem isso, a
  migração causa loss silencioso de dados de Open Finance e SibCoin.

### Documentação
- `AUDITORIA_SENIOR_SIBANKI.docx` (gerado fora do repo, em
  `OneDrive\Documentos\Claude\Projects\sibanki\`) — auditoria sênior 38 achados
  (6 críticos, 14 altos, 13 médios, 5 baixos) que motivou todas as mudanças
  acima.
- `PATCHES_FASE_1_2.md` (raiz) — relatório dos arquivos tocados nesta sessão
  com comandos `git` recomendados.

### Pendente (Semanas 3-4 da auditoria, não fechadas nesta sessão)
- CI no front (GitHub Actions com tsc + vitest + build em todo PR).
- ESLint flat config com `@typescript-eslint` + restrição a `any`.
- `firebase deploy --only firestore:rules,storage:rules` no fluxo de release.
- Trocar `npm install` por `npm ci` em scripts de deploy.
- Quebrar `functions/index.js` (1500+ linhas) em domínios.
- Quebrar `AppContext.tsx` em slices ou contextos por domínio.
- Converter `src/hooks/useTenant.js` para TypeScript.
- Adicionar testes Vitest para `sovereigntyEngine` e `decisionEngine`.

---

## Histórico anterior

Para sessões anteriores a 2026-04-26, consulte:
- `CLAUDE.md` — seções "ATUALIZAÇÃO DE SESSÃO …" (a serem migradas para cá).
- `/CHANGELOG.md` (raiz) — changelog orientado a produto/30 ações de expansão.
