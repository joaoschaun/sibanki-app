import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

/**
 * O diretório `public/app` (legado) é copiado para `dist/app` no build.
 * No Firebase Hosting, arquivos estáticos vencem rewrites — `/app` passava a servir o legado
 * em vez do SPA React no target `staging`. Removemos `dist/app` ao final do build.
 */
function stripLegacyAppFromDist(): Plugin {
  return {
    name: 'strip-legacy-app-from-dist',
    apply: 'build',
    closeBundle() {
      const p = resolve(process.cwd(), 'dist/app');
      if (existsSync(p)) {
        rmSync(p, { recursive: true, force: true });
        // eslint-disable-next-line no-console
        console.log('[vite] dist/app removido (legado não deve ir para o bundle de staging/React)');
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stripLegacyAppFromDist()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
});

