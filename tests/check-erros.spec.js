/**
 * Captura erros do console após login - diagnóstico
 * Uso: TEST_EMAIL=seu@email.com TEST_SENHA=senha npx playwright test check-erros
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '';

test.describe('Check erros - diagnóstico', () => {
  test.skip(!EMAIL || !SENHA, 'Defina TEST_EMAIL e TEST_SENHA para rodar');

  test('login e lista erros do console', async ({ page }) => {
    const erros = [];
    const warnings = [];

    page.on('console', msg => {
      const t = msg.type();
      const text = msg.text();
      if (t === 'error') erros.push(text);
      else if (t === 'warning') warnings.push(text);
    });
    page.on('pageerror', err => erros.push(err.message));

    await page.goto('/app', { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    });
    await page.waitForSelector('#lE', { state: 'visible', timeout: 5000 });
    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });

    const appVisible = await page.locator('.app.on').waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
    if (!appVisible) {
      const errMsg = await page.locator('#lErr').textContent().catch(() => '');
      console.log('\n❌ Login falhou:', errMsg || 'App não carregou');
    }

    await page.waitForTimeout(3000); // tempo para erros aparecerem

    const uniqErros = [...new Set(erros)];
    const uniqWarnings = [...new Set(warnings)];

    console.log('\n========== ERROS DO CONSOLE ==========');
    uniqErros.forEach((e, i) => console.log((i + 1) + '.', e));
    console.log('\n========== WARNINGS ==========');
    uniqWarnings.forEach((w, i) => console.log((i + 1) + '.', w));
    console.log('======================================\n');

    // Falha se houver erros críticos
    const criticos = uniqErros.filter(e =>
      /permission|renderAll|addE|addMeta|addInv|is not defined/.test(e)
    );
    expect(criticos, `Erros críticos encontrados: ${criticos.join('; ')}`).toHaveLength(0);
  });
});
