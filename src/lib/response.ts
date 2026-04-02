import type { Response } from "express";
import { fail as failResponse, ok as okResponse } from "../utils/http/respond";

export function ok(res: Response, data: unknown): Response {
  return okResponse(res, data);
}

export function fail(res: Response, code: number, message: string, details?: unknown): Response {
  return failResponse(res, message, code, undefined, details);
}
