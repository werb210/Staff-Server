// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";

import { jwtService } from "../services/jwt.service";
import { findUserById, mapAuthenticated } from "../services/user.service";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const publicRoutes: { path: string; methods: string[] }[] = [
    { path: "/api/auth/login", methods: ["POST", "OPTIONS"] },
    { path: "/api/auth/refresh", methods: ["POST", "OPTIONS"] },
  ];

  const requestPath = req.originalUrl || req.path;
  const isRouteLevelMiddleware = Boolean(req.baseUrl);

  const isPublicRoute =
    !isRouteLevelMiddleware &&
    publicRoutes.some(
      ({ path, methods }) =>
        methods.includes(req.method) &&
        (requestPath === path || requestPath.startsWith(`${path}?`)),
    );

  if (isPublicRoute) {
    return next();
  }

  const headerName = process.env.TOKEN_HEADER_NAME || "authorization";
  const authHeader = req.headers[headerName] as string | undefined;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);

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
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export default requireAuth;
