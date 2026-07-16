// Non-secret UI and local-development defaults.
export const APP_CONFIG = {
  bulkUploadMaxRows: 20,
};

export const configValue = (name, fallback) => APP_CONFIG[name] ?? fallback;
