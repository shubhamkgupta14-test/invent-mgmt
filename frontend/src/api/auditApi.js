import API from "./apiClient";

export const getAuditLogs = async (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value),
  );

  return API.get("/audits/", { params });
};
