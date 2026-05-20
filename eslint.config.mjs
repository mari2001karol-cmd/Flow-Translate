/**
 * ESLint Flat Config - Flow Translate
 * 
 * Utiliza o novo formato "flat config" do ESLint 9+.
 * 
 * Conceitos-chave:
 * - `languageOptions.globals` define variáveis globais que NÃO devem gerar
 *   erros de "undefined" (ex: `chrome`, `document`, `window`).
 * - Cada objeto no array exportado é um "config block" que pode ter 
 *   `files` (glob patterns) para limitar seu escopo.
 * - `ignores` no primeiro bloco define arquivos ignorados globalmente.
 */

import js from '@eslint/js';
import globals from 'globals';

export default [
  // ============================================
  // Bloco 1: Arquivos ignorados globalmente
  // ============================================
  {
    ignores: [
      'node_modules/**',
      'icons/**',
      '.git/**'
    ]
  },

  // ============================================
  // Bloco 2: Configuração base recomendada
  // ============================================
  js.configs.recommended,

  // ============================================
  // Bloco 3: Scripts do popup (contexto DOM + Chrome Extension APIs)
  // O popup roda em uma página da extensão, com acesso ao DOM
  // e às APIs chrome.* (runtime, storage, etc.)
  // ============================================
  {
    files: ['popup/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',               // popup.js é carregado via <script> tag
      globals: {
        ...globals.browser,               // window, document, navigator, etc.
        chrome: 'readonly'                 // API da extensão Chrome
      }
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',          // Ignora variáveis prefixadas com _
        varsIgnorePattern: '^_'
      }],
      'no-console': 'off',                // Console é útil para debug de extensões
      'no-undef': 'error',                // Garante que toda variável está declarada
      'eqeqeq': ['error', 'always'],      // Força === ao invés de ==
      'no-var': 'error',                   // Obriga let/const ao invés de var
      'prefer-const': 'warn',             // Sugere const quando variável não é reatribuída
      'curly': ['error', 'multi-line'],    // Obriga {} em blocos multi-line
      'no-throw-literal': 'error'          // Obriga throw new Error() ao invés de throw 'string'
    }
  },

  // ============================================
  // Bloco 4: Background Service Worker (sem DOM, com Chrome APIs + fetch)
  // O Service Worker NÃO tem acesso ao DOM (document, window, etc.)
  // Tem acesso a fetch(), console e APIs chrome.*
  // ============================================
  {
    files: ['background/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',                // Definido como "module" no manifest.json
      globals: {
        ...globals.serviceworker,           // self, fetch, caches, etc.
        chrome: 'readonly'                 // API da extensão Chrome
      }
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': 'off',
      'no-undef': 'error',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'curly': ['error', 'multi-line'],
      'no-throw-literal': 'error'
    }
  },

  // ============================================
  // Bloco 5: Content Script (contexto DOM da página host)
  // Roda no "isolated world" com acesso ao DOM da página
  // e APIs chrome.runtime/storage (subset limitado)
  // ============================================
  {
    files: ['content/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',               // Content scripts não suportam ES modules
      globals: {
        ...globals.browser,               // window, document, etc.
        chrome: 'readonly',               // chrome.runtime, chrome.storage
        NodeFilter: 'readonly'            // API do TreeWalker (DOM Level 2)
      }
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': 'off',
      'no-undef': 'error',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'curly': ['error', 'multi-line'],
      'no-throw-literal': 'error'
    }
  },

  // ============================================
  // Bloco 6: Módulos utilitários (ES modules)
  // Podem ser importados pelo background.js (type: module)
  // ============================================
  {
    files: ['utils/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': 'off',
      'no-undef': 'error',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'curly': ['error', 'multi-line'],
      'no-throw-literal': 'error'
    }
  },

  // ============================================
  // Bloco 7: Scripts de CI/utilitários (Node.js)
  // ============================================
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node                    // process, __dirname, require, etc.
      }
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'warn'
    }
  }
];
