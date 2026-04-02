import type { Response } from "express";
import type { ApiResponse } from "../../types/api";

export function ok<T>(res: Response, data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data };
  res.locals.__wrapped = true;
  return res.status(status).json(body);
}

export function fail(
  res: Response,
  message: string,
  status = 400,
  code?: string,
  details?: unknown,
): Response {
  const body: ApiResponse<never> = {
    success: false,
    error: { message, code, details },
  };

  res.locals.__wrapped = true;
  return res.status(status).json(body);
}
