import type { NextFunction, Request, Response } from "express";
import { fail } from "../system/response";

export function errorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  res.locals.__wrapped = true;

  return res.status(500).json(fail("INTERNAL_ERROR", ( _req as Request & { rid?: string }).rid));
}
