import API from "./apiClient";

export const getSales = async (params = {}) => {
  return API.get("/sales/", { params });
};

export const createSale = async (payload) => {
  return API.post("/sales/create", payload);
};

export const bulkUploadSales = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post("/sales/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
