import { resolve } from "node:path";

export const ROOT_DIR = resolve(import.meta.dirname, "..");
export const BACKEND_DIR = resolve(ROOT_DIR, "backend");
export const FRONTEND_DIR = resolve(ROOT_DIR, "frontend");

export function pythonExecutable() {
  // An activated virtualenv already places its Python first on PATH. PYTHON_BIN
  // supports deployments that want to select an interpreter explicitly.
  return process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
}

export function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
