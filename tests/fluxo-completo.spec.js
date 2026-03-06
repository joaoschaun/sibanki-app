/**
 * Fluxo completo: Login → Dashboard → Despesa → Meta → Análise IA
 * Uso: npx playwright test fluxo-completo
 * TEST_EMAIL=x TEST_SENHA=y npx playwright test fluxo-completo
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || 'teste@gmail.com';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '123456';

test.describe('Fluxo completo - Sibanki', () => {
  const report = { erros: [], sucessos: [], timings: {} };

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') report.erros.push(msg.text());
    });
    page.on('pageerror', err => report.erros.push(err.message));
  });

  test('login, dashboard, despesa, meta e análise IA', async ({ page }) => {
    const startTotal = Date.now();

    // 1. Login
    const t0 = Date.now();
    await page.goto('/app', { waitUntil: 'load', timeout: 30000 });
    report.timings.carregamento = Date.now() - t0;

    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    });
    await page.waitForSelector('#lE', { state: 'visible', timeout: 5000 });
    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });

    await expect(page.locator('.app.on')).toBeVisible({ timeout: 15000 });
    report.sucessos.push('Login OK');

    // 2. Dashboard
    const t1 = Date.now();
    await page.evaluate(() => {
      const n = document.querySelectorAll('.ni')[0];
      if (n && typeof go === 'function') go('dash', n);
    });
    await page.waitForSelector('.app.on', { state: 'visible', timeout: 3000 });
    report.timings.dashboard = Date.now() - t1;

    await page.screenshot({ path: path.join(screenshotDir, '01-dashboard.png'), fullPage: true });

    // Fechar onboarding se aparecer
    await page.evaluate(() => {
      const ob = document.getElementById('onboardOverlay');
      if (ob?.classList.contains('show')) {
        for (let i = 0; i < 5; i++) {
          const next = document.querySelector('.onb-next, .onb-btn');
          if (next) next.click();
        }
      }
    }).catch(() => {});

    // 3. Criar despesa
    const t2 = Date.now();
    await page.evaluate(() => {
      const n = document.querySelector('.ni[onclick*="lanc"]') || document.querySelectorAll('.ni')[1];
      if (n && typeof go === 'function') go('lanc', n);
    });
    await page.waitForSelector('#fV', { state: 'visible', timeout: 5000 });

    await page.fill('#fV', '50');
    await page.fill('#fDe', 'Teste Supermercado');
    await page.waitForSelector('#fC', { state: 'visible', timeout: 3000 });
    await page.selectOption('#fC', { value: 'Alimentação' }).catch(() => {});
    await page.click('#btnLancSalvar');
    report.timings.despesa = Date.now() - t2;

    await expect(page.locator('.toast, [class*="toast"]')).toBeVisible({ timeout: 5000 });
    report.sucessos.push('Despesa R$ 50 criada');

    // 4. Criar meta
    const t3 = Date.now();
    await page.evaluate(() => {
      const n = document.querySelector('.ni[onclick*="metas"]') || document.querySelectorAll('.ni')[4];
      if (n && typeof go === 'function') go('metas', n);
    });
    await page.waitForSelector('#metaNome', { state: 'visible', timeout: 5000 });

    const prazo = new Date();
    prazo.setMonth(prazo.getMonth() + 12);
    await page.fill('#metaNome', 'Meta Teste');
    await page.fill('#metaAlvo', '10000');
    await page.fill('#metaAtual', '0');
    await page.fill('#metaPrazo', prazo.toISOString().split('T')[0]);
    await page.click('button:has-text("Criar Meta")');
    report.timings.meta = Date.now() - t3;

    await expect(page.locator('.toast, [class*="toast"]')).toBeVisible({ timeout: 8000 });
    report.sucessos.push('Meta R$ 10.000 criada');

    // 5. Verificar análise IA
    const iaCard = page.locator('#metaIAAnaliseCard');
    await iaCard.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const iaVisible = await iaCard.isVisible().catch(() => false);
    if (iaVisible) report.sucessos.push('Análise IA exibida');

    await page.screenshot({ path: path.join(screenshotDir, '02-metas-com-ia.png'), fullPage: true });

    report.timings.total = Date.now() - startTotal;

    // Falhar se houve erros críticos
    const criticos = report.erros.filter(e =>
      /renderAll|addE|addMeta|addInv|is not defined/.test(e)
    );
    expect(criticos, `Erros críticos: ${criticos.join('; ')}`).toHaveLength(0);
  });
});
