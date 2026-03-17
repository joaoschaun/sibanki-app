/**
 * Playwright - Sibanki / Virtus Financeiro
 * Testes E2E otimizados para detectar erros e acelerar o processo
 * Config em .cjs para compatibilidade com package.json "type": "module"
 */
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://virtus-financeiro-cd7bd.web.app';
const STAGING_URL = 'https://staging-13a0b.web.app';
const EMAIL = process.env.TEST_EMAIL || process.env.EMAIL || '';
const SENHA = process.env.TEST_SENHA || process.env.SENHA || '';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'smoke',
      testMatch: '**/smoke.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iphone',
      testMatch: '**/smoke.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        isMobile: true,
        hasTouch: true,
        baseURL: BASE_URL,
      },
    },
    {
      name: 'fluxo-completo',
      testMatch: '**/fluxo-completo.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'check-erros',
      testMatch: '**/check-erros.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'analise-staging',
      testMatch: '**/analise-staging.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://staging-13a0b.web.app',
      },
    },
    {
      name: 'staging-validation',
      testMatch: '**/staging-login-validacao.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://staging-13a0b.web.app',
        headless: false,
      },
    },
    {
      name: 'diagrama-layout',
      testMatch: '**/{diagrama-layout,inspeciona-css,debug-layout,verifica-gap,verifica-familia-calendario,diagrama-gap-root,diagnostico-familia}.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://staging-13a0b.web.app',
      },
    },
    {
      name: 'compare-legado',
      testMatch: '**/compare-modulos-legado.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.LEGACY_BASE_URL || 'https://staging-13a0b.web.app/app',
      },
    },
    {
      name: 'compare-react',
      testMatch: '**/compare-modulos-react.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.REACT_BASE_URL || 'https://staging-13a0b.web.app',
      },
    },
  ],
  timeout: 120000,
  expect: { timeout: 10000 },
});
