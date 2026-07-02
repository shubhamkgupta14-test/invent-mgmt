import API from "./apiClient";
import { getStoredUser, setStoredUser } from "../utils/authUtils";

let currentUserPromise = null;

export const getMyDetails = async ({ force = false } = {}) => {
  const cachedUser = getStoredUser();

  if (!force && (cachedUser?.firstname || cachedUser?.lastname || cachedUser?.email)) {
    return {
      data: {
        data: cachedUser,
      },
    };
  }

  if (force) {
    return API.get("/users/me").then((response) => {
      if (response.data?.data) {
        setStoredUser(response.data.data);
      }
      return response;
    });
  }

  if (!currentUserPromise) {
    currentUserPromise = API.get("/users/me")
      .then((response) => {
        if (response.data?.data) {
          setStoredUser(response.data.data);
        }
        return response;
      })
      .finally(() => {
        currentUserPromise = null;
      });
  }

  return currentUserPromise;
};

export const changePassword = async (payload) => {
  return API.patch("/users/password", payload);
};

export const updateMyProfile = async (payload) => {
  return API.patch("/users/me", payload).then((response) => {
    if (response.data?.data) {
      setStoredUser(response.data.data, { notify: true });
    }
    return response;
  });
};

export const uploadMyProfileImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post("/users/me/profile-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }).then((response) => {
    if (response.data?.data) {
      setStoredUser(response.data.data, { notify: true });
    }
    return response;
  });
};

export const resetMyProfileImage = async () => {
  return API.delete("/users/me/profile-image").then((response) => {
    if (response.data?.data) {
      setStoredUser(response.data.data, { notify: true });
    }
    return response;
  });
};

export const requestEmailVerification = async () => {
  return API.post("/users/email-verification/request");
};

export const verifyEmail = async (otp) => {
  return API.post("/users/email-verification/verify", { otp }).then((response) => {
    setStoredUser(response.data.data, { notify: true });
    return response;
  });
};

export const createUser = async (payload) => {
  return API.post("/users/create", payload);
};

export const getUserDetails = async (username) => {
  return API.post("/users/details", { username });
};

export const getUsers = async (params = {}) => {
  return API.get("/users/", { params });
};

export const updateUserRole = async (username, role) => {
  return API.patch("/users/role", { username, role });
};

export const activateUser = async (username) => {
  return API.patch("/users/activate", { username });
};

export const deleteUser = async (username, permanent = false) => {
  return API.delete("/users/delete", {
    data: { username, permanent },
  });
};

export const cleanDatabase = async (collections) => {
  return API.delete("/users/clean-db", {
    data: { collections },
  });
};
