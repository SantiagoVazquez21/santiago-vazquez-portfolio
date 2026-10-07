import type { ESLint, Linter } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ESLINT_WARM_UP_TIMEOUT_MS,
  lintBoth,
  PASS_1,
  PASS_2,
  warmUpEslint,
} from "./lint-both";
// The hand-written list (D12, D17); a test below compares it with the calculated config.
import {
  ANY_RULE,
  COMPONENT_ONLY_RULE_IDS,
  DESCRIPTION_RULE,
  NO_USE_RULE,
  RESTRICTED_DISABLE_RULE,
  RESTRICTED_TYPES_RULE,
  TS_COMMENT_RULE,
  UNLIMITED_DISABLE_RULE,
  UNSUPPRESSIBLE_RULE_IDS,
} from "./unsuppressible-rules";

// Virtual files: nothing is written to disk, so the repo stays untouched.
async function lintPass1(
  code: string,
  filePath: string,
): Promise<Linter.LintMessage[]> {
  const [result] = await PASS_1.lintText(code, { filePath, warnIgnored: true });
  if (result === undefined) {
    throw new Error(`ESLint returned no result for ${filePath}`);
  }
  return result.messages;
}

function errorsOf(
  messages: Linter.LintMessage[],
  ruleId: string,
): Linter.LintMessage[] {
  return messages.filter((m) => m.ruleId === ruleId && m.severity === 2);
}

// calculateConfigForFile is typed as any, so its rules are narrowed before use.
function rulesOf(config: unknown): Partial<Record<string, unknown[]>> {
  if (typeof config === "object" && config !== null && "rules" in config) {
    const rules: unknown = config.rules;
    if (typeof rules === "object" && rules !== null) {
      return Object.fromEntries(
        Object.entries(rules).map(([ruleId, entry]: [string, unknown]) => [
          ruleId,
          Array.isArray(entry) ? entry : [entry],
        ]),
      );
    }
  }
  throw new Error("calculateConfigForFile returned no rules");
}

// One TypeScript source, one test file and one TypeScript config file (decision 4).
const TS_LOCATIONS = ["src/lib/x.ts", "tests/lib/x.test.ts", "next.config.ts"];

// ESLint loads its config, parser and plugins here, not in the first test (plan, D33).
beforeAll(() => warmUpEslint(), ESLINT_WARM_UP_TIMEOUT_MS);

describe("pass 1: explicit any (RF-12)", () => {
  it.each(TS_LOCATIONS)("reports an explicit any in %s", async (filePath) => {
    const messages = await lintPass1(
      "export const value: any = 1;\n",
      filePath,
    );
    expect(errorsOf(messages, ANY_RULE)).toHaveLength(1);
  });
});

describe("pass 1: object, Object and {} as a type (RF-13)", () => {
  const TYPE_CASES = TS_LOCATIONS.flatMap((filePath) =>
    ["object", "Object", "{}"].map((type) => [type, filePath] as const),
  );

  it.each(TYPE_CASES)("reports %s in %s", async (type, filePath) => {
    const messages = await lintPass1(
      `export const value: ${type} = { a: 1 };\n`,
      filePath,
    );
    expect(errorsOf(messages, RESTRICTED_TYPES_RULE)).toHaveLength(1);
  });

  it("does not report an object value that is not a type", async () => {
    const messages = await lintPass1(
      "export const value: Record<string, number> = {};\n",
      "src/lib/x.ts",
    );
    expect(errorsOf(messages, RESTRICTED_TYPES_RULE)).toEqual([]);
  });
});

describe("pass 1: TypeScript directives (RF-14)", () => {
  // @ts-nocheck only counts before the first statement, so every directive goes first.
  const DIRECTIVES = [
    "// @ts-ignore",
    "// @ts-ignore because the value is checked elsewhere",
    "// @ts-expect-error",
    "// @ts-expect-error: the value is checked elsewhere",
    "// @ts-nocheck",
    "// @ts-nocheck legacy file",
  ];

  it.each(DIRECTIVES)("reports %s", async (directive) => {
    const messages = await lintPass1(
      `${directive}\nexport const value: number = 1;\n`,
      "src/lib/x.ts",
    );
    expect(errorsOf(messages, TS_COMMENT_RULE)).toHaveLength(1);
  });
});

