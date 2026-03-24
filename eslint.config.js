const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    files: ["src/**/*.{ts,js}"],
    ignores: ["dist/**"],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: "Use config instead of process.env",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/platform/auth",
              message: "Use middleware/auth only",
            },
          ],
          patterns: ["@/routes/*"],
        },
      ],
    },
  },
  {
    files: ["src/config/**"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
