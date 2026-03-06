/**
 * Verifica se o gap entre topo e conteúdo foi corrigido nas abas Calendário e Família
 * Uso: npx playwright test verifica-gap --project=diagrama-layout
 * Ou com headed: npx playwright test verifica-gap --project=diagrama-layout --headed
 */
const { test, expect } = require('@playwright/test');

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
    window.entries = [];
    window.investments = [];
    window.goals = [];
    window.budgets = {};
    window.userAccs = ['Nubank'];
    window.accountBalances = { Nubank: 1000 };
    window.recurrents = [];
    window.cards = [];
    window.userCats = [];
    window.achievements = {};
    window.dashboardLayout = null;
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
      scrollY: window.scrollY,
    };
  });
}

test('gap corrigido em Calendário e Família', async ({ page }) => {
  await page.goto('/app', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2500);
  await injectAppState(page);
  await page.waitForTimeout(1200);

  const resultados = { calendario: null, casal: null };

  // === CALENDÁRIO ===
  await page.evaluate(() => { if (typeof go === 'function') go('calendario'); });
  await page.waitForTimeout(600);
  resultados.calendario = await measureGap(page);

  // === FAMÍLIA ===
  await page.evaluate(() => { if (typeof go === 'function') go('casal'); });
  await page.waitForTimeout(600);
  resultados.casal = await measureGap(page);

  console.log('\n=== VERIFICAÇÃO GAP ===');
  console.log('Calendário:', JSON.stringify(resultados.calendario));
  console.log('Família:', JSON.stringify(resultados.casal));

  // Gap aceitável: até 20px (antes era ~80-100+)
  const gapMax = 20;
  if (resultados.calendario) {
    expect(resultados.calendario.gap, `Gap em Calendário deve ser ≤${gapMax}px`).toBeLessThanOrEqual(gapMax);
  }
  if (resultados.casal) {
    expect(resultados.casal.gap, `Gap em Família deve ser ≤${gapMax}px`).toBeLessThanOrEqual(gapMax);
  }

  await page.screenshot({ path: 'verifica-gap-calendario.png', fullPage: false });
  await page.evaluate(() => { if (typeof go === 'function') go('casal'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'verifica-gap-familia.png', fullPage: false });
});
