import jwt, { type SignOptions } from "jsonwebtoken";
import {
  getAccessTokenExpiresIn,
  getAccessTokenSecret,
  getJwtClockSkewSeconds,
} from "../config";
import { type Role } from "./roles";

export type AccessTokenPayload = {
  sub: string;
  role: Role;
  tokenVersion: number;
  phone?: string | null;
};

export class AccessTokenSigningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessTokenSigningError";
  }
}

export class AccessTokenVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessTokenVerificationError";
  }
}

function requireJwtSecret(): string {
  const secret = getAccessTokenSecret();
  if (!secret) {
    throw new AccessTokenSigningError("JWT_SECRET is required");
  }
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = requireJwtSecret();
  const expiresIn = getAccessTokenExpiresIn() as SignOptions["expiresIn"];
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = requireJwtSecret();
  try {
    return jwt.verify(token, secret, {
      algorithms: ["HS256"],
      clockTolerance: getJwtClockSkewSeconds(),
    }) as AccessTokenPayload;
  } catch (err) {
    throw new AccessTokenVerificationError("Invalid access token");
  }
}
