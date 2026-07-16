import { spawn, spawnSync } from "node:child_process";
import {
  BACKEND_DIR,
  FRONTEND_DIR,
  npmExecutable,
  pythonExecutable,
} from "./process-utils.mjs";

const requestedMode = (process.argv[2] || "development").toLowerCase();
const modeAliases = { dev: "development", prod: "production" };
const mode = modeAliases[requestedMode] || requestedMode;
if (!["development", "test", "production"].includes(mode)) {
  console.error("Mode must be development, test, or production.");
  process.exit(1);
}

const environment = { ...process.env, ENVIRONMENT: mode };
const backendArgs = [
  "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000",
];
if (mode !== "production") backendArgs.push("--reload");

if (mode === "production") {
  const build = spawnSync(npmExecutable(), ["run", "build:prod"], {
    cwd: FRONTEND_DIR,
    env: environment,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const frontendArgs = mode === "production"
  ? ["run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
  : ["run", "dev", "--", "--mode", mode, "--host", "0.0.0.0", "--port", "5173"];

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
console.log("Backend: http://localhost:8000");
console.log("Frontend: http://localhost:5173");
