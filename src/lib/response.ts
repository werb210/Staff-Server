import type { Response } from "express";
import { fail as failEnvelope, ok as okEnvelope } from "../system/response";

export function ok(res: Response, data: unknown): Response {
  res.locals.__wrapped = true;
  return res.status(200).json(okEnvelope(data, res.locals.requestId));
}

export function fail(res: Response, code: number, message: string): Response {
  res.locals.__wrapped = true;
  return res.status(code).json(failEnvelope(message, res.locals.requestId));
}
