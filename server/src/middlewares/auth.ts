// server/src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import env from "../utils/env.js";
import { registry } from "../db/registry.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    silos: string[];
    name: string;
  };
}

export default async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = header.replace("Bearer ", "").trim();

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET as string);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = decoded.id;
    if (!userId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const user = await registry.users.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      silos: user.silos || [],
      name: user.name || "Unnamed User",
    };

    return next();
  } catch (err: any) {
    console.error("authMiddleware error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
