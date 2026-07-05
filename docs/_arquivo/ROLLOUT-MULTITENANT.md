# Rollout seguro - Multi-tenant (Sibanki)

## Objetivo
Publicar arquitetura multi-tenant sem vazamento cross-tenant e sem quebrar usuários legados.

## Ordem recomendada (staging -> produção)

1. **Deploy backend sem ativar regras restritivas ainda**
   - Deploy Cloud Functions com:
     - `middleware/auth.js`
     - `tenantService.js`
     - `tenantRoutes.js`
     - `userService.js`
     - trigger `onUserCreated`
     - endpoint `api` com `/api/v1/tenants`

2. **Criar tenant master**
   - Confirmar existência de `tenants/sibanki_master`.
   - Se não existir, criar via:
     - `POST /api/v1/tenants` (superadmin) ou
     - script de migração.

3. **Executar migração em DRY-RUN**
   - Rodar:
     - `node scripts/migrate-to-multitenant.js`
   - Validar relatório JSON:
     - usuários encontrados
     - erros
     - subcoleções migráveis

4. **Executar migração real**
   - Rodar:
     - `node scripts/migrate-to-multitenant.js --execute`
   - Validar:
     - documentos em `/tenants/sibanki_master/users/{uid}`
     - subcoleções migradas
     - claims com `tenantId` e `role`

5. **Smoke tests de API**
   - `GET /api/v1/tenants/resolve?host=...`
   - `POST /api/v1/tenants/:id/invites/consume`
   - `GET /api/v1/tenants/:id/stats`
   - Confirmar bloqueio de acesso fora do tenant.

6. **Publicar regras Firestore multi-tenant**
   - Deploy de `firestore.rules` apenas depois da migração.
   - Revalidar login, leitura e escrita dos usuários ativos.

7. **Ativar front-end com TenantProvider**
   - Publicar React com `TenantProvider` e fallback de branding.
   - Confirmar branding dinâmico por host.

8. **Monitoramento pós-go-live (24-72h)**
   - Erros 401/403 em Functions
   - Falhas de claims e token revogado
   - Taxa de sucesso no onboarding por convite
   - Latência de `resolveTenantByHost`

## Plano de rollback

1. Reverter frontend para build anterior (sem dependência do provider).
2. Reverter Functions para versão anterior.
3. Se necessário, restaurar regras legadas temporariamente para estabilização.
4. Não apagar dados migrados; manter trilha de auditoria (`migratedFrom`, `migratedAt`).

## Checklist final de produção

- [ ] `sibanki_master` existe
- [ ] Migração executada sem erros críticos
- [ ] Claims atualizadas para usuários ativos
- [ ] API multi-tenant respondendo
- [ ] Firestore rules publicadas após migração
- [ ] Testes de isolamento entre tenants aprovados
- [ ] Monitoramento ativo após deploy
