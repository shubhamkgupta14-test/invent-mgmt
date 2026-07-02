import API from "./apiClient";

export const getSuppliers = async (params = {}) => {
  return API.get("/suppliers/", { params });
};

export const addSupplier = async (payload) => {
  return API.post("/suppliers/add", payload);
};

export const bulkUploadSuppliers = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post("/suppliers/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateSupplier = async (supplierId, payload) => {
  return API.put(`/suppliers/update/${supplierId}`, payload);
};
