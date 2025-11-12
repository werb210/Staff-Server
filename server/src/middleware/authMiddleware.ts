import type { NextFunction, Request, Response } from "express";
import {
  getUserById,
  verifyAccessToken,
  type AuthenticatedUser,
} from "../services/authService.js";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const extractToken = (authorizationHeader: unknown): string | null => {
  if (!isNonEmptyString(authorizationHeader)) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
};

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const potentialHeader =
    req.headers.authorization ?? req.headers.Authorization;
  const token = extractToken(potentialHeader);

  if (!token) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  const secret = process.env.JWT_SECRET;
  if (!isNonEmptyString(secret)) {
    return res.status(500).json({ message: "Authentication not configured" });
  }

  try {
    const payload = verifyAccessToken(token, secret);
    const user = await getUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    (req as Request & { user?: AuthenticatedUser }).user = user;
    return next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized";
    return res.status(401).json({ message });
  }
};
