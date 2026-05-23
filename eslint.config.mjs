import js from "@eslint/js";
import globals from "globals";

// 🔥 FIX DEFINITIVO: define browser + chrome explicitamente
const browserGlobals = {
  ...globals.browser,
  chrome: "readonly",
  NodeFilter: "readonly",
};

export default [
  {
    ignores: ["node_modules/**", "icons/**", ".git/**"],
  },

  js.configs.recommended,

  // ============================================
  // POPUP
  // ============================================
  {
    files: ["popup/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: browserGlobals,
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
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
  // BACKGROUND
  // ============================================
  {
    files: ["background/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.serviceworker,
        chrome: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
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
  // CONTENT SCRIPT
  // ============================================
  {
    files: ["content/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: browserGlobals,
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
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
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
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
  // SCRIPTS
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
