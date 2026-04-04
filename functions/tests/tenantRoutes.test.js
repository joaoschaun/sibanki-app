const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const { createTenantRouter } = require("../services/tenant/tenantRoutes");

function passAuth(req, _res, next) {
  req.auth = {
    uid: "uid_test",
    email: "user@tenant.com",
    role: "admin",
    tenantId: "t1",
    email_verified: true,
  };
  next();
}

function withApp(router) {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/tenants", router);
  return app;
}

test("GET /resolve retorna tenant público", async () => {
  const router = createTenantRouter({
    resolveTenantByHost: async (host) => ({
      id: "t1",
      slug: "tenant-1",
      name: host ? "Tenant 1" : "Tenant fallback",
      branding: { appName: "Tenant 1" },
      features: { openFinance: true },
    }),
  });

  const app = withApp(router);
  const res = await request(app).get("/api/v1/tenants/resolve?host=tenant.sibanki.com.br");
  assert.equal(res.status, 200);
  assert.equal(res.body.id, "t1");
  assert.equal(res.body.features.openFinance, true);
});

test("POST /:id/invites/consume consome convite e registra usuário", async () => {
  const events = [];
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireEmailVerified: (_req, _res, next) => next(),
    validateAndConsumeInvite: async (tenantId, code, email) => {
      events.push({ type: "consume", tenantId, code, email });
      return { role: "user" };
    },
    registerUserInTenant: async (tenantId, payload) => {
      events.push({ type: "register", tenantId, payload });
      return payload;
    },
  });

  const app = withApp(router);
  const res = await request(app)
    .post("/api/v1/tenants/t1/invites/consume")
    .send({ code: "A1B2C3D4" });

  assert.equal(res.status, 201);
  assert.equal(res.body.ok, true);
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], {
    type: "consume",
    tenantId: "t1",
    code: "A1B2C3D4",
    email: "user@tenant.com",
  });
  assert.equal(events[1].type, "register");
  assert.equal(events[1].tenantId, "t1");
  assert.equal(events[1].payload.uid, "uid_test");
});

test("POST /:id/users retorna 400 sem uid", async () => {
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireTenantAdmin: (_req, _res, next) => next(),
    requireSameTenant: (_req, _res, next) => next(),
  });

  const app = withApp(router);
  const res = await request(app).post("/api/v1/tenants/t1/users").send({ email: "x@y.com" });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "uid obrigatório.");
});

test("PATCH /:id/branding atualiza branding para tenant admin", async () => {
  const calls = [];
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireTenantAdmin: (_req, _res, next) => next(),
    requireSameTenant: (_req, _res, next) => next(),
    requireEmailVerified: (_req, _res, next) => next(),
    updateTenantBranding: async (tenantId, branding, uid) => {
      calls.push({ tenantId, branding, uid });
      return { id: tenantId, branding };
    },
  });

  const app = withApp(router);
  const res = await request(app)
    .patch("/api/v1/tenants/t1/branding")
    .send({ primaryColor: "#000000" });

  assert.equal(res.status, 200);
  assert.equal(res.body.id, "t1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].uid, "uid_test");
  assert.equal(calls[0].branding.primaryColor, "#000000");
});

test("PATCH /:id/features bloqueia quando não for superadmin", async () => {
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireSuperAdmin: (_req, res) => res.status(403).json({ error: "Acesso restrito a superadmin." }),
  });

  const app = withApp(router);
  const res = await request(app)
    .patch("/api/v1/tenants/t1/features")
    .send({ openFinance: true });

  assert.equal(res.status, 403);
  assert.equal(res.body.error, "Acesso restrito a superadmin.");
});

test("PATCH /:id/features atualiza quando for superadmin", async () => {
  const calls = [];
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireSuperAdmin: (_req, _res, next) => next(),
    updateTenantFeatures: async (tenantId, features, uid) => {
      calls.push({ tenantId, features, uid });
      return { id: tenantId, features };
    },
  });

  const app = withApp(router);
  const res = await request(app)
    .patch("/api/v1/tenants/t1/features")
    .send({ openFinance: true });

  assert.equal(res.status, 200);
  assert.equal(res.body.features.openFinance, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].uid, "uid_test");
});

test("GET /:id/stats retorna agregados do tenant", async () => {
  const fakeDb = {
    collection: () => ({
      doc: () => ({
        collection: (name) => ({
          count: () => ({
            get: async () => ({
              data: () => ({ count: name === "users" ? 7 : 3 }),
            }),
          }),
        }),
      }),
    }),
  };

  const router = createTenantRouter({
    requireAuth: passAuth,
    requireTenantAdmin: (_req, _res, next) => next(),
    requireSameTenant: (_req, _res, next) => next(),
    db: fakeDb,
  });

  const app = withApp(router);
  const res = await request(app).get("/api/v1/tenants/t1/stats");

  assert.equal(res.status, 200);
  assert.equal(res.body.tenantId, "t1");
  assert.equal(res.body.usersCount, 7);
  assert.equal(res.body.invitesCount, 3);
});

