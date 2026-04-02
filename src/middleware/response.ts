import type { NextFunction, Request, Response } from "express";
import { error, ok } from "../lib/response";

type WrappedBody = {
  status?: string;
};

type WrappedHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

function resolveRid(req: Request): string | undefined {
  const headerRid = req.headers["x-request-id"];
  const requestRid = req.id ?? req.rid;

  if (typeof requestRid === "string" && requestRid.length > 0) {
    return requestRid;
  }

  if (typeof headerRid === "string" && headerRid.length > 0) {
    return headerRid;
  }

  return undefined;
}

export function wrap(handler: WrappedHandler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rid = resolveRid(req);

    try {
      const result = await handler(req, res, next);

      if (res.headersSent) {
        return;
      }

      if (!result || typeof result !== "object" || !("status" in (result as WrappedBody))) {
        res.locals.__wrapped = true;
        return res.json(ok(result ?? null, rid));
      }

      res.locals.__wrapped = true;
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  };
}

export function okResponse(res: Response, data?: unknown, statusCode = 200): Response {
  res.locals.__wrapped = true;
  return res.status(statusCode).json(ok(data ?? null, (res.getHeader("x-request-id") as string | undefined) ?? undefined));
}

export function fail(res: Response, a: number | string, b?: string | number): Response {
  const rid = (res.getHeader("x-request-id") as string | undefined) ?? undefined;

  if (typeof a === "number") {
    const message = typeof b === "string" ? b : "Request failed";
    res.locals.__wrapped = true;
    return res.status(a).json(error(message, rid));
  }

  const message = a;
  const statusCode = typeof b === "number" ? b : 400;
  res.locals.__wrapped = true;
  return res.status(statusCode).json(error(message, rid));
}

export { okResponse as ok, error };
