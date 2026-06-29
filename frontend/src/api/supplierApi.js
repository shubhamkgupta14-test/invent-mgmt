import API from "./apiClient";

export const getSuppliers = async () => {
  return API.get("/suppliers/");
};

export const addSupplier = async (payload) => {
  return API.post("/suppliers/add", payload);
};

export const updateSupplier = async (supplierId, payload) => {
  return API.put(`/suppliers/update/${supplierId}`, payload);
};
