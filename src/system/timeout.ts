import type { Request, Response, NextFunction } from "express";

export function timeout(ms = 15000) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const id = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({ status: "error", error: "TIMEOUT" });
      }
    }, ms);

    res.on("finish", () => clearTimeout(id));
    res.on("close", () => clearTimeout(id));

    next();
  };
}
