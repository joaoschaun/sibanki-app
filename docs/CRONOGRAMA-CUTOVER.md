# Cronograma de Cutover: Legado → React

> Plano de migração progressiva do app legado (`public/app/`) para o React SPA (`dist/`).

---

## Pré-requisitos (antes de iniciar)

| Item | Status |
|---|---|
| Build React passa sem erros | ✅ |
| Todas as rotas carregam (smoke test) | ✅ |
| Feature flags funcionais | ✅ |
| Backup/restore JSON funcional | ✅ |
| OCR/STT expostos como Cloud Functions | ✅ |
| Importação CSV/OFX funcional | ✅ |
| Wizard de cadastro migrado | ✅ |
| Tour guiado (SpotlightTour) | ✅ |
| Programa de Filiados migrado | ✅ |
| Referral (`?ref=`) funcional | ✅ |
| PWA instalável (manifest + SW + ícones) | ✅ |
| Push notifications (FCM + background SW) | ✅ |
| Install/push prompts no onboarding | ✅ |
| Error Boundary com fallback + analytics | ✅ |
| Health-check endpoint (`/health`) | ✅ |
| Script pré-cutover: `node scripts/pre-cutover-check.mjs` | ✅ |
| Documentação de produção: `docs/CONFIGURACAO-PRODUCAO.md` | ✅ |
| DEEPSEEK_KEY configurada em produção | ⏳ Manual (ver docs) |
| VAPID_KEY configurada (.env) | ⏳ Manual (ver docs) |
| Testes com credenciais reais | ⏳ Manual |

---

## Fase A — Staging validado (Semana 1)

**Objetivo:** confirmar que o React staging funciona end-to-end com dados reais.

1. Configurar variáveis manuais (ver `docs/CONFIGURACAO-PRODUCAO.md`):
   - `DEEPSEEK_KEY` via `firebase functions:secrets:set`
   - `VITE_VAPID_KEY` no `.env` + rebuild
2. Rodar script de prontidão:
   ```bash
   node scripts/pre-cutover-check.mjs
   ```
3. Rodar testes com credenciais:
   ```powershell
   $env:TEST_EMAIL="email"; $env:TEST_SENHA="senha"
   npx playwright test --project=react-smoke
   ```
4. Validar manualmente os 5 fluxos críticos:
   - Login → Dashboard → ver dados reais
   - Lançamento manual + por foto + por voz
   - Importação CSV de extrato bancário
   - Consultor IA com contexto financeiro
   - Backup JSON → download → re-import
5. Testar push: ativar em Configurações, verificar token no Firestore
6. Testar PWA: instalar no celular, verificar offline
7. Corrigir bugs encontrados

**Critério de saída:** 0 erros críticos, todos os fluxos passam, pre-cutover-check 100%.

---

## Fase B — Beta controlado (Semana 2)

**Objetivo:** testar com usuários reais em paralelo ao legado.

1. Adicionar banner no legado: "Experimente a nova versão" → link staging
2. Convidar 5-10 usuários beta (via WhatsApp ou email)
3. Monitorar erros via Cloud Functions logs + console
4. Coletar feedback via formulário simples ou chat
5. Corrigir bugs reportados

**Critério de saída:** feedback positivo de >80% dos beta testers.

---

## ✅ Fase C — Cutover executado (04/04/2026)

**React é agora a produção.**

1. ✅ `firebase.json` atualizado: target `app` → `dist/` (React)
2. ✅ Target `legado` criado apontando para `public/` (rollback)
3. ✅ `scripts/prepare-dist.mjs` copia PWA assets para dist/
4. ✅ Deploy: `firebase deploy --only hosting:app`
5. ✅ Verificação pós-deploy: 22/22 checks passaram
6. ⏳ Monitorar por 7 dias

**Rollback:**
```bash
copy firebase.json.bak firebase.json
firebase deploy --only hosting:app
```

---

## Fase D — Desligamento do legado (Semana 5+)

**Objetivo:** remover código legado e simplificar infraestrutura.

1. Remover rota `/app-legado/` do `firebase.json`
2. Arquivar `public/app/` (mover para branch `legado-archive`)
3. Remover scripts de comparação visual legado
4. Atualizar documentação e README
5. Celebrar 🎉

---

## Rollback

Em qualquer fase, se houver problema crítico:

```bash
# Reverter firebase.json para apontar para public/
git checkout HEAD -- firebase.json
npm run deploy:app
```

O legado continua funcional enquanto os arquivos estiverem em `public/app/`.

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Perda de dados durante migração | Backup automático antes do cutover |
| Features do legado não migradas | Inventário rastreia 100% das features |
| Usuários não encontram funcionalidades | Tour guiado + banner de ajuda |
| Performance degradada | Code splitting + lazy loading já implementados |
| APIs de terceiros (Pluggy, BRAPI) falharem | Circuit breakers já implementados no backend |
| Erro JS derruba toda a página | ErrorBoundary por rota com retry + ir ao início |
| Push notifications falham silenciosamente | Tokens inválidos auto-limpos, logs com timer |
| Cutover sem validação completa | Script `pre-cutover-check.mjs` automatizado |
| Serviço backend degradado | Endpoint `/health` monitora Firestore, Auth e secrets |
