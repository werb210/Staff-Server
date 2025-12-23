import { Request, Response } from "express";
import { signAccessToken } from "../../services/jwt.service.js";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export async function refreshToken(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = signAccessToken({
    userId: req.user.id,
    email: req.user.email
  });

  res.json({ token });
}
