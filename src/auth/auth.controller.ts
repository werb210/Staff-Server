import type { Request, Response } from "express";
import crypto from "crypto";

import type { AuthenticatedRequest } from "./auth.middleware";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./jwt";
import { comparePassword, hashPasswordSync } from "./password";

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  refreshTokenHash?: string | null;
}

const defaultEmail = process.env.DEFAULT_AUTH_EMAIL ?? "staff@example.com";
const defaultPassword = process.env.DEFAULT_AUTH_PASSWORD ?? "password123";

const userStore: UserRecord[] = [
  {
    id: crypto.randomUUID(),
    email: defaultEmail,
    passwordHash: hashPasswordSync(defaultPassword),
    refreshTokenHash: null,
  },
];

function getUserByEmail(email: string): UserRecord | undefined {
  return userStore.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function getUserById(userId: string): UserRecord | undefined {
  return userStore.find((user) => user.id === userId);
}

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite: "lax" | "none" = isProduction ? "none" : "lax";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
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

export function status(_req: Request, res: Response) {
  return res.status(200).json({ ok: true });
}

export async function login(req: AuthenticatedRequest, res: Response) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const user = getUserByEmail(String(email));
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const matches = await comparePassword(String(password), user.passwordHash);
  if (!matches) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  user.refreshTokenHash = hashRefreshToken(refreshToken);
  setAuthCookies(res, accessToken, refreshToken);

  return res.json({
    token: accessToken,
    refreshToken,
    user: { id: user.id, email: user.email },
  });
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  const refreshToken = req.cookies?.refresh_token as string | undefined;

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = getUserById(payload.userId);
      if (user) {
        user.refreshTokenHash = null;
      }
    } catch {
      // ignore invalid refresh token
    }
  }

  clearAuthCookies(res);
  return res.status(204).send();
}

export async function refresh(req: AuthenticatedRequest, res: Response) {
  const refreshToken = req.cookies?.refresh_token as string | undefined;

  if (!refreshToken) {
    return res.status(401).json({ message: "Missing refresh token" });
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const user = getUserById(payload.userId);
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

  user.refreshTokenHash = hashRefreshToken(newRefreshToken);
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

  const user = getUserById(req.user.id);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({ user: { id: user.id, email: user.email } });
}
