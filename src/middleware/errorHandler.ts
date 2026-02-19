import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error({ err }, "Request failed");

  return res.status(500).json({
    error: "Internal Server Error",
  });
}
