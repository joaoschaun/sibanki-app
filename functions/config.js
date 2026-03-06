// Configuração centralizada de ambiente e integrações
try {
  // Carrega variáveis de ambiente em desenvolvimento local
  require("dotenv").config();
} catch (e) {}

// BRAPI / mercado: .env (local) ou Firebase config (produção: firebase functions:config:set brapi.token="SEU_TOKEN_PRO")
let BRAPI_TOKEN = process.env.BRAPI_TOKEN || "";
if (!BRAPI_TOKEN) {
  try {
    const fn = require("firebase-functions");
    if (fn.config && fn.config().brapi && fn.config().brapi.token) {
      BRAPI_TOKEN = fn.config().brapi.token;
    }
  } catch (e) {}
}
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

// Gemini
const GEMINI_KEY = process.env.GEMINI_KEY || "";

// Stripe
const STRIPE_SECRET = process.env.STRIPE_SECRET || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// E-mail (Resend) - convite família (domínio sibanki.com.br)
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || "Sibanki Familia <familia@sibanki.com.br>";

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
  STRIPE_WEBHOOK_SECRET,
  getStripe,
  RESEND_API_KEY,
  RESEND_FROM
};

