/**
 * Análise completa do sistema no staging
 * Login + navegação por todos os módulos + captura de erros e screenshots
 *
 * Uso: BASE_URL=https://staging-13a0b.web.app npx playwright test analise-staging
 * Ou: npx playwright test analise-staging --project=staging
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, '..', 'screenshots', 'analise-staging');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || 'teste@gmail.com';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '123456';

const MODULOS = [
  { id: 'dash', nome: 'Dashboard' },
  { id: 'lanc', nome: 'Lançamentos' },
  { id: 'invest', nome: 'Investimentos' },
  { id: 'cartões', nome: 'Cartões' },
  { id: 'metas', nome: 'Metas' },
  { id: 'orçamento', nome: 'Orçamento' },
  { id: 'carteira', nome: 'Carteira' },
  { id: 'casal', nome: 'Família' },
  { id: 'ia', nome: 'Consultor IA' },
  { id: 'dicas', nome: 'Dicas' },
  { id: 'conq', nome: 'Conquistas' },
  { id: 'rel', nome: 'Relatórios' },
  { id: 'calendario', nome: 'Calendário' },
  { id: 'comunidade', nome: 'Comunidade' },
  { id: 'config', nome: 'Configurações' },
];

test.describe('Análise completa - Staging Sibanki', () => {
  const report = { erros: [], warnings: [], modulos: [], timings: {} };

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      const t = msg.type();
      const text = msg.text();
      if (t === 'error') report.erros.push(text);
      else if (t === 'warning') report.warnings.push(text);
    });
    page.on('pageerror', err => report.erros.push(err.message));
  });

  test('login e análise de todos os módulos', async ({ page }) => {
    const startTotal = Date.now();

    // 1. Acessar e fazer login
    await page.goto('/app', { waitUntil: 'load', timeout: 30000 });
    report.timings.carregamento = Date.now() - startTotal;

    // Abrir modal de auth: clicar "Começar Grátis" ou chamar showAuth
    const começarBtn = page.locator('button:has-text("Começar Grátis"), a:has-text("Entrar")').first();
    const authVisible = await começarBtn.isVisible().catch(() => false);
    if (authVisible) {
      await começarBtn.click();
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    });
    await page.waitForSelector('#lE', { state: 'visible', timeout: 10000 });

    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });

    const appVisible = await page.locator('.app.on').waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);
    if (!appVisible) {
      const errMsg = await page.locator('#lErr').textContent().catch(() => '');
      throw new Error('Login falhou: ' + (errMsg || 'App não carregou em 20s'));
    }

    report.modulos.push({ id: 'login', nome: 'Login', ok: true });
    await page.screenshot({ path: path.join(screenshotDir, '00-login-ok.png'), fullPage: false });

    // Fechar onboarding se aparecer
    await page.evaluate(() => {
      const ob = document.getElementById('onboardOverlay');
      if (ob?.classList.contains('show')) {
        const close = document.querySelector('.onb-skip, .onb-close, [onclick*="closeOnboard"]');
        if (close) close.click();
        else for (let i = 0; i < 6; i++) {
          const next = document.querySelector('.onb-next, .onb-btn');
          if (next) next.click();
        }
      }
    }).catch(() => {});

    await page.waitForTimeout(1500);

    // 2. Navegar por cada módulo
    for (let i = 0; i < MODULOS.length; i++) {
      const mod = MODULOS[i];
      const t0 = Date.now();
      try {
        await page.evaluate((id) => {
          if (typeof go === 'function') go(id, null);
        }, mod.id);

        await page.waitForTimeout(800);

        const tabVisible = await page.locator(`#${mod.id}.tab.on`).waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
        const hasContent = tabVisible ? await page.locator(`#${mod.id}`).evaluate(el => el && el.textContent?.length > 50).catch(() => false) : false;

        report.modulos.push({
          id: mod.id,
          nome: mod.nome,
          ok: !!tabVisible,
          tempo: Date.now() - t0,
          hasContent,
        });

        await page.screenshot({
          path: path.join(screenshotDir, `${String(i + 1).padStart(2, '0')}-${mod.id}.png`),
          fullPage: false,
        }).catch(() => {});
      } catch (e) {
        report.modulos.push({ id: mod.id, nome: mod.nome, ok: false, erro: e.message });
      }
    }

    // 3. Testar drawer (menu lateral)
    try {
      await page.click('.top-header-btn-menu', { timeout: 3000 });
      await page.waitForSelector('.drawer.open, .drawer-sidebar-mode', { timeout: 3000 }).catch(() => null);
      const drawerOpen = await page.locator('.drawer.open, body.drawer-sidebar-mode').isVisible().catch(() => false);
      if (drawerOpen) {
        await page.screenshot({ path: path.join(screenshotDir, '99-drawer-aberto.png'), fullPage: false });
      }
      await page.evaluate(() => {
        if (typeof closeDrawer === 'function') closeDrawer();
      }).catch(() => {});
    } catch (_) {}

    // 4. Testar edição de widgets (Dashboard)
    try {
      await page.evaluate(() => { if (typeof go === 'function') go('dash', null); });
      await page.waitForTimeout(500);
      const editBtn = page.locator('#dashEditBtn');
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(500);
        const panelVisible = await page.locator('#dashEditPanel.show').isVisible().catch(() => false);
        if (panelVisible) {
          await page.screenshot({ path: path.join(screenshotDir, '98-edit-widgets.png'), fullPage: false });
          await page.click('.dash-edit-panel-close').catch(() => page.evaluate(() => { if (typeof toggleDashboardEdit === 'function') toggleDashboardEdit(); }));
        }
      }
    } catch (_) {}

    report.timings.total = Date.now() - startTotal;

    // 5. Relatório final
    const errosUnicos = [...new Set(report.erros)];
    const criticos = errosUnicos.filter(e => /renderAll|addE|addMeta|addInv|go\(|is not defined|undefined/.test(e));

    console.log('\n========== RELATÓRIO DE ANÁLISE - STAGING ==========');
    console.log('Módulos:', report.modulos.map(m => `${m.nome}: ${m.ok ? 'OK' : 'FALHOU'}`).join(' | '));
    console.log('Tempo total:', (report.timings.total / 1000).toFixed(1), 's');
    if (errosUnicos.length > 0) {
      console.log('\nErros console:', errosUnicos.length);
      errosUnicos.slice(0, 10).forEach((e, i) => console.log(' ', i + 1, e.substring(0, 120)));
    }
    if (report.warnings.length > 0) {
      console.log('\nWarnings:', report.warnings.length);
    }
    console.log('Screenshots em:', screenshotDir);
    console.log('====================================================\n');

    expect(criticos, `Erros críticos: ${criticos.slice(0, 3).join('; ')}`).toHaveLength(0);

    const modulosOk = report.modulos.filter(m => m.ok).length;
    expect(modulosOk, `Pelo menos 12 módulos devem carregar (carregaram ${modulosOk})`).toBeGreaterThanOrEqual(12);
  });
});
