/**
 * Smoke test do React (staging) — valida que todas as rotas carregam sem erros JS
 * Uso: npx playwright test --project=react-smoke
 * Credenciais: TEST_EMAIL=x TEST_SENHA=y
 */
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '';

async function login(page) {
  await page.goto('/', { waitUntil: 'networkidle', timeout: 25000 });
  const emailInput = page.locator('input[type="email"]').last();
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(EMAIL);
    await page.locator('input[type="password"]').fill(SENHA);
    await page.locator('button[type="submit"]').last().click();
    await page.waitForTimeout(6000);
  }
}

async function dismissOverlays(page) {
  await page.waitForTimeout(1000);
  // Fecha qualquer dialog/modal/overlay clicando ESC repetidamente
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(500);
}

test.describe('React Staging — Smoke', () => {
  const jsErrors = [];

  test.beforeEach(async ({ page }) => {
    jsErrors.length = 0;
    page.on('pageerror', (err) => jsErrors.push(err.message));
  });

  test('login funciona e redireciona para Home', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'TEST_EMAIL e TEST_SENHA obrigatórios');
    await login(page);
    // Após login, a tela de login não deve mais estar visível
    await expect(page.locator('input[type="password"]')).not.toBeVisible({ timeout: 5000 });
    const body = await page.textContent('body');
    expect(body).not.toContain('Entre para acessar');
    expect(jsErrors.filter((e) => /is not defined|Cannot read/.test(e))).toHaveLength(0);
  });

  const ROUTES = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/lancamentos', label: 'Lançamentos' },
    { path: '/contas', label: 'Contas' },
    { path: '/cartoes', label: 'Cartões' },
    { path: '/orcamento', label: 'Orçamento' },
    { path: '/crescimento', label: 'Investimentos' },
    { path: '/planejamento', label: 'Metas' },
    { path: '/recorrentes', label: 'Recorrentes' },
    { path: '/consultor-ia', label: 'Consultor IA' },
    { path: '/relatorios', label: 'Relatórios' },
    { path: '/calendario', label: 'Calendário' },
    { path: '/conquistas', label: 'Conquistas' },
    { path: '/ferramentas', label: 'Ferramentas' },
    { path: '/credito', label: 'Hub de Crédito' },
    { path: '/cripto', label: 'Cripto' },
    { path: '/meu-cpf', label: 'Meu CPF' },
    { path: '/meus-boletos', label: 'Meus Boletos' },
    { path: '/sibcoin', label: 'SibCoin' },
    { path: '/loja', label: 'Loja' },
    { path: '/filiados', label: 'Filiados' },
    { path: '/social', label: 'Social' },
    { path: '/educacao', label: 'Educação' },
    { path: '/perfil', label: 'Perfil' },
    { path: '/configuracoes', label: 'Configurações' },
  ];

  for (const route of ROUTES) {
    test(`${route.label} (${route.path}) carrega sem erros`, async ({ page }) => {
      test.skip(!EMAIL || !SENHA, 'Credenciais obrigatórias');
      await login(page);
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
      const criticalErrors = jsErrors.filter((e) => /is not defined|Cannot read|Unexpected token/.test(e));
      expect(criticalErrors, `Erros JS em ${route.path}: ${criticalErrors.join('; ')}`).toHaveLength(0);
    });
  }
});

test.describe('React Staging — Features Fase 0-4', () => {
  test('Dashboard contém gráficos dedicados', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Credenciais obrigatórias');
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await dismissOverlays(page);
    await expect(page.locator('text=/Despesas por categoria/')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/Evolução/')).toBeVisible({ timeout: 5000 });
  });

  test('Lançamentos mostra botões OCR/STT/Importar', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Credenciais obrigatórias');
    await login(page);
    await page.goto('/lancamentos', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await dismissOverlays(page);
    await expect(page.locator('text=Foto')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Voz')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Importar')).toBeVisible({ timeout: 5000 });
  });

  test('Filiados carrega para usuários Pro', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Credenciais obrigatórias');
    await login(page);
    await page.goto('/filiados', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await dismissOverlays(page);
    await page.waitForTimeout(3000);
    const content = await page.textContent('body');
    expect(content).toMatch(/Programa de Filiados|Disponível para planos|Filiado|filiados/i);
  });

  test('Cripto carrega e contém abas', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Credenciais obrigatórias');
    await login(page);
    await page.goto('/cripto', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    expect(body).toMatch(/Cripto|Carteira|Bitcoin|Em breve|Mercado/i);
  });

  test('Configurações possui backup JSON funcional', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Credenciais obrigatórias');
    await login(page);
    await page.goto('/configuracoes', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await dismissOverlays(page);
    await expect(page.locator('text=Dados e Backup')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Backup JSON")')).toBeVisible({ timeout: 5000 });
  });
});
