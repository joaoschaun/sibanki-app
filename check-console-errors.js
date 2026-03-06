/**
 * Script Playwright: Navega pelo Sibanki e coleta erros do console por tela
 */
const { chromium } = require('@playwright/test');

const BASE_URL = 'https://virtus-financeiro-cd7bd.web.app/app';
const TESS_URL = 'https://tess-workflows-files.storage.googleapis.com/33e36a25e6bd6a0ed2d36a0cc3d9972bb97f2fd7/';

// Mapeamento: id da tab -> nome da tela
const SCREENS = [
  { id: 'dash', name: 'Dashboard', selector: '.ni' },
  { id: 'lanc', name: 'Lançamentos', selector: '.ni' },
  { id: 'invest', name: 'Investimentos', selector: '.ni' },
  { id: 'metas', name: 'Metas', selector: '.ni' },
  { id: 'config', name: 'Configurações', selector: '.top-config-btn' }
];

async function run() {
  const errorsByScreen = {};
  let currentScreen = 'Carregamento inicial';

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Coletar mensagens do console (error, warning e info relevantes)
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      if (!errorsByScreen[currentScreen]) errorsByScreen[currentScreen] = [];
      errorsByScreen[currentScreen].push({ type, text });
    }
  });

  // Erros não capturados (exceções)
  page.on('pageerror', err => {
    if (!errorsByScreen[currentScreen]) errorsByScreen[currentScreen] = [];
    errorsByScreen[currentScreen].push({ type: 'error', text: err.message });
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    await page.goto(TESS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  currentScreen = 'Carregamento inicial';
  console.log('Aguardando 12s para login manual (se necessário)...');
  await page.waitForTimeout(12000);

  // Verificar se está na tela de login
  const authVisible = await page.locator('.auth-bg').first().isVisible().catch(() => false);
  const authHidden = await page.locator('.auth-bg.hidden').isVisible().catch(() => false);
  if (authVisible && !authHidden) {
    currentScreen = 'Tela de Login';
    console.log('Na tela de login - coletando erros...');
    await page.waitForTimeout(2000);
  }

  // Navegar usando evaluate (funciona mesmo com elementos no DOM)
  const navSequence = [
    { name: 'Dashboard', fn: () => page.evaluate(() => { var n = document.querySelectorAll('.ni')[0]; if (n && typeof go === 'function') go('dash', n); }) },
    { name: 'Lançamentos', fn: () => page.evaluate(() => { var n = document.querySelector('.ni[onclick*="lanc"]') || document.querySelectorAll('.ni')[1]; if (n && typeof go === 'function') go('lanc', n); }) },
    { name: 'Investimentos', fn: () => page.evaluate(() => { var n = document.querySelector('.ni[onclick*="invest"]') || document.querySelectorAll('.ni')[2]; if (n && typeof go === 'function') go('invest', n); }) },
    { name: 'Metas', fn: () => page.evaluate(() => { var n = document.querySelector('.ni[onclick*="metas"]') || document.querySelectorAll('.ni')[4]; if (n && typeof go === 'function') go('metas', n); }) },
    { name: 'Configurações', fn: () => page.evaluate(() => { var n = document.querySelector('.top-config-btn'); if (n && n.onclick) n.click(); }) },
  ];

  for (const step of navSequence) {
    currentScreen = step.name;
    try {
      await step.fn();
      await page.waitForTimeout(2500);
    } catch (e) {
      console.log('Erro ao navegar para', step.name, e.message);
    }
  }

  await page.waitForTimeout(1000);
  await browser.close();

  // Relatório
  console.log('\n========== RELATÓRIO DE ERROS DO CONSOLE ==========\n');
  let total = 0;
  for (const [screen, items] of Object.entries(errorsByScreen)) {
    const unique = [...new Set(items.map(i => i.text))];
    if (unique.length > 0) {
      console.log(`\n--- ${screen} ---`);
      unique.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
      total += unique.length;
    }
  }
  if (total === 0) {
    console.log('Nenhum erro ou warning capturado no console.');
  }
  console.log('\n================================================\n');

  return errorsByScreen;
}

run().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
