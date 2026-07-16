import { spawnSync } from "node:child_process";
import { parseEnvironmentArgs } from "./env-mode.mjs";
import { FRONTEND_DIR, npmExecutable } from "./process-utils.mjs";

const action = process.argv[2];
if (!["build", "preview"].includes(action)) {
  console.error("Frontend action must be build or preview.");
  process.exit(1);
}

try {
  const mode = parseEnvironmentArgs(process.argv.slice(3));
  const result = spawnSync(npmExecutable(), ["run", `${action}:${mode.name}`], {
    cwd: FRONTEND_DIR,
    env: { ...process.env, ENVIRONMENT: mode.backend },
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
