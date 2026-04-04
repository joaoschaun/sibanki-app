const test = require("node:test");
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();
const { createUserService } = require("../services/user/userService");
const { createFirestoreMock } = require("./helpers/firestoreMock");

function createAdminMock() {
  return {
    firestore: {
      FieldValue: { serverTimestamp: () => "__ts__" },
    },
  };
}

test("registerUserInTenant falha quando tenant não existe", async () => {
  const service = createUserService({
    db: createFirestoreMock(),
    admin: createAdminMock(),
    tenantService: {
      PLAN_LIMITS: { starter: 100 },
      getTenantById: async () => null,
      getMasterTenant: async () => ({ id: "sibanki_master" }),
      setUserTenantClaims: async () => {},
    },
  });
  await assert.rejects(
    () => service.registerUserInTenant("missing", { uid: "u1" }),
    /Tenant não encontrado/
  );
});

test("createInvite cria código e TTL", async () => {
  const db = createFirestoreMock();
  const service = createUserService({
    db,
    admin: createAdminMock(),
    randomBytes: () => Buffer.from("A1B2C3D4", "hex"),
    nowMs: () => new Date("2026-01-01T00:00:00.000Z").getTime(),
    tenantService: {
      PLAN_LIMITS: { starter: 100 },
      getTenantById: async () => ({ id: "t1", plan: "starter" }),
      getMasterTenant: async () => ({ id: "sibanki_master" }),
      setUserTenantClaims: async () => {},
    },
  });

  const invite = await service.createInvite("t1", "admin1", { email: "User@Mail.com", role: "admin" });
  assert.equal(invite.code.length, 8);
  const saved = db.__docs.get(`tenants/t1/invites/${invite.code}`);
  assert.equal(saved.email, "user@mail.com");
  assert.equal(saved.role, "admin");
});

test("validateAndConsumeInvite valida e consome convite", async () => {
  const db = createFirestoreMock({
    "tenants/t1/invites/ABC12345": {
      status: "pending",
      email: "x@y.com",
      expiresAt: "2099-01-01T00:00:00.000Z",
    },
  });
  const service = createUserService({
    db,
    admin: createAdminMock(),
    nowMs: () => new Date("2026-01-01T00:00:00.000Z").getTime(),
    tenantService: {
      PLAN_LIMITS: { starter: 100 },
      getTenantById: async () => ({ id: "t1", plan: "starter" }),
      getMasterTenant: async () => ({ id: "sibanki_master" }),
      setUserTenantClaims: async () => {},
    },
  });

  const data = await service.validateAndConsumeInvite("t1", "abc12345", "x@y.com");
  assert.equal(data.status, "pending");
  const saved = db.__docs.get("tenants/t1/invites/ABC12345");
  assert.equal(saved.status, "consumed");
});

test("migrateLegacyUser retorna already-migrated quando já migrado", async () => {
  const db = createFirestoreMock({
    "users/u1": { email: "u1@mail.com" },
    "tenants/t1/users/u1": { migratedFrom: "legacy" },
  });
  const service = createUserService({
    db,
    admin: createAdminMock(),
    tenantService: {
      PLAN_LIMITS: { starter: 100 },
      getTenantById: async () => ({ id: "t1", plan: "starter" }),
      getMasterTenant: async () => ({ id: "sibanki_master" }),
      setUserTenantClaims: async () => {},
    },
  });

  const result = await service.migrateLegacyUser("u1", "t1");
  assert.equal(result.migrated, false);
  assert.equal(result.reason, "already-migrated");
});

test("registerUserInTenant registra usuário e atualiza claims", async () => {
  const db = createFirestoreMock();
  const calls = [];
  const service = createUserService({
    db,
    admin: createAdminMock(),
    tenantService: {
      PLAN_LIMITS: { starter: 100 },
      getTenantById: async () => ({ id: "t1", plan: "starter", userLimit: 100 }),
      getMasterTenant: async () => ({ id: "sibanki_master" }),
      setUserTenantClaims: async (uid, tenantId, role) => calls.push({ uid, tenantId, role }),
    },
  });

  const payload = await service.registerUserInTenant("t1", {
    uid: "u2",
    email: "U2@MAIL.com",
    displayName: "User 2",
    role: "admin",
  });
  assert.equal(payload.uid, "u2");
  assert.equal(payload.email, "u2@mail.com");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { uid: "u2", tenantId: "t1", role: "admin" });
});

test("migrateLegacyUser migra documento e subcoleções", async () => {
  const db = createFirestoreMock({
    "users/u3": { name: "Legacy User", email: "u3@mail.com" },
    "users/u3/transactions/tr1": { value: 10 },
    "users/u3/accounts/ac1": { bank: "XPTO" },
    "users/u3/categories/c1": { name: "Lazer" },
    "users/u3/goals/g1": { title: "Meta" },
    "users/u3/investments/i1": { symbol: "TESOURO" },
  });
  const calls = [];
  const service = createUserService({
    db,
    admin: createAdminMock(),
    tenantService: {
      PLAN_LIMITS: { starter: 100 },
      getTenantById: async () => ({ id: "t1", plan: "starter" }),
      getMasterTenant: async () => ({ id: "sibanki_master" }),
      setUserTenantClaims: async (...args) => calls.push(args),
    },
  });

  const result = await service.migrateLegacyUser("u3", "t1");
  assert.equal(result.migrated, true);
  assert.equal(result.copied.transactions, 1);
  assert.equal(result.copied.accounts, 1);
  assert.equal(result.copied.categories, 1);
  assert.equal(result.copied.goals, 1);
  assert.equal(result.copied.investments, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "u3");
  assert.equal(calls[0][1], "t1");
});
