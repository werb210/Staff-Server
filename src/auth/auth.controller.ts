import type { Request, Response } from "express";

import { getPool } from "../services/db";
import { comparePassword, hashPassword } from "./password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./jwt";
import type { AuthenticatedRequest } from "./auth.middleware";

interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  refresh_token_hash: string | null;
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function getRefreshTokenFromRequest(req: Request): string | null {
  const cookieToken = req.cookies?.refresh_token as string | undefined;
  if (cookieToken) {
    return cookieToken;
  }

  const bodyToken =
    (req.body?.refreshToken as string | undefined) ||
    (req.body?.refresh_token as string | undefined);
  return bodyToken ?? null;
}

async function fetchUserByEmail(email: string): Promise<UserRecord | null> {
  const pool = getPool();
  const result = await pool.query<UserRecord>(
    "SELECT id, email, password_hash, refresh_token_hash FROM users WHERE email = $1",
    [email],
  );

  return result.rows[0] ?? null;
}

async function storeRefreshTokenHash(userId: number, token: string) {
  const pool = getPool();
  const tokenHash = await hashPassword(token);
  await pool.query("UPDATE users SET refresh_token_hash = $1 WHERE id = $2", [
    tokenHash,
    userId,
  ]);
}

async function clearRefreshToken(userId: number) {
  const pool = getPool();
  await pool.query("UPDATE users SET refresh_token_hash = NULL WHERE id = $1", [
    userId,
  ]);
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const accessToken = signAccessToken({
    userId: String(user.id),
    email: user.email,
  });
  const refreshToken = signRefreshToken({
    userId: String(user.id),
    email: user.email,
  });

  await storeRefreshTokenHash(user.id, refreshToken);

  res.cookie("access_token", accessToken, getCookieOptions());
  res.cookie("refresh_token", refreshToken, getCookieOptions());

  return res.status(200).json({
    token: accessToken,
    user: {
      id: String(user.id),
      email: user.email,
    },
  });
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  const payload = verifyRefreshToken(refreshToken);
  const user = await fetchUserByEmail(payload.email);
  if (!user) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  await clearRefreshToken(user.id);

  res.clearCookie("access_token", getCookieOptions());
  res.clearCookie("refresh_token", getCookieOptions());

  return res.status(200).json({ ok: true });
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  const payload = verifyRefreshToken(refreshToken);
  const user = await fetchUserByEmail(payload.email);
  if (!user || !user.refresh_token_hash) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const tokenMatches = await comparePassword(
    refreshToken,
    user.refresh_token_hash,
  );
  if (!tokenMatches) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const accessToken = signAccessToken({
    userId: String(user.id),
    email: user.email,
  });
  const newRefreshToken = signRefreshToken({
    userId: String(user.id),
    email: user.email,
  });

  await storeRefreshTokenHash(user.id, newRefreshToken);

  res.cookie("access_token", accessToken, getCookieOptions());
  res.cookie("refresh_token", newRefreshToken, getCookieOptions());

  return res.status(200).json({ token: accessToken });
};

export const me = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.status(200).json({
    id: req.user.id,
    email: req.user.email,
  });
};

export const status = async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    return res.status(200).json({ status: "ok" });
  } catch (error) {
    return res.status(503).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
