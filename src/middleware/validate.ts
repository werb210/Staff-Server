import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ObjectSchema } from "joi";
import { errorResponse } from "./response";

export function validateBody(schema: ObjectSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return errorResponse(
        res,
        400,
        error.details.map((detail) => detail.message).join("; ")
      );
    }
    next();
  };
}
