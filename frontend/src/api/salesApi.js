import API from "./apiClient";

export const getSales = async (params = {}) => {
  return API.get("/sales/", { params });
};

export const createSale = async (payload) => {
  return API.post("/sales/create", payload);
};
