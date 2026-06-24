import API from "./apiClient";

export const getMyDetails = async () => {
  return API.get("/users/me");
};
