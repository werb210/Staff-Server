import type { Request, Response } from "express";
import crypto from "crypto";
import {
  clearUserRefreshTokenHash,
  getUserByEmail,
  getUserById,
  setUserRefreshTokenHash,
} from "../services/user.service";
import type { AuthenticatedRequest } from "./auth.middleware";
import { comparePassword } from "./password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./jwt";

/* -------------------- helpers -------------------- */

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as const,
    path: "/",
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const baseOptions = getCookieOptions();

  res.cookie("access_token", accessToken, {
    ...baseOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refresh_token", refreshToken, {
    ...baseOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  const baseOptions = getCookieOptions();
  res.clearCookie("access_token", baseOptions);
  res.clearCookie("refresh_token", baseOptions);
}

/* -------------------- REQUIRED HEALTH -------------------- */
/**
 * MUST exist or frontend + curl checks fail
 */
export function status(_req: Request, res: Response) {
  return res.status(200).json({ ok: true });
}

/* -------------------- auth -------------------- */

export async function login(req: AuthenticatedRequest, res: Response) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await setUserRefreshTokenHash(user.id, hashRefreshToken(refreshToken));
  setAuthCookies(res, accessToken, refreshToken);

  return res.json({
    token: accessToken,
    refreshToken,
    user: { id: user.id, email: user.email },
  });
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  const refreshToken = req.cookies?.refresh_token ?? req.body?.refreshToken;

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await clearUserRefreshTokenHash(payload.userId);
    } catch {
      // ignore
    }
  }

  clearAuthCookies(res);
  return res.status(204).send();
}

export async function refresh(req: AuthenticatedRequest, res: Response) {
  const refreshToken = req.cookies?.refresh_token ?? req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Missing refresh token" });
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const user = await getUserById(payload.userId);
  if (!user || !user.refreshTokenHash) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const incomingHash = hashRefreshToken(refreshToken);
  if (
    !crypto.timingSafeEqual(
      Buffer.from(user.refreshTokenHash),
      Buffer.from(incomingHash),
    )
  ) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const newRefreshToken = signRefreshToken({
    userId: user.id,
    email: user.email,
  });

  await setUserRefreshTokenHash(user.id, hashRefreshToken(newRefreshToken));
  setAuthCookies(res, accessToken, newRefreshToken);

  return res.json({
    token: accessToken,
    refreshToken: newRefreshToken,
  });
}

export async function me(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({ user: req.user });
}
