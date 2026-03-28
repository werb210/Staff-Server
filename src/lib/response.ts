import type { Response } from "express";

export function ok(res: Response, data: unknown): Response {
  if (data === undefined) {
    throw new Error("OK_RESPONSE_MISSING_DATA");
  }

  return res.status(200).send({ success: true, data });
}

export function fail(res: Response, error: string, code = 400): Response {
  if (!error) {
    throw new Error("FAIL_RESPONSE_MISSING_ERROR");
  }

  return res.status(code).send({ success: false, error });
}
