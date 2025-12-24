import type { Request, Response } from "express";

export function createUser(req: Request, res: Response) {
  res.json({ ok: true });
}

export default {
  createUser
};
