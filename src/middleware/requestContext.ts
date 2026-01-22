import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import { type Request, type Response, type NextFunction } from "express";

type Store = {
  requestId: string;
  route?: string;
  start: number;
  dbProcessIds: Set<number>;
  idempotencyKeyHash?: string;
};

export type RequestContext = {
  requestId: string;
  route?: string;
  start?: number;
  dbProcessIds?: Set<number>;
  idempotencyKeyHash?: string;
};

const storage = new AsyncLocalStorage<Store>();

export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ?? randomUUID();

  const store: Store = {
    requestId,
    route: req.originalUrl,
    start: Date.now(),
    dbProcessIds: new Set<number>(),
  };

  storage.run(store, () => {
    res.locals.requestId = requestId;
    res.locals.requestStart = store.start;
    res.setHeader("X-Request-Id", requestId);
    next();
  });
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function getRequestRoute(): string | undefined {
  return storage.getStore()?.route;
}

export function getRequestIdempotencyKeyHash(): string | undefined {
  return storage.getStore()?.idempotencyKeyHash;
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
    dbProcessIds: ctx.dbProcessIds ?? new Set<number>(),
    idempotencyKeyHash: ctx.idempotencyKeyHash,
  };

  const restore = (): void => {
    if (previous) {
      storage.enterWith(previous);
    }
  };

  const result = storage.run(store, fn);

  if (result instanceof Promise) {
    return result.finally(restore) as T;
  }

  restore();
  return result;
}

export function addRequestDbProcessId(processId: number): void {
  const store = storage.getStore();
  if (!store) return;
  store.dbProcessIds.add(processId);
}

export function removeRequestDbProcessId(processId: number): void {
  const store = storage.getStore();
  if (!store) return;
  store.dbProcessIds.delete(processId);
}

export function getRequestDbProcessIds(): number[] {
  const store = storage.getStore();
  return store ? Array.from(store.dbProcessIds) : [];
}

export function setRequestIdempotencyKeyHash(value: string): void {
  const store = storage.getStore();
  if (!store) return;
  store.idempotencyKeyHash = value;
}
