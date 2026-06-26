import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Mesmo config do app atual (public/app/app.js) – Firestore default, sem segundo banco
const firebaseConfig = {
  apiKey: 'AIzaSyAFuVpVJQb51MYqXyKD9w9ETwI-FHKv2k8',
  authDomain: 'virtus-financeiro-cd7bd.firebaseapp.com',
  projectId: 'virtus-financeiro-cd7bd',
  storageBucket: 'virtus-financeiro-cd7bd.firebasestorage.app',
  messagingSenderId: '508459921027',
  appId: '1:508459921027:web:fb54b7f94795bdb88735b6',
  measurementId: 'G-M03SM9BFWX',
};

const app = initializeApp(firebaseConfig);

/**
 * App Check (Ação #5 — Análise 360): protege as callables contra abuso.
 * Só ativa quando VITE_APPCHECK_SITE_KEY estiver definida no build — assim o
 * deploy é seguro em 2 fases: (1) front com a chave em modo Monitoring,
 * (2) `ENFORCE_APP_CHECK=true` nas Functions após validar métricas.
 * Checklist completo: docs/APP_CHECK.md.
 */
const appCheckSiteKey = import.meta.env.VITE_APPCHECK_SITE_KEY as string | undefined;
if (appCheckSiteKey) {
  let isLocalOrStaging = false;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    isLocalOrStaging = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('staging') || hostname.includes('staging-13a0b');
  }

  if (!isLocalOrStaging) {
    import('firebase/app-check')
      .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
      })
      .catch(() => { /* App Check é proteção adicional — nunca bloqueia o boot */ });
  } else {
    console.log('[AppCheck] Ignorado em localhost/staging para não bloquear as consultas de teste.');
  }
}

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const storage = getStorage(app);

/**
 * Regiões das Cloud Functions — fonte única de verdade.
 *
 * Por que duas regiões?
 * - `fnsBR` (southamerica-east1): SibCoin, Afiliados, Open Finance (Pluggy), Afiliados.
 *   Deployados aqui por menor latência no Brasil.
 * - `fnsUS` (us-central1): funções legadas e todas as que usam cold-start menor
 *   (BRAPI, chat IA, billing, WhatsApp, Sentinel).
 *   Cloudflare já faz CDN → latência aceitável.
 *
 * Use estes exports em vez de chamar getFunctions() inline com string de região.
 */
export const fnsBR = getFunctions(app, 'southamerica-east1');
export const fnsUS = getFunctions(app, 'us-central1');

/**
 * @deprecated Use `fnsUS` ou `fnsBR` explicitamente.
 * Mantido para compatibilidade com AgentCouncil.tsx e imports antigos.
 */
export const functions = fnsUS;

export default app;
