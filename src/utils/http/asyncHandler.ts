import type { NextFunction, Request, Response } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction): Promise<void> =>
    Promise.resolve(fn(req, res, next)).then(() => undefined).catch(next);
