import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import { type Request, type Response, type NextFunction } from "express";

type Store = {
  requestId: string;
  route?: string;
  start: number;
};

export type RequestContext = {
  requestId: string;
  route?: string;
  start?: number;
};

const storage = new AsyncLocalStorage<Store>();

export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ?? randomUUID();

  storage.run(
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
  return storage.getStore()?.requestId;
}

export function getRequestRoute(): string | undefined {
  return storage.getStore()?.route;
}

export function runWithRequestContext<T>(
  ctx: RequestContext,
  fn: () => T
): T {
  const previous = storage.getStore();
  const store: Store = {
    requestId: ctx.requestId,
    route: ctx.route,
    start: ctx.start ?? Date.now(),
  };
  const restore = (): void => {
    if (previous) {
      storage.enterWith(previous);
    }
  };
  const result = storage.run(store, () => fn());
  if (result instanceof Promise) {
    return result.finally(restore) as T;
  }
  restore();
  return result;
}
