import { type NextFunction, type Request, type Response } from "express";
import { AppError } from "./errors";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function requireRequestId(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }
  const headerId = req.get("x-request-id");
  if (!headerId || headerId.trim().length === 0) {
    next(
      new AppError(
        "missing_request_id",
        "x-request-id header is required for mutations.",
        400
      )
    );
    return;
  }
  next();
}
