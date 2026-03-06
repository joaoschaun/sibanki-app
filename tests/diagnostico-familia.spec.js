/**
 * Diagnóstico da aba Família - ícone e largura
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '';

test('diagnostico aba familia - icone e largura', async ({ page }) => {
  const consoleErros = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErros.push(msg.text()); });

  await page.goto('https://staging-13a0b.web.app/app', { waitUntil: 'load', timeout: 30000 });

  // Login
  await page.evaluate(() => {
    if (typeof showAuth === 'function') showAuth();
    if (typeof showLog === 'function') showLog();
  });
  await page.waitForSelector('#lE', { state: 'visible', timeout: 8000 });
  await page.fill('#lE', EMAIL);
  await page.fill('#lP', SENHA);
  await page.click('#lBtn');
  await page.locator('.app.on').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

  // Navegar para a aba Família
  await page.evaluate(() => { if (typeof go === 'function') go('casal', null); });
  await page.waitForSelector('#casal.on', { timeout: 5000 });
  await page.waitForTimeout(500); // aguardar lucide + animações

  // 1. HTML exato do ícone no hero
  const heroIconHtml = await page.evaluate(() => {
    const hero = document.querySelector('#casal .couple-hero');
    if (!hero) return 'HERO NÃO ENCONTRADO';
    const iconContainer = hero.querySelector('.module-icon');
    if (!iconContainer) return 'module-icon NÃO ENCONTRADO dentro do hero';
    return iconContainer.innerHTML;
  });
  console.log('=== HTML do ícone no hero ===');
  console.log(heroIconHtml);

  // 2. Verificar se tem <svg> ou ainda tem <i data-lucide>
  const iconState = await page.evaluate(() => {
    const moduleIcon = document.querySelector('#casal .couple-hero .module-icon');
    if (!moduleIcon) return { found: false };
    const svg = moduleIcon.querySelector('svg');
    const iTag = moduleIcon.querySelector('i[data-lucide]');
    return {
      found: true,
      hasSvg: !!svg,
      hasITag: !!iTag,
      iTagAttr: iTag ? iTag.getAttribute('data-lucide') : null,
      svgOuterHtml: svg ? svg.outerHTML.substring(0, 200) : null,
      containerComputedStyle: window.getComputedStyle(moduleIcon).cssText.substring(0, 300),
    };
  });
  console.log('=== Estado do ícone ===');
  console.log(JSON.stringify(iconState, null, 2));

  // 3. Widths do #casal e .cg
  const widths = await page.evaluate(() => {
    const casal = document.getElementById('casal');
    const cg = casal ? casal.querySelector('.cg') : null;
    const coupleNotLinked = document.getElementById('coupleNotLinked');
    const coupleHero = casal ? casal.querySelector('.couple-hero') : null;

    const rect = el => el ? {
      width: el.getBoundingClientRect().width,
      offsetWidth: el.offsetWidth,
      paddingLeft: parseFloat(window.getComputedStyle(el).paddingLeft),
      paddingRight: parseFloat(window.getComputedStyle(el).paddingRight),
      marginLeft: parseFloat(window.getComputedStyle(el).marginLeft),
      marginRight: parseFloat(window.getComputedStyle(el).marginRight),
      maxWidth: window.getComputedStyle(el).maxWidth,
      position: window.getComputedStyle(el).position,
    } : null;

    return {
      viewport: window.innerWidth,
      casal: rect(casal),
      cg: rect(cg),
      coupleNotLinked: rect(coupleNotLinked),
      coupleHero: rect(coupleHero),
    };
  });
  console.log('=== Widths / Box Model ===');
  console.log(JSON.stringify(widths, null, 2));

  // 4. CSS aplicado ao section#casal
  const casalCss = await page.evaluate(() => {
    const casal = document.getElementById('casal');
    if (!casal) return null;
    const s = window.getComputedStyle(casal);
    return {
      width: s.width,
      maxWidth: s.maxWidth,
      paddingLeft: s.paddingLeft,
      paddingRight: s.paddingRight,
      marginLeft: s.marginLeft,
      marginRight: s.marginRight,
      position: s.position,
      left: s.left,
      right: s.right,
    };
  });
  console.log('=== CSS computado do #casal ===');
  console.log(JSON.stringify(casalCss, null, 2));

  // 5. Lucide state
  const lucideState = await page.evaluate(() => {
    return {
      lucideDefined: typeof lucide !== 'undefined',
      refreshLucideDefined: typeof refreshLucide !== 'undefined' || typeof window.refreshLucide !== 'undefined',
      allDataLucideInCasal: Array.from(document.querySelectorAll('#casal [data-lucide]')).map(el => ({
        tag: el.tagName,
        attr: el.getAttribute('data-lucide'),
        hasSvgSibling: !!el.nextElementSibling,
      })),
      svgsInCasalHero: document.querySelectorAll('#casal .couple-hero svg').length,
    };
  });
  console.log('=== Estado Lucide ===');
  console.log(JSON.stringify(lucideState, null, 2));

  // 6. Screenshot
  await page.screenshot({
    path: 'tests/screenshots/familia-diagnostico.png',
    fullPage: false,
  });
  console.log('Screenshot salvo em tests/screenshots/familia-diagnostico.png');

  console.log('=== Erros de console ===');
  console.log(consoleErros.length ? consoleErros.join('\n') : 'Nenhum erro');
});
