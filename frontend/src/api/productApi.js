import API from "./apiClient";

export const getProducts = async (params = {}) => {
  return API.get("/products/", { params });
};

export const getProductOptions = async ({ activeOnly = false } = {}) => {
  return API.get("/products/options", {
    params: {
      active_only: activeOnly,
    },
  });
};

export const getProductFormOptions = async () => {
  return API.get("/products/form-options");
};

export const addProduct = async (payload) => {
  return API.post("/products/add", payload);
};

export const bulkUploadProducts = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post("/products/bulk-upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getProductDetails = async (sku) => {
  return API.get(`/products/details/${sku}`);
};

export const updateProduct = async (sku, req_body) => {
  return API.put(`/products/update/${sku}`, req_body);
};

export const deleteProduct = async (req_body) => {
  return API.delete("/products/delete", { data: req_body });
};
