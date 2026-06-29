import assert from "node:assert/strict";
import test from "node:test";

import {
  clearLastPath,
  clearToken,
  getLastPath,
  getStoredUser,
  getToken,
  getTokenWithExpiry,
  getUserFromToken,
  isTokenExpired,
  setStoredUser,
  setToken,
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
globalThis.atob = globalThis.atob || ((value) => Buffer.from(value, "base64").toString("binary"));

function resetStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

function createToken(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `header.${encodedPayload}.signature`;
}

test("setToken stores token and expiry state", () => {
  resetStorage();

  setToken("abc", 60);

  assert.equal(getToken(), "abc");
  assert.equal(isTokenExpired(), false);
  assert.deepEqual(getTokenWithExpiry(), { token: "abc", isExpired: false });
});

test("clearToken removes auth state and remembers non-root path", () => {
  resetStorage();
  setToken("abc", 60);
  setStoredUser({ username: "admin" });

  clearToken("/inventory?sku=ABC");

  assert.equal(getToken(), null);
  assert.equal(isTokenExpired(), true);
  assert.equal(getStoredUser(), null);
  assert.equal(getLastPath(), "/inventory?sku=ABC");
});

test("stored user handles invalid JSON gracefully", () => {
  resetStorage();
  sessionStorage.setItem("current_user", "{bad json");

  assert.equal(getStoredUser(), null);
  assert.equal(sessionStorage.getItem("current_user"), null);
});

test("getUserFromToken extracts expected user fields", () => {
  resetStorage();
  const token = createToken({
    sub: "user-1",
    username: "admin",
    role: "superadmin",
    ignored: true,
  });

  assert.deepEqual(getUserFromToken(token), {
    user_id: "user-1",
    username: "admin",
    role: "superadmin",
  });
});

test("last path defaults and can be cleared", () => {
  resetStorage();

  assert.equal(getLastPath(), "/dashboard");
  localStorage.setItem("last_path", "/sales");
  clearLastPath();
  assert.equal(getLastPath(), "/dashboard");
});
