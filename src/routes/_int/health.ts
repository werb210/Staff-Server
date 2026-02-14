import type { Request, Response } from "express";

export function intHealthHandler(_req: Request, res: Response): void {
  res.status(200).json({
    ok: true,
    status: "ok",
    version: process.env.APP_VERSION,
  });
}
