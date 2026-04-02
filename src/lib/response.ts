import type { Response } from "express";

function ridFrom(res: Response): string | undefined {
  return (res.locals.requestId as string | undefined) ?? (res.getHeader("x-request-id") as string | undefined);
}

export function ok(res: Response, data: unknown): Response {
  res.locals.__wrapped = true;
  const rid = ridFrom(res);
  return res.status(200).json({ status: "ok", ...(rid ? { rid } : {}), data });
}

export function fail(res: Response, code: number, message: string, details?: unknown): Response {
  res.locals.__wrapped = true;
  const rid = ridFrom(res);
  return res.status(code).json({ status: "error", ...(rid ? { rid } : {}), error: message, ...(details !== undefined ? { details } : {}) });
}
