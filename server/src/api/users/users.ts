import { Request, Response } from "express";

export function createUser(req: Request, res: Response) {
  return res.status(201).json({ ok: true });
}
