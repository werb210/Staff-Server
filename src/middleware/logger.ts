import { type NextFunction, type Request, type Response } from "express";
import { logger } from "../server/utils/logger";

export default function requestLogMiddleware(req: Request, _res: Response, next: NextFunction): void {
  logger.info("request_received", { method: req.method, path: req.originalUrl });
  next();
}
