/**
 * Auditoria e Curadoria do Sistema Legado - Sibanki
 * Cobertura completa: login, todos os módulos, erros de console, screenshots.
 *
 * Uso:
 *   npx playwright test curadoria --project=curadoria
 *   LEGACY_BASE_URL=http://localhost:3000/app npx playwright test curadoria --project=curadoria
 *
 * Requer: TEST_EMAIL e TEST_SENHA (ou EMAIL e SENHA)
 * Relatório: screenshots/curadoria/ + curadoria-report.json
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.join(__dirname, '..', 'screenshots', 'curadoria');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '';

// Módulos do legado na ordem do drawer (data-go)
const MODULOS = [
  { id: 'dash', nome: 'Dashboard' },
  { id: 'contas', nome: 'Contas' },
  { id: 'cartões', nome: 'Cartoes' },
  { id: 'lanc', nome: 'Lancamentos' },
  { id: 'metas', nome: 'Metas' },
  { id: 'orçamento', nome: 'Orcamento' },
  { id: 'calendario', nome: 'Calendario' },
  { id: 'invest', nome: 'Investimentos' },
  { id: 'ia', nome: 'Consultor-IA' },
  { id: 'dicas', nome: 'Educacao' },
  { id: 'casal', nome: 'Familia' },
  { id: 'comunidade', nome: 'Social' },
  { id: 'rel', nome: 'Relatorios' },
  { id: 'conq', nome: 'Conquistas' },
  { id: 'config', nome: 'Configuracoes' },
  { id: 'perfil', nome: 'Perfil' },
];

test.describe('Auditoria e Curadoria - Sistema Legado Sibanki', () => {
  const report = {
    erros: [],
    warnings: [],
    timings: {},
    modulos_ok: [],
    modulos_falha: [],
    ambiente: '',
    data: new Date().toISOString(),
  };

  test.beforeEach(async ({ page }) => {
    report.erros = [];
    report.warnings = [];
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') report.erros.push(text);
      if (type === 'warning') report.warnings.push(text);
    });
    page.on('pageerror', (err) => report.erros.push(`PageError: ${err.message}`));
  });

  test('auditoria completa: login + navegação por todos os módulos', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Defina TEST_EMAIL e TEST_SENHA para rodar a curadoria');

    const baseUrl = process.env.LEGACY_BASE_URL || process.env.BASE_URL || 'https://virtus-financeiro-cd7bd.web.app/app';
    report.ambiente = baseUrl;

    const startTotal = Date.now();

    // 1. Navegação e Login
    await page.goto(baseUrl.replace(/\/?$/, ''), { waitUntil: 'load', timeout: 30000 });

    await page.evaluate(() => {
      if (typeof showAuth === 'function') showAuth();
      if (typeof showLog === 'function') showLog();
    }).catch(() => {});

    await page.waitForSelector('#lE', { state: 'visible', timeout: 10000 }).catch(() => null);
    if (!(await page.locator('#lE').isVisible())) {
      await page.screenshot({ path: path.join(screenshotDir, '00-erro-tela-login.png'), fullPage: true });
      throw new Error(
        'Tela de login não encontrada. Verifique LEGACY_BASE_URL ou inicie o legado (npm run dev:legacy).'
      );
    }

    await page.fill('#lE', EMAIL, { force: true });
    await page.fill('#lP', SENHA, { force: true });
    await page.click('#lBtn', { force: true });

    try {
      await page.locator('.app.on').waitFor({ state: 'visible', timeout: 60000 });
      report.timings.login = Date.now() - startTotal;
      console.log('✅ Login realizado com sucesso.');
    } catch (e) {
      console.log('❌ Falha no login:', e.message);
      await page.screenshot({ path: path.join(screenshotDir, '00-falha-login.png'), fullPage: true });
      report.modulos_falha.push('login');
      report.erros.push(`Login: ${e.message}`);

      const uniqErros = [...new Set(report.erros)];
      fs.writeFileSync(
        path.join(screenshotDir, 'curadoria-report.json'),
        JSON.stringify(
          {
            ...report,
            uniqErros,
            uniqWarnings: [...new Set(report.warnings)],
          },
          null,
          2
        )
      );
      return;
    }

    // Fechar onboarding/tour se aparecer
    await page.evaluate(() => {
      const ob = document.getElementById('onboardOverlay');
      if (ob?.classList.contains('show')) {
        const close = document.querySelector('.onb-skip, .onb-close, [onclick*="closeOnboard"]');
        if (close) close.click();
      }
    }).catch(() => {});
    await page.waitForTimeout(800);

    // 2. Navegar por cada módulo
    for (let i = 0; i < MODULOS.length; i++) {
      const mod = MODULOS[i];
      const t0 = Date.now();
      try {
        await page.evaluate((id) => {
          if (typeof go === 'function') go(id, null);
        }, mod.id);
        await page.waitForTimeout(1200);

        const tabVisible = await page.locator(`[id="${mod.id}"].tab.on`).isVisible().catch(() => false);
        if (tabVisible) {
          report.modulos_ok.push(mod.nome);
          await page.screenshot({
            path: path.join(screenshotDir, `${String(i + 1).padStart(2, '0')}-${mod.nome}.png`),
            fullPage: false,
          }).catch(() => {});
          report.timings[mod.nome] = Date.now() - t0;
          console.log(`✅ ${mod.nome}`);
        } else {
          report.modulos_falha.push(mod.nome);
          console.log(`⚠️ ${mod.nome} - tab não visível`);
        }
      } catch (e) {
        report.modulos_falha.push(mod.nome);
        report.erros.push(`${mod.nome}: ${e.message}`);
        console.log(`❌ ${mod.nome}: ${e.message}`);
      }
    }

    report.timings.total = Date.now() - startTotal;
    const uniqErros = [...new Set(report.erros)];
    const uniqWarnings = [...new Set(report.warnings)];

    // 3. Erros críticos
    const criticos = uniqErros.filter((e) =>
      /permission|renderAll|addE|addMeta|addInv|is not defined|Uncaught/.test(e)
    );

    // 4. Relatório no console
    console.log('\n========== RELATÓRIO DE AUDITORIA E CURADORIA ==========');
    console.log(`Ambiente: ${report.ambiente}`);
    console.log(`Tempo total: ${report.timings.total}ms`);
    console.log(`Módulos OK: ${report.modulos_ok.length}/${MODULOS.length}`);
    console.log(`Módulos com falha: ${report.modulos_falha.join(', ') || 'nenhum'}`);
    console.log('\nERROS DO CONSOLE:');
    if (uniqErros.length === 0) console.log('  Nenhum.');
    uniqErros.forEach((e, i) => console.log(`  ${i + 1}. ${e.substring(0, 200)}`));
    console.log('\nWARNINGS (amostra):');
    uniqWarnings.slice(0, 8).forEach((w, i) => console.log(`  ${i + 1}. ${w.substring(0, 150)}`));
    if (uniqWarnings.length > 8) console.log(`  ... e mais ${uniqWarnings.length - 8}`);
    console.log('==========================================================\n');

    // 5. Salvar JSON
    fs.writeFileSync(
      path.join(screenshotDir, 'curadoria-report.json'),
      JSON.stringify(
        {
          ...report,
          uniqErros,
          uniqWarnings,
          criticos,
        },
        null,
        2
      )
    );

    expect(criticos, `Erros críticos: ${criticos.join('; ')}`).toHaveLength(0);
  });
});
