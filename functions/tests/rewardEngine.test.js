const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// ── Mocks do Firebase ────────────────────────────────────────────────────────
const Module = require("module");
const _origLoad = Module._load.bind(Module);

let mockDb = null;

Module._load = function (request, ...args) {
  if (request === "firebase-admin") {
    return {
      apps: [{}],
      initializeApp: () => {},
      firestore: () => mockDb,
    };
  }
  if (request === "firebase-functions/v2/https") {
    return {
      onCall: (options, handler) => {
        // Retorna o handler de forma a simular a chamada callable com context
        return async (auth, data = {}) => {
          return handler({ auth, data });
        };
      },
      HttpsError: class extends Error {
        constructor(code, message) {
          super(message);
          this.code = code;
        }
      }
    };
  }
  return _origLoad(request, ...args);
};

// ── Inclusão do Helper e Mocks ────────────────────────────────────────────────
const { createFirestoreMock } = require("./helpers/firestoreMock");

// ── Import da Function sob teste ──────────────────────────────────────────────
const rewardEngine = require("../services/sibcoin/rewardEngine");

describe("rewardEngine - getSibcoinMissions", () => {
  const uid = "user_test_123";
  const authContext = { uid };

  beforeEach(() => {
    mockDb = null;
  });

  it("retorna missões ativas e saldo do usuário novo sem progresso", async () => {
    mockDb = createFirestoreMock({
      [`users/${uid}`]: {
        sibcoinBalance: 0,
        sibcoinTier: "bronze",
        sibcoinEarned: 0,
      }
    });

    const result = await rewardEngine.getSibcoinMissions(authContext);

    assert.equal(result.balance, 0);
    assert.equal(result.tier, "bronze");
    assert.ok(result.missions.length > 0);

    // Todas as missões do usuário novo devem estar não-concluídas
    const completedMissions = result.missions.filter(m => m.completed);
    assert.equal(completedMissions.length, 0);
  });

  it("conclui retroativamente a missão Primeiro Lançamento se houver lançamentos ativos", async () => {
    mockDb = createFirestoreMock({
      [`users/${uid}`]: {
        sibcoinBalance: 0,
        sibcoinTier: "bronze",
        sibcoinEarned: 0,
        entries: [{ id: "ent_1", value: 100, type: "despesa" }],
        sibcoinMissionsCompleted: {}
      }
    });

    const result = await rewardEngine.getSibcoinMissions(authContext);

    // Deve ter concluído a missão mission_first_entry (recompensa 50 SC)
    assert.equal(result.balance, 50);
    assert.equal(result.earned, 50);
    
    // Reler o banco para verificar se os dados persistiram
    const userDoc = mockDb.__docs.get(`users/${uid}`);
    assert.equal(userDoc.sibcoinBalance, 50);
    assert.ok(userDoc.sibcoinMissionsCompleted.mission_first_entry !== undefined);

    // O status no retorno da API também deve indicar como concluído
    const firstEntryMission = result.missions.find(m => m.id === "mission_first_entry");
    assert.ok(firstEntryMission);
    assert.equal(firstEntryMission.completed, true);
  });

  it("conclui múltiplas missões de forma retroativa se múltiplos critérios forem atendidos", async () => {
    mockDb = createFirestoreMock({
      [`users/${uid}`]: {
        sibcoinBalance: 0,
        sibcoinTier: "bronze",
        sibcoinEarned: 0,
        entries: [{ id: "ent_1", value: 100, type: "despesa" }], // mission_first_entry = 50 SC
        goals: [{ id: "goal_1", title: "Comprar Carro" }], // mission_first_goal = 100 SC
        sibcoinMissionsCompleted: {}
      }
    });

    const result = await rewardEngine.getSibcoinMissions(authContext);

    assert.equal(result.balance, 150);
    assert.equal(result.earned, 150);

    const userDoc = mockDb.__docs.get(`users/${uid}`);
    assert.ok(userDoc.sibcoinMissionsCompleted.mission_first_entry !== undefined);
    assert.ok(userDoc.sibcoinMissionsCompleted.mission_first_goal !== undefined);
  });

  it("não conclui retroativamente missões recorrentes sem evento explícito", async () => {
    mockDb = createFirestoreMock({
      [`users/${uid}`]: {
        sibcoinBalance: 0,
        sibcoinTier: "bronze",
        sibcoinEarned: 0,
        sibcoinMissionsCompleted: {}
      }
    });

    const result = await rewardEngine.getSibcoinMissions(authContext);

    const streakMission = result.missions.find(m => m.id === "mission_login_streak");
    assert.ok(streakMission);
    assert.equal(streakMission.completed, false);
    assert.equal(result.balance, 0);
  });

  it("não credita moedas caso o estado não atenda às exigências da missão pendente", async () => {
    mockDb = createFirestoreMock({
      [`users/${uid}`]: {
        sibcoinBalance: 0,
        sibcoinTier: "bronze",
        sibcoinEarned: 0,
        entries: [], // Sem lançamentos para mission_first_entry
        sibcoinMissionsCompleted: {}
      }
    });

    const result = await rewardEngine.getSibcoinMissions(authContext);

    const firstEntryMission = result.missions.find(m => m.id === "mission_first_entry");
    assert.ok(firstEntryMission);
    assert.equal(firstEntryMission.completed, false);
    assert.equal(result.balance, 0);
  });
});
