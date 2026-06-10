/**
 * Comparação visual: captura screenshots de cada módulo do APP LEGADO.
 * Legado: por padrão em https://virtus-financeiro-cd7bd.web.app/app/
 * Uso: npx playwright test compare-modulos-legado --project=compare-legado
 * Screenshots: screenshots/compare/legado/
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE =
  process.env.LEGACY_BASE_URL ||
  process.env.BASE_URL ||
  'https://virtus-financeiro-cd7bd.web.app/app';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'compare', 'legado');
const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '';

const MODULOS_LEGADO = [
  { id: 'dash', nome: 'Dashboard' },
  { id: 'lanc', nome: 'Lancamentos' },
  { id: 'contas', nome: 'Contas' },
  { id: 'cartões', nome: 'Cartoes' },
  { id: 'invest', nome: 'Investimentos' },
  { id: 'metas', nome: 'Metas' },
  { id: 'orçamento', nome: 'Orcamento' },
  { id: 'ia', nome: 'Consultor-IA' },
  { id: 'dicas', nome: 'Educacao' },
  { id: 'comunidade', nome: 'Social' },
  { id: 'perfil', nome: 'Perfil' },
  { id: 'config', nome: 'Configuracoes' },
];

test.describe.configure({ mode: 'serial' });

test.describe('Compare módulos - Legado', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('login no legado e captura de cada módulo', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Defina TEST_EMAIL e TEST_SENHA para rodar a comparação');

    await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });

    // Abrir auth e preencher login (legado)
    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    }).catch(() => {});
    await page.waitForSelector('#lE', { state: 'visible', timeout: 10000 }).catch(() => null);
    if (!(await page.locator('#lE').isVisible())) {
      throw new Error('Tela de login do legado não encontrada. Rode o legado (npm run dev:legacy) ou defina LEGACY_BASE_URL.');
    }

    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });

    await page.locator('.app.on').waitFor({ state: 'visible', timeout: 20000 });

    // Fechar onboarding se existir
    await page.evaluate(() => {
      const ob = document.getElementById('onboardOverlay');
      if (ob?.classList.contains('show')) {
        const close = document.querySelector('.onb-skip, .onb-close, [onclick*="closeOnboard"]');
        if (close) close.click();
      }
    }).catch(() => {});
    await page.waitForTimeout(800);

    for (let i = 0; i < MODULOS_LEGADO.length; i++) {
      const mod = MODULOS_LEGADO[i];
      await page.evaluate((id) => { if (typeof go === 'function') go(id, null); }, mod.id);
      await page.waitForTimeout(1000);
      const tab = page.locator(`#${mod.id}.tab.on`);
      await tab.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${String(i + 1).padStart(2, '0')}-${mod.nome}.png`),
        fullPage: false,
      }).catch(() => {});
    }

    console.log('Screenshots legado salvos em:', SCREENSHOT_DIR);
  });
});
