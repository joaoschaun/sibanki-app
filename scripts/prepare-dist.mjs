#!/usr/bin/env node
/**
 * Prepara o dist/ para deploy em produção.
 * Copia assets PWA e Firebase Messaging SW do public/ que o Vite não inclui.
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

const FILES = [
  'manifest.json',
  'firebase-messaging-sw.js',
  'sw.js',
  'icon-192.svg',
  'icon-512.svg',
];

let copied = 0;
for (const file of FILES) {
  const src = join(ROOT, 'public', file);
  const dest = join(DIST, file);
  if (existsSync(src)) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    copied++;
    console.log(`  ✅ ${file}`);
  } else {
    const distExists = existsSync(dest);
    if (distExists) {
      console.log(`  ⏭️  ${file} (já existe em dist/)`);
    } else {
      console.warn(`  ⚠️  ${file} não encontrado em public/`);
    }
  }
}

// Remover pasta app/ do dist se existir (legado não vai no bundle React)
const distApp = join(DIST, 'app');
if (existsSync(distApp)) {
  const { rmSync } = await import('fs');
  rmSync(distApp, { recursive: true, force: true });
  console.log('  🗑️  dist/app/ removido (legado separado)');
}

console.log(`\n[prepare-dist] ${copied} arquivo(s) copiados para dist/\n`);
