import API from "./apiClient";

export const getLoyaltyConfig = async () => {
  return API.get("/loyalty/config");
};

export const getLoyaltyRecords = async (params = {}) => {
  return API.get("/loyalty/", { params });
};

export const addLoyaltyOrder = async (payload) => {
  return API.post("/loyalty/orders", payload);
};

export const redeemLoyalty = async (payload) => {
  return API.post("/loyalty/redeem", payload);
};

export const cancelLoyalty = async (payload) => {
  return API.post("/loyalty/cancel", payload);
};
