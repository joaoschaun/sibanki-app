import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest config separado do vite.config.ts para não interferir no build.
 *
 * Exclusões obrigatórias:
 *  - tests/         → testes E2E do Playwright (usam @playwright/test, incompatível com Vitest)
 *  - functions/     → testes de backend Node.js (usam node:test, não Vitest)
 *  - **\/*.spec.*   → specs Playwright adicionais
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    // 'node' funciona para todos os testes atuais (funções puras, sem DOM)
    // Trocar para 'jsdom' quando houver testes de componentes React
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/**',
      'functions/**',
      '**/*.spec.cjs',
      '**/*.spec.js',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/types/**',
        'src/main.tsx',
      ],
    },
  },
});
