// Configuração centralizada de ambiente e integrações
// Todas as variáveis lidas de process.env (dotenv em dev, env vars do Firebase em produção)
// Para configurar em produção: firebase functions:secrets:set NOME_DA_VAR
// Para desenvolvimento: editar functions/.env
try {
  const path = require("path");
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch (e) {}

// BRAPI / mercado
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || "";
const BRAPI_BASE = "https://brapi.dev/api";

// News providers (HTTP functions)
const GNEWS_KEY = process.env.GNEWS_KEY || "";
const NEWSDATA_KEY = process.env.NEWSDATA_KEY || "";

// NewsAPI (usado pelo bot do Telegram)
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";

// Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_API = TELEGRAM_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_TOKEN}`
  : "";

// IA — providers (fallback chain: Gemini → Groq → OpenAI → Claude)
const GEMINI_KEY = process.env.GEMINI_KEY || "";
const GROQ_KEY = process.env.GROQ_KEY || "";
const OPENAI_KEY = process.env.OPENAI_KEY || "";
const CLAUDE_KEY = process.env.CLAUDE_KEY || "";

// Google Cloud — Vision OCR + Speech STT
const GOOGLE_CLOUD_KEY = process.env.GOOGLE_CLOUD_KEY || "";

// Stripe
const STRIPE_SECRET = process.env.STRIPE_SECRET || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// E-mail (Resend) - convite família (domínio sibanki.com.br)
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || "Sibanki Familia <familia@sibanki.com.br>";

// WhatsApp Business (Meta Cloud API)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "sibanki_wa_verify";

// Afiliados / Cashback (Lomadee + Monetizze)
const LOMADEE_APP_TOKEN = process.env.LOMADEE_APP_TOKEN || "";
const LOMADEE_SOURCE_ID = process.env.LOMADEE_SOURCE_ID || "";
const LOMADEE_WEBHOOK_SECRET = process.env.LOMADEE_WEBHOOK_SECRET || "";
const MONETIZZE_API_KEY = process.env.MONETIZZE_API_KEY || "";
const MONETIZZE_TOKEN = process.env.MONETIZZE_TOKEN || "";
const MONETIZZE_WEBHOOK_SECRET = process.env.MONETIZZE_WEBHOOK_SECRET || "";

// Parâmetros de economia interna (defaults conservadores)
const CASHBACK_CONVERSION_RATE = Number(process.env.CASHBACK_CONVERSION_RATE || 10); // R$1 => 10 moedas
const CASHBACK_RELEASE_DAYS = Number(process.env.CASHBACK_RELEASE_DAYS || 7);

let stripeInstance = null;
function getStripe() {
  if (!stripeInstance) {
    if (!STRIPE_SECRET) {
      throw new Error("STRIPE_SECRET not configured");
    }
    // Lazy require para evitar custo em paths que não usam Stripe
    stripeInstance = require("stripe")(STRIPE_SECRET);
  }
  return stripeInstance;
}

module.exports = {
  BRAPI_TOKEN,
  BRAPI_BASE,
  GNEWS_KEY,
  NEWSDATA_KEY,
  NEWS_API_KEY,
  TELEGRAM_TOKEN,
  TELEGRAM_API,
  GEMINI_KEY,
  GROQ_KEY,
  OPENAI_KEY,
  CLAUDE_KEY,
  GOOGLE_CLOUD_KEY,
  STRIPE_SECRET,
  STRIPE_WEBHOOK_SECRET,
  getStripe,
  RESEND_API_KEY,
  RESEND_FROM,
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN,
  LOMADEE_APP_TOKEN,
  LOMADEE_SOURCE_ID,
  LOMADEE_WEBHOOK_SECRET,
  MONETIZZE_API_KEY,
  MONETIZZE_TOKEN,
  MONETIZZE_WEBHOOK_SECRET,
  CASHBACK_CONVERSION_RATE,
  CASHBACK_RELEASE_DAYS,
};

