import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// O staging (React) usa `dist` como public.
// Como o projeto também possui `public/app` (legado), o Vite copia para `dist/app`.
// Para garantir "staging só React", removemos `dist/app` antes do deploy do target `staging`.

const distAppPath = resolve('dist/app');

try {
  if (existsSync(distAppPath)) {
    rmSync(distAppPath, { recursive: true, force: true });
    // eslint-disable-next-line no-console
    console.log('[clean-staging-dist] Removed dist/app');
  } else {
    // eslint-disable-next-line no-console
    console.log('[clean-staging-dist] dist/app not found - skip');
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[clean-staging-dist] Failed to clean dist/app:', err);
  // Não aborta o deploy; apenas tentamos manter o staging React-only.
}

