/**
 * Validação em staging com conta teste — contexto limpo (simula anônimo).
 * URL: https://staging-13a0b.web.app/app/
 * Uso: npx playwright test staging-login-validacao --project=staging-validation
 * O projeto staging-validation roda em headed por padrão (Firebase Auth falha em headless).
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EMAIL = process.env.TEST_EMAIL || 'teste2@gmail.com';
const SENHA = process.env.TEST_SENHA || '123456';
const screenshotDir = path.join(__dirname, '..', 'screenshots', 'staging-validation');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

test.describe('Staging - Login e validação (contexto limpo)', () => {
  test.use({
    storageState: undefined,
    ignoreHTTPSErrors: true,
  });

  test('abre /app em staging, faz login e verifica fluxo', async ({ page }, testInfo) => {
    const baseURL = process.env.BASE_URL || 'https://staging-13a0b.web.app';
    const appUrl = `${baseURL}/app/`;
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    });
    await page.waitForSelector('#lE', { state: 'visible', timeout: 12000 });
    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.waitForTimeout(300);
    await page.click('#lBtn', { force: true });

    await page.waitForSelector('#lBtn:has-text("Entrando...")', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const authErr = await page.locator('#lErr.show').textContent().catch(() => '');
    if (authErr) {
      await page.screenshot({ path: path.join(screenshotDir, '00-erro-auth.png'), fullPage: true });
      throw new Error('Login falhou: ' + (authErr || 'erro de autenticação'));
    }

    await page.waitForSelector('#app.on, #sibankiOnboarding', { timeout: 45000 }).catch(() => {});

    const appHasOn = await page.locator('#app.on').count() > 0;
    const onboardingVisible = await page.locator('#sibankiOnboarding').isVisible().catch(() => false);
    if (!appHasOn && !onboardingVisible) {
      await page.screenshot({ path: path.join(screenshotDir, '00-login-falhou.png'), fullPage: true });
    }
    expect(
      appHasOn || onboardingVisible,
      'Login não concluiu. URL testada: ' + appUrl
    ).toBe(true);

    await page.screenshot({ path: path.join(screenshotDir, '01-apos-login.png'), fullPage: true });

    const erros = [];

    const onbMdl = await page.locator('#onbMdl').count();
    if (onbMdl > 0) {
      const visible = await page.locator('#onbMdl').isVisible().catch(() => false);
      if (visible) erros.push('Tour antigo (#onbMdl) ainda aparece');
    }

    const onboardOverlay = await page.locator('#onboardOverlay').count();
    if (onboardOverlay > 0) {
      const visible = await page.locator('#onboardOverlay.show').isVisible().catch(() => false);
      if (visible) erros.push('Onboarding legado (#onboardOverlay) ainda aparece');
    }

    const sibTour = await page.locator('#sibTourOverlay').count();
    const sibTourVisible = sibTour > 0 && await page.locator('#sibTourOverlay.show').isVisible().catch(() => false);
    const spotlight = await page.locator('#sibTourSpotlight').count();
    const spotlightVisible = spotlight > 0 && await page.locator('#sibTourSpotlight').isVisible().catch(() => false);

    if (sibTourVisible) {
      await page.screenshot({ path: path.join(screenshotDir, '02-tour-guiado-ativo.png'), fullPage: true });
      if (!spotlightVisible) erros.push('Tour guiado ativo mas spotlight não visível');
    }

    const dash = await page.locator('#dash.tab.on, .tab.on#dash').count();
    const appOnCount = await page.locator('#app.on').count();
    if (!appOnCount) erros.push('App principal (#app.on) não está presente');
    if (dash === 0 && !sibTourVisible) {
      const anyTab = await page.locator('.tab.on').first().count();
      if (anyTab === 0) erros.push('Nenhuma tab ativa após login');
    }

    const primeirosPassos = await page.locator('#sibPrimeirosPassos').count();
    const ppVisible = primeirosPassos > 0 && await page.locator('#sibPrimeirosPassos').isVisible().catch(() => false);
    if (ppVisible) {
      await page.screenshot({ path: path.join(screenshotDir, '03-primeiros-passos.png'), fullPage: true });
    }

    if (sibTourVisible) {
      const skip = page.locator('#sibTourSkip');
      if (await skip.isVisible().catch(() => false)) {
        await skip.click();
        await page.waitForTimeout(800);
      }
    }

    await page.screenshot({ path: path.join(screenshotDir, '04-dashboard-final.png'), fullPage: true });

    const tooltip = await page.locator('#sibTourTooltip').count();
    const tooltipVisible = tooltip > 0 && await page.locator('#sibTourTooltip').isVisible().catch(() => false);
    if (tooltipVisible && sibTourVisible) {
    }

    expect(erros, erros.length ? 'Falhas: ' + erros.join('; ') : 'OK').toHaveLength(0);
  });
});
