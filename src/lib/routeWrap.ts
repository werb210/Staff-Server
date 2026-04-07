import type { NextFunction, Request, Response } from "express";

export function wrap(fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req, res, next);
      if (result) {
        res.json(result);
      }
    } catch (err) {
      next(err);
    }
  };
}

export const routeWrap = wrap;
