import { spawnSync } from "node:child_process";
import {
  BACKEND_DIR,
  FRONTEND_DIR,
  ROOT_DIR,
  npmExecutable,
  pythonExecutable,
} from "./process-utils.mjs";

const checks = [
  [pythonExecutable(), ["-m", "unittest", "discover", "-s", "test/backend", "-p", "test_*.py"], ROOT_DIR],
  [pythonExecutable(), ["-m", "pip", "check"], BACKEND_DIR],
  [npmExecutable(), ["test"], FRONTEND_DIR],
  [npmExecutable(), ["run", "lint"], FRONTEND_DIR],
  [npmExecutable(), ["run", "build"], FRONTEND_DIR],
];

for (const [command, args, cwd] of checks) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    shell: process.platform === "win32" && command === npmExecutable(),
    stdio: "inherit",
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("All checks passed.");
