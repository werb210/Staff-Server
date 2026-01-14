import { type Response } from "express";

export function respondOk<T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>
): void {
  if (meta && Object.keys(meta).length > 0) {
    res.json({ ok: true, data, meta });
    return;
  }
  res.json({ ok: true, data });
}
