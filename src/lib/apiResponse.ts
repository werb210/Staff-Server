import type { ApiError, ApiSuccess } from "../types/api";

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function fail(_res: unknown, code: string, message?: string): ApiError {
  return {
    success: false,
    error: {
      message: message ?? code,
      code,
    },
  };
}
