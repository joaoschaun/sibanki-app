#!/usr/bin/env node
/**
 * Validação pré-cutover: verifica se o sistema está pronto para migração.
 * Uso: node scripts/pre-cutover-check.mjs [--staging-url URL]
 */

const STAGING_URL = process.argv.find(a => a.startsWith('--staging-url='))?.split('=')[1]
  || 'https://staging-13a0b.web.app';

const API_URL = 'https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/api';

const checks = [];
let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
  const status = ok ? '✅' : '❌';
  checks.push({ name, ok, detail });
  if (ok) passed++; else failed++;
  console.log(`  ${status} ${name}${detail ? ' — ' + detail : ''}`);
}

async function fetchOk(url, options = {}) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), ...options });
    return { ok: res.ok, status: res.status, headers: res.headers };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, data: null, error: e.message };
  }
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    return { ok: res.ok, text };
  } catch (e) {
    return { ok: false, text: '', error: e.message };
  }
}

console.log('\n🔍 Validação Pré-Cutover — Sibanki\n');
console.log(`  Staging: ${STAGING_URL}`);
console.log(`  API:     ${API_URL}\n`);

console.log('── Frontend (Staging) ──────────────────────');

const index = await fetchText(STAGING_URL);
check('Index HTML carrega', index.ok);
check('Contém React root', index.text.includes('id="root"'));
check('Contém manifest.json', index.text.includes('manifest.json'));
check('Contém theme-color', index.text.includes('theme-color'));
check('Contém apple-touch-icon', index.text.includes('apple-touch-icon'));
check('Define lang="pt-BR"', index.text.includes('lang="pt-BR"'));

const manifest = await fetchJson(`${STAGING_URL}/manifest.json`);
check('Manifest acessível', manifest.ok);
check('Manifest tem icons', manifest.data?.icons?.length > 0, `${manifest.data?.icons?.length || 0} ícones`);
check('Manifest tem start_url', !!manifest.data?.start_url);

const sw = await fetchOk(`${STAGING_URL}/sw.js`);
check('Service Worker acessível', sw.ok);

const fcmSw = await fetchOk(`${STAGING_URL}/firebase-messaging-sw.js`);
check('FCM Service Worker acessível', fcmSw.ok);

const icon192 = await fetchOk(`${STAGING_URL}/icon-192.svg`);
check('Ícone 192 acessível', icon192.ok);

const icon512 = await fetchOk(`${STAGING_URL}/icon-512.svg`);
check('Ícone 512 acessível', icon512.ok);

console.log('\n── Backend (Cloud Functions) ───────────────');

const health = await fetchJson(`${API_URL}/health`);
check('Health endpoint responde', health.ok);
if (health.data?.services) {
  const s = health.data.services;
  check('Firestore conectado', s.firestore?.startsWith('ok'), s.firestore);
  check('Auth conectado', s.auth === 'ok', s.auth);
  check('Gemini configurado', s.gemini === 'configured', s.gemini);
  check('Stripe configurado', s.stripe === 'configured', s.stripe);
  check('WhatsApp configurado', s.whatsapp === 'configured', s.whatsapp);
  check('Pluggy configurado', s.pluggy === 'configured', s.pluggy);
  check('DeepSeek configurado', s.deepseek === 'configured', s.deepseek);
  // Opcionais (não bloqueiam cutover)
  if (s.resend !== 'configured') {
    console.log(`  ⚠️  Resend (email) — ${s.resend} (opcional, emails semanais ficam inativos)`);
  } else {
    check('Resend configurado', true, s.resend);
  }
}

console.log('\n── Resumo ─────────────────────────────────');
console.log(`  Total: ${passed + failed} checks`);
console.log(`  ✅ Passou: ${passed}`);
console.log(`  ❌ Falhou: ${failed}`);

if (failed === 0) {
  console.log('\n  🎉 Sistema PRONTO para cutover!\n');
} else {
  console.log(`\n  ⚠️  ${failed} check(s) falharam. Corrija antes do cutover.\n`);
}

process.exit(failed > 0 ? 1 : 0);
