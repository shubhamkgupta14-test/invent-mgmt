import axios from "axios";
import { clearAuthState, getCsrfToken } from "../utils/authUtils";
import { createValidationToast } from "../utils/validationErrors";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Echo the session-scoped CSRF value in a header for state-changing requests.
API.interceptors.request.use(
  (config) => {
    const method = String(config.method || "get").toLowerCase();
    if (!["get", "head", "options"].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) config.headers["X-CSRF-Token"] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle 401 (token expiration/unauthorized)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (
      error.response?.status === 422 &&
      error.response?.data?.message === "Validation failed"
    ) {
      error.response.data.message = createValidationToast(
        error.response.data.data,
      );
    }

    if (error.response?.status === 401 && !isLoginRequest) {
      clearAuthState();
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export default API;
