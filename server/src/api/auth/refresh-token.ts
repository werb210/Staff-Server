import { signAccessToken } from "../../services/jwt.service.js";
import type { Request, Response } from "express";

export function refreshToken(req: Request, res: Response) {
  const user = req.user;
  const token = signAccessToken({
    userId: user.id,
    email: user.email,
  });

  res.json({ token });
}
