// Script behind `npm run lint`: runs both passes and fails on any error or warning (RF-52).
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));

// no-console is an error in lint/ too, so output goes straight to the streams (D26).
function out(text) {
  process.stdout.write(text);
}

function countProblems(results, key) {
  return results.reduce((sum, result) => sum + result[key], 0);
}

async function main() {
  const pass1 = new ESLint({
    cwd: PROJECT_ROOT,
    overrideConfigFile: "eslint.config.mjs",
  });
  // No directive or inline config can hide or lower an unsuppressible rule here (D10).
  const pass2 = new ESLint({
    cwd: PROJECT_ROOT,
    overrideConfigFile: "eslint.unsuppressible.config.mjs",
    allowInlineConfig: false,
  });

  // Pass 2 always runs, even when pass 1 fails, and it only has "error" rules.
  const results1 = await pass1.lintFiles(["."]);
  const results2 = ESLint.getErrorResults(await pass2.lintFiles(["."]));

  const formatter = await pass1.loadFormatter("stylish");
  out("Pass 1: all rules\n");
  out(await formatter.format(results1));
  out("Pass 2: unsuppressible rules, inline config ignored\n");
  out(await formatter.format(results2));

  const all = [...results1, ...results2];
  const errors =
    countProblems(all, "errorCount") + countProblems(all, "fatalErrorCount");
  // Only ESLint warnings count; npm, Node or deprecation notices never reach here (RF-52).
  const warnings = countProblems(results1, "warningCount");
  process.exitCode = errors > 0 || warnings > 0 ? 1 : 0;
}

try {
  await main();
} catch (error) {
  const detail =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${detail}\n`);
  process.exitCode = 2;
}
