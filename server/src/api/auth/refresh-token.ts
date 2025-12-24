iimport { Request, Response } from "express";
import { signAccessToken } from "../../services/jwt.service.js";

export function refreshToken(req: Request, res: Response) {
  const { sub, email } = req.body;

  if (!sub || !email) {
    return res.status(400).json({ error: "Invalid refresh payload" });
  }

  const token = signAccessToken({ sub, email });
  res.json({ accessToken: token });
}
