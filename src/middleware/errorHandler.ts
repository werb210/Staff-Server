import { AppError } from "../utils/AppError";

export function errorHandler(err: any, req: any, res: any, next: any) {
  const status = err instanceof AppError ? err.status : 500;

  res.status(status).json({
    error: err.message || "Internal Server Error",
    path: req.originalUrl,
    method: req.method,
  });
}
