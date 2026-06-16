/**
 * E2E Security Tests for Admin Routes
 * Usage: npx playwright test tests/admin-security.spec.cjs
 */
const { test, expect } = require('@playwright/test');

test.describe('Admin Route Security - Unauthenticated & Non-Admin', () => {
  test('unauthenticated user is redirected to Login page', async ({ page }) => {
    // Navigate directly to admin dashboard without authenticating
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Should show the Login page since the user is not authenticated
    await expect(page.locator('text=Bem-vindo de volta')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Entre para ver seus Dias de Liberdade')).toBeVisible();
  });

  test('non-admin user is denied access to admin', async ({ page }) => {
    const email = process.env.TEST_EMAIL || process.env.EMAIL || '';
    const senha = process.env.TEST_SENHA || process.env.SENHA || '';
    if (!email || !senha) {
      test.skip(true, 'Credentials required to check non-admin blocking behavior');
      return;
    }
    
    // Perform login with test credentials (standard non-admin account)
    await page.goto('/', { waitUntil: 'networkidle', timeout: 25000 });
    const emailInput = page.locator('input[type="email"]').last();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(email);
      await page.locator('input[type="password"]').fill(senha);
      await page.locator('button[type="submit"]').last().click();
      await page.waitForTimeout(6000);
    }
    
    // Attempt navigation to admin area
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Guard should trigger and block display
    await expect(page.locator('text=Acesso Restrito')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Você não tem permissão para acessar esta área')).toBeVisible();
  });
});
