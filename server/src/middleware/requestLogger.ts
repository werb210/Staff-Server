import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const message = `${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs.toFixed(2)}ms)`;
    if (res.statusCode >= 500) {
      console.error(message);
    } else if (res.statusCode >= 400) {
      console.warn(message);
    } else {
      console.info(message);
    }
  });
  next();
}
