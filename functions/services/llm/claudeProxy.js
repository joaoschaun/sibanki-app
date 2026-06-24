/**
 * claudeProxy.js
 * Proxy server-side para chamadas à API da Anthropic (Claude).
 *
 * Por que proxy?
 *  - A API key da Anthropic NUNCA deve estar no cliente
 *  - Chamadas diretas do browser expõem a chave e os prompts no Network tab
 *  - Este proxy valida autenticação antes de repassar ao Claude
 *  - Rate limiting e logging ficam centralizados aqui
 */
const functions = require("firebase-functions/v1");
const { CLAUDE_KEY } = require("../../config");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";  // CLD-2: default barato
const MAX_TOKENS_LIMIT = 2000;
const PROMPT_MAX_CHARS = 12_000;       // CLD-1: ~3k tokens — cabe contexto do admin panel
const SYSTEM_MAX_CHARS = 4_000;
const FETCH_TIMEOUT_MS = 30_000;       // CLD-3

/**
 * CLD-2 (auditoria 26/04/2026): allowlist de modelos. Antes, cliente passava
 * `model` livre e podia escolher claude-opus-4-6 (mais caro). Agora limitamos
 * a Haiku/Sonnet que é o que faz sentido pro admin panel.
 */
const ALLOWED_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-opus-4-6",   // permitido mas só com claim admin (validado abaixo)
]);
const PREMIUM_MODELS = new Set(["claude-opus-4-6"]);

/**
 * callClaude
 * Proxy seguro para a API da Anthropic — uso no admin panel.
 *
 * CLD-1/2/3/4 (auditoria 26/04/2026): hardening:
 *  - SEMPRE exige claim `admin` (antes era opt-in via `data.adminOnly`, controlado pelo cliente).
 *  - Cap de tamanho de prompt e systemPrompt.
 *  - Allowlist de modelos; modelos premium exigem mesmo claim admin.
 *  - Timeout de 30s no fetch para Anthropic.
 */
exports.callClaude = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para continuar.");
  }

  // CLD-4: claim admin é OBRIGATÓRIO. Antes a flag `adminOnly` vinha do cliente
  // — não-admin enviando `adminOnly: false` usava o proxy à vontade.
  if (context.auth.token?.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem usar callClaude.");
  }

  if (!CLAUDE_KEY) {
    throw new functions.https.HttpsError("failed-precondition", "Chave da API não configurada.");
  }

  const { prompt, systemPrompt, model, maxTokens } = data || {};

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "prompt é obrigatório.");
  }
  // CLD-1: caps de input
  if (prompt.length > PROMPT_MAX_CHARS) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `prompt muito longo (${prompt.length} > ${PROMPT_MAX_CHARS} chars).`,
    );
  }
  if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.length > SYSTEM_MAX_CHARS) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `systemPrompt muito longo (${systemPrompt.length} > ${SYSTEM_MAX_CHARS} chars).`,
    );
  }

  // CLD-2: allowlist de modelo
  const requestedModel = typeof model === "string" && model.trim() ? model.trim() : DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(requestedModel)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Modelo "${requestedModel}" não permitido. Use: ${[...ALLOWED_MODELS].join(", ")}.`,
    );
  }
  // Premium = mesmo gate (já está em admin), mas log explícito para custo tracking.
  if (PREMIUM_MODELS.has(requestedModel)) {
    console.info(`[claudeProxy] uso de modelo premium: ${requestedModel} por admin uid=${context.auth.uid}`);
  }

  const safeMaxTokens = Math.min(Number(maxTokens) || 1000, MAX_TOKENS_LIMIT);
  const safeModel = requestedModel;

  const body = {
    model: safeModel,
    max_tokens: safeMaxTokens,
    messages: [{ role: "user", content: prompt.trim() }],
  };

  if (systemPrompt && typeof systemPrompt === "string") {
    body.system = systemPrompt.trim();
  }

  try {
    // CLD-3: timeout explícito
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[claudeProxy] Anthropic error:", res.status, errText);
      throw new functions.https.HttpsError("internal", `Erro na API: ${res.status}`);
    }

    const json = await res.json();
    const text = json.content?.[0]?.text || "";
    return { text, model: safeModel };

  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error("[claudeProxy] Fetch error:", err);
    throw new functions.https.HttpsError("internal", "Erro ao conectar com a IA.");
  }
});
