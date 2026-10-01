import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  { ignores: ["dist/**", "coverage/**", "public/assets/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
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
