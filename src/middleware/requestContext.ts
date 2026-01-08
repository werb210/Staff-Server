// src/middleware/requestContext.ts
import { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";

const store = new AsyncLocalStorage<{
  requestId: string;
  route?: string;
  start: number;
}>();

import { AsyncLocalStorage } from "async_hooks";

export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ?? randomUUID();

  store.run(
    {
      requestId,
      route: req.originalUrl,
      start: Date.now(),
    },
    () => {
      res.locals.requestId = requestId;
      res.locals.requestStart = Date.now();
      res.setHeader("X-Request-Id", requestId);
      next();
    }
  );
}

export function getRequestId(): string | undefined {
  return store.getStore()?.requestId;
}

export function getRequestRoute(): string | undefined {
  return store.getStore()?.route;
}
