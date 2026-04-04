const test = require("node:test");
const assert = require("node:assert/strict");
const { createAuthMiddleware } = require("../middleware/auth");

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createAdminMock({ decoded, throws } = {}) {
  return {
    auth() {
      return {
        async verifyIdToken() {
          if (throws) throw throws;
          return decoded || {};
        },
      };
    },
  };
}

test("requireAuth retorna 401 sem bearer token", async () => {
  const { requireAuth } = createAuthMiddleware({ admin: createAdminMock() });
  const req = { headers: {}, params: {}, body: {} };
  const res = mockRes();
  let called = false;
  await requireAuth(req, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Token ausente.");
});

test("requireAuth retorna 401 token inválido/revogado", async () => {
  const { requireAuth } = createAuthMiddleware({
    admin: createAdminMock({ throws: new Error("revoked") }),
  });
  const req = { headers: { authorization: "Bearer abc" }, params: {}, body: {} };
  const res = mockRes();
  await requireAuth(req, res, () => {});
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Token inválido ou revogado.");
});

test("requireAuth retorna 403 claims inválidas", async () => {
  const { requireAuth } = createAuthMiddleware({
    admin: createAdminMock({ decoded: { uid: "u1", role: "admin" } }),
  });
  const req = { headers: { authorization: "Bearer abc" }, params: {}, body: {} };
  const res = mockRes();
  await requireAuth(req, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "Claims de tenant inválidas.");
});

test("requireAuth popula req.auth e chama next", async () => {
  const { requireAuth } = createAuthMiddleware({
    admin: createAdminMock({
      decoded: {
        uid: "u1",
        email: "user@mail.com",
        email_verified: true,
        tenantId: "t1",
        role: "admin",
      },
    }),
  });
  const req = { headers: { authorization: "Bearer abc" }, params: {}, body: {} };
  const res = mockRes();
  let called = false;
  await requireAuth(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(req.auth.uid, "u1");
  assert.equal(req.auth.tenantId, "t1");
  assert.equal(req.auth.role, "admin");
});

test("requireSuperAdmin bloqueia non-superadmin", () => {
  const { requireSuperAdmin } = createAuthMiddleware();
  const req = { auth: { role: "admin" }, params: {}, body: {} };
  const res = mockRes();
  let called = false;
  requireSuperAdmin(req, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});

test("requireTenantAdmin aceita admin e superadmin", () => {
  const { requireTenantAdmin } = createAuthMiddleware();
  const res1 = mockRes();
  const req1 = { auth: { role: "admin" }, params: {}, body: {} };
  let called1 = false;
  requireTenantAdmin(req1, res1, () => {
    called1 = true;
  });
  assert.equal(called1, true);

  const res2 = mockRes();
  const req2 = { auth: { role: "superadmin" }, params: {}, body: {} };
  let called2 = false;
  requireTenantAdmin(req2, res2, () => {
    called2 = true;
  });
  assert.equal(called2, true);
});

test("requireSameTenant valida tenantId e role", () => {
  const { requireSameTenant } = createAuthMiddleware();

  const reqMissing = { auth: { role: "admin", tenantId: "t1" }, params: {}, body: {} };
  const resMissing = mockRes();
  requireSameTenant(reqMissing, resMissing, () => {});
  assert.equal(resMissing.statusCode, 400);

  const reqDenied = { auth: { role: "admin", tenantId: "t1" }, params: { id: "t2" }, body: {} };
  const resDenied = mockRes();
  requireSameTenant(reqDenied, resDenied, () => {});
  assert.equal(resDenied.statusCode, 403);

  const reqAllowed = { auth: { role: "superadmin", tenantId: "x" }, params: { id: "t2" }, body: {} };
  const resAllowed = mockRes();
  let called = false;
  requireSameTenant(reqAllowed, resAllowed, () => {
    called = true;
  });
  assert.equal(called, true);
});

test("requireOwnerOrTenantAdmin valida owner/admin", () => {
  const { requireOwnerOrTenantAdmin } = createAuthMiddleware();

  const reqMissing = { auth: { uid: "u1", role: "user" }, params: {}, body: {} };
  const resMissing = mockRes();
  requireOwnerOrTenantAdmin(reqMissing, resMissing, () => {});
  assert.equal(resMissing.statusCode, 400);

  const reqDenied = { auth: { uid: "u1", role: "user" }, params: { userId: "u2" }, body: {} };
  const resDenied = mockRes();
  requireOwnerOrTenantAdmin(reqDenied, resDenied, () => {});
  assert.equal(resDenied.statusCode, 403);

  const reqOwner = { auth: { uid: "u1", role: "user" }, params: { userId: "u1" }, body: {} };
  const resOwner = mockRes();
  let called = false;
  requireOwnerOrTenantAdmin(reqOwner, resOwner, () => {
    called = true;
  });
  assert.equal(called, true);
});

test("requireEmailVerified permite superadmin e e-mail verificado", () => {
  const { requireEmailVerified } = createAuthMiddleware();

  const reqSuper = { auth: { role: "superadmin", email_verified: false }, params: {}, body: {} };
  const resSuper = mockRes();
  let calledSuper = false;
  requireEmailVerified(reqSuper, resSuper, () => {
    calledSuper = true;
  });
  assert.equal(calledSuper, true);

  const reqDenied = { auth: { role: "admin", email_verified: false }, params: {}, body: {} };
  const resDenied = mockRes();
  requireEmailVerified(reqDenied, resDenied, () => {});
  assert.equal(resDenied.statusCode, 403);

  const reqOk = { auth: { role: "admin", email_verified: true }, params: {}, body: {} };
  const resOk = mockRes();
  let calledOk = false;
  requireEmailVerified(reqOk, resOk, () => {
    calledOk = true;
  });
  assert.equal(calledOk, true);
});
