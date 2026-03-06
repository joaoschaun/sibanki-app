/**
 * Teste completo: Login, Dashboard, Despesa, Meta, Análise IA
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'https://virtus-financeiro-cd7bd.web.app/app';
const EMAIL = 'teste@gmail.com';
const SENHA = '123456';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const report = {
  erros: [],
  warnings: [],
  lentidao: [],
  elementosQuebrados: [],
  sucessos: [],
  timings: {}
};

async function run() {
  const startTotal = Date.now();
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Coletar erros do console
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') report.erros.push(text);
    else if (type === 'warning') report.warnings.push(text);
  });
  page.on('pageerror', err => report.erros.push(err.message));

  try {
    // 1. Acessar e fazer login
    const t0 = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
    report.timings.carregamento = Date.now() - t0;

    await page.waitForTimeout(2000); // Aguardar scripts e Firebase

    // Garantir que o formulário de login está visível (landing -> auth)
    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    });
    await page.waitForTimeout(1000);

    // Preencher login (lE, lP, lBtn)
    await page.waitForSelector('#lE', { state: 'visible', timeout: 5000 }).catch(() => {});
    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });
    await page.waitForTimeout(5000);

    // Verificar se logou (app visível)
    const appVisible = await page.locator('.app.on').isVisible().catch(() => false);
    if (!appVisible) {
      const errMsg = await page.locator('#lErr').textContent().catch(() => '');
      report.erros.push('Login falhou: ' + (errMsg || 'App não carregou após login'));
    } else {
      report.sucessos.push('Login realizado com sucesso');
    }

    await page.waitForTimeout(2000);

    // 2. Screenshot do Dashboard
    const t1 = Date.now();
    await page.evaluate(() => {
      var n = document.querySelectorAll('.ni')[0];
      if (n && typeof go === 'function') go('dash', n);
    });
    await page.waitForTimeout(2500);
    report.timings.dashboard = Date.now() - t1;

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard.png'), fullPage: true });
    report.sucessos.push('Screenshot do Dashboard salvo em screenshots/01-dashboard.png');

    // Fechar onboarding se aparecer
    await page.evaluate(() => { var ob=document.getElementById('onboardOverlay'); if(ob&&ob.classList.contains('show')){ var next=document.querySelector('.onb-next, .onb-btn'); for(var i=0;i<5&&next;i++){ next.click(); next=document.querySelector('.onb-next, .onb-btn'); } if(ob.classList.contains('show'))ob.remove(); } }).catch(()=>{});
    await page.waitForTimeout(800);

    // 3. Criar despesa R$ 50 em Alimentação
    const t2 = Date.now();
    await page.evaluate(() => {
      var n = document.querySelector('.ni[onclick*="lanc"]') || document.querySelectorAll('.ni')[1];
      if (n && typeof go === 'function') go('lanc', n);
    });
    await page.waitForTimeout(1500);

    await page.fill('#fV', '50');
    await page.fill('#fDe', 'Teste Supermercado');
    await page.waitForTimeout(800); // Aguardar popFilCat popular categorias
    await page.selectOption('#fC', { value: 'Alimentação' });
    await page.waitForTimeout(500);
    await page.click('#btnLancSalvar');
    await page.waitForTimeout(2000);
    report.timings.despesa = Date.now() - t2;

    const toastOk = await page.locator('.toast, [class*="toast"]').filter({ hasText: /salvo|ok/i }).isVisible().catch(() => false);
    if (toastOk) report.sucessos.push('Despesa de R$ 50 em Alimentação criada');
    else report.erros.push('Despesa pode não ter sido salva - toast não confirmado');

    // 4. Ir para Metas e criar meta R$ 10.000
    const t3 = Date.now();
    await page.evaluate(() => {
      var n = document.querySelector('.ni[onclick*="metas"]') || document.querySelectorAll('.ni')[4];
      if (n && typeof go === 'function') go('metas', n);
    });
    await page.waitForTimeout(2000);

    await page.fill('#metaNome', 'Meta Teste');
    await page.fill('#metaAlvo', '10000');
    await page.fill('#metaAtual', '0');
    const prazo = new Date();
    prazo.setMonth(prazo.getMonth() + 12);
    await page.fill('#metaPrazo', prazo.toISOString().split('T')[0]);
    await page.click('button:has-text("Criar Meta")');
    await page.waitForTimeout(4000); // Aguardar análise IA
    report.timings.meta = Date.now() - t3;

    const metaToast = await page.locator('.toast, [class*="toast"]').filter({ hasText: /meta|ok/i }).isVisible().catch(() => false);
    if (metaToast) report.sucessos.push('Meta de R$ 10.000 criada');

    // 5. Verificar se análise IA apareceu
    const iaCard = await page.locator('#metaIAAnaliseCard');
    const iaVisible = await iaCard.isVisible().catch(() => false);
    const iaContent = iaVisible ? await iaCard.textContent().catch(() => '') : '';

    if (iaVisible && iaContent && iaContent.length > 20) {
      report.sucessos.push('Análise da IA apareceu: ' + iaContent.substring(0, 80) + '...');
    } else if (iaVisible) {
      report.warnings.push('Card de análise IA visível mas conteúdo curto ou vazio');
    } else {
      report.erros.push('Análise da IA não apareceu após criar meta');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-metas-com-ia.png'), fullPage: true });
    report.sucessos.push('Screenshot das Metas salvo em screenshots/02-metas-com-ia.png');

    // Análise de lentidão
    if (report.timings.carregamento > 5000) report.lentidao.push('Carregamento inicial: ' + report.timings.carregamento + 'ms');
    if (report.timings.dashboard > 3000) report.lentidao.push('Dashboard: ' + report.timings.dashboard + 'ms');
    if (report.timings.despesa > 3000) report.lentidao.push('Criar despesa: ' + report.timings.despesa + 'ms');
    if (report.timings.meta > 5000) report.lentidao.push('Criar meta + IA: ' + report.timings.meta + 'ms');

  } catch (e) {
    report.erros.push('Exceção: ' + e.message);
  }

  report.timings.total = Date.now() - startTotal;
  await page.waitForTimeout(1000);
  await browser.close();

  // Relatório final
  console.log('\n========== RELATÓRIO DO TESTE ==========\n');
  console.log('SUCESSOS:', report.sucessos.length);
  report.sucessos.forEach(s => console.log('  ✓', s));
  console.log('\nERROS:', report.erros.length);
  [...new Set(report.erros)].forEach(e => console.log('  ✗', e));
  console.log('\nWARNINGS:', report.warnings.length);
  [...new Set(report.warnings)].forEach(w => console.log('  ⚠', w));
  console.log('\nLENTIDÃO:', report.lentidao.length);
  report.lentidao.forEach(l => console.log('  ⏱', l));
  console.log('\nTEMPOS:', JSON.stringify(report.timings, null, 2));
  console.log('\n========================================\n');

  return report;
}

// Criar pasta de screenshots
const fs = require('fs');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

run().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
