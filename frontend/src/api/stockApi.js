import API from "./apiClient";

export const getStocks = async (params = {}) => {
  return API.get("/stocks/", { params });
};

export const getStockByBarcode = async (barcode) => {
  return API.get(`/stocks/barcode/${encodeURIComponent(barcode)}`);
};

export const calculateSellingPrice = async (payload) => {
  return API.post("/stocks/selling-price/calculate", payload);
};

export const updateStockActualPrice = async (sku, actualPrice) => {
  return API.patch(`/stocks/${sku}/actual-price`, {
    actual_price: Number(actualPrice || 0),
  });
};

export const updateStockBarcode = async (sku, barcode) => {
  return API.patch(`/stocks/${sku}/barcode`, {
    barcode: String(barcode || "").trim(),
  });
};
