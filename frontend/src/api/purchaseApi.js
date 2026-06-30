import API from "./apiClient";

export const getPurchases = async (params = {}) => {
  return API.get("/purchases/", { params });
};

export const createPurchase = async (payload) => {
  return API.post("/purchases/create", payload);
};
