/**
 * Diagnóstico de layout — detecta o espaço em branco gigante no topo
 * Uso: npx playwright test diagrama-layout --headed
 */
const { test } = require('@playwright/test');

const EMAIL = process.env.TEST_EMAIL || 'teste@gmail.com';
const SENHA = process.env.TEST_SENHA || '123456';

async function login(page) {
  await page.goto('/app', { waitUntil: 'load', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => {
    if (typeof showAuth === 'function') showAuth();
    if (typeof showLog === 'function') showLog();
  });
  await page.waitForSelector('#lE', { state: 'visible', timeout: 5000 });
  await page.fill('#lE', EMAIL, { force: true });
  await page.fill('#lP', SENHA, { force: true });
  await page.click('#lBtn', { force: true });
  // Wait for login and Firestore data load (pode demorar até 45s no CI)
  await page.locator('.app.on').waitFor({ state: 'visible', timeout: 45000 });
  await page.waitForTimeout(2000);
}

test('diagnóstico de layout — mede espaços em branco', async ({ page }) => {
  await login(page);

  const tabs = ['dash', 'lanc', 'conq', 'dicas', 'invest', 'metas'];

  for (const tabId of tabs) {
    await page.evaluate((id) => { if (typeof go === 'function') go(id); }, tabId);
    await page.waitForTimeout(800);

    const info = await page.evaluate((id) => {
      const tab = document.getElementById(id);
      const wrap = document.querySelector('.wrap');
      const appContent = document.querySelector('.app-content');
      const topHeader = document.getElementById('topHeader');
      const body = document.body;

      function rect(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), display: getComputedStyle(el).display };
      }

      // Find first visible child of active tab
      let firstChildRect = null;
      if (tab) {
        for (const child of tab.children) {
          const cs = getComputedStyle(child);
          if (cs.display !== 'none' && cs.visibility !== 'hidden') {
            firstChildRect = child.getBoundingClientRect();
            firstChildRect = { top: Math.round(firstChildRect.top), height: Math.round(firstChildRect.height), tagName: child.tagName, id: child.id, className: child.className.slice(0, 50) };
            break;
          }
        }
      }

      // Check section#casal visibility
      const casal = document.getElementById('casal');
      const casalInfo = casal ? {
        display: getComputedStyle(casal).display,
        rect: rect(casal),
        parentTag: casal.parentElement ? casal.parentElement.tagName + '#' + casal.parentElement.id + '.' + casal.parentElement.className.slice(0, 30) : null
      } : null;

      return {
        tabId: id,
        scrollY: window.scrollY,
        tab: rect(tab),
        wrap: rect(wrap),
        appContent: rect(appContent),
        topHeader: rect(topHeader),
        firstChild: firstChildRect,
        casal: casalInfo,
        viewportHeight: window.innerHeight,
      };
    }, tabId);

    console.log('\n=== TAB:', tabId, '===');
    console.log('scrollY:', info.scrollY);
    console.log('viewport height:', info.viewportHeight);
    console.log('topHeader:', JSON.stringify(info.topHeader));
    console.log('tab rect:', JSON.stringify(info.tab));
    console.log('wrap rect:', JSON.stringify(info.wrap));
    console.log('firstChild:', JSON.stringify(info.firstChild));
    console.log('casal:', JSON.stringify(info.casal));

    // Captura screenshot de cada tab
    await page.screenshot({ path: `layout-${tabId}.png`, fullPage: false });
  }
});
