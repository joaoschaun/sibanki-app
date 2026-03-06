/**
 * Captura erros do console ao fazer login na conta
 * Uso: EMAIL=seu@email.com SENHA=suasenha node check-erros-conta.js
 * PowerShell: $env:EMAIL="seu@email.com"; $env:SENHA="sua"; node check-erros-conta.js
 */
const { chromium } = require('@playwright/test');

const BASE_URL = 'https://virtus-financeiro-cd7bd.web.app/app';
const EMAIL = process.env.EMAIL || '';
const SENHA = process.env.SENHA || '';

const erros = [];
const warnings = [];

async function run() {
  if (!EMAIL || !SENHA) {
    console.log('Use: EMAIL=seu@email.com SENHA=suasenha node check-erros-conta.js');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  page.on('console', msg => {
    const t = msg.type();
    const text = msg.text();
    if (t === 'error') erros.push(text);
    else if (t === 'warning') warnings.push(text);
  });
  page.on('pageerror', err => erros.push(err.message));

  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    if (typeof showAuth === 'function') showAuth();
    if (typeof showLog === 'function') showLog();
  });
  await page.waitForTimeout(1000);

  await page.fill('#lE', EMAIL, { force: true });
  await page.fill('#lP', SENHA, { force: true });
  await page.click('#lBtn', { force: true });
  await page.waitForTimeout(8000);

  console.log('\n========== ERROS DO CONSOLE ==========\n');
  const uniq = [...new Set(erros)];
  uniq.forEach((e, i) => console.log((i + 1) + '. ' + e));
  console.log('\n========== WARNINGS ==========\n');
  const uniqW = [...new Set(warnings)];
  uniqW.forEach((w, i) => console.log((i + 1) + '. ' + w));
  console.log('\n========================================\n');

  await page.waitForTimeout(5000);
  await browser.close();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
