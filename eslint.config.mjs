import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The OCR engines' own builds, copied in by `pnpm ocr-assets`. Minified
    // third-party code, so there is nothing here to lint.
    "public/tesseract/**",
    "public/pdf/**",
  ]),
]);

export default eslintConfig;
