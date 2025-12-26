import { Request, Response } from "express";

export async function refreshToken(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({
    success: true,
    userId: req.user.id
  });
}
