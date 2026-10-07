import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));

// Both passes are loaded by path: tests never import the .mjs lint files (plan, D12, D17).
export const PASS_1 = new ESLint({
  cwd: PROJECT_ROOT,
  overrideConfigFile: "eslint.config.mjs",
});

// Pass 2 ignores every directive and inline config, so none can hide its reports (D10).
export const PASS_2 = new ESLint({
  cwd: PROJECT_ROOT,
  overrideConfigFile: "eslint.unsuppressible.config.mjs",
  allowInlineConfig: false,
});

// Only for the warm-up hook: the global testTimeout stays at 5 s (plan, D33).
export const ESLINT_WARM_UP_TIMEOUT_MS = 30_000;

// The first lintText of an instance loads its config, parser and plugins (~3 s), which
// in a parallel run could exceed the 5 s of the first test; a beforeAll pays it instead.
export async function warmUpEslint(
  instances: readonly ESLint[] = [PASS_1, PASS_2],
): Promise<void> {
  await Promise.all(
    instances.map((eslint) =>
      eslint.lintText("export {};\n", {
        filePath: "src/lib/warm-up.ts",
        warnIgnored: true,
      }),
    ),
  );
}

export interface BothPassesResult {
  pass1: ESLint.LintResult;
  // Raw result, warnings included, so a test can prove pass 2 has none of its own.
  pass2: ESLint.LintResult;
  exitCode: 0 | 1;
}

// Virtual files: nothing is written to disk, so the repo stays untouched.
async function lintWith(
  eslint: ESLint,
  code: string,
  filePath: string,
): Promise<ESLint.LintResult> {
  const [result] = await eslint.lintText(code, { filePath, warnIgnored: true });
  if (result === undefined) {
    throw new Error(`ESLint returned no result for ${filePath}`);
  }
  return result;
}

// Same exit rule as lint/run.mjs (plan, section 4.6): pass 2 only counts its errors.
export async function lintBoth(
  code: string,
  filePath: string,
): Promise<BothPassesResult> {
  const pass1 = await lintWith(PASS_1, code, filePath);
  const pass2 = await lintWith(PASS_2, code, filePath);
  const errors = [pass1, ...ESLint.getErrorResults([pass2])].reduce(
    (sum, result) => sum + result.errorCount + result.fatalErrorCount,
    0,
  );
  const warnings = pass1.warningCount;
  return { pass1, pass2, exitCode: errors > 0 || warnings > 0 ? 1 : 0 };
}
