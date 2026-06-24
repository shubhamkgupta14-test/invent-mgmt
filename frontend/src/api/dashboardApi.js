import API from "./apiClient";

export const getDashboardSummary = async () => {
  return API.get("/dashboard/summary");
};

export const getLowStockProducts = async () => {
  return API.get("/dashboard/low-stock");
};

export const getRecentPurchases = async () => {
  return API.get("/dashboard/recent-purchases");
};

export const getRecentSales = async () => {
  return API.get("/dashboard/recent-sales");
};
