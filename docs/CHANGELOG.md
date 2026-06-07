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

### Alterado
- **Modularização das Cloud Functions**: Concluída a divisão do arquivo principal `functions/index.js` (reduzido de 1500+ linhas para ~350 linhas de exportações diretas) em controladores de domínio separados e organizados na pasta `functions/services/`:
  - [whatsappController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/whatsapp/whatsappController.js): Webhook, códigos de vinculação e convites via WhatsApp (modo Família, Consórcio, Credi Amigo e resumo semanal).
  - [sentinelController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/sentinel/sentinelController.js): Validação geográfica do Sentinela GPS e relatórios agendados semanais.
  - [pushController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/push/pushController.js): Disparos diários de orçamento/faturas e envio de notificações manuais.
  - [affiliateController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/affiliate/affiliateController.js): Integração de catálogo Lomadee, webhooks de afiliados, registro de cliques e emissão manual/automática de cashback em SibCoin.
  - Mapeadas as funções de convite adicionais para o [emailController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/email/emailController.js) (consórcio e empréstimo entre amigos) e funções de captura para o [assistantController.js](file:///c:/Users/jscha/virtus-financeiro/functions/services/assistant/assistantController.js) (OCR e STT de voz para lançamentos).
- **Correção de Sintaxe no Servidor**: Removida uma instrução `catch` orfã deixada na extração parcial do `proactiveInsightApi` que quebrava o carregamento do `index.js`.
- **Suporte a Transações no Mock do Firestore**: Modificado [firestoreMock.js](file:///c:/Users/jscha/virtus-financeiro/functions/tests/helpers/firestoreMock.js) para incluir suporte a `db.doc()` na raiz e `db.runTransaction()`, permitindo simulação de transações atômicas locais em testes unitários do backend.

### Adicionado
- **Suíte de Testes para Rate Limit e Quotas de IA (SEG-12)**: Criada a suíte de testes unitários [chatRateLimiter.test.js](file:///c:/Users/jscha/virtus-financeiro/functions/tests/chatRateLimiter.test.js) cobrindo comportamento feliz, bypass em desenvolvimento, bloqueios por quota diária com base no plano, burst limits (30 reqs/min), leitura dinâmica de plano no banco de dados e tolerância a falhas (fail-open).
- **Fallback de Onboarding para Ld (Dias de Liberdade)**: Lógica no `sovereigntyEngine.ts` que utiliza dados de estimativas coletados no onboarding (`cadastroCompleto` contendo rendaEstimada, gastosEstimados, reservaEstimada, criptoEstimada) como fallback para cálculo de Dias de Liberdade caso o usuário não tenha cadastrado contas ou lançamentos reais.
- **Identificação Visual de Estimativa**: `SovereigntyHero` agora exibe uma badge de aviso específica (`baseado em estimativas do cadastro...`) caso o cálculo do Ld dependa desses dados provisórios, incentivando a conexão do Open Finance ou digitação manual.
- **Testes Unitários do Motor de Decisão (`decisionEngine.test.ts`)**: Criada a suíte de testes com 12 novos casos de teste cobrindo todas as ramificações de cálculos do motor (À vista vs. parcelado com descontos/pressão de crédito, estratégias de quitação de dívidas Avalanche vs. Bola de Neve, amortizações usando o FGTS e dimensionamento de reservas de emergência para diferentes perfis profissionais).

### Alterado
- **Correção da Navegação do Modo Visual (Painel)**: Ajustado `AppModeToggle` para garantir que, ao clicar em "Painel" a partir de qualquer subpágina da visão visual (como `/configuracoes` ou `/lancamentos`), o usuário seja redirecionado de volta para `/dashboard`. Corrigida também a sincronização em `useUiStore.ts` (`syncRoute`), ignorando as rotas `/` e `/login` para evitar que sobreponham o último caminho visual visitado com rotas de redirecionamento genéricas.
- **Navegação do Logotipo de Marca**: O logotipo em `Sidebar.tsx` foi envolvido em um `<Link to="/dashboard">` para permitir acesso rápido à home/dashboard de qualquer página.
- **Hierarquia Visual e Identidade**: Movido `<SovereigntyHero>` para o topo do `Dashboard.tsx` (logo abaixo do `<CoachSetup>`), priorizando os indicadores de Dias de Liberdade (Ld) e o brilho radial da marca.

### Adicionado — Governança IA
- `AGENTS.md` (raiz) — regras universais para qualquer agente de IA
  (Claude Cowork, Cursor, Antigravity). Inclui matriz de responsabilidade,
  convenções de commit, limites duros, política de webhook fail-closed.
- `.cursorrules` (raiz) — entrada principal para Cursor IDE; aponta para
  `AGENTS.md` como fonte única de verdade.
- `.editorconfig` (raiz) — padroniza EOL/charset/indent entre Cursor e Claude.
- `docs/CHANGELOG.md` — este arquivo.

### Alterado — Governança IA
- `AGENTS.md` (raiz) — Atualizado para a versão 1.1 sob autorização do João, permitindo à IA (Antigravity) executar comandos de deploy sob demanda direta no chat.
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
