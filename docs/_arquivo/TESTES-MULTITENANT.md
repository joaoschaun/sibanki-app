# Testes Multi-tenant (Sibanki)

## Objetivo
Documentar como validar a arquitetura multi-tenant no backend (Cloud Functions), incluindo suíte de testes e cobertura mínima para CI.

## Comandos principais

No diretório `functions/`:

- Rodar testes:
  - `npm test`
- Rodar cobertura:
  - `npm run test:coverage`

## Escopo atual da suíte

### Rotas (`tenantRoutes`)
- Resolução pública de tenant por host
- Criação de tenant (superadmin)
- Consulta de tenant por id com regras de acesso
- Atualização de branding e features
- Cadastro de usuário no tenant
- Consumo de convite por código
- Estatísticas do tenant
- Cenários de erro (`400`, `403`, `404`, `500`)

### Serviços (`tenantService`)
- Resolução por host com cache
- Claims de tenant/role
- Verificação de pertencimento do usuário ao tenant
- Criação de tenant e validação de slug único
- Atualização de branding/features

### Serviços (`userService`)
- Registro de usuário em tenant e limite de plano
- Criação/consumo de convites
- Migração de usuário legado (incluindo subcoleções)

### Middleware (`auth`)
- `requireAuth` (token ausente, inválido/revogado, claims inválidas, sucesso)
- `requireSuperAdmin`
- `requireTenantAdmin`
- `requireSameTenant`
- `requireOwnerOrTenantAdmin`
- `requireEmailVerified`

## Baseline de cobertura atual

Referência (última execução):

- **All files**
  - Statements: **91.15%**
  - Branches: **66.66%**
  - Functions: **91.89%**
  - Lines: **91.15%**

- **`middleware/auth.js`**
  - Statements: **97.27%**
  - Branches: **90%**
  - Functions: **100%**
  - Lines: **97.27%**

- **`services/tenant/tenantRoutes.js`**
  - Lines: **91.56%**

- **`services/tenant/tenantService.js`**
  - Lines: **88.34%**

- **`services/user/userService.js`**
  - Lines: **91.84%**

## Recomendação para CI

Executar em pipeline (job de backend):

1. `npm ci` (em `functions/`)
2. `npm test`
3. `npm run test:coverage`

Gates sugeridos:

- `lines >= 85%`
- `functions >= 85%`
- `branches >= 60%`

## Critérios de aceite antes de deploy

- [ ] Testes passando (`npm test`)
- [ ] Cobertura dentro do baseline mínimo
- [ ] Regras Firestore e rotas multi-tenant validadas em staging
- [ ] Migração validada em DRY-RUN antes de execução real
