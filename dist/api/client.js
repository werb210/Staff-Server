"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const apiClient = axios_1.default.create({
    baseURL: "https://server.boreal.financial/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});
// Attach bearer token to every request
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token");
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
exports.default = apiClient;
