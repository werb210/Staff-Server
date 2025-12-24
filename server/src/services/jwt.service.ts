// server/src/services/jwt.service.ts

import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

/**
 * ENV
 * Fail fast if secret is missing so TS + runtime are aligned.
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

/**
 * Payload types
 */
export interface AccessTokenPayload extends JwtPayload {
  email: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  email: string;
}

/**
 * Options
 */
const ACCESS_OPTS: SignOptions = { expiresIn: "1h" };
const REFRESH_OPTS: SignOptions = { expiresIn: "30d" };

/**
 * Sign
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, ACCESS_OPTS);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, REFRESH_OPTS);
}

/**
 * Verify
 * jsonwebtoken typings return `string | JwtPayload`
 * We assert to our payload shape after runtime validation.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET as string);
  if (typeof decoded !== "object" || !("email" in decoded)) {
    throw new Error("Invalid access token payload");
  }
  return decoded as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET as string);
  if (typeof decoded !== "object" || !("email" in decoded)) {
    throw new Error("Invalid refresh token payload");
  }
  return decoded as RefreshTokenPayload;
}
