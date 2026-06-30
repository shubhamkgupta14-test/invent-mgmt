import API from "./apiClient";

export const getSuppliers = async (params = {}) => {
  return API.get("/suppliers/", { params });
};

export const addSupplier = async (payload) => {
  return API.post("/suppliers/add", payload);
};

export const updateSupplier = async (supplierId, payload) => {
  return API.put(`/suppliers/update/${supplierId}`, payload);
};
