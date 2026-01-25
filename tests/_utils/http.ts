import axios, { type AxiosRequestConfig } from "axios";

const defaultBaseUrl = "https://api.staff.boreal.financial";

function resolveBaseUrl() {
  return process.env.TEST_BASE_URL || defaultBaseUrl;
}

async function request<T>(
  method: AxiosRequestConfig["method"],
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const response = await axios.request<T>({
    method,
    url,
    baseURL: resolveBaseUrl(),
    data: body,
    headers,
  });
  return response.data;
}

export function get<T>(url: string, headers?: Record<string, string>) {
  return request<T>("get", url, undefined, headers);
}

export function post<T>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  return request<T>("post", url, body, headers);
}

export function patch<T>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  return request<T>("patch", url, body, headers);
}

export function del<T>(url: string, headers?: Record<string, string>) {
  return request<T>("delete", url, undefined, headers);
}
