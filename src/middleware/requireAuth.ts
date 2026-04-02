import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ status: "error", error: "NO_TOKEN" });
  }

  const token = header.split(" ")[1];
  if (!token) {
    return res.status(401).json({ status: "error", error: "NO_TOKEN" });
  }
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(401).json({ status: "error", error: "INVALID_TOKEN" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ status: "error", error: "INVALID_TOKEN" });
  }
}

export default requireAuth;
