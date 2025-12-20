// server/src/middleware/auth.ts
import { NextFunction, Request, Response } from "express";

import { jwtService } from "../services/jwt.service";
import { findUserById, mapAuthenticated } from "../services/user.service";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);

  if (!bearerMatch) {
    return res.status(401).json({ error: "Authorization header must use Bearer scheme" });
  }

  const accessToken = bearerMatch[1]?.trim();

  if (!accessToken) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  try {
    const payload = jwtService.verifyAccessToken(accessToken);
    const userRecord = await findUserById(payload.userId);
    const user = mapAuthenticated(userRecord);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export default requireAuth;
