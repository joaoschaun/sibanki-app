const test = require("node:test");
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();
const { createTenantService } = require("../services/tenant/tenantService");
const { createFirestoreMock } = require("./helpers/firestoreMock");

function createAdminMock(customClaims = {}) {
  const state = { claimsWritten: null };
  return {
    firestore: {
      FieldValue: { serverTimestamp: () => "__ts__" },
    },
    auth() {
      return {
        async getUser() {
          return { customClaims };
        },
        async setCustomUserClaims(_uid, claims) {
          state.claimsWritten = claims;
        },
      };
    },
    __state: state,
  };
}

test("resolveTenantByHost usa cache após primeira consulta", async () => {
  const db = createFirestoreMock({
    "tenants/t1": { slug: "t1", domains: ["foo.sibanki.com.br"] },
  });
  const service = createTenantService({ db, admin: createAdminMock(), cache: new Map() });

  const first = await service.resolveTenantByHost("https://foo.sibanki.com.br/path");
  const second = await service.resolveTenantByHost("foo.sibanki.com.br");

  assert.equal(first.id, "t1");
  assert.equal(second.id, "t1");
});

test("setUserTenantClaims normaliza role inválida", async () => {
  const adminMock = createAdminMock({ keep: true });
  const service = createTenantService({ db: createFirestoreMock(), admin: adminMock, cache: new Map() });
  const claims = await service.setUserTenantClaims("u1", "tenant_a", "invalid-role");
  assert.equal(claims.role, "user");
  assert.equal(claims.tenantId, "tenant_a");
  assert.equal(adminMock.__state.claimsWritten.keep, true);
});

test("verifyUserTenant retorna ok quando claims e doc batem", async () => {
  const db = createFirestoreMock({
    "tenants/t1/users/u1": { tenantId: "t1" },
  });
  const adminMock = createAdminMock({ tenantId: "t1", role: "admin" });
  const service = createTenantService({ db, admin: adminMock, cache: new Map() });
  const result = await service.verifyUserTenant("u1", "t1");
  assert.equal(result.ok, true);
  assert.equal(result.inTenantCollection, true);
  assert.equal(result.role, "admin");
});

test("createTenant falha com slug duplicado", async () => {
  const db = createFirestoreMock({
    "tenants/existente": { slug: "dup", domains: [] },
  });
  const service = createTenantService({ db, admin: createAdminMock(), cache: new Map() });
  await assert.rejects(
    () => service.createTenant({ name: "Dup", slug: "dup" }, "uid_admin"),
    /Slug já existe/
  );
});

test("createTenant cria tenant com config padrão", async () => {
  const db = createFirestoreMock();
  const service = createTenantService({ db, admin: createAdminMock(), cache: new Map() });
  const created = await service.createTenant(
    {
      tenantId: "tenant_new",
      name: "Parceiro Novo",
      slug: "parceiro-novo",
      plan: "growth",
      domains: ["https://parceiro.exemplo.com.br/app"],
    },
    "uid_admin"
  );

  assert.equal(created.id, "tenant_new");
  const tenantDoc = db.__docs.get("tenants/tenant_new");
  assert.equal(tenantDoc.slug, "parceiro-novo");
  assert.equal(tenantDoc.userLimit, 1000);
  assert.deepEqual(tenantDoc.domains, ["parceiro.exemplo.com.br"]);
  assert.equal(db.__operations.commits > 0, true);
});

test("updateTenantBranding atualiza branding existente", async () => {
  const db = createFirestoreMock({
    "tenants/t1": {
      slug: "tenant-1",
      domains: ["t1.exemplo.com"],
      branding: { appName: "Old", primaryColor: "#111111" },
    },
  });
  const service = createTenantService({ db, admin: createAdminMock(), cache: new Map() });
  const out = await service.updateTenantBranding("t1", { appName: "New Name" }, "uid_admin");
  assert.equal(out.id, "t1");
  assert.equal(out.branding.appName, "New Name");
  assert.equal(out.branding.primaryColor, "#111111");
});

test("updateTenantFeatures atualiza features existentes", async () => {
  const db = createFirestoreMock({
    "tenants/t2": {
      slug: "tenant-2",
      domains: [],
      features: { openFinance: false, reports: true },
    },
  });
  const service = createTenantService({ db, admin: createAdminMock(), cache: new Map() });
  const out = await service.updateTenantFeatures("t2", { openFinance: true }, "uid_admin");
  assert.equal(out.id, "t2");
  assert.equal(out.features.openFinance, true);
  assert.equal(out.features.reports, true);
});
