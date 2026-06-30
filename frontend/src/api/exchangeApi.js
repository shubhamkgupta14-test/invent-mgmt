import API from "./apiClient";

export const getExchanges = async (params = {}) => {
  return API.get("/exchanges/", { params });
};

export const createExchange = async (payload) => {
  return API.post("/exchanges/create", payload);
};
