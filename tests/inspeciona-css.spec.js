/**
 * Inspeciona CSS carregado no staging sem precisar de login
 * Uso: npx playwright test inspeciona-css --project=diagrama-layout
 */
const { test } = require('@playwright/test');

test('inspeciona regras CSS que podem causar espaço em branco', async ({ page }) => {
  await page.goto('/app', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    // Função helper para pegar computed style de um seletor
    function cs(selector, prop) {
      const el = document.querySelector(selector);
      if (!el) return `[${selector} NOT FOUND]`;
      return getComputedStyle(el)[prop];
    }

    // Verificar se section#casal existe e onde está no DOM
    const casal = document.getElementById('casal');
    const wrap = document.querySelector('.wrap');
    const appContent = document.querySelector('.app-content');
    const app = document.getElementById('app');

    let casalParent = null;
    if (casal) {
      const p = casal.parentElement;
      casalParent = p ? p.tagName + '#' + (p.id || '') + '.' + (p.className || '').split(' ').join('.') : 'null';
    }

    // Verificar display de section#casal
    const casalDisplay = casal ? getComputedStyle(casal).display : 'element not found';
    const casalHeight = casal ? casal.getBoundingClientRect().height : -1;

    // Verificar se section#casal está inside wrap
    let isInsideWrap = false;
    if (casal && wrap) {
      isInsideWrap = wrap.contains(casal);
    }

    // Obter todas as regras CSS que mencionam 'section.tab' ou '.tab' com display
    const styleSheets = Array.from(document.styleSheets);
    const tabRules = [];
    for (const sheet of styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          if (rule.selectorText && rule.selectorText.match(/section\.tab|\.tab\b/) && rule.style) {
            const disp = rule.style.display;
            const pt = rule.style.paddingTop;
            const mt = rule.style.marginTop;
            const mh = rule.style.minHeight;
            if (disp || pt || mt || mh) {
              tabRules.push({ selector: rule.selectorText, display: disp, paddingTop: pt, marginTop: mt, minHeight: mh });
            }
          }
        }
      } catch(e) {}
    }

    // Verificar elementos entre .top-header e primeiro .tab
    const topHeader = document.getElementById('topHeader');
    const dashTab = document.getElementById('dash');
    const topHeaderRect = topHeader ? topHeader.getBoundingClientRect() : null;
    const dashTabRect = dashTab ? dashTab.getBoundingClientRect() : null;

    // Verificar wrap padding/margin
    const wrapStyles = wrap ? {
      paddingTop: getComputedStyle(wrap).paddingTop,
      paddingBottom: getComputedStyle(wrap).paddingBottom,
      marginTop: getComputedStyle(wrap).marginTop,
    } : null;

    // Verificar app-content
    const appContentStyles = appContent ? {
      paddingTop: getComputedStyle(appContent).paddingTop,
      minHeight: getComputedStyle(appContent).minHeight,
    } : null;

    // Verificar kpi padding
    const kpiEl = document.querySelector('.kpi');
    const kpiPadding = kpiEl ? getComputedStyle(kpiEl).padding : 'no .kpi found';

    return {
      casal: {
        exists: !!casal,
        display: casalDisplay,
        height: casalHeight,
        parent: casalParent,
        isInsideWrap,
      },
      topHeaderRect: topHeaderRect ? { top: Math.round(topHeaderRect.top), bottom: Math.round(topHeaderRect.bottom), height: Math.round(topHeaderRect.height) } : null,
      dashTabRect: dashTabRect ? { top: Math.round(dashTabRect.top), bottom: Math.round(dashTabRect.bottom), height: Math.round(dashTabRect.height), display: getComputedStyle(dashTab).display } : null,
      wrapStyles,
      appContentStyles,
      tabRules,
      kpiPadding,
      bodyPaddingTop: getComputedStyle(document.body).paddingTop,
    };
  });

  console.log('\n=== DIAGNÓSTICO CSS ===');
  console.log('section#casal:', JSON.stringify(info.casal, null, 2));
  console.log('\ntopHeader rect:', JSON.stringify(info.topHeaderRect));
  console.log('dash tab rect:', JSON.stringify(info.dashTabRect));
  console.log('\nwrap styles:', JSON.stringify(info.wrapStyles));
  console.log('app-content styles:', JSON.stringify(info.appContentStyles));
  console.log('body paddingTop:', info.bodyPaddingTop);
  console.log('kpi padding:', info.kpiPadding);
  console.log('\nRegras CSS .tab com display/padding/margin:', JSON.stringify(info.tabRules, null, 2));

  await page.screenshot({ path: 'inspeciona-css.png', fullPage: true });
});
