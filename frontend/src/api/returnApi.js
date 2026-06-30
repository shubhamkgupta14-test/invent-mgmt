import API from "./apiClient";

export const getReturns = async (params = {}) => {
  return API.get("/returns/", { params });
};

export const createReturn = async (payload) => {
  return API.post("/returns/create", payload);
};
