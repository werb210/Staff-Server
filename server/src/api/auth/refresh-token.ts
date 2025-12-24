import { Request, Response } from "express";
import { signAccessToken } from "../../services/jwt.service";

export function refreshToken(req: Request, res: Response) {
  const user = req.user as { id: string; email: string };

  const token = signAccessToken({
    sub: user.id,
    email: user.email,
  });

  res.json({ accessToken: token });
}
