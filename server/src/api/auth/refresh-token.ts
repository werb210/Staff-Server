// server/src/api/auth/refresh-token.ts

import { Request, Response } from "express";
import { signAccessToken, verifyAccessToken } from "../../services/jwt.service.js";

export function refreshToken(req: Request, res: Response) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = auth.slice(7);
  const payload = verifyAccessToken(token);

  const accessToken = signAccessToken({
    sub: payload.sub,
    email: payload.email,
  });

  res.json({ accessToken });
}
