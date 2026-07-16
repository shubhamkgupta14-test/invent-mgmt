const USER_KEY = "current_user";
const CSRF_KEY = "csrf_token";
const LAST_PATH_KEY = "last_path";

export function clearAuthState(lastPath = null) {
  if (lastPath && lastPath !== "/") {
    localStorage.setItem(LAST_PATH_KEY, lastPath);
  }
  // Remove tokens left by versions that used JavaScript-readable storage.
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(CSRF_KEY);
}

export function setCsrfToken(token) {
  if (token) sessionStorage.setItem(CSRF_KEY, token);
}

export function getCsrfToken() {
  return sessionStorage.getItem(CSRF_KEY);
}

export function getLastPath() {
  return localStorage.getItem(LAST_PATH_KEY) || "/dashboard";
}

export function clearLastPath() {
  localStorage.removeItem(LAST_PATH_KEY);
}

export function setStoredUser(user, { notify = false } = {}) {
  if (!user) return;
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  if (notify && typeof window !== "undefined") {
    window.dispatchEvent(new Event("user:changed"));
  }
}

export function getStoredUser() {
  const user = sessionStorage.getItem(USER_KEY);
  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch {
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

