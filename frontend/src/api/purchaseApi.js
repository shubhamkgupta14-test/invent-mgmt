import API from "./apiClient";

export const getPurchases = async () => {
  return API.get("/purchases/");
};

export const createPurchase = async (payload) => {
  return API.post("/purchases/create", payload);
};
