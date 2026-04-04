# API Multi-Tenant — Documentação

> Base URL: `https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/tenantApi`

---

## Autenticação

Todas as rotas (exceto `GET /resolve`) exigem **Bearer Token** no header `Authorization`.

```
Authorization: Bearer <Firebase ID Token>
```

O token deve conter custom claims:
- `tenantId` — ID do tenant ao qual o usuário pertence
- `role` — `user`, `admin` ou `superadmin`

---

## Roles e Permissões

| Role | Pode criar tenants | Gerenciar branding | Gerenciar features | Adicionar usuários | Ver stats |
|---|---|---|---|---|---|
| `superadmin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin` | ❌ | ✅ (próprio tenant) | ❌ | ✅ (próprio tenant) | ✅ |
| `user` | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Endpoints

### 1. Criar Tenant

```
POST /
```

**Acesso:** `superadmin`

**Body:**
```json
{
  "name": "Escritório Alpha",
  "slug": "escritorio-alpha",
  "plan": "starter",
  "domains": ["alpha.sibanki.com.br"],
  "branding": {
    "appName": "Alpha Finance",
    "primaryColor": "#3b82f6",
    "logoUrl": "https://..."
  },
  "features": {
    "openFinance": true,
    "whatsapp": true
  }
}
```

**Resposta:** `201 Created`
```json
{
  "id": "abc123",
  "name": "Escritório Alpha",
  "slug": "escritorio-alpha",
  "plan": "starter",
  "userLimit": 100,
  "domains": ["alpha.sibanki.com.br"],
  "branding": { "..." },
  "features": { "..." },
  "status": "active"
}
```

**Planos disponíveis:**
| Plano | Limite de usuários |
|---|---|
| `starter` | 100 |
| `growth` | 1.000 |
| `enterprise` | Ilimitado |

---

### 2. Resolver Tenant por Host

```
GET /resolve?host=alpha.sibanki.com.br
```

**Acesso:** Público (sem autenticação)

**Resposta:** `200 OK`
```json
{
  "id": "abc123",
  "slug": "escritorio-alpha",
  "name": "Escritório Alpha",
  "branding": {
    "appName": "Alpha Finance",
    "primaryColor": "#3b82f6",
    "secondaryColor": "#0ea5e9",
    "logoUrl": "",
    "faviconUrl": "",
    "customCss": ""
  },
  "features": {
    "openFinance": false,
    "whatsapp": true,
    "reports": true,
    "advisor": true
  }
}
```

**Erro:** `404` se nenhum tenant encontrado para o host.

> O frontend usa este endpoint no boot para resolver branding e features do tenant corrente.

---

### 3. Buscar Tenant por ID

```
GET /:id
```

**Acesso:** `admin` ou `superadmin` do mesmo tenant

**Resposta:** `200 OK` com o objeto completo do tenant.

---

### 4. Atualizar Branding

```
PATCH /:id/branding
```

**Acesso:** `admin` do tenant (email verificado) ou `superadmin`

**Body (parcial):**
```json
{
  "appName": "Alpha Pro",
  "primaryColor": "#10b981",
  "logoUrl": "https://..."
}
```

Campos não enviados mantêm o valor anterior (merge).

**Resposta:** `200 OK` com tenant atualizado.

---

### 5. Atualizar Features

```
PATCH /:id/features
```

**Acesso:** `superadmin` apenas

**Body (parcial):**
```json
{
  "openFinance": true
}
```

**Resposta:** `200 OK` com tenant atualizado.

**Features padrão:**
```json
{
  "openFinance": false,
  "whatsapp": true,
  "reports": true,
  "advisor": true
}
```

---

### 6. Adicionar Usuário ao Tenant

```
POST /:id/users
```

**Acesso:** `admin` do tenant

**Body:**
```json
{
  "uid": "firebase-user-uid",
  "email": "user@example.com",
  "role": "user",
  "sendInvite": false
}
```

Se `sendInvite: true` e `email` fornecido, também gera um convite.

**Resposta:** `201 Created`
```json
{
  "user": {
    "uid": "...",
    "email": "...",
    "role": "user",
    "tenantId": "abc123"
  },
  "invite": { "code": "A1B2C3D4", "expiresAt": "2026-04-07T..." }
}
```

---

### 7. Consumir Convite (Onboarding)

```
POST /:id/invites/consume
```

**Acesso:** Qualquer usuário autenticado (email verificado)

**Body:**
```json
{
  "code": "A1B2C3D4"
}
```

**Validações:**
- Código deve estar `pending`
- Email do token deve coincidir com o email do convite
- Convite não pode ter expirado (TTL: 72 horas)

**Resposta:** `201 Created`
```json
{
  "ok": true,
  "tenantId": "abc123",
  "user": { "uid": "...", "role": "user" }
}
```

**Erros:**
- `400` — código inválido, email não confere, convite expirado, convite já consumido

---

### 8. Estatísticas do Tenant

```
GET /:id/stats
```

**Acesso:** `admin` do tenant

**Resposta:** `200 OK`
```json
{
  "tenantId": "abc123",
  "usersCount": 47,
  "invitesCount": 12
}
```

---

## Cache

O serviço de tenant mantém um cache em memória com TTL de 5 minutos:
- Cache por `id`, `slug`, e cada `domain`
- Invalidado automaticamente em updates de branding e features
- Sem necessidade de ação manual

---

## Modelo Firestore

```
tenants/
  {tenantId}/
    name, slug, plan, userLimit, domains[], status
    branding { appName, primaryColor, secondaryColor, logoUrl, faviconUrl, customCss }
    features { openFinance, whatsapp, reports, advisor }
    createdBy, createdAt, updatedAt
    
    config/
      default/ { locale, currency, timezone }
    
    categories/
      {auto}/ { name, type, order }
    
    users/
      {uid}/ { uid, email, displayName, role, tenantId, ownerId }
    
    invites/
      {code}/ { tenantId, code, email, role, invitedBy, status, expiresAt }
```

---

## Migração de Usuário Legado

O `userService` inclui `migrateLegacyUser(uid, targetTenantId)`:

1. Lê documento de `users/{uid}` (legado)
2. Copia para `tenants/{tenantId}/users/{uid}` com flag `migratedFrom: "legacy"`
3. Copia subcoleções: `transactions`, `accounts`, `categories`, `goals`, `investments`
4. Define custom claims para o novo tenant

Uso:
```javascript
const { migrateLegacyUser } = require('./services/user/userService');
const result = await migrateLegacyUser('uid123', 'tenant_abc');
// { uid, migrated: true, copied: { transactions: 150, accounts: 3, ... } }
```

---

## Auth Trigger (Auto-registro)

Quando um novo usuário é criado no Firebase Auth, o trigger `onUserCreated` registra-o automaticamente no tenant master (`sibanki_master`):

```javascript
exports.onUserCreated = functions.auth.user().onCreate(userService.onUserCreated);
```

---

## Erros Comuns

| Código | Mensagem | Causa |
|---|---|---|
| 401 | Token ausente | Header Authorization faltando |
| 401 | Token inválido ou revogado | Token expirado ou revogado |
| 403 | Claims de tenant inválidas | Usuário sem tenantId no token |
| 403 | Acesso restrito a superadmin | Role insuficiente |
| 403 | Tenant não autorizado | Tentativa de acessar outro tenant |
| 403 | E-mail não verificado | Email não confirmado |
| 400 | Slug já existe | Slug duplicado ao criar tenant |
| 400 | Limite de usuários atingido | Plano excedido |