describe("pass 1: @ts-check (RF-68)", () => {
  const CASES = ["src/lib/x.ts", "eslint.config.mjs"].flatMap((filePath) =>
    ["// @ts-check", "// @ts-check to catch typos"].map(
      (comment) => [comment, filePath] as const,
    ),
  );

  it.each(CASES)("reports %s in %s", async (comment, filePath) => {
    const messages = await lintPass1(
      `${comment}\nexport const value = 1;\n`,
      filePath,
    );
    expect(errorsOf(messages, TS_COMMENT_RULE)).toHaveLength(1);
  });
});

describe("pass 1: justification after ' -- ' (RF-50)", () => {
  // Each directive suppresses a real console.log, so only the missing justification can fail.
  const DIRECTIVES = [
    ["without justification", "// eslint-disable-next-line no-console"],
    [
      "with the reason but without ' -- '",
      "// eslint-disable-next-line no-console because the example rule is suppressed",
    ],
  ] as const;

  it.each(DIRECTIVES)(
    "reports a directive on no-console %s",
    async (_name, directive) => {
      const messages = await lintPass1(
        `${directive}\nconsole.log("x");\n`,
        "src/lib/x.ts",
      );
      expect(errorsOf(messages, DESCRIPTION_RULE)).toHaveLength(1);
    },
  );

  it("does not report a directive justified after ' -- '", async () => {
    const messages = await lintPass1(
      '// eslint-disable-next-line no-console -- the example rule is suppressed on purpose\nconsole.log("x");\n',
      "src/lib/x.ts",
    );
    expect(errorsOf(messages, DESCRIPTION_RULE)).toEqual([]);
  });
});

describe("pass 1: declaration comments (RF-64)", () => {
  const CASES = [
    "/* global x */",
    "/* global x -- declared on purpose */",
    "/* globals x */",
    "/* globals x -- declared on purpose */",
    "/* exported x */",
    "/* exported x -- declared on purpose */",
    "/* eslint-env node */",
    "/* eslint-env node -- declared on purpose */",
  ];

  it.each(CASES)("reports %s", async (comment) => {
    const messages = await lintPass1(
      `${comment}\nexport const value = 1;\n`,
      "src/lib/x.ts",
    );
    expect(errorsOf(messages, NO_USE_RULE)).toHaveLength(1);
  });
});

// Every RF-15 form is justified and has the next statement in its scope.
const FORMS = [
  ["eslint-disable", (body: string) => `/* eslint-disable ${body} */`],
  [
    "eslint-disable-line",
    (body: string) => `export const a = 1; // eslint-disable-line ${body}`,
  ],
  [
    "eslint-disable-next-line",
    (body: string) => `// eslint-disable-next-line ${body}`,
  ],
] as const;

function codeWith(directive: string): string {
  return `${directive}\nexport const value = 1;\n`;
}

const ALL_NAMED_CASES = FORMS.flatMap(([form, directive]) =>
  UNSUPPRESSIBLE_RULE_IDS.map(
    (ruleId) => [form, ruleId, directive(`${ruleId} -- x`)] as const,
  ),
);

const UNLIMITED_CASES = FORMS.map(
  ([form, directive]) => [form, directive("-- x")] as const,
);

const MIXED_CASE_CODE =
  '// eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any -- x\nconsole.log("x");\n';

// The 31 RF-15 cases of T13, T16 and T21, as [name, code], generated from the same hand-written list.
const RF15_CASES = [
  ...ALL_NAMED_CASES.map(
    ([form, ruleId, directive]) =>
      [`${form} naming ${ruleId}`, codeWith(directive)] as const,
  ),
  ...UNLIMITED_CASES.map(
    ([form, directive]) =>
      [`${form} without a rule list`, codeWith(directive)] as const,
  ),
  [
    "a directive naming a suppressible and an unsuppressible rule",
    MIXED_CASE_CODE,
  ] as const,
];

