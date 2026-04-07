import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { fail } from "../lib/response";

export function validate<T>(schema: ZodSchema<T>, target: "body" | "params" | "query" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (target === "body") {
      const isUploadRoute = req.originalUrl.split("?")[0] === "/api/documents/upload";
      if (req.method === "POST" && !req.is("application/json") && !isUploadRoute) {
        return res.status(415).json(fail("JSON_REQUIRED", req.rid));
      }
    }

    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return res.status(400).json(fail("INVALID_INPUT", req.rid));
    }

    Object.assign(req, { [target]: result.data });
    if (target === "body") {
      req.validated = result.data;
    }

    return next();
  };
}

export function requireFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      const value = req.body ? (req.body as Record<string, unknown>)[field] : undefined;
      if (!value || String(value).trim() === "") {
        return res.status(400).json(fail("INVALID_INPUT", req.rid));
      }
    }

    return next();
  };
}

export const validationErrorHandler = (
  err: { type?: string } | undefined,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err?.type === "validation") {
    return res.status(400).json(fail("INVALID_INPUT", req.rid));
  }

  return next(err);
};

export const validateBody = requireFields;
