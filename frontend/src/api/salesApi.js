import API from "./apiClient";

export const getSales = async () => {
  return API.get("/sales/");
};

export const createSale = async (payload) => {
  return API.post("/sales/create", payload);
};
