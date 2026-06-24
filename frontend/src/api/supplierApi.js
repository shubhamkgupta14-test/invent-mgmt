import API from "./apiClient";

export const getSuppliers = async () => {
  return API.get("/suppliers");
};
