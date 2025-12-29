import axios, { type InternalAxiosRequestConfig } from "axios";

const apiClient = axios.create({
  baseURL: "https://server.boreal.financial/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach bearer token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token");

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default apiClient;
