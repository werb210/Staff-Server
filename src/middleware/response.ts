import type { Response } from "express";

export function successResponse(
  res: Response,
  data: Record<string, unknown> = {},
  message = "ok"
): Response {
  return res.status(200).json({ success: true, message, data });
}

export function errorResponse(
  res: Response,
  status = 500,
  error = "server_error"
): Response {
  return res.status(status).json({ success: false, error });
}
