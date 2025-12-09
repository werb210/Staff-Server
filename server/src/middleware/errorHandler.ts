import { NextFunction, Request, Response } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = (err as any)?.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: message });
}
