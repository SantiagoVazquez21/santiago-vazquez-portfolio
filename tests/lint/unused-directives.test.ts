import { fileURLToPath } from "node:url";
import { ESLint, type Linter } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";
import { ESLINT_WARM_UP_TIMEOUT_MS, warmUpEslint } from "./lint-both";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));

// Pass 1 is loaded by path: tests never import the .mjs lint files (plan, D12, D17).
const PASS_1 = new ESLint({
  cwd: PROJECT_ROOT,
  overrideConfigFile: "eslint.config.mjs",
});

const FILE_PATH = "src/lib/x.ts";

// Virtual files: nothing is written to disk, so the repo stays untouched.
async function lintPass1(code: string): Promise<ESLint.LintResult> {
  const [result] = await PASS_1.lintText(code, {
    filePath: FILE_PATH,
    warnIgnored: true,
  });
  if (result === undefined) {
    throw new Error(`ESLint returned no result for ${FILE_PATH}`);
  }
  return result;
}

// The native mechanism has no rule id, so no directive can name it (plan, D11).
function nativeReports(messages: Linter.LintMessage[]): Linter.LintMessage[] {
  return messages.filter((m) => m.ruleId === null);
}

// ESLint places the native report at the start of the comment it is about.
function positionOf(
  code: string,
  comment: string,
): { line: number; column: number } {
  const index = code.indexOf(comment);
  if (index === -1) {
    throw new Error(`Comment not found: ${comment}`);
  }
  const before = code.slice(0, index).split("\n");
  const lastLine = before.at(-1) ?? "";
  return { line: before.length, column: lastLine.length + 1 };
}

function reportsAt(
  messages: Linter.LintMessage[],
  code: string,
  comment: string,
): Linter.LintMessage[] {
  const { line, column } = positionOf(code, comment);
  return nativeReports(messages).filter(
    (m) => m.line === line && m.column === column,
  );
}

// This file builds its own pass 1, so that is the instance it warms up (plan, D33).
beforeAll(() => warmUpEslint([PASS_1]), ESLINT_WARM_UP_TIMEOUT_MS);

describe("pass 1: unused directives fail with the native error (RF-51)", () => {
  const UNUSED_DIRECTIVES = [
    [
      "eslint-disable-next-line, justified",
      "// eslint-disable-next-line no-console -- logs while debugging\nexport const value = 1;\n",
    ],
    [
      "eslint-disable-next-line, without justification",
      "// eslint-disable-next-line no-console\nexport const value = 1;\n",
    ],
    [
      "eslint-disable-line, justified",
      "export const value = 1; // eslint-disable-line no-console -- logs while debugging\n",
    ],
    [
      "eslint-disable for the file, justified",
      "/* eslint-disable no-console -- logs while debugging */\nexport const value = 1;\n",
    ],
  ] as const;

  it.each(UNUSED_DIRECTIVES)("reports %s", async (_name, code) => {
    const result = await lintPass1(code);
    const native = nativeReports(result.messages);
    expect(native).toHaveLength(1);
    expect(native[0]?.severity).toBe(2);
    expect(native[0]?.message).toContain("Unused eslint-disable directive");
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it("reports an inline config without effect", async () => {
    const result = await lintPass1(
      '/* eslint no-console: "error" -- already an error */\nexport const value = 1;\n',
    );
    const native = nativeReports(result.messages);
    expect(native).toHaveLength(1);
    expect(native[0]?.severity).toBe(2);
    expect(native[0]?.message).toContain("Unused inline config");
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it("reports a directive with two rules when only one of them fires", async () => {
    // prefer-const is active through the typescript-eslint preset and does not fire here.
    const result = await lintPass1(
      '// eslint-disable-next-line no-console, prefer-const -- logs while debugging\nconsole.log("x");\n',
    );
    const native = nativeReports(result.messages);
    expect(native).toHaveLength(1);
    expect(native[0]?.severity).toBe(2);
    expect(native[0]?.message).toContain("prefer-const");
    expect(result.messages.filter((m) => m.ruleId === "no-console")).toEqual(
      [],
    );
  });
});

describe("pass 1: used and justified directive (RF-48)", () => {
  it("does not report a directive that suppresses a real console.log", async () => {
    const result = await lintPass1(
      '// eslint-disable-next-line no-console -- the example rule is suppressed on purpose\nconsole.log("x");\n',
    );
    expect(result.messages).toEqual([]);
  });
});

describe("pass 1: no comment hides or lowers the native error (RF-51, decision 4 mutation 2)", () => {
  const UNUSED =
    "// eslint-disable-next-line no-console -- logs while debugging";
  const BODY = `${UNUSED}\nexport const value = 1;\n`;

  // Every variant keeps the original unused directive untouched, so it can be found by position.
  const VARIANTS = [
    [
      "file eslint-disable without rules",
      `/* eslint-disable -- hides it */\n${BODY}`,
    ],
    [
      "block eslint-disable without rules",
      `export const before = 1;\n/* eslint-disable -- hides it */\n${BODY}/* eslint-enable */\n`,
    ],
    [
      "eslint-disable-line without rules",
      `/* eslint-disable-line -- hides it */ ${UNUSED}\nexport const value = 1;\n`,
    ],
    [
      "eslint-disable-next-line without rules",
      `// eslint-disable-next-line -- hides it\n${BODY}`,
    ],
    [
      "file eslint-disable naming no-console",
      `/* eslint-disable no-console -- hides it */\n${BODY}`,
    ],
    [
      "block eslint-disable naming no-console",
      `export const before = 1;\n/* eslint-disable no-console -- hides it */\n${BODY}/* eslint-enable */\n`,
    ],
    [
      "eslint-disable-line naming no-console",
      `/* eslint-disable-line no-console -- hides it */ ${UNUSED}\nexport const value = 1;\n`,
    ],
    [
      "eslint-disable-next-line naming no-console",
      `// eslint-disable-next-line no-console -- hides it\n${BODY}`,
    ],
    [
      'inline config no-console: "warn"',
      `/* eslint no-console: "warn" -- lowers it */\n${BODY}`,
    ],
    [
      'inline config no-console: "off"',
      `/* eslint no-console: "off" -- turns it off */\n${BODY}`,
    ],
  ] as const;

  it.each(VARIANTS)("keeps the error with %s", async (_name, code) => {
    const result = await lintPass1(code);
    const original = reportsAt(result.messages, code, UNUSED);
    expect(original).toHaveLength(1);
    expect(original[0]?.severity).toBe(2);
    expect(original[0]?.message).toContain(
      "Unused eslint-disable directive (no problems were reported from 'no-console')",
    );
    expect(result.errorCount).toBeGreaterThan(0);
  });
});
