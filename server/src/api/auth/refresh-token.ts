import { Request, Response } from "express";
import { signAccessToken } from "../../services/jwt.service";

export function refreshToken(req: Request, res: Response) {
  const user = (req as any).user as { id: string; email: string } | undefined;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = signAccessToken({
    userId: user.id,
    email: user.email,
  });

  return res.json({ token });
}
