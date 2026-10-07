import type { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ESLINT_WARM_UP_TIMEOUT_MS,
  lintBoth,
  PASS_1,
  PASS_2,
  warmUpEslint,
} from "./lint-both";
import {
  COMPONENT_ONLY_RULE_IDS,
  COMPONENT_PATHS,
  RESTRICTED_DISABLE_RULE,
  UNLIMITED_DISABLE_RULE,
  UNSUPPRESSIBLE_RULE_IDS,
} from "./unsuppressible-rules";

const UNUSED_DISABLE_RULE =
  "@eslint-community/eslint-comments/no-unused-disable";
const NATIVE_OPTIONS = [
  "reportUnusedDisableDirectives",
  "reportUnusedInlineConfigs",
] as const;

// Plan, section 8: sources, components, pages, tests, lint tests and config files (RF-60).
const LOCATIONS = [
  "src/lib/x.ts",
  "src/components/X.tsx",
  "src/app/[lang]/page.tsx",
  "tests/lib/x.test.ts",
  "tests/lint/x.test.ts",
  "next.config.ts",
  "vitest.config.mts",
  "eslint.config.mjs",
  "lint/run.mjs",
  "scripts/next.mjs",
];

const PASSES = [
  ["pass 1", PASS_1],
  ["pass 2", PASS_2],
] as const;

interface CalculatedConfig {
  rules: Partial<Record<string, unknown[]>>;
  linterOptions: Partial<Record<string, unknown>>;
}

function recordOf(value: unknown, name: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value));
  }
  throw new Error(`calculateConfigForFile returned no ${name}`);
}

// calculateConfigForFile is typed as any and returns undefined for an ignored file,
// so the result is narrowed before use.
async function calculatedConfig(
  eslint: ESLint,
  filePath: string,
): Promise<CalculatedConfig> {
  const config = recordOf(
    await eslint.calculateConfigForFile(filePath),
    `config for ${filePath}`,
  );
  const rules = Object.fromEntries(
    Object.entries(recordOf(config.rules, "rules")).map(([ruleId, entry]) => [
      ruleId,
      Array.isArray(entry) ? entry : [entry],
    ]),
  );
  return {
    rules,
    linterOptions: recordOf(config.linterOptions, "linterOptions"),
  };
}

// ESLint loads its config, parser and plugins here, not in the first test (plan, D33).
beforeAll(() => warmUpEslint(), ESLINT_WARM_UP_TIMEOUT_MS);

describe.each(LOCATIONS)("RF-60 in %s", (filePath) => {
  it.each(PASSES)("is linted by %s", async (_pass, eslint) => {
    expect(await eslint.isPathIgnored(filePath)).toBe(false);
  });

  // Plan, section 8: local/no-hardcoded-text is checked only in the two components,
  // and nowhere else does any pass configure it (plan, section 6.4).
  const isComponent = COMPONENT_PATHS.includes(filePath);
  const appliedRuleIds = UNSUPPRESSIBLE_RULE_IDS.filter(
    (ruleId) => isComponent || !COMPONENT_ONLY_RULE_IDS.includes(ruleId),
  );

  it.each(PASSES)(
    "%s runs every unsuppressible rule that applies here with severity 2",
    async (_pass, eslint) => {
      const { rules } = await calculatedConfig(eslint, filePath);
      for (const ruleId of appliedRuleIds) {
        expect(rules[ruleId]?.[0], ruleId).toBe(2);
      }
    },
  );

  it.each(PASSES)(
    "%s configures the component-only rules only in components",
    async (_pass, eslint) => {
      const { rules } = await calculatedConfig(eslint, filePath);
      for (const ruleId of COMPONENT_ONLY_RULE_IDS) {
        expect(rules[ruleId]?.[0], ruleId).toBe(isComponent ? 2 : undefined);
      }
    },
  );

  it("pass 1 reports unused directives and inline configs as errors", async () => {
    const { linterOptions } = await calculatedConfig(PASS_1, filePath);
    for (const option of NATIVE_OPTIONS) {
      expect(linterOptions[option], option).toBe(2);
    }
  });

  // D11: the deprecated rule reports nothing in flat config, so it is never configured.
  it.each(PASSES)(
    "%s neither configures no-unused-disable nor lists it as unsuppressible",
    async (_pass, eslint) => {
      const { rules } = await calculatedConfig(eslint, filePath);
      const [, ...restricted] = rules[RESTRICTED_DISABLE_RULE] ?? [];
      expect(Object.keys(rules)).not.toContain(UNUSED_DISABLE_RULE);
      expect(restricted).not.toContain(UNUSED_DISABLE_RULE);
      expect(UNSUPPRESSIBLE_RULE_IDS).not.toContain(UNUSED_DISABLE_RULE);
    },
  );

  // Decision 4, mutation 2: pass 1 alone keeps the native error, so RF-51 does not
  // depend on pass 2, and both passes report the directive without a rule list.
  it("fails with an unused directive inside an eslint-disable-next-line without rules", async () => {
    const code =
      "// eslint-disable-next-line -- x\n// eslint-disable-next-line no-console -- x\nexport const value = 1;\n";
    const { exitCode, pass1, pass2 } = await lintBoth(code, filePath);
    expect(exitCode).toBe(1);
    const unused = pass1.messages.filter(
      (m) => m.ruleId === null && m.line === 2 && m.column === 1,
    );
    expect(unused).toHaveLength(1);
    expect(unused[0]?.severity).toBe(2);
    expect(unused[0]?.message).toContain(
      "Unused eslint-disable directive (no problems were reported from 'no-console')",
    );
    for (const result of [pass1, pass2]) {
      expect(
        result.messages.filter(
          (m) =>
            m.ruleId === UNLIMITED_DISABLE_RULE &&
            m.severity === 2 &&
            m.line === 1,
        ),
      ).toHaveLength(1);
    }
  });
});
