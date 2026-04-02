import type { ApiResponse } from "@boreal/shared-contract";

export function ok<T>(data: T): ApiResponse<T> {
  return { status: "ok", data };
}

export function fail(_res: unknown, code: string, message?: string): ApiResponse<never> {
  return {
    status: "error",
    error: message ?? code,
  };
}
