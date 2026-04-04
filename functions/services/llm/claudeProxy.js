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
const functions = require("firebase-functions");
const { CLAUDE_KEY } = require("../../config");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-opus-4-6";
const MAX_TOKENS_LIMIT = 2000;

/**
 * callClaude
 * Proxy seguro para a API da Anthropic.
 * Requer autenticação Firebase e claim admin para uso no admin panel.
 */
exports.callClaude = functions.https.onCall(async (data, context) => {
  // Requer autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para continuar.");
  }

  // Para uso no admin panel, exige claim admin
  const isAdminCall = data?.adminOnly === true;
  if (isAdminCall && context.auth.token?.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem usar esta função.");
  }

  if (!CLAUDE_KEY) {
    throw new functions.https.HttpsError("failed-precondition", "Chave da API não configurada.");
  }

  const { prompt, systemPrompt, model, maxTokens } = data || {};

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "prompt é obrigatório.");
  }

  const safeMaxTokens = Math.min(Number(maxTokens) || 1000, MAX_TOKENS_LIMIT);
  const safeModel = model || DEFAULT_MODEL;

  const body = {
    model: safeModel,
    max_tokens: safeMaxTokens,
    messages: [{ role: "user", content: prompt.trim() }],
  };

  if (systemPrompt && typeof systemPrompt === "string") {
    body.system = systemPrompt.trim();
  }

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
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
