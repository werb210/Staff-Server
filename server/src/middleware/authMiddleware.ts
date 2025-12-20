import { NextFunction, Request, Response } from "express";
import { requireAuth } from "./requireAuth";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, next);
}
