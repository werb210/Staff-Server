import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { fail } from "../utils/http/respond";

export function validate<T>(schema: ZodSchema<T>, target: "body" | "params" | "query" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (target === "body") {
      const isUploadRoute = req.originalUrl.split("?")[0] === "/api/documents/upload";
      if (req.method === "POST" && !req.is("application/json") && !isUploadRoute) {
        return fail(res, "JSON body required", 415, "JSON_REQUIRED");
      }
    }

    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return fail(res, "Validation failed", 422, "VALIDATION_ERROR", result.error);
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
      if (!req.body || (req.body as Record<string, unknown>)[field] === undefined) {
        return fail(res, "Validation failed", 422, "VALIDATION_ERROR", { missingField: field });
      }
    }

    return next();
  };
}

export const validationErrorHandler = (
  err: { type?: string } | undefined,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err?.type === "validation") {
    return fail(res, "Validation failed", 422, "VALIDATION_ERROR");
  }

  return next(err);
};

export const validateBody = requireFields;
