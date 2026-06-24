const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const { logEvent, logError, timer } = require("../../logger");
const { runAssistantAnalysis, runAssistantAnalysisStream } = require("./assistantOrchestrator");
const { enforceChatQuota } = require("./chatRateLimiter");
const { processEntryCapture, runVisionToEntry } = require("./entryCaptureOrchestrator");
const { generateProactiveInsight } = require("../llm/llmService");
const { buildProactiveInsightPrompt } = require("../llm/sovereignSystemPrompt");

const db = admin.firestore();

// Limits
const CHAT_MESSAGE_MAX = 4_096;          // 4 KB
const CHAT_CONTEXT_MAX = 32_768;         // 32 KB

const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";
const chatApiOptions = {
  timeoutSeconds: 300,
  memory: '512MB',
  ...(enforceAppCheck ? { enforceAppCheck: true } : {}),
};

const PLATFORM_EVENT_ALLOWLIST = new Set([
  "advisor_opened",
  "advisor_message_sent",
  "advisor_reply_received",
  "advisor_reply_failed",
  "insight_shown",
  "insight_cta_clicked",
]);

function sanitizePlatformPayload(value, depth = 0) {
  if (depth > 3) return undefined;
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.substring(0, 500);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => sanitizePlatformPayload(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const out = {};
    Object.keys(value).slice(0, 30).forEach((key) => {
      const sanitized = sanitizePlatformPayload(value[key], depth + 1);
      if (sanitized !== undefined) out[key] = sanitized;
    });
    return out;
  }
  return undefined;
}

exports.trackPlatformEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
  }

  const uid = context.auth.uid;
  const name = data && data.name ? String(data.name).trim() : "";
  if (!PLATFORM_EVENT_ALLOWLIST.has(name)) {
    throw new functions.https.HttpsError("invalid-argument", "Evento não permitido.");
  }

  const payload = sanitizePlatformPayload((data && data.payload) || {}, 0) || {};
  const eventData = {
    uid,
    name,
    payload,
    source: "react",
    ts: admin.firestore.FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(db.collection("users").doc(uid).collection("platform_events").doc(), eventData);
  batch.set(db.collection("platform_events").doc(), eventData);
  await batch.commit();

  logEvent("platform", "trackEvent", { uid, name });
  return { ok: true };
});

exports.chatApi = functions.runWith(chatApiOptions).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para usar a IA.");
  }
  const message = (data && data.message) ? String(data.message).trim() : "";
  if (!message) {
    throw new functions.https.HttpsError("invalid-argument", "Mensagem vazia.");
  }
  if (message.length > CHAT_MESSAGE_MAX) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Mensagem muito longa (${message.length} chars > ${CHAT_MESSAGE_MAX}).`
    );
  }
  const contextStr = (data && data.context) ? String(data.context).trim() : "";
  if (contextStr.length > CHAT_CONTEXT_MAX) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Contexto muito longo (${contextStr.length} chars > ${CHAT_CONTEXT_MAX}).`
    );
  }
  await enforceChatQuota({ functions, uid: context.auth.uid, kind: "chat" });
  const t = timer("chatApi", "generate");
  try {
    const result = await runAssistantAnalysis({ message, contextStr });
    if (!result || !result.reply) {
      throw new functions.https.HttpsError("resource-exhausted", "Todos os provedores de IA atingiram o limite. Tente em alguns minutos.");
    }
    t.end({ uid: context.auth.uid });
    return { reply: result.reply, marketPayload: result.marketPayload || null };
  } catch (e) {
    if (e instanceof functions.https.HttpsError) throw e;
    logError("chatApi", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao processar. Tente novamente.");
  }
});

