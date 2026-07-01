const TOKEN_KEY = "token";
const EXPIRY_KEY = "token_expiry";
const USER_KEY = "current_user";
const LAST_PATH_KEY = "last_path";

export function setToken(token, expiresIn = 3600) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  const expiryTime = Date.now() + expiresIn * 1000; // Convert to milliseconds
  localStorage.setItem(EXPIRY_KEY, expiryTime);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isTokenExpired() {
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() > parseInt(expiry);
}

export function clearToken(lastPath = null) {
  if (lastPath && lastPath !== "/") {
    localStorage.setItem(LAST_PATH_KEY, lastPath);
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getLastPath() {
  return localStorage.getItem(LAST_PATH_KEY) || "/dashboard";
}

export function clearLastPath() {
  localStorage.removeItem(LAST_PATH_KEY);
}

export function getTokenWithExpiry() {
  const token = getToken();
  const isExpired = isTokenExpired();

  return { token, isExpired };
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

export function getUserFromToken(token = getToken()) {
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      user_id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
