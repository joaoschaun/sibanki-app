/**
 * brapiRateLimiter.test.js
 * Testes unitários para o rate limiter distribuído (Firestore sliding window).
 *
 * Estratégia: mock de firebase-admin e firebase-functions para testar a lógica
 * de janela deslizante, reinício de janela expirada, e fallback em memória.
 */
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// ── Estado de mock ─────────────────────────────────────────────────────────────
let _docData = null;       // dados retornados por get()
let _setData = null;       // dados passados para set()
let _updateData = null;    // dados passados para update()
let _transactionError = false; // simular falha do Firestore

const Module = require("module");
const _orig = Module._load.bind(Module);
let _injected = false;

if (!_injected) {
  _injected = true;
  Module._load = function (request, ...args) {
    if (request === "firebase-admin") {
      const makeRef = () => ({
        get: async () => ({
          exists: _docData !== null,
          data: () => _docData,
        }),
        set: async (d) => { _setData = d; },
        update: async (d) => { _updateData = d; },
      });

      const mockDb = {
        collection: () => ({
          doc: () => makeRef(),
        }),
        runTransaction: async (fn) => {
          if (_transactionError) throw new Error("Firestore unavailable");
          const tx = {
            get: async () => ({
              exists: _docData !== null,
              data: () => _docData,
            }),
            set: (_, d) => { _setData = d; },
            update: (_, d) => { _updateData = d; },
          };
          return fn(tx);
        },
      };

      return {
        apps: [{}],
        initializeApp: () => {},
        firestore: Object.assign(() => mockDb, {
          FieldValue: { serverTimestamp: () => "ts" },
        }),
      };
    }
    if (request === "firebase-functions") {
      return {
        https: {
          HttpsError: class HttpsError extends Error {
            constructor(code, msg) { super(msg); this.code = code; }
          },
        },
      };
    }
    return _orig(request, ...args);
  };
}

// Carregamos o módulo uma vez — o mock de Module._load garante isolamento de estado via variáveis
const { brapiRateCheck } = require("../services/market/brapiRateLimiter");

// Contexto autenticado de exemplo
const makeContext = (uid = "user_123") => ({ auth: { uid } });

// ── Testes ────────────────────────────────────────────────────────────────────

describe("brapiRateCheck — Firestore", () => {
  beforeEach(() => {
    _docData = null;
    _setData = null;
    _updateData = null;
    _transactionError = false;
  });

  it("lança unauthenticated quando não há auth", async () => {
    await assert.rejects(
      () => brapiRateCheck({ auth: null }),
      (e) => e.code === "unauthenticated"
    );
  });

  it("cria documento na primeira requisição", async () => {
    await brapiRateCheck(makeContext());
    assert.ok(_setData !== null);
    assert.equal(_setData.count, 1);
    assert.ok(typeof _setData.windowStart === "number");
  });

  it("incrementa contador dentro da janela ativa", async () => {
    _docData = { windowStart: Date.now() - 5000, count: 5 };
    await brapiRateCheck(makeContext());
    assert.ok(_updateData !== null);
    assert.equal(_updateData.count, 6);
  });

  it("reinicia janela quando expirada", async () => {
    _docData = { windowStart: Date.now() - 120_000, count: 25 }; // janela de 2 min atrás
    await brapiRateCheck(makeContext());
    assert.ok(_setData !== null);
    assert.equal(_setData.count, 1); // reiniciou
  });

  it("lança resource-exhausted quando limite atingido", async () => {
    _docData = { windowStart: Date.now() - 5000, count: 30 }; // já no limite
    await assert.rejects(
      () => brapiRateCheck(makeContext()),
      (e) => e.code === "resource-exhausted"
    );
    // Não deve incrementar além do limite
    assert.equal(_updateData, null);
  });

  it("usa fallback em memória quando Firestore falha", async () => {
    _transactionError = true;
    // Não deve lançar (dentro do limite)
    await assert.doesNotReject(() => brapiRateCheck(makeContext("user_fallback")));
  });

  it("lança resource-exhausted via fallback após 30 req do mesmo uid", async () => {
    _transactionError = true;
    const ctx = makeContext("user_flood");
    // 30 chamadas devem passar (limite = 30)
    for (let i = 0; i < 30; i++) {
      await brapiRateCheck(ctx);
    }
    // 31ª deve rejeitar
    await assert.rejects(
      () => brapiRateCheck(ctx),
      (e) => e.code === "resource-exhausted"
    );
  });
});
