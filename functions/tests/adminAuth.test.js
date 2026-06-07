const { describe, it, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
const { createFirestoreMock } = require("./helpers/firestoreMock");

if (!admin.apps.length) {
  admin.initializeApp();
}

const originalFirestore = Object.getOwnPropertyDescriptor(admin, "firestore");
const originalAuth = Object.getOwnPropertyDescriptor(admin, "auth");

const dbMock = createFirestoreMock();

const mockedFirestoreFunc = () => dbMock;
mockedFirestoreFunc.FieldValue = {
  serverTimestamp: () => new Date(),
};

const claimsByUid = new Map();
const usersByEmail = new Map();
const usersByUid = new Map();

const mockedAuthFunc = () => {
  return {
    async setCustomUserClaims(uid, claims) {
      claimsByUid.set(uid, claims);
    },
    async getUser(uid) {
      if (!usersByUid.has(uid)) {
        throw new Error("user-not-found");
      }
      return usersByUid.get(uid);
    },
    async getUserByEmail(email) {
      const normalized = String(email).toLowerCase();
      if (!usersByEmail.has(normalized)) {
        throw new Error("user-not-found");
      }
      return usersByEmail.get(normalized);
    }
  };
};

Object.defineProperty(admin, "firestore", {
  value: mockedFirestoreFunc,
  configurable: true,
  writable: true,
});

Object.defineProperty(admin, "auth", {
  value: mockedAuthFunc,
  configurable: true,
  writable: true,
});

const {
  validateAdminAccessLogic,
  revokeAdminAccessLogic,
  grantAdminAccessLogic,
  listAdminsLogic,
} = require("../services/admin/adminAuth");

describe("adminAuth tests", { concurrency: false }, () => {
  beforeEach(() => {
    dbMock.__docs.clear();
    dbMock.__operations.sets = [];
    dbMock.__operations.batchSets = [];
    dbMock.__operations.commits = 0;
    claimsByUid.clear();
    usersByEmail.clear();
    usersByUid.clear();
  });

  after(() => {
    if (originalFirestore) {
      Object.defineProperty(admin, "firestore", originalFirestore);
    }
    if (originalAuth) {
      Object.defineProperty(admin, "auth", originalAuth);
    }
  });

  // ── validateAdminAccessLogic ───────────────────────────────────────────────────
  it("validateAdminAccessLogic: rejeita se não autenticado", async () => {
    await assert.rejects(
      () => validateAdminAccessLogic({}, {}),
      (err) => {
        assert.equal(err.code, "unauthenticated");
        return true;
      }
    );
  });

  it("validateAdminAccessLogic: nega acesso se e-mail não estiver na coleção admins", async () => {
    const context = {
      auth: {
        uid: "user_normal",
        token: { email: "normal@example.com" }
      }
    };

    await assert.rejects(
      () => validateAdminAccessLogic({}, context),
      (err) => {
        assert.equal(err.code, "permission-denied");
        assert.match(err.message, /Acesso negado/);
        return true;
      }
    );
  });

  it("validateAdminAccessLogic: concede acesso e claim admin se e-mail constar em admins", async () => {
    // Cadastra e-mail do admin no mock do firestore
    dbMock.__docs.set("admins/adm@example.com", {
      addedBy: "super",
      addedAt: new Date()
    });

    const context = {
      auth: {
        uid: "user_adm",
        token: { email: "adm@example.com" }
      }
    };

    const res = await validateAdminAccessLogic({}, context);
    assert.equal(res.admin, true);
    assert.equal(res.alreadyGranted, false);
    
    // Verifica se setCustomUserClaims foi chamado com admin: true
    assert.deepEqual(claimsByUid.get("user_adm"), { admin: true });
  });

  it("validateAdminAccessLogic: retorna alreadyGranted se token já possui a claim", async () => {
    dbMock.__docs.set("admins/adm@example.com", {
      addedBy: "super",
    });

    const context = {
      auth: {
        uid: "user_adm",
        token: { email: "adm@example.com", admin: true }
      }
    };

    const res = await validateAdminAccessLogic({}, context);
    assert.equal(res.admin, true);
    assert.equal(res.alreadyGranted, true);
    
    // setCustomUserClaims não deve ter sido chamado para o uid, pois já possui a claim no token
    assert.equal(claimsByUid.has("user_adm"), false);
  });

  // ── grantAdminAccessLogic ──────────────────────────────────────────────────────
  it("grantAdminAccessLogic: rejeita se caller não for admin", async () => {
    const context = {
      auth: {
        uid: "user_normal",
        token: { email: "normal@example.com" } // Sem claim admin: true
      }
    };

    await assert.rejects(
      () => grantAdminAccessLogic({ email: "novo@example.com" }, context),
      (err) => {
        assert.equal(err.code, "permission-denied");
        return true;
      }
    );
  });

  it("grantAdminAccessLogic: adiciona admin à coleção e atribui claim se usuário já existir", async () => {
    const context = {
      auth: {
        uid: "user_adm",
        token: { email: "adm@example.com", admin: true }
      }
    };

    // Usuário que será promovido existe no Auth
    usersByEmail.set("promovido@example.com", { uid: "uid_promovido", email: "promovido@example.com" });

    const res = await grantAdminAccessLogic({ email: "promovido@example.com" }, context);
    assert.equal(res.success, true);
    assert.equal(res.email, "promovido@example.com");

    // Verifica gravação no Firestore
    const doc = dbMock.__docs.get("admins/promovido@example.com");
    assert.ok(doc);
    assert.equal(doc.addedBy, "user_adm");

    // Verifica se a claim de admin foi setada imediatamente no Auth
    assert.deepEqual(claimsByUid.get("uid_promovido"), { admin: true });
  });

  // ── revokeAdminAccessLogic ─────────────────────────────────────────────────────
  it("revokeAdminAccessLogic: nega se caller não for admin", async () => {
    const context = {
      auth: {
        uid: "user_normal",
        token: { email: "normal@example.com" }
      }
    };

    await assert.rejects(
      () => revokeAdminAccessLogic({ email: "adm@example.com" }, context),
      (err) => {
        assert.equal(err.code, "permission-denied");
        return true;
      }
    );
  });

  it("revokeAdminAccessLogic: remove da coleção e remove claims via targetUid", async () => {
    const context = {
      auth: {
        uid: "user_adm",
        token: { email: "adm@example.com", admin: true }
      }
    };

    dbMock.__docs.set("admins/revogado@example.com", { addedBy: "user_adm" });
    usersByUid.set("uid_revogado", { uid: "uid_revogado", email: "revogado@example.com" });

    const res = await revokeAdminAccessLogic({ targetUid: "uid_revogado" }, context);
    assert.equal(res.revoked, true);
    assert.equal(res.email, "revogado@example.com");

    // Removido do banco
    assert.equal(dbMock.__docs.has("admins/revogado@example.com"), false);
    // Claim removida
    assert.deepEqual(claimsByUid.get("uid_revogado"), { admin: false });
  });

  it("revokeAdminAccessLogic: remove da coleção e remove claims via e-mail", async () => {
    const context = {
      auth: {
        uid: "user_adm",
        token: { email: "adm@example.com", admin: true }
      }
    };

    dbMock.__docs.set("admins/revogado@example.com", { addedBy: "user_adm" });
    usersByEmail.set("revogado@example.com", { uid: "uid_revogado", email: "revogado@example.com" });

    const res = await revokeAdminAccessLogic({ email: "revogado@example.com" }, context);
    assert.equal(res.revoked, true);
    assert.equal(res.email, "revogado@example.com");

    // Removido do banco
    assert.equal(dbMock.__docs.has("admins/revogado@example.com"), false);
    // Claim removida
    assert.deepEqual(claimsByUid.get("uid_revogado"), { admin: false });
  });

  // ── listAdminsLogic ────────────────────────────────────────────────────────────
  it("listAdminsLogic: rejeita se caller não for admin", async () => {
    const context = {
      auth: {
        uid: "user_normal",
        token: { email: "normal@example.com" }
      }
    };

    await assert.rejects(
      () => listAdminsLogic({}, context),
      (err) => {
        assert.equal(err.code, "permission-denied");
        return true;
      }
    );
  });

  it("listAdminsLogic: retorna a lista completa de administradores", async () => {
    const context = {
      auth: {
        uid: "user_adm",
        token: { email: "adm@example.com", admin: true }
      }
    };

    dbMock.__docs.set("admins/adm1@example.com", { addedBy: "super" });
    dbMock.__docs.set("admins/adm2@example.com", { addedBy: "super" });

    const res = await listAdminsLogic({}, context);
    assert.ok(res.admins);
    assert.equal(res.admins.length, 2);
    
    const emails = res.admins.map((a) => a.email);
    assert.ok(emails.includes("adm1@example.com"));
    assert.ok(emails.includes("adm2@example.com"));
  });
});
