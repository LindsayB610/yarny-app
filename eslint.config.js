import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "public/**",
      "netlify/**/*.js",
      ".netlify/**",
      "archive/**",
      "legacy-vanilla/**",
      "test-corpus/**",
      "playwright-report/**",
      "test-results/**",
      "vitest.setup.ts",
      "*.config.js",
      "*.config.cjs"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Use projectService for better performance (TypeScript 5.9+)
        // Falls back to traditional project option if projectService not supported
        projectService: {
          allowDefaultProject: ["*.js", "*.cjs"]
        },
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname || process.cwd(),
        jsxPragma: "React",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      import: importPlugin
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Note: recommended-type-checked rules are included via the configs above
      // Individual typed rules are enabled below
      ...reactPlugin.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      // Typed linting rules (require type information)
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      // Additional helpful type-checked rules
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "error",
      "import/order": [
        "error",
        {
          "groups": [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
          "newlines-between": "always",
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": true
          }
        }
      ],
      "react/react-in-jsx-scope": "off"
    }
  },
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "tests/**/*.{ts,tsx}",
      "tests/**/*.{ts}",
      "test-corpus/**/*.{js,ts,tsx}"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "react/display-name": "off",
      "import/order": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      // Allow floating promises in tests (test utilities often fire-and-forget)
      "@typescript-eslint/no-floating-promises": "off",
      // Allow typeof import() in test files (needed for dynamic import type annotations)
      "@typescript-eslint/consistent-type-imports": "off",
      // Allow promise misuse in tests (test event handlers often need async)
      "@typescript-eslint/no-misused-promises": "off"
    }
  }
];

