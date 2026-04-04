/**
 * Sibanki - STT Service (Speech-to-Text) Multi-Provider
 * Groq Whisper (grátis) → Google Cloud Speech (60min/mês grátis) → fallback regex
 */
const fetch = require("node-fetch");
const { logError } = require("../../logger");

const GROQ_KEY         = process.env.GROQ_KEY         || "";
const GOOGLE_CLOUD_KEY = process.env.GOOGLE_CLOUD_KEY || "";

const errSTT = { groq: 0, google: 0 };
const MAX_ERR = 3;
setInterval(() => { errSTT.groq = 0; errSTT.google = 0; }, 3600000);

// ─── Provedor 1: Groq Whisper (GRATUITO — mais generoso do mercado) ──────────
// Limite: ~2.000 minutos de áudio/dia no plano gratuito
async function _groqWhisper(audioBuffer, mimeType) {
  if (!GROQ_KEY || errSTT.groq >= MAX_ERR) return null;
  try {
    const { FormData, Blob } = require("node-fetch");
    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: mimeType || "audio/webm" }), "audio.webm");
    form.append("model", "whisper-large-v3-turbo");
    form.append("language", "pt");
    form.append("response_format", "text");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_KEY}` },
      body: form,
      signal: AbortSignal.timeout(20000)
    });
    if (res.status === 429) { errSTT.groq++; return null; }
    const text = await res.text();
    if (!text || text.length < 2) { errSTT.groq++; return null; }
    errSTT.groq = 0;
    return text.trim();
  } catch (e) {
    errSTT.groq++;
    logError("stt:groq", e);
    return null;
  }
}

// ─── Provedor 2: Google Cloud Speech-to-Text (60 min/mês grátis) ────────────
async function _googleSpeech(audioBuffer, mimeType) {
  if (!GOOGLE_CLOUD_KEY || errSTT.google >= MAX_ERR) return null;
  try {
    const audioB64 = audioBuffer.toString("base64");
    const encoding = (mimeType || "").includes("ogg") ? "OGG_OPUS"
      : (mimeType || "").includes("mp4") ? "MP4"
      : "WEBM_OPUS";

    const res = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: { encoding, sampleRateHertz: 48000, languageCode: "pt-BR" },
          audio: { content: audioB64 }
        }),
        signal: AbortSignal.timeout(20000)
      }
    );
    if (res.status === 429) { errSTT.google++; return null; }
    const json = await res.json();
    const transcript = json.results?.[0]?.alternatives?.[0]?.transcript;
    if (!transcript) { errSTT.google++; return null; }
    errSTT.google = 0;
    return transcript.trim();
  } catch (e) {
    errSTT.google++;
    logError("stt:google", e);
    return null;
  }
}

/**
 * Transcreve áudio para texto com fallback automático.
 * @param {Buffer} audioBuffer - Buffer do arquivo de áudio
 * @param {string} mimeType    - Ex: "audio/webm", "audio/ogg", "audio/mp4"
 * @returns {Promise<{text: string|null, provider: string}>}
 */
async function transcribeAudio(audioBuffer, mimeType) {
  if (!audioBuffer || audioBuffer.length < 100) {
    return { text: null, provider: "none" };
  }

  let text = await _groqWhisper(audioBuffer, mimeType);
  if (text) return { text, provider: "groq" };

  text = await _googleSpeech(audioBuffer, mimeType);
  if (text) return { text, provider: "google" };

  return { text: null, provider: "none" };
}

function getSTTStatus() {
  return {
    groq:   { available: !!GROQ_KEY,         errors: errSTT.groq,   healthy: errSTT.groq < MAX_ERR },
    google: { available: !!GOOGLE_CLOUD_KEY,  errors: errSTT.google, healthy: errSTT.google < MAX_ERR },
  };
}

module.exports = { transcribeAudio, getSTTStatus };
