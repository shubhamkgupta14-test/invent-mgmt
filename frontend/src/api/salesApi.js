import API from "./apiClient";

export const getSales = async () => {
  return API.get("/sales");
};
