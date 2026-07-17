import API from "./apiClient";

export const getAdminAccessStatus = () => API.get("/admin-access/status");
export const beginAdminAccess = () => API.post("/admin-access/begin");
export const requestAdminOtp = () => API.post("/admin-access/request-otp");
export const verifyAdminOtp = (otp) =>
  API.post("/admin-access/verify-otp", { otp });
