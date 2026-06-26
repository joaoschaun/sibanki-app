/**
 * Testes de Viewport Mobile e Regressão Visual de Layout (Safe Areas e Posicionamento)
 * Caminho: tests/mobile-viewport.spec.cjs
 * Execução: npx playwright test tests/mobile-viewport.spec.cjs
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || 'teste@gmail.com';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '123456';

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
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
}

const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'Pixel 5', width: 393, height: 851 }
];

test.describe('Mobile Viewport & Safe Area Verification', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'TEST_EMAIL e TEST_SENHA obrigatórios');
  });

  for (const vp of VIEWPORTS) {
    test(`Layout sanity and safe-areas on ${vp.name}`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await login(page);
      await dismissOverlays(page);

      // Verify Dashboard layout
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Inject simulated safe areas (notch / home indicator bar)
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.id = 'simulated-safe-areas';
        style.innerHTML = `
          header {
            padding-top: 47px !important;
            height: calc(3.5rem + 47px) !important;
          }
          nav.fixed {
            padding-bottom: 34px !important;
            height: calc(3.5rem + 34px) !important;
          }
        `;
        document.head.appendChild(style);
      });

      await page.waitForTimeout(500);

      // 1. Check no horizontal overflow
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      // 2. Verify Header positioning at top
      const header = page.locator('header').first();
      if (await header.isVisible()) {
        const headerBox = await header.boundingBox();
        expect(headerBox).not.toBeNull();
        expect(headerBox.y).toBe(0); // must snap to top
      }

      // 3. Verify Bottom Navigation positioning at bottom
      const bottomNav = page.locator('nav').filter({ hasText: /Lançar|CECI/i }).first();
      if (await bottomNav.isVisible()) {
        const navBox = await bottomNav.boundingBox();
        expect(navBox).not.toBeNull();
        // The bottom of the nav should be at the bottom of the viewport
        expect(Math.round(navBox.y + navBox.height)).toBe(vp.height);
      }

      // 4. Verify CECI Button or drawer does not overlap tab actions
      const cecifab = page.locator('button').filter({ hasText: /ceci/i }).first();
      if (await cecifab.isVisible()) {
        const fabBox = await cecifab.boundingBox();
        const navBox = await bottomNav.boundingBox();
        if (fabBox && navBox) {
          // The FAB should be positioned above or inside the bottom nav correctly without covering the main options
          expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(navBox.y + 10);
        }
      }
    });
  }
});
