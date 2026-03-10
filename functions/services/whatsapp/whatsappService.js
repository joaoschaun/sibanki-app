/**
 * WhatsApp Business Cloud API - Sibanki
 * Recebe mensagens, extrai lançamento (IA ou regex), grava no Firestore e responde.
 */
const fetch = require("node-fetch");
const { GEMINI_KEY, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = require("../../config");
const { logError } = require("../../logger");
const { extractEntry } = require("../llm/llmService");

const META_API = "https://graph.facebook.com/v18.0";

const DEFAULT_CATS = [
  "Moradia", "Transporte", "Alimentação", "Saúde", "Bem-estar", "Educação",
  "Lazer", "Cartões", "Empréstimo", "Assinaturas", "Imprevisto", "Salário",
  "Freela", "Investimentos", "Transferencia", "Outros"
];

/**
 * Extrai valor em reais do texto (regex).
 * Ex: "120", "120 reais", "R$ 120,50", "R$ 120.50", "gastei 99,90"
 */
function parseValueRegex(text) {
  const normalized = (text || "").replace(/\s+/g, " ");
  // R$ 123,45 ou R$ 123.45 ou 123,45 ou 123.45
  const m = normalized.match(/(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)/);
  if (!m) return null;
  const num = m[1].replace(/\./g, "").replace(",", ".");
  const v = parseFloat(num);
  return isNaN(v) ? null : Math.round(v * 100) / 100;
}

/**
 * Detecta se é receita (recebi, ganhei, salário, entrada) ou despesa por padrões comuns.
 */
function inferTypeRegex(text) {
  const t = (text || "").toLowerCase();
  if (/\b(recebi|ganhei|salário|salario|entrada|venda|freela|pagamento recebido|depósito)\b/.test(t)) return "receita";
  if (/\b(gastei|paguei|comprei|conta|despesa|boleto|fatura|assinatura|mercado|supermercado|uber|combustível)\b/.test(t)) return "despesa";
  return "despesa"; // padrão
}

/**
 * Fallback: extração por regex para frases simples.
 * Retorna { type, value, desc, category } ou null.
 */
function parseLancamentoRegex(text) {
  const trimmed = (text || "").trim();
  if (trimmed.length < 3) return null;
  const value = parseValueRegex(trimmed);
  if (value == null || value <= 0) return null;
  const type = inferTypeRegex(trimmed);
  // Descrição: até 80 chars, removendo o valor e palavras de valor
  let desc = trimmed
    .replace(/\bR\$\s*[\d.,]+\s*(reais?)?/gi, "")
    .replace(/\b\d+[\.,]\d{2}\s*(reais?)?/gi, "")
    .replace(/\b(recebi|ganhei|gastei|paguei)\b/gi, "")
    .trim();
  if (!desc) desc = type === "receita" ? "Receita" : "Despesa";
  if (desc.length > 80) desc = desc.substring(0, 77) + "...";
  const category = mapDescToCategory(desc);
  return { type, value, desc, category };
}

function mapDescToCategory(desc) {
  const d = (desc || "").toLowerCase();
  if (/mercado|supermercado|alimentação|comida|restaurante|lanche|ifood|uber eats/i.test(d)) return "Alimentação";
  if (/uber|99|taxi|combustível|gasolina|ônibus|transporte|estacionamento/i.test(d)) return "Transporte";
  if (/luz|energia|água|agua|aluguel|condomínio|internet|net|vivo|claro|oi/i.test(d)) return "Moradia";
  if (/farmácia|remédio|médico|consulta|plano de saúde|saúde/i.test(d)) return "Saúde";
  if (/salário|salario|freela|venda|entrada/i.test(d)) return "Salário";
  if (/cartão|fatura|parcela/i.test(d)) return "Cartões";
  return "Outros";
}

/**
 * Chama Gemini para extrair lançamento em JSON.
 * Retorna { type, value, desc, category, account? } ou null em caso de erro.
 */
async function parseLancamentoGemini(text) {
  if (!GEMINI_KEY || !text || text.length < 2) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
  const prompt = `Extraia do texto de lançamento financeiro no Brasil APENAS um JSON válido, sem markdown, sem explicação.
Categorias permitidas: Moradia, Transporte, Alimentação, Saúde, Bem-estar, Educação, Lazer, Cartões, Empréstimo, Assinaturas, Imprevisto, Salário, Freela, Investimentos, Outros.
Se não souber a categoria, use "Outros". Data use hoje (YYYY-MM-DD) se não mencionada.
Formato exato: {"type":"despesa","value":120.50,"desc":"Supermercado","category":"Alimentação","account":"Nubank","date":"2026-03-08"}

Texto: "${text.replace(/"/g, '\\"')}"`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.1 }
      })
    });
    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    const cleaned = raw.replace(/```\w*\n?/g, "").replace(/\n/g, " ").trim();
    const first = cleaned.match(/\{[\s\S]*\}/);
    if (!first) return null;
    const parsed = JSON.parse(first[0]);
    if (!parsed.type || !parsed.value) return null;
    const type = (parsed.type || "").toLowerCase().includes("receita") ? "receita" : "despesa";
    const value = Math.round((parseFloat(parsed.value) || 0) * 100) / 100;
    if (value <= 0) return null;
    const desc = (parsed.desc || (type === "receita" ? "Receita" : "Despesa")).substring(0, 80);
    const category = DEFAULT_CATS.includes(parsed.category) ? parsed.category : "Outros";
    let date = parsed.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const d = new Date();
      date = d.toISOString().slice(0, 10);
    }
    return {
      type,
      value,
      desc,
      category,
      account: parsed.account || "Carteira física",
      date
    };
  } catch (e) {
    logError("whatsapp parseLancamentoGemini", e);
    return null;
  }
}

/**
 * Extrai lançamento: tenta Gemini, fallback regex.
 */
async function parseMessageToEntry(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  // Usa llmService com fallback automático entre provedores
  let entry = await extractEntry(trimmed, DEFAULT_CATS);
  if (!entry) entry = await parseLancamentoGemini(trimmed); // fallback direto
  if (!entry) entry = parseLancamentoRegex(trimmed);
  if (!entry) return null;
  if (!entry.date) {
    const d = new Date();
    entry.date = d.toISOString().slice(0, 10);
  }
  if (!entry.account) entry.account = "Carteira física";
  return entry;
}

/**
 * Adiciona um lançamento ao usuário no Firestore (mesmo formato do app).
 */
async function addEntryToUser(db, uid, entry) {
  const userRef = db.collection("users").doc(uid);
  const doc = await userRef.get();
  if (!doc.exists) return false;
  const data = doc.data();
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const newEntry = {
    id: Date.now(),
    date: entry.date,
    type: entry.type,
    desc: entry.desc || entry.category,
    category: entry.category,
    value: entry.value,
    account: entry.account,
    status: "pago",
    formaPgto: ""
  };
  entries.push(newEntry);
  await userRef.update({
    entries,
    updated: new Date().toISOString()
  });
  return newEntry;
}

/**
 * Envia mensagem de texto via WhatsApp Cloud API.
 */
async function sendWhatsAppText(phoneNumberId, to, text) {
  if (!WHATSAPP_TOKEN || !phoneNumberId) {
    logError("whatsapp send", new Error("WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set"));
    return false;
  }
  const url = `${META_API}/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/\D/g, ""),
        type: "text",
        text: { body: text }
      })
    });
    const json = await res.json();
    if (json.error) {
      logError("whatsapp send response", json.error);
      return false;
    }
    return true;
  } catch (e) {
    logError("whatsapp send", e);
    return false;
  }
}

module.exports = {
  parseMessageToEntry,
  addEntryToUser,
  sendWhatsAppText,
  parseLancamentoRegex,
  DEFAULT_CATS
};
