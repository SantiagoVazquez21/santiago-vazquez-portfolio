// Hand-written copy of the unsuppressible rules, shared by the lint tests. Tests never
// import the .mjs lint files (D12, D17), so eslint-config.test.ts compares this list with
// the calculated config and fails until a new rule is added here.

export const ANY_RULE = "@typescript-eslint/no-explicit-any";
export const RESTRICTED_TYPES_RULE = "@typescript-eslint/no-restricted-types";
export const TS_COMMENT_RULE = "@typescript-eslint/ban-ts-comment";
export const DESCRIPTION_RULE =
  "@eslint-community/eslint-comments/require-description";
export const NO_USE_RULE = "@eslint-community/eslint-comments/no-use";
export const RESTRICTED_DISABLE_RULE =
  "@eslint-community/eslint-comments/no-restricted-disable";
export const UNLIMITED_DISABLE_RULE =
  "@eslint-community/eslint-comments/no-unlimited-disable";
export const INLINE_CONFIG_RULE = "local/no-unsuppressible-inline-config";
export const HARDCODED_TEXT_RULE = "local/no-hardcoded-text";

export const UNSUPPRESSIBLE_RULE_IDS = [
  ANY_RULE,
  RESTRICTED_TYPES_RULE,
  TS_COMMENT_RULE,
  HARDCODED_TEXT_RULE,
  DESCRIPTION_RULE,
  NO_USE_RULE,
  UNLIMITED_DISABLE_RULE,
  RESTRICTED_DISABLE_RULE,
  INLINE_CONFIG_RULE,
];

// Unsuppressible rules that apply only to components (plan, section 6.4): everywhere
// else no pass configures them, although no directive or inline config may name them.
export const COMPONENT_ONLY_RULE_IDS = [HARDCODED_TEXT_RULE];

// A component under src/components/ and a page under src/app/ (spec, "Componente").
export const COMPONENT_PATHS = [
  "src/components/X.tsx",
  "src/app/[lang]/page.tsx",
];
