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
      "dist",
      "coverage",
      "node_modules",
      "public",
      "netlify/**/*.js",
      "archive/**",
      "legacy-vanilla/**"
    ]
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
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
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
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
      "@typescript-eslint/ban-ts-comment": "off"
    }
  }
];

