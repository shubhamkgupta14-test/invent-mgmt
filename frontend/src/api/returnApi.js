import API from "./apiClient";

export const getReturns = async () => {
  return API.get("/returns");
};

export const createReturn = async (payload) => {
  return API.post("/returns/create", payload);
};
