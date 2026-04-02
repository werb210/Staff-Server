import type { Response } from "express";
import { error, ok } from "../lib/response";

function ridFrom(res: Response): string | undefined {
  return (res.locals.requestId as string | undefined) ?? (res.getHeader("x-request-id") as string | undefined);
}

export function okResponse(res: Response, data?: unknown, statusCode = 200): Response {
  res.locals.__wrapped = true;
  return res.status(statusCode).json(ok(data, ridFrom(res)));
}

export function fail(res: Response, statusCode: number, message: string): Response {
  res.locals.__wrapped = true;
  return res.status(statusCode).json(error(message, ridFrom(res)));
}

export { okResponse as ok, error };
