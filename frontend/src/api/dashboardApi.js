import API from "./apiClient";

export const getDashboardSummary = async () => {
  return API.get("/dashboard/summary");
};
