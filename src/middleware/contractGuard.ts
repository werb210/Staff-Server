import { Request, Response, NextFunction } from "express";
import { fail } from "../lib/response";

export function requireFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter((f) => {
      const value = (req.body ?? {})[f];
      return !value || String(value).trim() === "";
    });

    if (missing.length > 0) {
      return res.status(400).json(fail("INVALID_INPUT", req.rid));
    }

    next();
  };
}
