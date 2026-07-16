import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  BACKEND_DIR,
  FRONTEND_DIR,
  envFileValue,
  npmExecutable,
  pythonExecutable,
} from "./process-utils.mjs";
import { parseEnvironmentArgs } from "./env-mode.mjs";

let selectedMode;
try {
  selectedMode = parseEnvironmentArgs();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const mode = selectedMode.backend;

const environment = { ...process.env, ENVIRONMENT: mode };
const environmentSuffix = selectedMode.name;
const backendEnvFile = resolve(
  BACKEND_DIR,
  environmentSuffix === "dev" ? ".env" : `.env.${environmentSuffix}`,
);
const backendPort = Number(envFileValue(backendEnvFile, "BACKEND_PORT", "8000"));
if (!Number.isInteger(backendPort) || backendPort < 1 || backendPort > 65535) {
  console.error(`Invalid BACKEND_PORT in ${backendEnvFile}`);
  process.exit(1);
}
const backendArgs = [
  "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", String(backendPort),
];
if (mode !== "production") backendArgs.push("--reload");

const deploymentMode = mode === "production";

if (deploymentMode) {
  const build = spawnSync(npmExecutable(), ["run", `build:${selectedMode.name}`], {
    cwd: FRONTEND_DIR,
    env: environment,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const frontendArgs = deploymentMode
  ? ["run", `preview:${selectedMode.name}`]
  : ["run", mode === "test" ? "dev:test" : "dev"];

const children = [
  spawn(pythonExecutable(), backendArgs, {
    cwd: BACKEND_DIR,
    env: environment,
    stdio: "inherit",
  }),
  spawn(npmExecutable(), frontendArgs, {
    cwd: FRONTEND_DIR,
    env: environment,
    shell: process.platform === "win32",
    stdio: "inherit",
  }),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(exitCode), 100).unref();
}

for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) stop(signal ? 1 : (code ?? 0));
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

console.log(`Starting inventory application in ${mode} mode.`);
console.log(`Backend: http://localhost:${backendPort}`);
console.log("Frontend: see the Vite URL above (configured by the selected env file)");
