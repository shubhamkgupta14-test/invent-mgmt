import assert from "node:assert/strict";
import test from "node:test";

import {
  clearLastPath,
  clearAuthState,
  getLastPath,
  getCsrfToken,
  getStoredUser,
  setCsrfToken,
  setStoredUser,
} from "../../frontend/src/utils/authUtils.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();

function resetStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

test("clearAuthState removes cached user and remembers non-root path", () => {
  resetStorage();
  localStorage.setItem("token", "legacy-token");
  localStorage.setItem("token_expiry", "123");
  setStoredUser({ username: "admin" });
  setCsrfToken("csrf-value");

  clearAuthState("/inventory?sku=ABC");

  assert.equal(getStoredUser(), null);
  assert.equal(getCsrfToken(), null);
  assert.equal(localStorage.getItem("token"), null);
  assert.equal(localStorage.getItem("token_expiry"), null);
  assert.equal(getLastPath(), "/inventory?sku=ABC");
});

test("stored user handles invalid JSON gracefully", () => {
  resetStorage();
  sessionStorage.setItem("current_user", "{bad json");

  assert.equal(getStoredUser(), null);
  assert.equal(sessionStorage.getItem("current_user"), null);
});

test("last path defaults and can be cleared", () => {
  resetStorage();

  assert.equal(getLastPath(), "/dashboard");
  localStorage.setItem("last_path", "/sales");
  clearLastPath();
  assert.equal(getLastPath(), "/dashboard");
});
