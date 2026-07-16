// Non-secret UI and local-development defaults.
export const APP_CONFIG = {
  bulkUploadMaxRows: 51,
  devServerHost: "localhost",
  devServerPort: 5173,
  apiProxyTarget: "http://localhost:8000",
};

export const configValue = (name, fallback) => APP_CONFIG[name] ?? fallback;