exports.chatStreamApi = functions.runWith(chatApiOptions).https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Auth header missing or malformed' });
    }
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { context: contextStr, message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: 'Mensagem ausente ou estruturada incorretamente' });
    }
    if (message.length > CHAT_MESSAGE_MAX) {
      return res.status(400).json({ error: `Mensagem muito longa (${message.length} > ${CHAT_MESSAGE_MAX}).` });
    }
    if (typeof contextStr === "string" && contextStr.length > CHAT_CONTEXT_MAX) {
      return res.status(400).json({ error: `Contexto muito longo (${contextStr.length} > ${CHAT_CONTEXT_MAX}).` });
    }

    try {
      await enforceChatQuota({ functions, uid: decodedToken.uid, kind: "stream" });
    } catch (e) {
      if (e instanceof functions.https.HttpsError) {
        return res.status(429).json({ error: e.message, code: e.code });
      }
      throw e;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const result = await runAssistantAnalysisStream({ message, contextStr });
      const safeStreamText = result.text || "";

      const chunks = String(safeStreamText || "").match(/[\s\S]{1,220}/g) || [];
      for (const part of chunks) {
        res.write(`data: ${JSON.stringify({ text: part })}\n\n`);
      }

      if (result.marketPayload) {
         res.write(`data: ${JSON.stringify({ marketPayload: result.marketPayload })}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      logError("chatStreamApi", error);
      res.write(`data: ${JSON.stringify({ error: "Erro interno no servidor de streaming." })}\n\n`);
      res.end();
    }
  });
});

exports.visionToEntryApi = functions.runWith({ timeoutSeconds: 30, memory: "512MB" }).https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login necessário para usar Visão IA.");
  const base64Image = data.image; 
  const mimeType = data.mimeType || "image/jpeg";
  if (!base64Image) throw new functions.https.HttpsError("invalid-argument", "Nenhuma imagem enviada.");

  try {
    const result = await runVisionToEntry({
      imageBase64: base64Image,
      mimeType,
      uid: context.auth.uid,
    });
    if (!result.entryPayload) {
      throw new functions.https.HttpsError("internal", "Não foi possível extrair os dados do recibo.");
    }
    return {
      reply: result.reply,
      entryPayload: result.entryPayload,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    if (error.code === "invalid-argument") {
      throw new functions.https.HttpsError("invalid-argument", error.message);
    }
    logError("visionToEntryApi", "process", error);
    throw new functions.https.HttpsError("internal", "Falha de processamento na Visão Gemini.");
  }
});

exports.assistantEntryCaptureApi = functions.runWith({ timeoutSeconds: 30, memory: "512MB" }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  }
  try {
    return await processEntryCapture({
      kind: data?.kind,
      audioBase64: data?.audioBase64,
      mimeType: data?.mimeType,
      image: data?.image,
      imageBase64: data?.imageBase64,
      uid: context.auth.uid,
      db,
    });
  } catch (e) {
    if (e.code === "invalid-argument") {
      throw new functions.https.HttpsError("invalid-argument", e.message);
    }
    logError("assistantEntryCaptureApi", "process", e, { uid: context.auth.uid });
    throw new functions.https.HttpsError("internal", "Falha ao processar seu envio. Tente novamente.");
  }
});

exports.proactiveInsightApi = functions.runWith(chatApiOptions).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para usar a IA.");
  }
  const snapshot = (data && data.snapshot) ? String(data.snapshot).trim() : "";
  if (!snapshot) {
    throw new functions.https.HttpsError("invalid-argument", "Snapshot vazio.");
  }
  if (snapshot.length > CHAT_CONTEXT_MAX) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Snapshot muito longo (${snapshot.length} chars > ${CHAT_CONTEXT_MAX}).`
    );
  }
  await enforceChatQuota({ functions, uid: context.auth.uid, kind: "insight" });
  try {
    const proactivePrompt = buildProactiveInsightPrompt(snapshot);
    const result = await generateProactiveInsight(proactivePrompt);
    logEvent("proactiveInsightApi", { hasInsight: !result.status, uid: context.auth.uid });
    return result;
  } catch (e) {
    logError("proactiveInsightApi", e);
    throw new functions.https.HttpsError("internal", e.message || "Erro ao gerar insight. Tente novamente.");
  }
});

exports.ocrToEntry = functions.runWith({ timeoutSeconds: 30, memory: "512MB" }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  }
  const { imageBase64, mimeType } = data || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "imageBase64 é obrigatório.");
  }
  const maxSize = 4 * 1024 * 1024;
  const buf = Buffer.from(imageBase64, "base64");
  if (buf.length > maxSize) {
    throw new functions.https.HttpsError("invalid-argument", "Imagem excede 4MB.");
  }
  const t = timer("ocrToEntry", "process");
  try {
    const { imageToEntry } = require("../llm/ocrService");
    const userSnap = await db.collection("users").doc(context.auth.uid).get();
    const categories = userSnap.exists ? (userSnap.data().categories || []) : [];
    const result = await imageToEntry(buf, mimeType || "image/jpeg", categories);
    t.end({ uid: context.auth.uid, provider: result.provider, hasEntry: !!result.entry });
    return result;
  } catch (e) {
    t.fail(e, { uid: context.auth.uid });
    throw new functions.https.HttpsError("internal", "Falha ao processar imagem.");
  }
});

exports.sttToEntry = functions.runWith({ timeoutSeconds: 30, memory: "512MB" }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login.");
  }
  const { audioBase64, mimeType } = data || {};
  if (!audioBase64 || typeof audioBase64 !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "audioBase64 é obrigatório.");
  }
  try {
    const { runVoiceToEntry } = require("./entryCaptureOrchestrator");
    const result = await runVoiceToEntry({
      audioBase64,
      mimeType,
      uid: context.auth.uid,
      db,
    });
    return { entry: result.entry, transcript: result.transcript, provider: result.provider };
  } catch (e) {
    if (e.code === "invalid-argument") {
      throw new functions.https.HttpsError("invalid-argument", e.message);
    }
    logError("sttToEntry", "process", e);
    throw new functions.https.HttpsError("internal", "Falha ao processar áudio.");
  }
});
