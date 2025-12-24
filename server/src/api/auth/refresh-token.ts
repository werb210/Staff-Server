import { Request, Response } from "express";
import jwt from "jsonwebtoken";

interface AccessTokenPayload {
  sub: string;
}

export default function refreshToken(req: Request, res: Response) {
  const token = req.cookies?.refresh_token;

  if (!token) {
    return res.status(401).json({ error: "No refresh token" });
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET!
  ) as AccessTokenPayload;

  const accessToken = jwt.sign(
    { sub: decoded.sub },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "15m" }
  );

  res.json({ accessToken });
}
