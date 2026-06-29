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
