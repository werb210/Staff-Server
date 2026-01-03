import { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "crypto";

export function requestId(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const id = randomUUID();
  res.locals.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
