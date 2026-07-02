import API from "./apiClient";

export const getPurchases = async (params = {}) => {
  return API.get("/purchases/", { params });
};

export const createPurchase = async (payload) => {
  return API.post("/purchases/create", payload);
};

export const bulkUploadPurchases = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post("/purchases/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
