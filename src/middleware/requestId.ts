import { randomUUID } from "crypto";
import { type NextFunction, type Request, type Response } from "express";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  req.id = randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
}
