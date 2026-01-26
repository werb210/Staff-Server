import type { Request, Response } from "express";

export function intHealthHandler(_req: Request, res: Response): void {
  try {
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(200).json({ status: "ok" });
  }
}
