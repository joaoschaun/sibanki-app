const { describe, it, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const admin = require("firebase-admin");
const { createFirestoreMock } = require("./helpers/firestoreMock");

if (!admin.apps.length) {
  admin.initializeApp();
}

const originalFirestore = Object.getOwnPropertyDescriptor(admin, "firestore");
const dbMock = createFirestoreMock();

const mockedFirestoreFunc = () => dbMock;
mockedFirestoreFunc.FieldValue = {
  serverTimestamp: () => new Date(),
};

Object.defineProperty(admin, "firestore", {
  value: mockedFirestoreFunc,
  configurable: true,
  writable: true,
});

describe("chatRateLimiter tests", { concurrency: false }, () => {
  beforeEach(() => {
    dbMock.__docs.clear();
    dbMock.__operations.sets = [];
    dbMock.__operations.batchSets = [];
    dbMock.__operations.commits = 0;
    process.env.DISABLE_CHAT_RATE_LIMIT = ""; // Garante que está ativado
  });

  after(() => {
    if (originalFirestore) {
      Object.defineProperty(admin, "firestore", originalFirestore);
    }
  });

  const { consumeChatQuota, enforceChatQuota } = require("../services/assistant/chatRateLimiter");

  it("consumeChatQuota: ok para primeira requisição do dia", async () => {
    const result = await consumeChatQuota({ uid: "user_test", plan: "free", kind: "chat" });
    assert.equal(result.ok, true);
    assert.equal(result.usedToday, 1);
    assert.equal(result.dailyLimit, 200);
  });

  it("consumeChatQuota: respeita bypass em DEV", async () => {
    process.env.DISABLE_CHAT_RATE_LIMIT = "1";
    const result = await consumeChatQuota({ uid: "user_test", plan: "free" });
    assert.equal(result.ok, true);
    assert.equal(result.usedToday, undefined);
  });

  it("consumeChatQuota: bloqueia requisições se atingir quota diária", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const path = `users/user_pro/quotas/chat-${today}`;
    dbMock.__docs.set(path, {
      count: 2000,
      plan: "pro",
      lastTs: [],
    });

    const result = await consumeChatQuota({ uid: "user_pro", plan: "pro" });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "daily-quota-exceeded");
    assert.equal(result.usedToday, 2000);
    assert.equal(result.dailyLimit, 2000);
  });

  it("consumeChatQuota: bloqueia por burst limit (30 reqs/min)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const recentTimestamps = Array.from({ length: 30 }, (_, i) => now - i * 1000);
    
    dbMock.__docs.set(`users/user_burst/quotas/chat-${today}`, {
      count: 50,
      plan: "pro",
      lastTs: recentTimestamps,
    });

    const result = await consumeChatQuota({ uid: "user_burst", plan: "pro" });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "burst-limit-exceeded");
  });

  it("enforceChatQuota: deixa passar se ok", async () => {
    const functionsMock = {
      https: {
        HttpsError: class HttpsError extends Error {
          constructor(code, message) {
            super(message);
            this.code = code;
          }
        }
      }
    };
    
    await enforceChatQuota({ functions: functionsMock, uid: "user_ok", kind: "chat" });
    assert.ok(true);
  });

  it("enforceChatQuota: lança erro se atingir limite", async () => {
    const functionsMock = {
      https: {
        HttpsError: class HttpsError extends Error {
          constructor(code, message) {
            super(message);
            this.code = code;
          }
        }
      }
    };

    const today = new Date().toISOString().slice(0, 10);
    dbMock.__docs.set(`users/user_blocked/quotas/chat-${today}`, {
      count: 200,
      plan: "free",
      lastTs: [],
    });

    await assert.rejects(
      () => enforceChatQuota({ functions: functionsMock, uid: "user_blocked", kind: "chat" }),
      (err) => {
        assert.equal(err.code, "resource-exhausted");
        assert.match(err.message, /Você atingiu a quota diária/);
        return true;
      }
    );
  });

  it("enforceChatQuota: lê plano do banco de dados", async () => {
    const functionsMock = {
      https: {
        HttpsError: class HttpsError extends Error {
          constructor(code, message) {
            super(message);
            this.code = code;
          }
        }
      }
    };

    const today = new Date().toISOString().slice(0, 10);
    
    // Cadastra usuário no mock como PRO
    dbMock.__docs.set("users/user_pro_limit", { plan: "pro" });
    
    // Configura uso atual em 250 (excede o free de 200, mas está abaixo do pro de 2000)
    dbMock.__docs.set(`users/user_pro_limit/quotas/chat-${today}`, {
      count: 250,
      plan: "pro",
      lastTs: [],
    });

    // Não deve lançar erro porque limite do pro é 2000
    await enforceChatQuota({ functions: functionsMock, uid: "user_pro_limit", kind: "chat" });
    assert.ok(true);
  });

  it("enforceChatQuota: fail-open se Firestore falhar", async () => {
    const functionsMock = {
      https: {
        HttpsError: class HttpsError extends Error {}
      }
    };
    
    // Força erro no firestore mock
    const originalRunTransaction = dbMock.runTransaction;
    dbMock.runTransaction = async () => {
      throw new Error("Firestore down simulation");
    };

    // Não deve lançar erro para o usuário (fail-open)
    try {
      await enforceChatQuota({ functions: functionsMock, uid: "user_fs_fail", kind: "chat" });
      assert.ok(true);
    } finally {
      dbMock.runTransaction = originalRunTransaction;
    }
  });
});
