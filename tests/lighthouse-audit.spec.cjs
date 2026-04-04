/**
 * Lightweight PWA + perf checks using Playwright
 * Não requer Lighthouse — verifica os critérios mais importantes diretamente
 * Uso: npx playwright test --project=react-smoke tests/lighthouse-audit.spec.cjs
 */
const { test, expect } = require('@playwright/test');

test.describe('PWA & Performance Audit', () => {
  test('manifest.json está acessível e válido', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
  });

  test('ícones PWA estão acessíveis', async ({ request }) => {
    const icon192 = await request.get('/icon-192.svg');
    expect(icon192.status()).toBe(200);
    const icon512 = await request.get('/icon-512.svg');
    expect(icon512.status()).toBe(200);
  });

  test('service worker registrado (sw.js existe)', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('CACHE_NAME');
  });

  test('index.html contém meta tags PWA obrigatórias', async ({ request }) => {
    const res = await request.get('/');
    const html = await res.text();
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('apple-mobile-web-app-capable');
  });

  test('página carrega em menos de 5s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test('CSS e JS principal carregam com sucesso', async ({ page }) => {
    const failedRequests = [];
    page.on('requestfailed', (req) => failedRequests.push(req.url()));
    await page.goto('/', { waitUntil: 'networkidle', timeout: 15000 });
    const criticalFails = failedRequests.filter((u) => /\.(js|css)$/.test(u));
    expect(criticalFails, `Assets falharam: ${criticalFails.join(', ')}`).toHaveLength(0);
  });

  test('nenhum erro JS crítico na página inicial', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const critical = errors.filter((e) => /is not defined|Cannot read|Unexpected token/.test(e));
    expect(critical, `Erros JS: ${critical.join('; ')}`).toHaveLength(0);
  });

  test('página tem lang="pt-BR"', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('pt-BR');
  });

  test('viewport meta tag presente', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewport).toContain('width=device-width');
  });
});
