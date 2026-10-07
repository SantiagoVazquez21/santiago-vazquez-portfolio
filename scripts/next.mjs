// Starts Next for `npm run dev`, `build` and `start` with telemetry disabled (RF-8; plan, D8).
// The variable is loaded into this process and inherited by Next and its workers, so
// nothing goes through NODE_OPTIONS, where Node rejects env file flags (plan, section 12).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

process.loadEnvFile(
  fileURLToPath(new URL("../next-telemetry.env", import.meta.url)),
);

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: "inherit",
});

const FORWARDED_SIGNALS = ["SIGINT", "SIGTERM"];

// On Windows, Ctrl+C already reaches Next through the shared console, and child.kill
// would end it abruptly. Listening still keeps this script alive until Next exits.
function forward(signal) {
  if (
    process.platform !== "win32" &&
    child.exitCode === null &&
    child.signalCode === null
  ) {
    child.kill(signal);
  }
}

for (const signal of FORWARDED_SIGNALS) {
  process.on(signal, forward);
}

child.on("error", (error) => {
  process.stderr.write(`Could not start Next: ${error.message}\n`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  for (const s of FORWARDED_SIGNALS) {
    process.off(s, forward);
  }
  if (signal) {
    // The caller sees the same signal that ended Next.
    process.kill(process.pid, signal);
  } else {
    process.exitCode = code ?? 1;
  }
});
