import API from "./apiClient";

export const getMaintenanceStatus = () => API.get("/maintenance/status");

export const getMaintenanceConfig = () => API.get("/maintenance/config");

export const updateMaintenanceConfig = (payload) =>
  API.put("/maintenance/config", payload);

