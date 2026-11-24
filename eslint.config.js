// SPDX-FileCopyrightText: © 2026 Pablo Cigoy
// SPDX-License-Identifier: AGPL-3.0-only

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// A leading underscore marks a binding that exists only to be discarded,
// as in `const { file: _f, ...rest } = item`.
const unusedVars = ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }];

export default tseslint.config(
  { ignores: ["dist", "functions/lib", "node_modules", "functions/node_modules", "public"] },

  // The React PWA.
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": unusedVars,
    },
  },

  // Cloud Functions, build scripts and rules tests all run on Node.
  {
    files: ["functions/src/**/*.ts", "scripts/**/*.mjs", "tests/**/*.mjs", "vite.config.ts", "eslint.config.js"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": unusedVars,
    },
  },
);
