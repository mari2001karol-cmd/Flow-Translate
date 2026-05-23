/**
 * ESLint Flat Config - Flow Translate
 */

import js from "@eslint/js";
import globals from "globals";

export default [
  // ============================================
  // Ignorados globais
  // ============================================
  {
    ignores: ["node_modules/**", "icons/**", ".git/**"],
  },

  // ============================================
  // Base recomendada
  // ============================================
  js.configs.recommended,

  // ============================================
  // POPUP (DOM + Extension API)
  // ============================================
  {
    files: ["popup/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
      "no-undef": "error",
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "warn",
      curly: ["error", "multi-line"],
      "no-throw-literal": "error",
    },
  },

  // ============================================
  // BACKGROUND (Service Worker)
  // ============================================
  {
    files: ["background/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.serviceworker,
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
      "no-undef": "error",
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "warn",
      curly: ["error", "multi-line"],
      "no-throw-literal": "error",
    },
  },

  // ============================================
  // CONTENT SCRIPT (DOM isolado)
  // ============================================
  {
    files: ["content/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
      "no-undef": "error",
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "warn",
      curly: ["error", "multi-line"],
      "no-throw-literal": "error",
    },
  },

  // ============================================
  // UTILS
  // ============================================
  {
    files: ["utils/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
      "no-undef": "error",
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "warn",
      curly: ["error", "multi-line"],
      "no-throw-literal": "error",
    },
  },

  // ============================================
  // SCRIPTS NODE (CI)
  // ============================================
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
      "no-undef": "error",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
];
