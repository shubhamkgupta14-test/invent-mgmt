import API from "./apiClient";

export const loginUser = async (data) => {
  const formData = new URLSearchParams();
  formData.append("username", data.username);
  formData.append("password", data.password);

  return API.post("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
};

export const logoutUser = async () => {
  return API.post("/auth/logout");
};

export const getCsrfToken = async () => {
  return API.get("/auth/csrf");
};

export const keepSessionAlive = async () => {
  return API.post("/auth/session/keep-alive");
};

export const requestPasswordResetOtp = async (identifier) => {
  return API.post("/auth/password-reset/request", { identifier });
};

export const verifyPasswordResetOtp = async (identifier, otp) => {
  return API.post("/auth/password-reset/verify-otp", { identifier, otp });
};

export const confirmPasswordReset = async (resetToken, newPassword) => {
  return API.post("/auth/password-reset/confirm", {
    reset_token: resetToken,
    new_password: newPassword,
  });
};
