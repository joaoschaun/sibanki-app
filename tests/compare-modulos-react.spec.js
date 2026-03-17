/**
 * Comparação visual: captura screenshots de cada módulo do APP REACT.
 * Staging: React na raiz https://staging-13a0b.web.app
 * Uso: npx playwright test compare-modulos-react --project=compare-react
 * Screenshots: screenshots/compare/react/
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE = process.env.REACT_BASE_URL || process.env.BASE_URL || 'https://staging-13a0b.web.app';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'compare', 'react');
const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '';

const MODULOS_REACT = [
  { path: '/', nome: 'Dashboard' },
  { path: '/contas', nome: 'Contas' },
  { path: '/cartoes', nome: 'Cartoes' },
  { path: '/lancamentos', nome: 'Lancamentos' },
  { path: '/recorrentes', nome: 'Recorrentes' },
  { path: '/planejamento', nome: 'Planejamento' },
  { path: '/orcamento', nome: 'Orcamento' },
  { path: '/crescimento', nome: 'Crescimento' },
  { path: '/social', nome: 'Social' },
  { path: '/consultor-ia', nome: 'Consultor-IA' },
  { path: '/educacao', nome: 'Educacao' },
  { path: '/perfil', nome: 'Perfil' },
  { path: '/configuracoes', nome: 'Configuracoes' },
];

test.describe.configure({ mode: 'serial' });

test.describe('Compare módulos - React', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('login no React e captura de cada módulo', async ({ page }) => {
    test.skip(!EMAIL || !SENHA, 'Defina TEST_EMAIL e TEST_SENHA para rodar a comparação');

    await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });

    // Login React: input email, input password, botão Entrar
    const emailInput = page.getByPlaceholder('E-mail');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);
    if (!(await emailInput.isVisible())) {
      throw new Error('Tela de login do React não encontrada. Verifique REACT_BASE_URL.');
    }

    await emailInput.fill(EMAIL);
    await page.getByPlaceholder('Senha').fill(SENHA);
    await page.getByRole('button', { name: /Entrar/i }).click();

    // Aguardar sair da tela de login (sidebar ou main com navegação)
    await page.waitForSelector('nav a[href="/"], aside a[href="/"]', { state: 'visible', timeout: 20000 });

    await page.waitForTimeout(1000);

    const base = BASE.replace(/\/$/, '');
    for (let i = 0; i < MODULOS_REACT.length; i++) {
      const mod = MODULOS_REACT[i];
      await page.goto(base + mod.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${String(i + 1).padStart(2, '0')}-${mod.nome}.png`),
        fullPage: false,
      }).catch(() => {});
    }

    console.log('Screenshots React salvos em:', SCREENSHOT_DIR);
  });
});