test("GET /:id/stats bloqueia quando middleware negar permissão", async () => {
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireTenantAdmin: (_req, res) => res.status(403).json({ error: "Acesso restrito a admin do tenant." }),
    requireSameTenant: (_req, _res, next) => next(),
  });

  const app = withApp(router);
  const res = await request(app).get("/api/v1/tenants/t1/stats");
  assert.equal(res.status, 403);
  assert.equal(res.body.error, "Acesso restrito a admin do tenant.");
});

test("POST / cria tenant quando superadmin", async () => {
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireSuperAdmin: (_req, _res, next) => next(),
    createTenant: async (payload, uid) => ({
      id: "tenant_new",
      ...payload,
      createdBy: uid,
    }),
  });

  const app = withApp(router);
  const res = await request(app)
    .post("/api/v1/tenants")
    .send({ name: "Parceiro X", slug: "parceiro-x", plan: "starter" });

  assert.equal(res.status, 201);
  assert.equal(res.body.id, "tenant_new");
  assert.equal(res.body.createdBy, "uid_test");
  assert.equal(res.body.slug, "parceiro-x");
});

test("POST / retorna 400 quando serviço falha (ex: slug duplicado)", async () => {
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireSuperAdmin: (_req, _res, next) => next(),
    createTenant: async () => {
      throw new Error("Slug já existe.");
    },
  });

  const app = withApp(router);
  const res = await request(app)
    .post("/api/v1/tenants")
    .send({ name: "Parceiro Y", slug: "parceiro-x" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Slug já existe.");
});

test("GET /:id retorna tenant para admin", async () => {
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireSameTenant: (_req, _res, next) => next(),
    getTenantById: async (id) => ({ id, name: "Tenant 1" }),
  });

  const app = withApp(router);
  const res = await request(app).get("/api/v1/tenants/t1");
  assert.equal(res.status, 200);
  assert.equal(res.body.id, "t1");
  assert.equal(res.body.name, "Tenant 1");
});

test("GET /:id retorna 403 para role user", async () => {
  const router = createTenantRouter({
    requireAuth: (req, _res, next) => {
      req.auth = {
        uid: "u_user",
        email: "user@tenant.com",
        role: "user",
        tenantId: "t1",
        email_verified: true,
      };
      next();
    },
    requireSameTenant: (_req, _res, next) => next(),
    getTenantById: async (id) => ({ id, name: "Tenant 1" }),
  });

  const app = withApp(router);
  const res = await request(app).get("/api/v1/tenants/t1");
  assert.equal(res.status, 403);
  assert.equal(res.body.error, "Acesso negado.");
});

test("POST /:id/users com sendInvite=true retorna user + invite", async () => {
  const calls = [];
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireTenantAdmin: (_req, _res, next) => next(),
    requireSameTenant: (_req, _res, next) => next(),
    registerUserInTenant: async (tenantId, payload) => {
      calls.push({ type: "register", tenantId, payload });
      return { tenantId, ...payload };
    },
    createInvite: async (tenantId, inviterUid, payload) => {
      calls.push({ type: "invite", tenantId, inviterUid, payload });
      return { code: "INV12345", expiresAt: "2099-01-01T00:00:00.000Z" };
    },
  });

  const app = withApp(router);
  const res = await request(app)
    .post("/api/v1/tenants/t1/users")
    .send({
      uid: "u_new",
      email: "new@tenant.com",
      role: "user",
      sendInvite: true,
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.uid, "u_new");
  assert.equal(res.body.invite.code, "INV12345");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].type, "register");
  assert.equal(calls[1].type, "invite");
  assert.equal(calls[1].inviterUid, "uid_test");
});

test("GET /resolve retorna 500 quando serviço lança erro", async () => {
  const router = createTenantRouter({
    resolveTenantByHost: async () => {
      throw new Error("falha interna");
    },
  });

  const app = withApp(router);
  const res = await request(app).get("/api/v1/tenants/resolve?host=tenant.sibanki.com.br");
  assert.equal(res.status, 500);
  assert.equal(res.body.error, "falha interna");
});

test("GET /:id retorna 404 quando tenant não existe", async () => {
  const router = createTenantRouter({
    requireAuth: passAuth,
    requireSameTenant: (_req, _res, next) => next(),
    getTenantById: async () => null,
  });

  const app = withApp(router);
  const res = await request(app).get("/api/v1/tenants/t-missing");
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Tenant não encontrado.");
});

test("GET /:id/stats retorna 500 quando Firestore falha", async () => {
  const fakeDbError = {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          count: () => ({
            get: async () => {
              throw new Error("firestore down");
            },
          }),
        }),
      }),
    }),
  };

  const router = createTenantRouter({
    requireAuth: passAuth,
    requireTenantAdmin: (_req, _res, next) => next(),
    requireSameTenant: (_req, _res, next) => next(),
    db: fakeDbError,
  });

  const app = withApp(router);
  const res = await request(app).get("/api/v1/tenants/t1/stats");
  assert.equal(res.status, 500);
  assert.equal(res.body.error, "firestore down");
});
