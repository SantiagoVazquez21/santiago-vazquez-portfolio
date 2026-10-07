import type { ESLint, Linter } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ESLINT_WARM_UP_TIMEOUT_MS,
  lintBoth,
  PASS_1,
  PASS_2,
  warmUpEslint,
} from "./lint-both";

const INLINE_CONFIG_RULE = "local/no-unsuppressible-inline-config";
const RESTRICTED_DISABLE_RULE =
  "@eslint-community/eslint-comments/no-restricted-disable";
const FILE_PATH = "src/lib/x.ts";

// Each unsuppressible rule with a snippet that it reports, so the "problem present"
// cases really have the problem in the scope of the inline config (RF-15).
const RULE_PROBLEMS = [
  ["@typescript-eslint/no-explicit-any", "export const a: any = 1;"],
  ["@typescript-eslint/no-restricted-types", "export const a: object = {};"],
  ["@typescript-eslint/ban-ts-comment", "// @ts-check"],
  [
    "@eslint-community/eslint-comments/require-description",
    '// eslint-disable-next-line no-console\nconsole.log("a");',
  ],
  ["@eslint-community/eslint-comments/no-use", "/* global a */"],
  [
    "@eslint-community/eslint-comments/no-unlimited-disable",
    '// eslint-disable-next-line -- y\nconsole.log("a");',
  ],
  [
    RESTRICTED_DISABLE_RULE,
    "// eslint-disable-next-line @typescript-eslint/no-explicit-any -- y\nexport const a: any = 1;",
  ],
  [
    INLINE_CONFIG_RULE,
    '/* eslint @typescript-eslint/no-explicit-any: "off" -- y */',
  ],
] as const;

const SETTINGS = ['"off"', '"warn"'];
const JUSTIFICATIONS = [
  ["with justification", " -- x"],
  ["without justification", ""],
] as const;

const REST = "export const value = 1;\n";

const CASES = RULE_PROBLEMS.flatMap(([ruleId, problem]) =>
  SETTINGS.flatMap((setting) =>
    JUSTIFICATIONS.flatMap(([justified, description]) =>
      [
        ["with the problem", `${problem}\n`],
        ["without the problem", ""],
      ].map(
        ([present, body]) =>
          [
            `${ruleId}: ${setting}, ${justified}, ${present}`,
            ruleId,
            `/* eslint ${ruleId}: ${setting}${description} */\n${body ?? ""}${REST}`,
          ] as const,
      ),
    ),
  ),
);

// The comment turns this very rule off or down in pass 1, so only pass 2 (where
// ESLint ignores inline config) can report it as an error (D10).
function changesItself(ruleId: string): boolean {
  return ruleId === INLINE_CONFIG_RULE;
}

function reportsOn(
  messages: Linter.LintMessage[],
  ruleId: string,
): Linter.LintMessage[] {
  return messages.filter(
    (m) =>
      m.ruleId === INLINE_CONFIG_RULE &&
      m.severity === 2 &&
      m.line === 1 &&
      m.message.includes(`'${ruleId}'`),
  );
}

// ESLint loads its config, parser and plugins here, not in the first test (plan, D33).
beforeAll(() => warmUpEslint(), ESLINT_WARM_UP_TIMEOUT_MS);

