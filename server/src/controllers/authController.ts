import type { Request, Response } from "express";
import {
  authenticateUser,
  generateAccessToken,
  type AuthenticatedUser,
} from "../services/authService.js";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const secret = process.env.JWT_SECRET;
  if (!isNonEmptyString(secret)) {
    return res.status(500).json({ message: "Authentication not configured" });
  }

  const token = generateAccessToken(user, secret);
  return res.json({ token, user });
};

export const me = (req: Request, res: Response) => {
  const requestWithUser = req as Request & { user?: AuthenticatedUser };

  if (!requestWithUser.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({ user: requestWithUser.user });
};
