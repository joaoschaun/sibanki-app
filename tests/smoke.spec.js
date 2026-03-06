/**
 * Smoke test RÁPIDO - detecta erros críticos em ~30s
 * Uso: npx playwright test smoke
 * Com credenciais: TEST_EMAIL=x TEST_SENHA=y npx playwright test smoke
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || 'teste@gmail.com';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '123456';

test.describe('Smoke - Sibanki', () => {
  test.beforeEach(async ({ page }) => {
    const erros = [];
    page.on('console', msg => {
      const t = msg.type();
      const text = msg.text();
      if (t === 'error') erros.push(text);
    });
    page.on('pageerror', err => erros.push(err.message));
    page.setExtraHTTPHeaders({ 'Cache-Control': 'no-cache' });
  });

  test('carrega a página sem erros críticos de JS', async ({ page }) => {
    const erros = [];
    page.on('console', msg => {
      if (msg.type() === 'error') erros.push(msg.text());
    });
    page.on('pageerror', err => erros.push(err.message));

    await page.goto('/app', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Erros que indicam problemas graves (renderAll, addE, addMeta, addInv)
    const criticos = erros.filter(e =>
      /renderAll|addE|addMeta|addInv|is not defined|undefined is not/.test(e)
    );
    expect(criticos, `Erros críticos no console: ${criticos.join('; ')}`).toHaveLength(0);
  });

  test('login e dashboard carregam sem quebrar', async ({ page }) => {
    const erros = [];
    page.on('console', msg => {
      if (msg.type() === 'error') erros.push(msg.text());
    });
    page.on('pageerror', err => erros.push(err.message));

    await page.goto('/app', { waitUntil: 'load', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Mostrar auth e login
    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    });
    await page.waitForSelector('#lE', { state: 'visible', timeout: 5000 });

    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });

    // Aguardar app carregar (máx 15s)
    const appOn = await page.locator('.app.on').waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
    if (!appOn) {
      const errMsg = await page.locator('#lErr').textContent().catch(() => '');
      throw new Error('Login falhou: ' + (errMsg || 'App não carregou'));
    }

    // Verificar que não houve erros críticos pós-login
    const criticos = erros.filter(e =>
      /renderAll|addE|addMeta|addInv|is not defined/.test(e)
    );
    expect(criticos, `Erros críticos após login: ${criticos.join('; ')}`).toHaveLength(0);
  });

  test('funções globais existem após login', async ({ page }) => {
    await page.goto('/app', { waitUntil: 'load', timeout: 20000 });
    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    });
    await page.waitForSelector('#lE', { state: 'visible', timeout: 5000 });
    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });
    await page.locator('.app.on').waitFor({ state: 'visible', timeout: 15000 });

    const funcoes = await page.evaluate(() => ({
      renderAll: typeof renderAll === 'function',
      addE: typeof addE === 'function',
      addMeta: typeof addMeta === 'function',
      addInv: typeof addInv === 'function',
    }));

    expect(funcoes.renderAll, 'renderAll deve ser função').toBe(true);
    expect(funcoes.addE, 'addE deve ser função').toBe(true);
    expect(funcoes.addMeta, 'addMeta deve ser função').toBe(true);
    expect(funcoes.addInv, 'addInv deve ser função').toBe(true);
  });
});
