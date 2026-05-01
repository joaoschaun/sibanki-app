// eslint.config.js — ESLint v9 flat config
//
// REL-03 (auditoria 26/04/2026, decisão sênior): introduzir lint mínimo no front.
// Objetivo: travar a sangria de `as any` (115 ocorrências em 39 arquivos hoje)
// SEM quebrar o repo. Estratégia "warn primeiro, error depois":
//   - `as any` / `: any` → WARN (visível no editor, não bloqueia CI)
//   - Erros estruturais (no-undef, no-redeclare) → ERROR
//   - Imports não-usados → WARN (já temos noUnusedLocals no tsc, redundante)
//
// Quando o número de warns cair abaixo de ~30, virar tudo para `error` num PR.
//
// Plugins recomendados (instalar como devDeps quando ativar):
//   npm install --save-dev eslint @eslint/js typescript-eslint
//
// Dependências mínimas: Node 22, ESLint v9.

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // 1) Recomendações base do JS
  js.configs.recommended,

  // 2) Recomendações TS (versão type-aware é mais cara — começamos com a leve)
  ...tseslint.configs.recommended,

  // 3) Regras do projeto Sibanki
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        // Vite + browser
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        console: "readonly",
        sessionStorage: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        crypto: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        Image: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLLinkElement: "readonly",
        HTMLStyleElement: "readonly",
        Notification: "readonly",
        Audio: "readonly",
        MediaRecorder: "readonly",
        getComputedStyle: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        IntersectionObserver: "readonly",
        ResizeObserver: "readonly",
        MutationObserver: "readonly",
        process: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      // ── Sangria de tipos (warn agora, error depois) ──────────────────────
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "off",  // muito ruidoso sem type-aware
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",

      // ── Limpeza ─────────────────────────────────────────────────────────
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // tsc com noUnusedLocals já cobre boa parte — manter como warn
      "no-unused-vars": "off",

      // ── Confusões clássicas que TS sozinho não pega ─────────────────────
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "warn",
      "no-var": "error",
      "eqeqeq": ["warn", "smart"],
      "no-duplicate-imports": "error",

      // ── React (sem plugin, regras genéricas) ────────────────────────────
      // Quando adicionar eslint-plugin-react-hooks: ligar 'react-hooks/exhaustive-deps'
      // como warn — vai pegar bug real em useEffect.
    },
  },

  // 4) Testes — relaxar regras para facilitar mocks
  {
    files: ["src/**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
    },
  },

  // 5) Cloud Functions — config separada (são CommonJS, contexto Node)
  {
    files: ["functions/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  // 6) Ignores
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "functions/node_modules/**",
      "public/app/**",       // legado, modo manutenção
      "public/admin/**",     // vanilla JS legado
      "playwright.config.cjs",
      "tests/**",            // E2E têm regras próprias
      "scripts/**",          // utilitários CLI
      "**/*.d.ts",
      "**/*.config.{js,ts,cjs,mjs}",
      ".github/**",
    ],
  },
];
