// Single source of truth for both lint passes: files, ignores and unsuppressible rules.

export const LINT_FILES = ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"];

// Every TypeScript or JavaScript file under src/components/ or src/app/ is a component
// (spec, "Componente"), whether it renders markup or not.
export const COMPONENT_FILES = [
  "src/components/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
  "src/app/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
];

// node_modules is already ignored by ESLint. Nothing else may be added here (RF-60).
export const LINT_IGNORES = [
  ".next/**",
  "next-env.d.ts",
  "coverage/**",
  "out/**",
  "build/**",
  "docs/**",
  "specs/**",
  ".claude/**",
  ".agents/**",
];

// Rules that no directive or config may turn off or lower (spec, unsuppressible rule).
const BASE_UNSUPPRESSIBLE_RULES = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-restricted-types": [
    "error",
    {
      types: {
        object: { message: "Use a precise type or unknown plus validation." },
        Object: { message: "Use a precise type or unknown plus validation." },
        "{}": { message: "Use a precise type or unknown plus validation." },
      },
    },
  ],
  // Every TypeScript directive is banned, with or without a description (RF-14, RF-68).
  "@typescript-eslint/ban-ts-comment": [
    "error",
    {
      "ts-ignore": true,
      "ts-expect-error": true,
      "ts-nocheck": true,
      "ts-check": true,
    },
  ],
  // Suppressions need a justification after " -- " (RF-50). Declaration comments are
  // banned by no-use instead, and eslint-enable only closes a justified block.
  "@eslint-community/eslint-comments/require-description": [
    "error",
    {
      ignore: ["eslint-enable", "eslint-env", "exported", "global", "globals"],
    },
  ],
  // Declaration comments are banned, justified or not (RF-64).
  "@eslint-community/eslint-comments/no-use": [
    "error",
    {
      allow: [
        "eslint",
        "eslint-disable",
        "eslint-disable-line",
        "eslint-disable-next-line",
        "eslint-enable",
      ],
    },
  ],
};

const UNLIMITED_DISABLE_RULE =
  "@eslint-community/eslint-comments/no-unlimited-disable";
const RESTRICTED_DISABLE_RULE =
  "@eslint-community/eslint-comments/no-restricted-disable";
const INLINE_CONFIG_RULE = "local/no-unsuppressible-inline-config";

// Unsuppressible rules that apply to COMPONENT_FILES only (RF-16; plan, section 6.4).
export const UNSUPPRESSIBLE_COMPONENT_RULES = {
  "local/no-hardcoded-text": "error",
};

export const UNSUPPRESSIBLE_RULE_IDS = [
  ...Object.keys(BASE_UNSUPPRESSIBLE_RULES),
  ...Object.keys(UNSUPPRESSIBLE_COMPONENT_RULES),
  UNLIMITED_DISABLE_RULE,
  RESTRICTED_DISABLE_RULE,
  INLINE_CONFIG_RULE,
];

// A directive without a rule list, or a directive or inline config naming any
// unsuppressible rule (itself included), fails (RF-15), in every file. The component
// rules are left out here: each pass adds them in a COMPONENT_FILES block.
export const UNSUPPRESSIBLE_RULES = {
  ...BASE_UNSUPPRESSIBLE_RULES,
  [UNLIMITED_DISABLE_RULE]: "error",
  [RESTRICTED_DISABLE_RULE]: ["error", ...UNSUPPRESSIBLE_RULE_IDS],
  [INLINE_CONFIG_RULE]: ["error", { rules: UNSUPPRESSIBLE_RULE_IDS }],
};
