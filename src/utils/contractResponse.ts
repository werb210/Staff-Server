import { type Response } from "express";

export const send = {
  ok: (res: Response, data: Record<string, unknown> = { ok: true }) => res.json(data),
  error: (res: Response, status: number, msg: string) => res.status(status).json({ error: msg }),
};
