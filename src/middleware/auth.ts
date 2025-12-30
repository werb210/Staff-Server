import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h) {
    return res.status(401).json({ error: "no_token" });
  }

  try {
    const token = h.replace("Bearer ", "");
    (req as { user?: unknown }).user = jwt.verify(token, process.env.JWT_SECRET!);
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