// In one pass these directives hide the report of the rule they name (D10), so they
// are checked with both passes. eslint-disable-next-line is not excluded: its report
// lands on the directive line, outside its own scope.
function hidesItsOwnReport(form: string, ruleId: string): boolean {
  return (
    (form === "eslint-disable" || form === "eslint-disable-line") &&
    ruleId === RESTRICTED_DISABLE_RULE
  );
}

const SELF_REFERENCING_CASES = ALL_NAMED_CASES.filter(([form, ruleId]) =>
  hidesItsOwnReport(form, ruleId),
);

describe("pass 1: directives on unsuppressible rules (RF-15)", () => {
  const NAMED_CASES = ALL_NAMED_CASES.filter(
    ([form, ruleId]) => !hidesItsOwnReport(form, ruleId),
  );

  it("excludes only the self-referencing directives from pass 1", () => {
    expect(SELF_REFERENCING_CASES.map(([, , directive]) => directive)).toEqual([
      `/* eslint-disable ${RESTRICTED_DISABLE_RULE} -- x */`,
      `export const a = 1; // eslint-disable-line ${RESTRICTED_DISABLE_RULE} -- x`,
    ]);
    // 27 named, 3 without a rule list and 1 mixed: 31 cases, 29 checked here.
    expect(ALL_NAMED_CASES).toHaveLength(27);
    expect(RF15_CASES).toHaveLength(31);
    expect(NAMED_CASES.length + UNLIMITED_CASES.length + 1).toBe(29);
  });

  it.each(NAMED_CASES)(
    "reports %s naming %s",
    async (_form, _ruleId, directive) => {
      const messages = await lintPass1(codeWith(directive), "src/lib/x.ts");
      expect(errorsOf(messages, RESTRICTED_DISABLE_RULE)).not.toEqual([]);
    },
  );

  it.each(UNLIMITED_CASES)(
    "reports %s without a rule list",
    async (_form, directive) => {
      const messages = await lintPass1(codeWith(directive), "src/lib/x.ts");
      expect(errorsOf(messages, UNLIMITED_DISABLE_RULE)).not.toEqual([]);
    },
  );

  it("reports a directive naming a suppressible and an unsuppressible rule", async () => {
    const messages = await lintPass1(MIXED_CASE_CODE, "src/lib/x.ts");
    expect(errorsOf(messages, RESTRICTED_DISABLE_RULE)).toHaveLength(1);
  });

  it("does not report a justified directive on a suppressible rule alone", async () => {
    const messages = await lintPass1(
      '// eslint-disable-next-line no-console -- x\nconsole.log("x");\n',
      "src/lib/x.ts",
    );
    expect(errorsOf(messages, RESTRICTED_DISABLE_RULE)).toEqual([]);
    expect(errorsOf(messages, UNLIMITED_DISABLE_RULE)).toEqual([]);
  });

  it("uses the same rule list as the calculated pass 1 config", async () => {
    await expectSameRuleList(PASS_1);
  });
});

async function expectSameRuleList(eslint: ESLint): Promise<void> {
  const rules = rulesOf(await eslint.calculateConfigForFile("src/lib/x.ts"));
  const [, ...restricted] = rules[RESTRICTED_DISABLE_RULE] ?? [];

  expect(new Set(UNSUPPRESSIBLE_RULE_IDS).size).toBe(
    UNSUPPRESSIBLE_RULE_IDS.length,
  );
  expect(new Set(restricted).size).toBe(restricted.length);
  expect([...restricted].sort()).toEqual([...UNSUPPRESSIBLE_RULE_IDS].sort());
  // src/lib/ is not a component: the component-only rules are listed but not configured.
  for (const ruleId of UNSUPPRESSIBLE_RULE_IDS) {
    expect(rules[ruleId]?.[0], ruleId).toBe(
      COMPONENT_ONLY_RULE_IDS.includes(ruleId) ? undefined : 2,
    );
  }
}

