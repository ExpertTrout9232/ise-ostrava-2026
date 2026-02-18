// TODO: Fix this fucking mess

// ! eslint-config-prettier should be a lifesaver appraently

// TODO: Convert to the new standard with ""...""
// perhaps use eslint-config-standard instead of the recommended one
// * use some tailwind class wrapper so it looks nice and tidy, prettier cant do this well

// import css from "@eslint/css";
import js from "@eslint/js";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import html from "@html-eslint/eslint-plugin";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

// import { tailwind4 } from "tailwind-csstree";

export default defineConfig([
  globalIgnores(["src/output.css"]),
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/gfm", extends: ["markdown/recommended"] },
  // { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"], languageOptions: {
  //           customSyntax: tailwind4,
  //       }, rules: {"css/no-invalid-syntax": "off"} },
  {
    files: ["**/*.html"],
    plugins: { html },
    language: "html/html",
    extends: ["html/recommended"],
    rules: {
      "html/indent": "off",
      "html/attrs-newline": "off",
      "html/require-closing-tags": ["error", { selfClosing: "always" }],
      "html/no-extra-spacing-attrs": ["error", { enforceBeforeSelfClose: true }],
      "html/use-baseline": ["warn", { available: "newly" }],
    },
  },
]);
