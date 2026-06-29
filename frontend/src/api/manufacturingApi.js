import API from "./apiClient";

export const getManufacturingRecords = async () => {
  return API.get("/manufacturing/");
};

export const createManufacturingRecord = async (payload) => {
  return API.post("/manufacturing/create", payload);
};
