import API from "./apiClient";

export const getExchanges = async () => {
  return API.get("/exchanges/");
};

export const createExchange = async (payload) => {
  return API.post("/exchanges/create", payload);
};
