// Pass 2: only the unsuppressible rules, all of them, without exceptions (D30).
// lint/run.mjs runs it with allowInlineConfig: false, so no comment can hide them (D10).
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
  // Parser and @typescript-eslint plugin only: no recommended rules here.
  tseslint.configs.base,
  {
    files: LINT_FILES,
    plugins: {
      "@eslint-community/eslint-comments": eslintComments,
      local: localPlugin,
    },
    // No directive or inline config applies here, so none can be unused; RF-51 is pass 1's.
    linterOptions: {
      reportUnusedDisableDirectives: "off",
      reportUnusedInlineConfigs: "off",
    },
    rules: UNSUPPRESSIBLE_RULES,
  },
  // RF-16 applies to components only, as in pass 1 (plan, section 6.4).
  { files: COMPONENT_FILES, rules: UNSUPPRESSIBLE_COMPONENT_RULES },
];
