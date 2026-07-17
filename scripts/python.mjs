import { spawnSync } from "node:child_process";
import { ROOT_DIR, pythonExecutable } from "./process-utils.mjs";

const result = spawnSync(pythonExecutable(), process.argv.slice(2), {
  cwd: ROOT_DIR,
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