describe("local/no-unsuppressible-inline-config (RF-15)", () => {
  it("generates every case: 8 rules, 2 settings, 2 justifications, 2 problems", () => {
    expect(CASES).toHaveLength(64);
    expect(CASES.filter(([, ruleId]) => changesItself(ruleId))).toHaveLength(8);
  });

  it.each(CASES)("fails with %s", async (_name, ruleId, code) => {
    const { exitCode, pass1, pass2 } = await lintBoth(code, FILE_PATH);
    expect(exitCode).toBe(1);
    expect(reportsOn(pass2.messages, ruleId)).toHaveLength(1);
    if (!changesItself(ruleId)) {
      expect(reportsOn(pass1.messages, ruleId)).toHaveLength(1);
    }
  });

  const OTHER_FORMS = [
    [
      "numeric severity 0",
      "/* eslint @typescript-eslint/no-explicit-any: 0 */",
    ],
    [
      "numeric severity 1",
      "/* eslint @typescript-eslint/no-explicit-any: 1 */",
    ],
    [
      "array with warn",
      '/* eslint @typescript-eslint/no-explicit-any: ["warn"] -- x */',
    ],
    [
      "new options at error",
      '/* eslint @typescript-eslint/no-explicit-any: ["error", { "fixToUnknown": true }] -- x */',
    ],
    [
      "quoted key",
      '/* eslint "@typescript-eslint/no-explicit-any": "off" -- x */',
    ],
    [
      "second key after a suppressible rule",
      '/* eslint no-console: "off", @typescript-eslint/no-explicit-any: "off" -- x */',
    ],
    [
      "comment over several lines",
      '/* eslint\n  @typescript-eslint/no-explicit-any: "off" -- x */',
    ],
  ] as const;

  it.each(OTHER_FORMS)("fails with %s", async (_name, comment) => {
    const { exitCode, pass1, pass2 } = await lintBoth(
      `${comment}\n${REST}`,
      FILE_PATH,
    );
    expect(exitCode).toBe(1);
    expect(
      reportsOn(pass1.messages, "@typescript-eslint/no-explicit-any"),
    ).toHaveLength(1);
    expect(
      reportsOn(pass2.messages, "@typescript-eslint/no-explicit-any"),
    ).toHaveLength(1);
  });

  const NOT_REPORTED = [
    [
      'no-console: "off"',
      '/* eslint no-console: "off" -- x */\nconsole.log("a");\n',
    ],
    [
      'no-console: "warn"',
      '/* eslint no-console: "warn" -- x */\nconsole.log("a");\n',
    ],
    [
      "an unsuppressible rule named only in the justification",
      '/* eslint no-console: "off" -- unlike @typescript-eslint/no-explicit-any */\nconsole.log("a");\n',
    ],
    [
      "an eslint-disable directive",
      '/* eslint-disable no-console -- x */\nconsole.log("a");\n',
    ],
    [
      "a line comment that looks like inline config",
      '// eslint @typescript-eslint/no-explicit-any: "off"\nexport const value = 1;\n',
    ],
  ] as const;

  it.each(NOT_REPORTED)("does not report %s", async (_name, code) => {
    const { pass1, pass2 } = await lintBoth(code, FILE_PATH);
    for (const result of [pass1, pass2]) {
      expect(
        result.messages.filter((m) => m.ruleId === INLINE_CONFIG_RULE),
      ).toEqual([]);
    }
  });
});

// calculateConfigForFile is typed as any, so its rules are narrowed before use.
function ruleEntry(config: unknown, ruleId: string): unknown[] {
  if (typeof config === "object" && config !== null && "rules" in config) {
    const rules: unknown = config.rules;
    if (typeof rules === "object" && rules !== null && ruleId in rules) {
      const entry: unknown = Object.entries(rules).find(
        ([id]) => id === ruleId,
      )?.[1];
      return Array.isArray(entry) ? entry : [entry];
    }
  }
  throw new Error(`calculateConfigForFile has no ${ruleId}`);
}

describe("local/no-unsuppressible-inline-config in the calculated config", () => {
  it.each([
    ["pass 1", PASS_1],
    ["pass 2", PASS_2],
  ] as const)(
    "is an error in %s with the unsuppressible rule list",
    async (_pass, eslint: ESLint) => {
      const config: unknown = await eslint.calculateConfigForFile(FILE_PATH);
      const [severity, options] = ruleEntry(config, INLINE_CONFIG_RULE);
      const [, ...restricted] = ruleEntry(config, RESTRICTED_DISABLE_RULE);
      expect(severity).toBe(2);
      expect(options).toEqual({ rules: restricted });
      expect(restricted).toContain(INLINE_CONFIG_RULE);
    },
  );
});
