/**
 * Diagnóstico profundo do gap no topo de #casal e #calendario
 * Mede bounding rect + computed styles de TODOS os elementos relevantes
 * Uso: npx playwright test diagrama-gap-root --project=diagrama-layout
 */
const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

function injectAppState(page) {
  return page.evaluate(() => {
    ['landingPage'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    const ab = document.getElementById('authBg'); if (ab) ab.classList.add('hidden');
    const app = document.getElementById('app'); if (app) app.classList.add('on');
    const lb = document.getElementById('loadBg'); if (lb) { lb.classList.add('hidden'); lb.style.display = 'none'; }
    window.U = { uid: 'test', email: 'test@test.com', displayName: 'Teste' };
    window.entries = []; window.investments = []; window.goals = [];
    window.budgets = {}; window.userAccs = ['Nubank'];
    window.accountBalances = { Nubank: 1000 };
    window.recurrents = []; window.cards = []; window.userCats = [];
    window.achievements = {}; window.dashboardLayout = null; window.onboardingDone = true;
    try { if (typeof initUI === 'function') initUI(); } catch(e) {
      document.querySelectorAll('.tab').forEach(t => { t.classList.remove('on'); t.style.animation = 'none'; });
      const d = document.getElementById('dash'); if (d) d.classList.add('on');
    }
  });
}

/** Mede tudo que pode causar gap no topo de um tab */
function deepMeasureTab(page, tabId) {
  return page.evaluate((id) => {
    const tab = document.getElementById(id);
    if (!tab) return { error: 'tab not found: ' + id };

    const topHeader = document.getElementById('topHeader');
    const wrap = document.querySelector('.wrap');

    function measure(el, label) {
      if (!el) return { label, error: 'null' };
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        label,
        tag: el.tagName,
        id: el.id || '',
        class: (el.className || '').toString().slice(0, 60),
        rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), height: Math.round(r.height) },
        styles: {
          display: cs.display,
          position: cs.position,
          marginTop: cs.marginTop,
          marginBottom: cs.marginBottom,
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom,
          minHeight: cs.minHeight,
          height: cs.height,
          overflow: cs.overflow,
          overflowY: cs.overflowY,
          transform: cs.transform !== 'none' ? cs.transform : '',
          animation: cs.animationName || '',
          visibility: cs.visibility,
          opacity: cs.opacity,
          boxSizing: cs.boxSizing,
        },
      };
    }

    const headerRect = topHeader ? topHeader.getBoundingClientRect() : null;
    const tabRect = tab.getBoundingClientRect();
    const gapTabVsHeader = headerRect ? Math.round(tabRect.top - headerRect.bottom) : 'N/A';

    // Filhos diretos do tab
    const children = [];
    for (let i = 0; i < Math.min(tab.children.length, 10); i++) {
      const child = tab.children[i];
      const m = measure(child, `children[${i}]`);
      // Para cada filho visível, também mede seus filhos
      const grandchildren = [];
      if (m.styles.display !== 'none') {
        for (let j = 0; j < Math.min(child.children.length, 5); j++) {
          grandchildren.push(measure(child.children[j], `  grandchild[${j}]`));
        }
      }
      m.grandchildren = grandchildren;
      children.push(m);
    }

    // Mede scroll dos containers
    const scrollInfo = {
      windowScrollY: window.scrollY,
      docScrollTop: document.documentElement.scrollTop,
      bodyScrollTop: document.body.scrollTop,
      wrapScrollTop: wrap ? wrap.scrollTop : 'N/A',
      wrapScrollHeight: wrap ? wrap.scrollHeight : 'N/A',
      wrapClientHeight: wrap ? wrap.clientHeight : 'N/A',
    };

    // Mede os elementos fixos/absolutos que poderiam estar sobre o conteúdo
    const fixedEls = [];
    document.querySelectorAll('*').forEach(el => {
      const cs = window.getComputedStyle(el);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && cs.display !== 'none') {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.top >= 0 && r.top < 200) {
          fixedEls.push({
            tag: el.tagName, id: el.id || '', class: (el.className || '').toString().slice(0, 40),
            position: cs.position, top: Math.round(r.top), height: Math.round(r.height), zIndex: cs.zIndex
          });
        }
      }
    });

    return {
      tabId: id,
      gapTabVsHeader,
      headerBottom: headerRect ? Math.round(headerRect.bottom) : 'N/A',
      tab: measure(tab, 'TAB#' + id),
      children,
      scrollInfo,
      fixedEls,
    };
  }, tabId);
}

