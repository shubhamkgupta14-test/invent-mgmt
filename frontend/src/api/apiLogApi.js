import API from "./apiClient";

export const getApiLogs = async (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );

  return API.get("/api-logs/", { params });
};

export const getApiLogByTraceId = async (traceId) => {
  return API.get(`/api-logs/${traceId}`);
};

export const getApiTracingStatus = async () => {
  return API.get("/api-logs/tracing/status");
};

export const setApiTracingStatus = async (enabled) => {
  return API.put("/api-logs/tracing/status", null, { params: { enabled } });
};
