/**
 * Debug layout sem login — detecta o espaço em branco no topo
 * Uso: npx playwright test debug-layout --project=diagrama-layout --headed
 */
const { test } = require('@playwright/test');

test('debug layout sem login', async ({ page }) => {
  await page.goto('/app', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  // Injeta estado mínimo — simula o fluxo exato do onAuthStateChanged(user)
  await page.evaluate(() => {
    // 1) Esconde landing page e auth (como faz o auth handler em linha 4345-4346)
    const lp = document.getElementById('landingPage');
    if (lp) lp.style.display = 'none';
    const ab = document.getElementById('authBg');
    if (ab) ab.classList.add('hidden');

    // 2) Mostra o app (como linha 4347)
    const app = document.getElementById('app');
    if (app) app.classList.add('on');

    // 3) Esconde loading screen (simulando applyDocFromServer)
    const lb = document.getElementById('loadBg');
    if (lb) { lb.classList.add('hidden'); lb.style.display = 'none'; }

    // 4) Define variáveis globais mínimas
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

    // 5) Chama initUI (como applyDocFromServer → initUI)
    try {
      if (typeof initUI === 'function') initUI();
    } catch(e) {
      console.error('initUI error:', e.message);
      // Fallback: mostra dash tab manualmente
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('on');
        t.style.animation = 'none';
      });
      const dash = document.getElementById('dash');
      if (dash) { dash.classList.add('on'); }
    }
  });

  await page.waitForTimeout(1500);

  // Mede o layout
  const info = await page.evaluate(() => {
    function rect(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
        display: cs.display,
        paddingTop: cs.paddingTop,
        marginTop: cs.marginTop,
        minHeight: cs.minHeight,
        overflow: cs.overflow,
        position: cs.position,
      };
    }

    const app = document.getElementById('app');
    const appContent = document.getElementById('appContent');
    const wrap = document.querySelector('.wrap');
    const topHeader = document.getElementById('topHeader');
    const dash = document.getElementById('dash');

    // Primeiro filho visível do #dash
    let firstVisibleChild = null;
    if (dash) {
      for (const child of dash.children) {
        const cs = getComputedStyle(child);
        if (cs.display !== 'none') {
          const r = child.getBoundingClientRect();
          firstVisibleChild = {
            tag: child.tagName,
            id: child.id || '',
            className: child.className.slice(0, 50),
            top: Math.round(r.top),
            height: Math.round(r.height),
          };
          break;
        }
      }
    }

    // Todos os elementos diretos de .wrap com suas posições
    const wrapChildren = [];
    if (wrap) {
      for (const child of wrap.children) {
        const cs = getComputedStyle(child);
        if (cs.display !== 'none' && cs.position !== 'fixed' && cs.position !== 'absolute') {
          const r = child.getBoundingClientRect();
          wrapChildren.push({
            tag: child.tagName,
            id: child.id || '',
            className: child.className.slice(0, 40),
            top: Math.round(r.top),
            height: Math.round(r.height),
          });
        }
      }
    }

    return {
      app: rect(app),
      appContent: rect(appContent),
      wrap: rect(wrap),
      topHeader: rect(topHeader),
      dash: rect(dash),
      firstVisibleChild,
      wrapChildren,
      scrollY: window.scrollY,
      bodyScrollTop: document.body.scrollTop,
      htmlScrollTop: document.documentElement.scrollTop,
      viewportHeight: window.innerHeight,
    };
  });

  console.log('\n=== DEBUG LAYOUT ===');
  console.log('scrollY:', info.scrollY, '| bodyScrollTop:', info.bodyScrollTop, '| htmlScrollTop:', info.htmlScrollTop);
  console.log('viewport height:', info.viewportHeight);
  console.log('app:', JSON.stringify(info.app));
  console.log('appContent:', JSON.stringify(info.appContent));
  console.log('wrap:', JSON.stringify(info.wrap));
  console.log('topHeader:', JSON.stringify(info.topHeader));
  console.log('dash:', JSON.stringify(info.dash));
  console.log('firstVisibleChild:', JSON.stringify(info.firstVisibleChild));
  console.log('\nWrap children (visible, non-fixed):');
  info.wrapChildren.forEach((c, i) => console.log(`  [${i}]`, JSON.stringify(c)));

  await page.screenshot({ path: 'debug-layout.png', fullPage: false });

  // Navega para 'conq' e inspeciona TODOS os elementos visíveis no .wrap
  await page.evaluate(() => {
    if (typeof go === 'function') go('conq');
  });
  await page.waitForTimeout(800);

  const conqInfo = await page.evaluate(() => {
    const wrap = document.querySelector('.wrap');
    const allInWrap = [];
    if (wrap) {
      // Lista TODOS os filhos diretos do wrap, mostrando display e rect
      for (const child of wrap.children) {
        const cs = getComputedStyle(child);
        const r = child.getBoundingClientRect();
        allInWrap.push({
          tag: child.tagName,
          id: child.id || '',
          className: child.className.slice(0, 50),
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          position: cs.position,
          top: Math.round(r.top),
          height: Math.round(r.height),
        });
      }
    }
    const conqEl = document.getElementById('conq');
    const conqRect = conqEl ? conqEl.getBoundingClientRect() : null;
    return {
      scrollY: window.scrollY,
      conq: conqRect ? { top: Math.round(conqRect.top), height: Math.round(conqRect.height) } : null,
      allInWrap,
    };
  });

  // Verifica parent elements
  const parentInfo = await page.evaluate(() => {
    function parentChain(el) {
      if (!el) return 'null';
      const chain = [];
      let cur = el.parentElement;
      while (cur && cur !== document.body && chain.length < 5) {
        chain.push((cur.tagName || '?') + '#' + (cur.id || '') + '.' + (cur.className || '').slice(0, 20));
        cur = cur.parentElement;
      }
      if (cur === document.body) chain.push('BODY');
      return chain.join(' > ');
    }
    const conq = document.getElementById('conq');
    const dicas = document.getElementById('dicas');
    const ia = document.getElementById('ia');
    const rel = document.getElementById('rel');
    const geminiStatus = document.getElementById('geminiStatus');
    const config = document.getElementById('config');
    const dash = document.getElementById('dash');
    return {
      dash_parent: parentChain(dash),
      config_parent: parentChain(config),
      geminiStatus_parent: parentChain(geminiStatus),
      ia_parent: parentChain(ia),
      dicas_parent: parentChain(dicas),
      conq_parent: parentChain(conq),
      rel_parent: parentChain(rel),
    };
  });

  console.log('\n=== CONQ TAB ANALYSIS ===');
  console.log('scrollY:', conqInfo.scrollY);
  console.log('conq rect:', JSON.stringify(conqInfo.conq));
  console.log('\nParent chains:');
  Object.entries(parentInfo).forEach(([k, v]) => console.log(' ', k, ':', v));
  console.log('\nAll wrap children with height>0 or not hidden:');
  conqInfo.allInWrap.forEach((c, i) => {
    if (c.height > 0 || c.display !== 'none') {
      console.log(`  [${i}]`, c.display !== 'none' ? '*** VISIBLE ***' : '(hidden)', JSON.stringify(c));
    }
  });

  await page.screenshot({ path: 'debug-conq.png', fullPage: false });
});
