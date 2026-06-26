import axios from "axios";

const TOKEN_KEY = "token";
const EXPIRY_KEY = "token_expiry";

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

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function getTokenWithExpiry() {
  const token = getToken();
  const isExpired = isTokenExpired();

  return { token, isExpired };
}
