import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

type EnvRecord = Record<string, string | undefined>;

type ApiEnvelope<T> = {
  message?: string;
  data?: T;
  [key: string]: unknown;
};

export interface ApiError extends Error {
  status: number;
  data?: unknown;
}

const runtimeEnv = (() => {
  const globalCandidate =
    typeof globalThis !== "undefined"
      ? ((globalThis as typeof globalThis & { __ENV__?: EnvRecord }).__ENV__ ?? null)
      : null;

  if (globalCandidate) {
    return globalCandidate;
  }

  if (typeof window !== "undefined") {
    const browserCandidate = (window as typeof window & { __ENV__?: EnvRecord }).__ENV__;
    if (browserCandidate) {
      return browserCandidate;
    }
  }

  return {} as EnvRecord;
})();

const getBaseUrl = () =>
  runtimeEnv.VITE_API_BASE_URL ??
  runtimeEnv.REACT_APP_API_BASE_URL ??
  runtimeEnv.API_BASE_URL ??
  process.env.REACT_APP_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  "http://localhost:5000";

export const httpClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    Accept: "application/json",
  },
});

const extractData = <T>(payload: unknown): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
};

const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiEnvelope<unknown>>;
    const message =
      (typeof axiosError.response?.data === "object"
        ? (axiosError.response?.data as ApiEnvelope<unknown>)?.message
        : undefined) ?? axiosError.message ?? "Request failed";
    const apiError = new Error(message) as ApiError;
    apiError.status = axiosError.response?.status ?? axiosError.status ?? 500;
    apiError.data = axiosError.response?.data;
    return apiError;
  }

  const fallback = new Error(
    error instanceof Error ? error.message : "Unknown error",
  ) as ApiError;
  fallback.status = 500;
  return fallback;
};

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const headers: AxiosRequestConfig["headers"] = {
    Accept: "application/json",
    ...config.headers,
  };

  if (config.data && !(config.data instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  try {
    const response: AxiosResponse<unknown> = await httpClient.request({
      ...config,
      headers,
    });
    return extractData<T>(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}
