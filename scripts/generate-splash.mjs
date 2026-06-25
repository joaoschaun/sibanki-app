#!/usr/bin/env node
/**
 * Gera imagens PNG de splash screen para iOS PWA.
 *
 * Sem apple-touch-startup-image, o iOS usa um screenshot da última sessão
 * como splash — o que pode exibir conteúdo parcial/indesejado da app.
 * Fornecendo esses PNGs, substituímos esse comportamento por uma tela
 * preta limpa (#0a0a0a), idêntica ao fundo do app.
 *
 * Não requer dependências externas — usa apenas Node.js built-ins (zlib).
 */

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ── CRC32 (necessário para chunks PNG) ──────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ b) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Cria um PNG RGB de cor sólida usando Pure Node.js.
 *
 * Trick de performance: filtro "Up" (tipo 2) da 2ª linha em diante.
 * Com linhas idênticas, o diff é zero — DEFLATE comprime isso a quase nada,
 * então até o maior splash (1290×2796) fica < 5 KB no disco.
 */
function solidColorPng(width, height, r, g, b) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;              // bit depth
  ihdr[9] = 2;              // color type: RGB
  ihdr[10] = ihdr[11] = ihdr[12] = 0; // compression / filter / interlace

  // Dados brutos: (1 byte de filtro + width*3 bytes RGB) × height linhas
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize, 0); // alloc zera a memória

  // Linha 0: filtro None (0) + pixels RGB
  raw[0] = 0;
  for (let x = 0; x < width; x++) {
    raw[1 + x * 3] = r;
    raw[2 + x * 3] = g;
    raw[3 + x * 3] = b;
  }

  // Linhas 1…h-1: filtro Up (2) + zeros (diff da linha anterior é 0)
  for (let y = 1; y < height; y++) {
    raw[y * rowSize] = 2;
  }

  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Tamanhos para dispositivos iOS (portrait) ────────────────────────────────
// [largura_png, altura_png, dpr, css_width, css_height, label]
const SIZES = [
  [ 750, 1334, 2, 375, 667, 'iPhone SE (3rd)/8/7'],
  [ 828, 1792, 2, 414, 896, 'iPhone XR / 11'],
  [1080, 2340, 3, 360, 780, 'iPhone 13 mini / 12 mini'],
  [1125, 2436, 3, 375, 812, 'iPhone X / XS / 11 Pro'],
  [1170, 2532, 3, 390, 844, 'iPhone 12 / 13 / 14'],
  [1179, 2556, 3, 393, 852, 'iPhone 14 Pro / 15 / 15 Pro'],
  [1242, 2688, 3, 414, 896, 'iPhone XS Max / 11 Pro Max'],
  [1284, 2778, 3, 428, 926, 'iPhone 14 Plus / 15 Plus'],
  [1290, 2796, 3, 430, 932, 'iPhone 15 Pro Max / 14 Pro Max'],
];

// Cor de fundo: #0a0a0a (idêntica ao --si-bg do design system)
const BG = [0x0a, 0x0a, 0x0a];

const OUT_DIR = join(process.cwd(), 'public', 'splash');
mkdirSync(OUT_DIR, { recursive: true });

console.log('Gerando splash screens iOS...\n');

for (const [w, h, , , , label] of SIZES) {
  const filename = `${w}x${h}.png`;
  const png = solidColorPng(w, h, ...BG);
  writeFileSync(join(OUT_DIR, filename), png);
  const kb = (png.length / 1024).toFixed(1);
  console.log(`  ✅ ${filename.padEnd(16)} ${kb.padStart(5)} KB  — ${label}`);
}

console.log('\n✅ Splash screens geradas em public/splash/');
console.log('   Adicione as meta tags no index.html para ativar no iOS.\n');
