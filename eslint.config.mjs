// Pass 1: every rule. Nothing after the last block may lower an unsuppressible rule (RF-60).
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import tseslint from "typescript-eslint";
import localPlugin from "./lint/plugin.mjs";
import {
  COMPONENT_FILES,
  LINT_FILES,
  LINT_IGNORES,
  UNSUPPRESSIBLE_COMPONENT_RULES,
  UNSUPPRESSIBLE_RULES,
} from "./lint/shared.mjs";

export default [
  { ignores: LINT_IGNORES },
  ...tseslint.configs.recommended,
  {
    files: LINT_FILES,
    plugins: {
      "@eslint-community/eslint-comments": eslintComments,
      local: localPlugin,
    },
    // Native reports have no rule id, so no directive or inline config can hide or lower them (RF-51, D11).
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
    rules: {
      // Suppressible example rule (plan, D13).
      "no-console": "error",
      ...UNSUPPRESSIBLE_RULES,
    },
  },
  // RF-16 applies to components only (plan, section 6.4).
  { files: COMPONENT_FILES, rules: UNSUPPRESSIBLE_COMPONENT_RULES },
];
