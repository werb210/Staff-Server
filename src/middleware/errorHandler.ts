import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error({
    message: err?.message,
    stack: err?.stack,
    path: req.path,
  });

  res.status(err?.status || err?.statusCode || 500).json({
    error: "Internal Server Error",
  });
}
