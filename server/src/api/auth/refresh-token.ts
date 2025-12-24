import type { Request, Response } from "express";
import { signAccessToken } from "../../services/jwt.service.js";

export function refreshToken(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = signAccessToken({
    userId: req.user.id,
    email: req.user.email
  });

  res.json({ accessToken: token });
}
