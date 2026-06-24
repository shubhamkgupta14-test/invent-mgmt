import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

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
