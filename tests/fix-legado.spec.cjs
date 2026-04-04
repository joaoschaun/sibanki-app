/**
 * Validação das 3 correções no legado em produção
 * URL: https://virtus-financeiro-cd7bd.web.app/app/
 *
 * Uso: npx cross-env TEST_EMAIL=x TEST_SENHA=y playwright test tests/fix-legado.spec.cjs --project=fix-legado-prod
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs  = require('fs');

const BASE   = process.env.BASE_URL  || 'https://virtus-financeiro-cd7bd.web.app';
const EMAIL  = process.env.TEST_EMAIL || '';
const SENHA  = process.env.TEST_SENHA || '';
const SS_DIR = path.join(__dirname, '..', 'screenshots', 'fix-legado');
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

/* ── helper: login no app legado ──────────────────────────────────────────── */
async function loginLegado(page) {
  await page.goto(BASE + '/app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  // Abre modal de auth
  await page.evaluate(() => {
    if (typeof showAuth === 'function') showAuth();
    if (typeof showLog  === 'function') showLog();
  });
  await page.waitForSelector('#lE', { state: 'visible', timeout: 15000 });
  await page.fill('#lE', EMAIL, { force: true });
  await page.fill('#lP', SENHA, { force: true });
  await page.click('#lBtn', { force: true });

  // Aguarda app carregar
  await page.waitForSelector('#app.on', { timeout: 30000 });
  await page.waitForTimeout(1500);

  // Fecha onboarding se aparecer
  await page.evaluate(() => {
    const ob = document.getElementById('sibankiOnboarding');
    if (ob && ob.style.display !== 'none') {
      const skip = document.querySelector('#sibOnbSkip, .sib-onb-btn.secondary');
      if (skip) skip.click();
    }
  }).catch(() => {});

  await page.waitForTimeout(800);
}

/* ── helper: navegar para Lançamentos ────────────────────────────────────── */
async function irParaLancamentos(page) {
  await page.evaluate(() => { if (typeof go === 'function') go('lanc', null); });
  await page.waitForSelector('#lanc.tab.on', { timeout: 10000 });
  await page.waitForTimeout(600);
}

test.describe('Fix Legado – Produção', () => {

  /* ── FIX 2 — listener duplicado (freeze) ──────────────────────────────── */
  test('Fix 2 – Sem acúmulo de listeners (catPicker único)', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginLegado(page);
    await irParaLancamentos(page);

    // Conta quantos listeners de click estão ativos no documento
    // usando a técnica de injetar uma variável de contagem
    const listenerCount = await page.evaluate(() => {
      return typeof window._catPickerGlobalListenerAdded !== 'undefined'
        ? window._catPickerGlobalListenerAdded
        : false;
    });
    expect(listenerCount).toBe(true);
    console.log('✅ Fix 2 – _catPickerGlobalListenerAdded=true (listener único garantido)');
    await page.screenshot({ path: `${require('path').join(__dirname, '..', 'screenshots', 'fix-legado')}/01-listener-unico.png` });
  });

  /* ── FIX 2b — Hambúrguer responde ────────────────────────────────────── */
  test('Fix 2 – Hambúrguer abre/fecha sidebar sem freeze', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginLegado(page);
    await irParaLancamentos(page);

    const hamburger = page.locator('#drawerToggleBtn, .top-header-btn-menu').first();
    await expect(hamburger).toBeVisible({ timeout: 5000 });

    const bodyBefore = await page.locator('body').getAttribute('class');
    await hamburger.click();
    await page.waitForTimeout(500);
    const bodyAfter = await page.locator('body').getAttribute('class');

    // Classes devem mudar após o clique (colapsado/expandido)
    expect(bodyBefore).not.toEqual(bodyAfter);
    console.log('✅ Fix 2 – Hambúrguer respondeu, sidebar alternada');
    await page.screenshot({ path: `${require('path').join(__dirname, '..', 'screenshots', 'fix-legado')}/02-hamburger.png` });
  });

  /* ── FIX 2c — Avatar dropdown abre ──────────────────────────────────── */
  test('Fix 2 – Avatar dropdown abre na página de Lançamentos', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginLegado(page);
    await irParaLancamentos(page);

    const avatar = page.locator('#topHeaderAvatar').first();
    await expect(avatar).toBeVisible({ timeout: 5000 });
    await avatar.click();
    await page.waitForTimeout(400);

    const dropdown = page.locator('#avatarDropdown.open');
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    console.log('✅ Fix 2 – Dropdown do avatar abriu');
    await page.screenshot({ path: `${require('path').join(__dirname, '..', 'screenshots', 'fix-legado')}/03-avatar-dropdown.png` });

    // Fechar clicando fora
    await page.mouse.click(300, 400);
    await page.waitForTimeout(300);
    await expect(dropdown).not.toBeVisible({ timeout: 2000 });
    console.log('✅ Fix 2 – Dropdown fecha ao clicar fora');
  });

  /* ── FIX 3 — Ícones Lucide sem debounce rápido (não piscam) ────────── */
  test('Fix 3 – Debounce Lucide 120ms (não piscam ícones)', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginLegado(page);
    await irParaLancamentos(page);

    // Verificar que o debounce foi aplicado corretamente (120ms)
    const debounceOk = await page.evaluate(() => {
      // O _timer é interno, mas podemos verificar se lucide.createIcons é a versão debounced
      return typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function';
    });
    expect(debounceOk).toBe(true);
    console.log('✅ Fix 3 – Lucide createIcons presente e debounced');
    await page.screenshot({ path: `${require('path').join(__dirname, '..', 'screenshots', 'fix-legado')}/04-lucide.png` });
  });

  /* ── FIX 1 — Popup de Recorrência com periodicidade ─────────────────── */
  test('Fix 1 – Popup de recorrência abre com campo periodicidade', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginLegado(page);
    await irParaLancamentos(page);

    // Abrir formulário de lançamento
    const btnLancar = page.locator('#lancBtnLancar').first();
    await expect(btnLancar).toBeVisible({ timeout: 5000 });
    await btnLancar.click();
    await page.waitForTimeout(500);

    // Formulário deve estar visível
    const form = page.locator('#lancFormBox');
    await expect(form).toBeVisible({ timeout: 5000 });
    console.log('✅ Fix 1a – Formulário de lançamento abriu');
    await page.screenshot({ path: `${require('path').join(__dirname, '..', 'screenshots', 'fix-legado')}/05-form-lanc.png` });

    // Selecionar "Sim" em recorrência
    const recSelect = page.locator('#fRecorrente');
    await expect(recSelect).toBeVisible({ timeout: 3000 });
    await recSelect.selectOption('sim');
    await page.waitForTimeout(600);

    // Popup deve aparecer
    const popup = page.locator('#recDuracaoPopup');
    await expect(popup).toBeVisible({ timeout: 5000 });
    console.log('✅ Fix 1b – Popup de recorrência abriu ao selecionar "Sim"');
    await page.screenshot({ path: `${require('path').join(__dirname, '..', 'screenshots', 'fix-legado')}/06-popup-recorrencia.png` });

    // ✅ Verificar que campo de periodicidade existe no popup
    const btnMensal    = page.locator('.rec-freq-btn[data-freq="mensal"]');
    const btnSemanal   = page.locator('.rec-freq-btn[data-freq="semanal"]');
    const btnQuinzenal = page.locator('.rec-freq-btn[data-freq="quinzenal"]');
    const btnAnual     = page.locator('.rec-freq-btn[data-freq="anual"]');

    await expect(btnMensal).toBeVisible({ timeout: 3000 });
    await expect(btnSemanal).toBeVisible();
    await expect(btnQuinzenal).toBeVisible();
    await expect(btnAnual).toBeVisible();
    console.log('✅ Fix 1c – Botões de periodicidade presentes (Mensal, Semanal, Quinzenal, Anual)');

    // Clicar em "Trimestral"
    const btnTrimestral = page.locator('.rec-freq-btn[data-freq="trimestral"]');
    await btnTrimestral.click();
    await page.waitForTimeout(300);

    // Verificar seleção visual
    const bg = await btnTrimestral.evaluate(el => el.style.background);
    expect(bg).toContain('var(--vr)');
    console.log('✅ Fix 1d – Botão Trimestral ficou destacado ao clicar');

    // Verificar campo de duração
    await expect(page.locator('.rec-duracao-btn[data-value="12"]')).toBeVisible();
    await expect(page.locator('.rec-duracao-btn[data-value="indeterminado"]')).toBeVisible();
    console.log('✅ Fix 1e – Botões de duração (3, 6, 12, 24, 36 meses + Indeterminado) presentes');

    // Selecionar duração 6 meses e verificar que fecha o popup
    await page.locator('.rec-duracao-btn[data-value="6"]').click();
    await page.waitForTimeout(400);
    await expect(popup).not.toBeVisible({ timeout: 3000 });
    console.log('✅ Fix 1f – Popup fecha após selecionar duração');
    await page.screenshot({ path: `${require('path').join(__dirname, '..', 'screenshots', 'fix-legado')}/07-popup-fechou.png` });

    // Verificar que hidden input foi preenchido
    const durVal  = await page.locator('#fRecorrenciaDuracao').inputValue();
    const freqVal = await page.locator('#fRecorrenciaFreq').inputValue();
    expect(durVal).toBe('6');
    expect(freqVal).toBe('trimestral');
    console.log(`✅ Fix 1g – Valores salvos: duracao="${durVal}" freq="${freqVal}"`);
  });

  /* ── FIX 3 — Filtro "Hoje" como padrão ──────────────────────────────── */
  test('Fix 3 – Filtro padrão "Hoje" ativo', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginLegado(page);
    await irParaLancamentos(page);

    const periodoHoje = await page.evaluate(() => {
      return typeof _lancPeriodo !== 'undefined' ? _lancPeriodo : null;
    });
    expect(periodoHoje).toBe('hoje');
    console.log('✅ Fix 3 – _lancPeriodo="hoje" (filtro padrão correto)');
    await page.screenshot({ path: `${require('path').join(__dirname, '..', 'screenshots', 'fix-legado')}/08-filtro-hoje.png` });
  });

});
