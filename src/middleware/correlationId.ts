import { type NextFunction, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-correlation-id"];
  const correlationId =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming
      : uuidv4();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
}
