import API from "./apiClient";

export const getManufacturingRecords = async (params = {}) => {
  return API.get("/manufacturing/", { params });
};

export const createManufacturingRecord = async (payload) => {
  return API.post("/manufacturing/create", payload);
};
