import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  { ignores: ["dist/**", "coverage/**", "public/assets/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["src/client/**/*.{ts,tsx}", "src/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/server/**"],
              message: "Use shared HTTP contracts, never server internals.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/domain/**/*.ts", "src/server/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "fastify",
                "@fastify/*",
                "pg",
                "**/persistence/**",
                "**/routes/**",
                "**/shared/**",
                "**/security/**",
              ],
              message:
                "Domain and application depend only on domain models and ports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        document: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        location: "readonly",
      },
    },
  },
);
