const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function resolveMediaUrl(url, fallback = "") {
  if (!url) return fallback;

  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  if (url.startsWith("/uploads/") && API_BASE_URL) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
}
