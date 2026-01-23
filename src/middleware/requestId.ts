import { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { runWithRequestContext } from "./requestContext";

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const headerId = req.get("x-request-id");
  const trimmedHeader = headerId ? headerId.trim() : "";
  const id = trimmedHeader.length > 0 ? trimmedHeader : randomUUID();
  res.locals.requestId = id;
  res.locals.requestRoute = req.originalUrl;
  (req as Request & { id?: string }).id = id;
  res.setHeader("x-request-id", id);
  runWithRequestContext(
    {
      requestId: id,
      method: req.method,
      path: req.path,
      route: req.originalUrl,
      dbProcessIds: new Set(),
    },
    () => {
      next();
    }
  );
}
