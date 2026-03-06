import { createWriteStream, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'bancos');

mkdirSync(OUT_DIR, { recursive: true });

const bancos = [
  { key: 'nubank',      domain: 'nubank.com.br' },
  { key: 'inter',       domain: 'inter.co' },
  { key: 'itau',        domain: 'itau.com.br' },
  { key: 'bradesco',    domain: 'bradesco.com.br' },
  { key: 'santander',   domain: 'santander.com.br' },
  { key: 'bb',          domain: 'bb.com.br' },
  { key: 'caixa',       domain: 'caixa.gov.br' },
  { key: 'c6',          domain: 'c6bank.com.br' },
  { key: 'btg',         domain: 'btgpactual.com' },
  { key: 'xp',          domain: 'xp.com.br' },
  { key: 'picpay',      domain: 'picpay.com' },
  { key: 'mercadopago', domain: 'mercadopago.com.br' },
  { key: 'neon',        domain: 'neon.com.br' },
  { key: 'will',        domain: 'will.com.br' },
  { key: 'pagbank',     domain: 'pagbank.com.br' },
];

async function download(url, dest) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const stream = createWriteStream(dest);
  await pipeline(res.body, stream);
  return dest;
}

async function main() {
  const results = [];
  for (const { key, domain } of bancos) {
    const dest = path.join(OUT_DIR, `${key}.png`);
    // Google favicon service — 128px PNG, sem auth, sem CORS
    const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    try {
      await download(url, dest);
      const { size } = await import('fs').then(fs => fs.promises.stat(dest));
      const ok = size > 500; // imagem real vs placeholder 1x1
      console.log(`${ok ? '✓' : '⚠'} ${key.padEnd(12)} ${domain.padEnd(25)} ${size} bytes`);
      results.push({ key, domain, ok, size });
    } catch (e) {
      console.log(`✗ ${key.padEnd(12)} ${domain.padEnd(25)} ERRO: ${e.message}`);
      results.push({ key, domain, ok: false, size: 0 });
    }
  }

  console.log('\n--- Resumo ---');
  const ok = results.filter(r => r.ok).length;
  console.log(`${ok}/${results.length} logos baixados com sucesso`);
  console.log(`Destino: ${OUT_DIR}`);
}

main().catch(console.error);
