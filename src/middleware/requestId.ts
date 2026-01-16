import { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { AppError } from "./errors";
import { runWithRequestContext } from "./requestContext";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const headerId = req.get("x-request-id");
  const trimmedHeader = headerId ? headerId.trim() : "";
  const hasHeader = trimmedHeader.length > 0;
  const id = hasHeader ? trimmedHeader : randomUUID();
  const path = req.originalUrl.split("?")[0];
  const isAuthRoute = path.startsWith("/api/auth/");
  const isApplicationCreate = req.method === "POST" && path === "/api/applications";
  const requiresRequestId =
    MUTATION_METHODS.has(req.method) && !isAuthRoute && !isApplicationCreate;
  res.locals.requestId = id;
  res.locals.requestRoute = req.originalUrl;
  (req as Request & { id?: string }).id = id;
  res.setHeader("x-request-id", id);
  runWithRequestContext({ requestId: id, route: req.originalUrl, dbProcessIds: new Set() }, () => {
    if (requiresRequestId && !hasHeader) {
      next(
        new AppError(
          "missing_request_id",
          "X-Request-Id header is required.",
          400
        )
      );
      return;
    }
    next();
  });
}