function errorsAtLine(
  messages: Linter.LintMessage[],
  ruleId: string,
  line: number,
): Linter.LintMessage[] {
  return errorsOf(messages, ruleId).filter((m) => m.line === line);
}

describe("pass 2: every unsuppressible rule, without exceptions (D30)", () => {
  it("uses the same rule list as the calculated pass 2 config", async () => {
    await expectSameRuleList(PASS_2);
  });
});

describe("both passes: directives on unsuppressible rules (RF-15)", () => {
  it.each(RF15_CASES)("fails with %s", async (_name, code) => {
    const { exitCode } = await lintBoth(code, "src/lib/x.ts");
    expect(exitCode).toBe(1);
  });

  it.each(SELF_REFERENCING_CASES)(
    "fails with %s naming %s and pass 2 reports it on the directive line",
    async (_form, _ruleId, directive) => {
      const { exitCode, pass2 } = await lintBoth(
        codeWith(directive),
        "src/lib/x.ts",
      );
      expect(exitCode).toBe(1);
      expect(
        errorsAtLine(pass2.messages, RESTRICTED_DISABLE_RULE, 1),
      ).toHaveLength(1);
    },
  );

  // Pass 1 may report nothing here (D10): the directive hides both rules it names.
  const ANY_COMBINATIONS = [
    [
      "eslint-disable",
      `/* eslint-disable ${RESTRICTED_DISABLE_RULE}, ${ANY_RULE} -- x */\nexport const value: any = 1;\n`,
      1,
      2,
    ],
    [
      "eslint-disable-line",
      `export const value: any = 1; // eslint-disable-line ${RESTRICTED_DISABLE_RULE}, ${ANY_RULE} -- x\n`,
      1,
      1,
    ],
  ] as const;

  it.each(ANY_COMBINATIONS)(
    "fails with %s naming no-restricted-disable and no-explicit-any over a real any",
    async (_form, code, directiveLine, anyLine) => {
      const { exitCode, pass2 } = await lintBoth(code, "src/lib/x.ts");
      expect(exitCode).toBe(1);
      // One report for each unsuppressible rule the directive names.
      expect(
        errorsAtLine(
          pass2.messages,
          RESTRICTED_DISABLE_RULE,
          directiveLine,
        ).map((m) => m.message),
      ).toEqual([
        `Disabling '${RESTRICTED_DISABLE_RULE}' is not allowed.`,
        `Disabling '${ANY_RULE}' is not allowed.`,
      ]);
      expect(errorsAtLine(pass2.messages, ANY_RULE, anyLine)).toHaveLength(1);
    },
  );
});

// Decision 4, mutations 1 and 3: each form names the rule and has the problem in its scope.
function formsAround(
  ruleId: string,
  problem: string,
): (readonly [string, string, number])[] {
  const rest = "export const value = 1;\n";
  return [
    [
      "eslint-disable",
      `/* eslint-disable ${ruleId} -- x */\n${problem}\n${rest}`,
      2,
    ],
    [
      "eslint-disable-line",
      `/* eslint-disable-line ${ruleId} -- x */ ${problem}\n${rest}`,
      1,
    ],
    [
      "eslint-disable-next-line",
      `// eslint-disable-next-line ${ruleId} -- x\n${problem}\n${rest}`,
      2,
    ],
    [
      'inline config "off"',
      `/* eslint ${ruleId}: "off" -- x */\n${problem}\n${rest}`,
      2,
    ],
  ];
}

const MUTATION_1 = formsAround(NO_USE_RULE, "/* global x */");
const MUTATION_3 = formsAround(TS_COMMENT_RULE, "// @ts-check");

describe("both passes: decision 4, mutation 1 (RF-15 on the RF-64 rule)", () => {
  it.each(MUTATION_1)(
    "fails with %s and pass 2 reports /* global x */ on its line",
    async (_form, code, problemLine) => {
      const { exitCode, pass2 } = await lintBoth(code, "src/lib/x.ts");
      expect(exitCode).toBe(1);
      expect(
        errorsAtLine(pass2.messages, NO_USE_RULE, problemLine),
      ).toHaveLength(1);
    },
  );
});

