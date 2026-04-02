import type { NextFunction, Request, Response } from "express";
import { fail } from "../utils/http/respond";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  const message = err instanceof Error ? err.message : "Unexpected server error";
  return fail(res, message, 500, "INTERNAL_ERROR", err);
}
