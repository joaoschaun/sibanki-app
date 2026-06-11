#!/usr/bin/env node
/**
 * Gera public/og-image.png (1200x630) para previews de link (WhatsApp/OG/Twitter).
 * Requer Playwright Chromium instalado (npx playwright install chromium).
 */
import { chromium } from 'playwright';

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; background: #0a0a0a;
    font-family: Inter, -apple-system, system-ui, sans-serif; color: #fff;
    display: flex; align-items: center; justify-content: center;
  }
  .card {
    width: 1080px; height: 510px; background: #111111;
    border: 1px solid rgba(255,255,255,0.10); border-radius: 32px;
    padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between;
  }
  .logo { font-size: 64px; font-weight: 700; letter-spacing: -0.01em; }
  .headline { font-size: 40px; font-weight: 600; color: rgba(255,255,255,0.92); line-height: 1.25; max-width: 880px; }
  .pills { display: flex; gap: 16px; }
  .pill {
    border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04);
    border-radius: 999px; padding: 14px 26px; font-size: 19px; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.65);
  }
</style></head><body>
  <div class="card">
    <div class="logo">Sibanki</div>
    <div class="headline">Controle financeiro com IA.<br>Veja sua realidade financeira com clareza.</div>
    <div class="pills">
      <div class="pill">Open Finance</div>
      <div class="pill">Consultor IA</div>
      <div class="pill">Dias de Liberdade</div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'public/og-image.png' });
await browser.close();
console.log('public/og-image.png gerado (1200x630)');
