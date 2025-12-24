import type { Request, Response } from "express";
import { signAccessToken } from "../../services/jwt.service.js";

export function refreshToken(req: Request, res: Response) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = signAccessToken({
    userId: user.id,
    email: user.email,
  });

  res.json({ token });
}
