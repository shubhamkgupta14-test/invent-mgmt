import { existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { relative, resolve } from "node:path";
import { ROOT_DIR } from "./process-utils.mjs";

const mode = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!["deps", "cache", "all"].includes(mode)) {
  console.error("Clean mode must be deps, cache, or all.");
  process.exit(1);
}

const removed = new Set();

function assertWorkspacePath(target) {
  const resolved = resolve(target);
  const pathFromRoot = relative(ROOT_DIR, resolved);
  if (!pathFromRoot || pathFromRoot.startsWith("..") || resolve(ROOT_DIR, pathFromRoot) !== resolved) {
    throw new Error(`Refusing to remove path outside the workspace: ${resolved}`);
  }
  return resolved;
}

function removeTarget(target) {
  const resolved = assertWorkspacePath(target);
  if (!existsSync(resolved) || removed.has(resolved)) return;
  console.log(`${dryRun ? "Would remove" : "Removing"}: ${relative(ROOT_DIR, resolved)}`);
  if (!dryRun) rmSync(resolved, { recursive: true, force: true, maxRetries: 3 });
  removed.add(resolved);
}

function findPythonCaches(directory) {
  if (!existsSync(directory) || lstatSync(directory).isSymbolicLink()) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (["__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", "htmlcov"].includes(entry.name)) {
        removeTarget(target);
      } else if (!["node_modules", ".venv", ".git", "dist"].includes(entry.name)) {
        findPythonCaches(target);
      }
    } else if (entry.name.endsWith(".pyc") || entry.name === ".coverage") {
      removeTarget(target);
    }
  }
}

if (mode === "deps" || mode === "all") {
  removeTarget(resolve(ROOT_DIR, "node_modules"));
  removeTarget(resolve(ROOT_DIR, "frontend", "node_modules"));
  removeTarget(resolve(ROOT_DIR, "backend", ".venv"));
}

if (mode === "cache" || mode === "all") {
  removeTarget(resolve(ROOT_DIR, "frontend", "dist"));
  removeTarget(resolve(ROOT_DIR, "frontend", ".eslintcache"));
  removeTarget(resolve(ROOT_DIR, "frontend", "node_modules", ".vite"));
  findPythonCaches(resolve(ROOT_DIR, "backend"));
  findPythonCaches(resolve(ROOT_DIR, "test"));
  findPythonCaches(resolve(ROOT_DIR, "dev-tools"));
}

console.log(dryRun ? "Dry run complete." : "Cleanup complete.");