describe("both passes: decision 4, mutation 3 (RF-15 on the RF-68 rule)", () => {
  it.each(MUTATION_3)(
    "fails with %s and pass 2 reports // @ts-check on its line",
    async (_form, code, problemLine) => {
      const { exitCode, pass2 } = await lintBoth(code, "src/lib/x.ts");
      expect(exitCode).toBe(1);
      expect(
        errorsAtLine(pass2.messages, TS_COMMENT_RULE, problemLine),
      ).toHaveLength(1);
    },
  );
});

// Decision 4, mutation 2: no comment hides or lowers the native error (RF-51).
const UNUSED = "// eslint-disable-next-line no-console -- logs while debugging";
const UNUSED_BODY = `${UNUSED}\nexport const value = 1;\n`;

// The original unused directive is kept untouched, so its line and column are known.
const MUTATION_2 = [
  [
    "file eslint-disable without rules",
    `/* eslint-disable -- hides it */\n${UNUSED_BODY}`,
    2,
    1,
  ],
  [
    "eslint-disable-line without rules",
    `/* eslint-disable-line -- hides it */ ${UNUSED_BODY}`,
    1,
    39,
  ],
  [
    "eslint-disable-next-line without rules",
    `// eslint-disable-next-line -- hides it\n${UNUSED_BODY}`,
    2,
    1,
  ],
  [
    'inline config no-console: "warn"',
    `/* eslint no-console: "warn" -- x */\n${UNUSED_BODY}`,
    2,
    1,
  ],
] as const;

describe("both passes: decision 4, mutation 2 (RF-51)", () => {
  it.each(MUTATION_2)(
    "fails with %s and pass 1 keeps the native error",
    async (_form, code, line, column) => {
      expect(code.split("\n")[line - 1]?.indexOf(UNUSED)).toBe(column - 1);
      const { exitCode, pass1 } = await lintBoth(code, "src/lib/x.ts");
      expect(exitCode).toBe(1);
      const original = pass1.messages.filter(
        (m) => m.ruleId === null && m.line === line && m.column === column,
      );
      expect(original).toHaveLength(1);
      expect(original[0]?.severity).toBe(2);
      expect(original[0]?.message).toContain(
        "Unused eslint-disable directive (no problems were reported from 'no-console')",
      );
    },
  );
});

describe("both passes: a warning alone fails the lint (RF-52)", () => {
  it("fails with no-console lowered to warn and a console.log", async () => {
    const code = '/* eslint no-console: "warn" -- x */\nconsole.log("x");\n';
    const { exitCode, pass1, pass2 } = await lintBoth(code, "src/lib/x.ts");
    // The warning must be the only problem, so nothing else explains exit code 1.
    expect(pass1.errorCount + pass1.fatalErrorCount).toBe(0);
    expect(pass1.messages).toHaveLength(1);
    expect(pass1.messages[0]).toMatchObject({
      ruleId: "no-console",
      severity: 1,
      line: 2,
    });
    expect(pass2.messages).toEqual([]);
    expect(exitCode).toBe(1);
  });
});

describe("pass 2: no warnings of its own with allowInlineConfig: false", () => {
  // Every comment of this suite, plus inline config, declaration and TypeScript comments.
  const CODES = [
    ...RF15_CASES.map(([, code]) => code),
    ...MUTATION_1.map(([, code]) => code),
    ...MUTATION_2.map(([, code]) => code),
    ...MUTATION_3.map(([, code]) => code),
    '/* eslint no-console: "error" -- x */\nconsole.log("x");\n',
    "/* eslint-env node -- x */\n/* globals x */\n/* exported x */\nexport const value = 1;\n",
    "// @ts-ignore\n// @ts-expect-error\n// @ts-nocheck\nexport const value = 1;\n",
  ];

  it.each(CODES)("has no warnings in pass 2 for %j", async (code) => {
    const { pass2 } = await lintBoth(code, "src/lib/x.ts");
    expect(pass2.warningCount).toBe(0);
    expect(pass2.messages.filter((m) => m.severity !== 2)).toEqual([]);
  });
});