test('diagrama profundo gap — casal e calendario', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 Pro
  await page.goto('/app', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2500);
  await injectAppState(page);
  await page.waitForTimeout(1500);

  // Fechar overlays
  await page.evaluate(() => {
    window.onboardingDone = true;
    ['onboardOverlay','onbMdl'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  }).catch(() => {});
  await page.waitForTimeout(500);

  const results = {};

  // ========== FAMÍLIA ==========
  await page.evaluate(() => { if (typeof go === 'function') go('casal'); });
  await page.waitForTimeout(700); // espera animação terminar
  results.casal = await deepMeasureTab(page, 'casal');
  await page.screenshot({ path: path.join(screenshotDir, 'gap-casal.png'), fullPage: false });

  // ========== CALENDÁRIO ==========
  await page.evaluate(() => { if (typeof go === 'function') go('calendario'); });
  await page.waitForTimeout(700);
  results.calendario = await deepMeasureTab(page, 'calendario');
  await page.screenshot({ path: path.join(screenshotDir, 'gap-calendario.png'), fullPage: false });

  // ========== RELATÓRIO ==========
  function printMeasure(m, indent) {
    if (!m) return;
    const pre = indent || '';
    if (m.error) { console.log(pre + m.label + ': ERROR', m.error); return; }
    const r = m.rect;
    const s = m.styles;
    console.log(pre + `${m.label} <${m.tag}${m.id ? '#'+m.id : ''} class="${m.class}">:`);
    console.log(pre + `  rect: top=${r.top} bottom=${r.bottom} height=${r.height}`);
    if (s.display !== 'none') {
      const flags = [];
      if (s.marginTop !== '0px') flags.push('marginTop=' + s.marginTop);
      if (s.paddingTop !== '0px') flags.push('paddingTop=' + s.paddingTop);
      if (s.transform) flags.push('transform=' + s.transform);
      if (s.animation) flags.push('anim=' + s.animation);
      if (s.position !== 'static') flags.push('pos=' + s.position);
      if (s.minHeight !== '0px') flags.push('minH=' + s.minHeight);
      if (flags.length) console.log(pre + '  ⚠ ' + flags.join(' | '));
      else console.log(pre + '  ✓ no margin/padding/transform issues');
    } else {
      console.log(pre + '  [display:none — skipped]');
    }
  }

  ['casal', 'calendario'].forEach(id => {
    const r = results[id];
    if (!r || r.error) { console.log(`\n=== ${id.toUpperCase()} — ERROR: ${r?.error} ===`); return; }
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TAB #${id} — gap vs header: ${r.gapTabVsHeader}px (headerBottom=${r.headerBottom})`);
    console.log(`SCROLL: window.scrollY=${r.scrollInfo.windowScrollY} | doc.scrollTop=${r.scrollInfo.docScrollTop} | wrap.scrollTop=${r.scrollInfo.wrapScrollTop}`);
    console.log('');
    printMeasure(r.tab, '');
    console.log('');
    r.children.forEach(child => {
      printMeasure(child, '  ');
      if (child.grandchildren) {
        child.grandchildren.forEach(gc => printMeasure(gc, '    '));
      }
    });
    if (r.fixedEls.length) {
      console.log('\n  Fixed/Sticky elements in top 200px:');
      r.fixedEls.forEach(f => console.log('   ', JSON.stringify(f)));
    }
  });

  // Salva JSON para análise
  const jsonPath = path.join(screenshotDir, 'gap-diagnostic.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log('\nJSON completo salvo em:', jsonPath);
});
