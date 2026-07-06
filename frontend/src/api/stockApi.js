import API from "./apiClient";

export const getStocks = async (params = {}) => {
  return API.get("/stocks/", { params });
};

export const calculateSellingPrice = async (payload) => {
  return API.post("/stocks/selling-price/calculate", payload);
};

export const updateStockActualPrice = async (sku, actualPrice) => {
  return API.patch(`/stocks/${sku}/actual-price`, {
    actual_price: Number(actualPrice || 0),
  });
};
