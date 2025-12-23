import { Request, Response } from "express";
import { signAccessToken } from "../../services/jwt.service.js";

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const user = req.user as { id: string; email: string };

  const token = signAccessToken({
    userId: user.id,
    email: user.email
  });

  res.json({ token });
}
