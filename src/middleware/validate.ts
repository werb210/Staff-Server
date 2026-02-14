import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ObjectSchema } from "joi";
import { errorResponse } from "./response";

export function validateBody(schema: ObjectSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return errorResponse(
        res,
        400,
        error.details.map((detail) => detail.message).join("; ")
      );
    }
    req.body = value;
    next();
  };
}
