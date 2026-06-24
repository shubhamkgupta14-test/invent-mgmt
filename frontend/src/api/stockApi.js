import API from "./apiClient";

export const getStocks = async () => {
  return API.get("/stocks");
};
