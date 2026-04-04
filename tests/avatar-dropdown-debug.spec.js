/**
 * Debug: dropdown do avatar no canto superior direito
 * Verifica se o dropdown aparece corretamente e não é cortado (especialmente na aba Lançamentos)
 * Uso: npx playwright test avatar-dropdown-debug --headed
 * Requer: TEST_EMAIL e TEST_SENHA
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'https://virtus-financeiro-cd7bd.web.app/app';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'avatar-dropdown-debug');
const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '';

test.describe('Avatar dropdown - debug', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('login e abre dropdown no Dashboard', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Defina TEST_EMAIL e TEST_SENHA');

    await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });

    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    }).catch(() => {});
    await page.waitForSelector('#lE', { state: 'visible', timeout: 10000 }).catch(() => null);
    if (!(await page.locator('#lE').isVisible())) {
      throw new Error('Tela de login não encontrada.');
    }

    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });

    await page.waitForTimeout(3000);
    const errEl = await page.locator('#lErr').textContent().catch(() => '');
    if (errEl) console.log('Erro de login:', errEl);

    await page.locator('.app.on').waitFor({ state: 'visible', timeout: 25000 });

    await page.evaluate(() => {
      const ob = document.getElementById('onboardOverlay');
      if (ob?.classList.contains('show')) {
        const close = document.querySelector('.onb-skip, .onb-close, [onclick*="closeOnboard"]');
        if (close) close.click();
      }
    }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.evaluate(() => { if (typeof go === 'function') go('dash', null); });
    await page.waitForTimeout(800);

    const avatar = page.locator('#topHeaderAvatar');
    await avatar.waitFor({ state: 'visible', timeout: 5000 });
    await avatar.click({ force: true });
    await page.waitForTimeout(500);

    const dd = page.locator('#avatarDropdown.open');
    await expect(dd).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard-dropdown-aberto.png'), fullPage: false });
    const ddBox = await dd.boundingBox();
    const viewport = page.viewportSize();
    if (ddBox && viewport) {
      const cortadoTopo = ddBox.y < 0;
      const cortadoDireita = ddBox.x + ddBox.width > viewport.width;
      const cortadoEsquerda = ddBox.x < 0;
      const cortadoBaixo = ddBox.y + ddBox.height > viewport.height;
      if (cortadoTopo || cortadoDireita || cortadoEsquerda || cortadoBaixo) {
        console.log('Dashboard - Dropdown possivelmente cortado:', { cortadoTopo, cortadoDireita, cortadoEsquerda, cortadoBaixo, ddBox, viewport });
      }
    }
  });

  test('abre dropdown na aba Lançamentos (onde corta)', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Defina TEST_EMAIL e TEST_SENHA');

    await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });

    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    }).catch(() => {});
    await page.waitForSelector('#lE', { state: 'visible', timeout: 10000 }).catch(() => null);
    if (!(await page.locator('#lE').isVisible())) {
      throw new Error('Tela de login não encontrada.');
    }

    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });

    await page.waitForTimeout(3000);
    const errEl = await page.locator('#lErr').textContent().catch(() => '');
    if (errEl) console.log('Erro de login:', errEl);

    await page.locator('.app.on').waitFor({ state: 'visible', timeout: 25000 });

    await page.evaluate(() => {
      const ob = document.getElementById('onboardOverlay');
      if (ob?.classList.contains('show')) {
        const close = document.querySelector('.onb-skip, .onb-close, [onclick*="closeOnboard"]');
        if (close) close.click();
      }
    }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.evaluate(() => { if (typeof go === 'function') go('lanc', null); });
    await page.waitForTimeout(1200);

    const avatar = page.locator('#topHeaderAvatar');
    await avatar.waitFor({ state: 'visible', timeout: 5000 });
    await avatar.click({ force: true });
    await page.waitForTimeout(500);

    const dd = page.locator('#avatarDropdown.open');
    await expect(dd).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-lancamentos-dropdown-aberto.png'), fullPage: false });

    const ddBox = await dd.boundingBox();
    const viewport = page.viewportSize();
    const headerBox = await page.locator('#topHeader').boundingBox();

    if (ddBox && viewport && headerBox) {
      const cortadoTopo = ddBox.y < headerBox.y + headerBox.height;
      const itemPerfil = page.locator('.avatar-dropdown-item').first();
      const perfilBox = await itemPerfil.boundingBox();
      const perfilVisivel = perfilBox && perfilBox.y >= 0 && perfilBox.y + perfilBox.height <= viewport.height;

      console.log('Lançamentos - Análise:', {
        ddBox,
        headerBox,
        viewport,
        cortadoTopo,
        perfilVisivel,
        perfilBox,
      });
    }
  });

  test('clique fora fecha o dropdown', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Defina TEST_EMAIL e TEST_SENHA');

    await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });

    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    }).catch(() => {});
    await page.waitForSelector('#lE', { state: 'visible', timeout: 10000 }).catch(() => null);
    if (!(await page.locator('#lE').isVisible())) {
      throw new Error('Tela de login não encontrada.');
    }

    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });

    await page.waitForTimeout(3000);
    const errEl = await page.locator('#lErr').textContent().catch(() => '');
    if (errEl) console.log('Erro de login:', errEl);

    await page.locator('.app.on').waitFor({ state: 'visible', timeout: 25000 });

    await page.evaluate(() => {
      const ob = document.getElementById('onboardOverlay');
      if (ob?.classList.contains('show')) {
        const close = document.querySelector('.onb-skip, .onb-close, [onclick*="closeOnboard"]');
        if (close) close.click();
      }
    }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.locator('#topHeaderAvatar').click({ force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('#avatarDropdown.open')).toBeVisible();

    await page.click('.top-header-logo', { force: true });
    await page.waitForTimeout(300);

    await expect(page.locator('#avatarDropdown.open')).not.toBeVisible();
  });
});
