import { Request, Response } from "express";

export function me(req: Request, res: Response) {
  return res.status(200).json(req.user);
}
