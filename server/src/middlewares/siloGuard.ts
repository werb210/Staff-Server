import type { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
  interface Request {
    silo?: string;
  }
}

export const siloGuard = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers["x-silo"];
  const silo = typeof header === "string" ? header : undefined;
  req.silo = silo;
  next();
};
