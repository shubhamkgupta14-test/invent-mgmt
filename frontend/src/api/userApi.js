import API from "./apiClient";
import { getStoredUser, setStoredUser } from "../utils/authUtils";

let currentUserPromise = null;

export const getMyDetails = async () => {
  const cachedUser = getStoredUser();

  if (cachedUser?.firstname || cachedUser?.lastname || cachedUser?.email) {
    return {
      data: {
        data: cachedUser,
      },
    };
  }

  if (!currentUserPromise) {
    currentUserPromise = API.get("/users/me")
      .then((response) => {
        setStoredUser(response.data.data);
        return response;
      })
      .finally(() => {
        currentUserPromise = null;
      });
  }

  return currentUserPromise;
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
