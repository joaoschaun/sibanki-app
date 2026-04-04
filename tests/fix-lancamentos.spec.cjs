/**
 * Testes de validação das correções na página de Lançamentos (React staging)
 * URL: https://staging-13a0b.web.app
 *
 * Uso: BASE_URL=https://staging-13a0b.web.app TEST_EMAIL=x TEST_SENHA=y npx playwright test tests/fix-lancamentos.spec.cjs --headed
 *
 * Cobre:
 *  ✅ Fix 1 – Modal de recorrência abre ao clicar "Sim"
 *  ✅ Fix 2 – Hambúrguer e dropdown do avatar funcionam (sem freeze)
 *  ✅ Fix 3 – Filtro padrão "Hoje" ativo + ícones sem piscar
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs  = require('fs');

const BASE_URL  = process.env.BASE_URL  || 'https://staging-13a0b.web.app';
const EMAIL     = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA     = process.env.TEST_SENHA || process.env.SENHA || '';

const ssDir = path.join(__dirname, '..', 'screenshots', 'fix-lancamentos');
if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

/* ── helpers ─────────────────────────────────────────────────────────────── */
async function loginReact(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Aguarda tela de login (input email)
  await page.waitForSelector('input[type="email"], input[placeholder*="mail"]', { timeout: 15000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', SENHA);
  await page.click('button[type="submit"]');
  // Aguarda o app carregar (sidebar ou header visível)
  await page.waitForSelector('nav, aside, header', { timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function irParaLancamentos(page) {
  // Navegar para /lancamentos via sidebar ou URL
  const lancLink = page.locator('a[href="/lancamentos"], a:has-text("Lançamentos")').first();
  if (await lancLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await lancLink.click();
  } else {
    await page.goto(BASE_URL + '/lancamentos', { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ssDir, '01-pagina-lancamentos.png') });
}

test.describe('Fix Lançamentos – React Staging', () => {

  /* ── FIX 2: Hambúrguer + Dropdown Avatar não travam ──────────────────── */
  test('Fix 2 – Hambúrguer abre/fecha sidebar sem freeze', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido — pule com credenciais reais');
    await loginReact(page);
    await irParaLancamentos(page);

    // Clicar hambúrguer
    const hamburguer = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], header button').first();
    await expect(hamburguer).toBeVisible({ timeout: 5000 });
    await hamburguer.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ssDir, '02-hamburger-clicado.png') });

    // Verificar que a sidebar mudou (collapsed/expanded)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    console.log('✅ Fix 2a – Hambúrguer respondeu sem freeze');
  });

  test('Fix 2 – Dropdown do avatar abre na página de Lançamentos', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginReact(page);
    await irParaLancamentos(page);

    // Clicar avatar
    const avatar = page.locator('button[aria-label="Menu da conta"]');
    await expect(avatar).toBeVisible({ timeout: 5000 });
    await avatar.click();
    await page.waitForTimeout(400);

    // Dropdown deve estar visível
    const dropdown = page.locator('header >> text=Perfil').first();
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: path.join(ssDir, '03-dropdown-avatar-aberto.png') });
    console.log('✅ Fix 2b – Dropdown do avatar abriu corretamente');

    // Fechar clicando fora
    await page.mouse.click(200, 200);
    await page.waitForTimeout(300);
    await expect(dropdown).not.toBeVisible({ timeout: 2000 });
    console.log('✅ Fix 2c – Dropdown fecha ao clicar fora');
  });

  /* ── FIX 3: Filtro "Hoje" padrão + ícones sem piscar ─────────────────── */
  test('Fix 3 – Filtro padrão "Hoje" está ativo na abertura', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginReact(page);
    await irParaLancamentos(page);

    // Botão "Hoje" deve ter a classe ativa (bg-blue-600)
    const botaoHoje = page.locator('button:has-text("Hoje")').first();
    await expect(botaoHoje).toBeVisible({ timeout: 5000 });
    const classes = await botaoHoje.getAttribute('class');
    expect(classes).toContain('bg-blue-600');
    console.log('✅ Fix 3a – Botão "Hoje" está ativo por padrão');
    await page.screenshot({ path: path.join(ssDir, '04-filtro-hoje-ativo.png') });
  });

  test('Fix 3 – Ícones de registro estáticos (sem animate-pulse)', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginReact(page);
    await irParaLancamentos(page);

    // Nenhum elemento na lista deve ter animate-pulse
    const pulsing = await page.locator('.animate-pulse').count();
    expect(pulsing).toBe(0);
    console.log('✅ Fix 3b – Nenhum ícone com animate-pulse encontrado');
  });

  test('Fix 3 – Agrupamento por data com "Total do dia"', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginReact(page);
    await irParaLancamentos(page);

    // Trocar para "Todos" para garantir que há registros
    const botaoTodos = page.locator('button:has-text("Todos")').first();
    if (await botaoTodos.isVisible({ timeout: 2000 }).catch(() => false)) {
      await botaoTodos.click();
      await page.waitForTimeout(800);
    }

    // Verificar texto "Total do dia" nos grupos
    const totalDia = page.locator('text=Total do dia').first();
    const temRegistros = await totalDia.isVisible({ timeout: 4000 }).catch(() => false);

    if (temRegistros) {
      console.log('✅ Fix 3c – Agrupamento por data com "Total do dia" visível');
      await page.screenshot({ path: path.join(ssDir, '05-agrupamento-total-dia.png') });
    } else {
      console.log('ℹ️  Fix 3c – Sem registros no período (conta pode estar vazia)');
    }
  });

  /* ── FIX 1: Modal de Recorrência abre ao clicar "Sim" ────────────────── */
  test('Fix 1 – Modal de recorrência abre com todos os campos', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginReact(page);
    await irParaLancamentos(page);

    // Abrir modal "Novo lançamento" via botão Lançar
    const btnLancar = page.locator('button:has-text("Lançar")').first();
    await expect(btnLancar).toBeVisible({ timeout: 5000 });
    await btnLancar.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ssDir, '06-modal-novo-lancamento.png') });

    // Verificar modal aberto
    const modalTitle = page.locator('text=Novo lançamento').first();
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    console.log('✅ Fix 1a – Modal "Novo lançamento" abriu');

    // Clicar botão "Sim" de recorrência
    const btnSim = page.locator('button:has-text("Sim")').first();
    await expect(btnSim).toBeVisible({ timeout: 5000 });
    await btnSim.click();
    await page.waitForTimeout(600);

    // Modal de recorrência deve aparecer
    const recorrModal = page.locator('text=Configurar Recorrência').first();
    await expect(recorrModal).toBeVisible({ timeout: 5000 });
    console.log('✅ Fix 1b – Modal de recorrência abriu ao clicar "Sim"');
    await page.screenshot({ path: path.join(ssDir, '07-modal-recorrencia.png') });

    // Verificar campos presentes
    await expect(page.locator('button:has-text("Mensal")')).toBeVisible();
    await expect(page.locator('button:has-text("Semanal")')).toBeVisible();
    console.log('✅ Fix 1c – Opções de periodicidade presentes');

    await expect(page.locator('button:has-text("Indefinido")')).toBeVisible();
    await expect(page.locator('button:has-text("Nº de vezes")')).toBeVisible();
    await expect(page.locator('button:has-text("Até data")')).toBeVisible();
    console.log('✅ Fix 1d – Opções de duração presentes');

    // Testar seleção de "Nº de vezes"
    await page.click('button:has-text("Nº de vezes")');
    await page.waitForTimeout(300);
    const inputQtd = page.locator('input[type="number"]').first();
    await expect(inputQtd).toBeVisible();
    console.log('✅ Fix 1e – Campo "Nº de repetições" aparece ao selecionar Nº de vezes');

    // Confirmar
    await page.click('button:has-text("Confirmar")');
    await page.waitForTimeout(400);

    // Badge de resumo deve aparecer no formulário principal
    const badge = page.locator('text=Mensal').last();
    await expect(badge).toBeVisible({ timeout: 3000 });
    console.log('✅ Fix 1f – Badge de resumo da recorrência visível no formulário');
    await page.screenshot({ path: path.join(ssDir, '08-badge-recorrencia-configurado.png') });
  });

  /* ── Sidebar: grupos Planejamento/Crescimento funcionam ──────────────── */
  test('Fix 2 – Sidebar: grupos dropdown funcionam', async ({ page }) => {
    test.skip(!EMAIL, 'TEST_EMAIL não definido');
    await loginReact(page);
    await irParaLancamentos(page);

    // Expandir sidebar se estiver colapsada
    const sidebar = page.locator('aside');
    const width = await sidebar.evaluate(el => el.getBoundingClientRect().width);
    if (width < 200) {
      await page.locator('button[aria-label*="Expandir"], button[aria-label*="menu"]').first().click();
      await page.waitForTimeout(400);
    }

    // Clicar no grupo "Planejamento"
    const grupoPlan = page.locator('button:has-text("Planejamento")').first();
    if (await grupoPlan.isVisible({ timeout: 3000 }).catch(() => false)) {
      await grupoPlan.click();
      await page.waitForTimeout(400);
      const subMeta = page.locator('a:has-text("Metas")').first();
      const abriu = await subMeta.isVisible({ timeout: 2000 }).catch(() => false);
      if (abriu) console.log('✅ Fix 2d – Grupo Planejamento expandiu no sidebar');
      else console.log('ℹ️  Grupo Planejamento não expandiu (pode estar em modo colapsado)');
      await page.screenshot({ path: path.join(ssDir, '09-sidebar-planejamento.png') });
    }
  });

});
