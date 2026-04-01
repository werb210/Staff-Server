import type { Response } from "express";

export function ok(res: Response, data: unknown): Response {
  res.locals.__wrapped = true;
  return res.status(200).json({ status: "ok", data });
}

export function fail(res: Response, code: number, message: string): Response {
  res.locals.__wrapped = true;
  return res.status(code).json({
    status: "error",
    error: {
      code: String(code),
      message,
    },
  });
}
