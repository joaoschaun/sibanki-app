/**
 * Layout mobile (320-class) — sem scroll horizontal na raiz.
 * Uso: npx playwright test --project=react-smoke-mobile-layout
 * Credenciais: TEST_EMAIL / TEST_SENHA (mesmo fluxo do react-smoke)
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '';

async function login(page) {
  await page.goto('/', { waitUntil: 'networkidle', timeout: 25000 });
  const emailInput = page.locator('input[type="email"]').last();
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(EMAIL);
    await page.locator('input[type="password"]').fill(SENHA);
    await page.locator('button[type="submit"]').last().click();
    await page.waitForTimeout(6000);
  }
}

async function dismissOverlays(page) {
  await page.waitForTimeout(800);
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

async function assertNoDocumentHorizontalOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth,
    `scrollWidth (${scrollWidth}) > clientWidth (${clientWidth}) — possível overflow horizontal`,
  ).toBeLessThanOrEqual(clientWidth + 1);
}

const ROUTES = [
  '/dashboard',
  '/consultor-ia',
  '/credito/visao-geral',
  '/credito/cartoes',
  '/lancamentos',
];

test.describe('React — layout mobile (sem overflow horizontal)', () => {
  test('rotas críticas cabem na largura do viewport', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'TEST_EMAIL e TEST_SENHA obrigatórios');
    await login(page);
    await dismissOverlays(page);

    for (const path of ROUTES) {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2500);
      await assertNoDocumentHorizontalOverflow(page);
    }
  });
});
