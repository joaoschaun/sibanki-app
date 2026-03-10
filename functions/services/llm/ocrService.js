/**
 * Sibanki - OCR Service (Image/Document → Text) Multi-Provider
 * Google Vision (1.000/mês grátis) → Tesseract local (100% grátis) → fallback
 *
 * Casos de uso no Sibanki:
 *  - Foto de nota fiscal → extrair valor e descrição
 *  - Foto de boleto → extrair valor e vencimento
 *  - Extrato bancário em imagem → extrair lançamentos
 */
const fetch = require("node-fetch");
const { logError } = require("../../logger");

const GOOGLE_CLOUD_KEY = process.env.GOOGLE_CLOUD_KEY || "";

const errOCR = { vision: 0, tesseract: 0 };
const MAX_ERR = 3;
setInterval(() => { errOCR.vision = 0; errOCR.tesseract = 0; }, 3600000);

// ─── Provedor 1: Google Vision API (1.000 unidades/mês grátis) ───────────────
// 1 imagem = 1 unidade. Além disso: US$ 1,50/1.000 imagens.
async function _googleVision(imageBuffer, mimeType) {
  if (!GOOGLE_CLOUD_KEY || errOCR.vision >= MAX_ERR) return null;
  try {
    const imageB64 = imageBuffer.toString("base64");
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: imageB64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }]
          }]
        }),
        signal: AbortSignal.timeout(15000)
      }
    );
    if (res.status === 429) { errOCR.vision++; return null; }
    const json = await res.json();
    const text = json.responses?.[0]?.fullTextAnnotation?.text;
    if (!text) { errOCR.vision++; return null; }
    errOCR.vision = 0;
    return text.trim();
  } catch (e) {
    errOCR.vision++;
    logError("ocr:vision", e);
    return null;
  }
}

// ─── Provedor 2: Tesseract.js local (100% gratuito, sem limites) ─────────────
// Requer: npm install tesseract.js na pasta functions
// Sem limite, sem API key, roda no próprio servidor Firebase Functions
async function _tesseractLocal(imageBuffer) {
  if (errOCR.tesseract >= MAX_ERR) return null;
  try {
    const Tesseract = require("tesseract.js");
    const { data: { text } } = await Tesseract.recognize(imageBuffer, "por", {
      logger: () => {} // silenciar logs
    });
    if (!text || text.trim().length < 3) { errOCR.tesseract++; return null; }
    errOCR.tesseract = 0;
    return text.trim();
  } catch (e) {
    errOCR.tesseract++;
    logError("ocr:tesseract", e);
    return null;
  }
}

/**
 * Extrai texto de imagem (nota fiscal, boleto, extrato).
 * @param {Buffer} imageBuffer  - Buffer da imagem (PNG, JPEG, WebP)
 * @param {string} mimeType     - Ex: "image/jpeg", "image/png"
 * @returns {Promise<{text: string|null, provider: string}>}
 */
async function extractTextFromImage(imageBuffer, mimeType) {
  if (!imageBuffer || imageBuffer.length < 100) {
    return { text: null, provider: "none" };
  }

  let text = await _googleVision(imageBuffer, mimeType);
  if (text) return { text, provider: "google_vision" };

  text = await _tesseractLocal(imageBuffer);
  if (text) return { text, provider: "tesseract" };

  return { text: null, provider: "none" };
}

/**
 * Pipeline completo: imagem → texto OCR → lançamento financeiro (via LLM).
 * Integra ocrService + llmService.
 */
async function imageToEntry(imageBuffer, mimeType, categories) {
  const { extractTextFromImage } = require("./ocrService");
  const { extractEntry } = require("./llmService");

  const ocr = await extractTextFromImage(imageBuffer, mimeType);
  if (!ocr.text) return { entry: null, ocrText: null, provider: "none" };

  const entry = await extractEntry(ocr.text, categories);
  return { entry, ocrText: ocr.text, provider: ocr.provider };
}

function getOCRStatus() {
  return {
    google_vision: { available: !!GOOGLE_CLOUD_KEY, errors: errOCR.vision,     healthy: errOCR.vision < MAX_ERR },
    tesseract:     { available: true,                 errors: errOCR.tesseract, healthy: errOCR.tesseract < MAX_ERR },
  };
}

module.exports = { extractTextFromImage, imageToEntry, getOCRStatus };
