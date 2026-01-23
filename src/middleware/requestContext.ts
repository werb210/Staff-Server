import { type Request, type Response, type NextFunction } from "express";
import {
  getRequestContext,
  runWithRequestContext as runWithRequestContextMiddleware,
  type RequestContextInput,
  withRequestContext,
} from "../observability/requestContext";

export type RequestContext = {
  requestId: string;
  route?: string;
  start?: number;
  method?: string;
  path?: string;
  startTime?: number;
  sqlTraceEnabled?: boolean;
  dbProcessIds?: Set<number>;
  idempotencyKeyHash?: string;
};

export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  runWithRequestContextMiddleware(req, res, next);
}

export function getRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}

export function getRequestRoute(): string | undefined {
  return getRequestContext()?.path;
}

export function getRequestIdempotencyKeyHash(): string | undefined {
  return getRequestContext()?.idempotencyKeyHash;
}

export function runWithRequestContext<T>(
  ctx: RequestContext,
  fn: () => T
): T {
  const input: RequestContextInput = {
    requestId: ctx.requestId,
    method: ctx.method,
    path: ctx.path ?? ctx.route,
    startTime: ctx.startTime ?? ctx.start,
    sqlTraceEnabled: ctx.sqlTraceEnabled,
    dbProcessIds: ctx.dbProcessIds,
    idempotencyKeyHash: ctx.idempotencyKeyHash,
  };
  return withRequestContext(input, fn);
}

export function addRequestDbProcessId(processId: number): void {
  const store = getRequestContext();
  if (!store) return;
  if (!store.dbProcessIds) {
    store.dbProcessIds = new Set<number>();
  }
  store.dbProcessIds.add(processId);
}

export function removeRequestDbProcessId(processId: number): void {
  const store = getRequestContext();
  if (!store) return;
  store.dbProcessIds?.delete(processId);
}

export function getRequestDbProcessIds(): number[] {
  const store = getRequestContext();
  return store?.dbProcessIds ? Array.from(store.dbProcessIds) : [];
}

export function setRequestIdempotencyKeyHash(value: string): void {
  const store = getRequestContext();
  if (!store) return;
  store.idempotencyKeyHash = value;
}
