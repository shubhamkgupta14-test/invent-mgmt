import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CLEAN_OPTIONS,
  DEFAULT_CLEAN_COLLECTIONS,
} from "../../frontend/src/config/cleanupConfig.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("cleanup UI lists every backend cleanup key", () => {
  const backendConfig = readFileSync(
    path.join(root, "backend/app/config/collections.py"),
    "utf8",
  );
  const frontendKeys = CLEAN_OPTIONS.map(({ value }) => value);

  assert.equal(new Set(frontendKeys).size, frontendKeys.length);
  for (const key of frontendKeys) {
    assert.match(backendConfig, new RegExp(`["]${key}["]\\s*:`));
  }
  assert.equal(frontendKeys.length, 20);
});

test("default cleanup selection is conservative", () => {
  const allKeys = new Set(CLEAN_OPTIONS.map(({ value }) => value));
  assert.ok(DEFAULT_CLEAN_COLLECTIONS.length < CLEAN_OPTIONS.length / 2);
  assert.ok(DEFAULT_CLEAN_COLLECTIONS.every((key) => allKeys.has(key)));
  assert.equal(DEFAULT_CLEAN_COLLECTIONS.includes("users"), false);
  assert.equal(DEFAULT_CLEAN_COLLECTIONS.includes("products"), false);
  assert.equal(DEFAULT_CLEAN_COLLECTIONS.includes("company-settings"), false);
});

test("root package exposes replacement workflows and legacy launchers are removed", () => {
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  for (const script of ["dev", "start:dev", "start:test", "start:prod", "seed", "test"]) {
    assert.equal(typeof packageJson.scripts[script], "string");
  }

  for (const filename of ["run-dev.bat", "run-dev.sh", "run-test.bat"]) {
    assert.equal(existsSync(path.join(root, filename)), false);
  }
});
