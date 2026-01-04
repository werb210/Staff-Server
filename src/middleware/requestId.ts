import { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { runWithRequestContext } from "./requestContext";

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const headerId = req.get("x-request-id");
  const id = headerId && headerId.trim().length > 0 ? headerId : randomUUID();
  res.locals.requestId = id;
  res.setHeader("x-request-id", id);
  runWithRequestContext(id, () => {
    next();
  });
}
