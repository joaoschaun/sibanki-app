/**
 * Verifica layout Família e Calendário no staging - gap entre topo e conteúdo
 * Uso: npx playwright test verifica-familia-calendario --project=diagrama-layout
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || 'teste@gmail.com';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '123456';

function injectAppState(page) {
  return page.evaluate(() => {
    const lp = document.getElementById('landingPage');
    if (lp) lp.style.display = 'none';
    const ab = document.getElementById('authBg');
    if (ab) ab.classList.add('hidden');
    const app = document.getElementById('app');
    if (app) app.classList.add('on');
    const lb = document.getElementById('loadBg');
    if (lb) { lb.classList.add('hidden'); lb.style.display = 'none'; }
    window.U = { uid: 'test', email: 'test@test.com', displayName: 'Teste' };
    window.entries = []; window.investments = []; window.goals = [];
    window.budgets = {}; window.userAccs = ['Nubank'];
    window.accountBalances = { Nubank: 1000 };
    window.recurrents = []; window.cards = []; window.userCats = [];
    window.achievements = {}; window.dashboardLayout = null;
    window.onboardingDone = true;
    try {
      if (typeof initUI === 'function') initUI();
    } catch (e) {
      document.querySelectorAll('.tab').forEach(t => { t.classList.remove('on'); t.style.animation = 'none'; });
      const dash = document.getElementById('dash');
      if (dash) dash.classList.add('on');
    }
  });
}

function measureGap(page) {
  return page.evaluate(() => {
    const topHeader = document.getElementById('topHeader');
    const wrap = document.querySelector('.wrap');
    const activeTab = wrap?.querySelector('.tab.on');
    if (!topHeader || !activeTab) return null;
    const headerRect = topHeader.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const gap = Math.round(tabRect.top - headerRect.bottom);
    return {
      tabId: activeTab.id,
      headerBottom: Math.round(headerRect.bottom),
      tabTop: Math.round(tabRect.top),
      gap,
      viewportHeight: window.innerHeight,
    };
  });
}

test('navega staging, Família e Calendário - verifica gap', async ({ page }) => {
  const resultado = { navegou: false, loginOk: false, familia: null, calendario: null };

  // 1. Navegar até staging
  await page.goto('https://staging-13a0b.web.app/app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  resultado.navegou = true;
  await page.waitForTimeout(2500);

  // 2. Lidar com login
  const authForm = page.locator('#lE');
  const authVisible = await authForm.isVisible().catch(() => false);
  if (authVisible) {
    try {
      await page.evaluate(() => {
        if (typeof showAuth === 'function') showAuth();
        if (typeof showLog === 'function') showLog();
      });
      await page.waitForSelector('#lE', { state: 'visible', timeout: 5000 });
      await page.fill('#lE', EMAIL, { force: true });
      await page.fill('#lP', SENHA, { force: true });
      await page.click('#lBtn', { force: true });
      const appOn = await page.locator('.app.on').waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
      resultado.loginOk = !!appOn;
    } catch (e) {
      resultado.loginOk = false;
    }
  }
  if (!resultado.loginOk) {
    await injectAppState(page);
    await page.waitForTimeout(1200);
  }

  // Fechar onboarding/onbMdl que bloqueia cliques
  await page.evaluate(() => {
    window.onboardingDone = true;
    const ob = document.getElementById('onboardOverlay');
    if (ob) { ob.classList.remove('show'); ob.style.display = 'none'; }
    const mdl = document.getElementById('onbMdl');
    if (mdl) { mdl.style.display = 'none'; }
    const close = document.querySelector('.onb-skip, .onb-close, [onclick*="closeOnboard"], [onclick*="closeOnb"], .onb-skip');
    if (close) close.click();
  }).catch(() => {});
  await page.waitForTimeout(1000);

  // 3. Abrir drawer e clicar Família (ou usar go() direto)
  const menuBtn = page.locator('.top-header-btn-menu, [class*="menu"]').first();
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click({ force: true });
    await page.waitForTimeout(500);
    const famLink = page.locator('a:has-text("Família"), [data-id="casal"], a[href*="casal"]').first();
    if (await famLink.isVisible().catch(() => false)) {
      await famLink.click();
    } else {
      await page.evaluate(() => { if (typeof go === 'function') go('casal'); });
    }
  } else {
    await page.evaluate(() => { if (typeof go === 'function') go('casal'); });
  }
  await page.waitForTimeout(800);

  // 4. Screenshot e medida Família
  resultado.familia = await measureGap(page);
  await page.screenshot({ path: path.join(screenshotDir, 'verifica-familia.png'), fullPage: false });

  // 5. Clicar Calendário
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(400);
    const calLink = page.locator('a:has-text("Calendário"), [data-id="calendario"]').first();
    if (await calLink.isVisible().catch(() => false)) {
      await calLink.click();
    } else {
      await page.evaluate(() => { if (typeof go === 'function') go('calendario'); });
    }
  } else {
    await page.evaluate(() => { if (typeof go === 'function') go('calendario'); });
  }
  await page.waitForTimeout(800);

  // 6. Screenshot e medida Calendário
  resultado.calendario = await measureGap(page);
  await page.screenshot({ path: path.join(screenshotDir, 'verifica-calendario.png'), fullPage: false });

  // Relatório
  console.log('\n========== RELATÓRIO - FAMÍLIA E CALENDÁRIO ==========');
  console.log('1. Navegou:', resultado.navegou);
  console.log('2. Login OK:', resultado.loginOk);
  console.log('3. Família - gap:', resultado.familia ? resultado.familia.gap + 'px' : 'N/A');
  console.log('   Família - headerBottom:', resultado.familia?.headerBottom, 'tabTop:', resultado.familia?.tabTop);
  console.log('4. Calendário - gap:', resultado.calendario ? resultado.calendario.gap + 'px' : 'N/A');
  console.log('   Calendário - headerBottom:', resultado.calendario?.headerBottom, 'tabTop:', resultado.calendario?.tabTop);
  console.log('Screenshots em:', screenshotDir);
  console.log('====================================================\n');

  const gapMax = 20;
  if (resultado.familia) {
    expect(resultado.familia.gap, 'Gap Família deve ser <= 20px').toBeLessThanOrEqual(gapMax);
  }
  if (resultado.calendario) {
    expect(resultado.calendario.gap, 'Gap Calendário deve ser <= 20px').toBeLessThanOrEqual(gapMax);
  }
});

