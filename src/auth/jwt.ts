import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import {
  getAccessTokenExpiresIn,
  getAccessTokenSecret,
  getJwtClockSkewSeconds,
} from "../config";
import { type Role, isRole } from "./roles";
import { type Capability, isCapability } from "./capabilities";

export type AccessTokenPayload = {
  sub: string;
  role: Role;
  tokenVersion: number;
  phone?: string | null;
  silo?: string;
  capabilities?: Capability[];
};

const JWT_ISSUER = "boreal-staff-server";
const JWT_AUDIENCE = "boreal-staff-portal";

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
  if (!secret || typeof secret !== "string") {
    throw new AccessTokenSigningError("JWT secret is missing or invalid");
  }
  return secret;
}

function validatePayload(payload: any): asserts payload is AccessTokenPayload {
  if (!payload || typeof payload !== "object") {
    throw new AccessTokenVerificationError("Token payload is not an object");
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new AccessTokenVerificationError("Token subject (sub) is invalid");
  }

  if (!isRole(payload.role)) {
    throw new AccessTokenVerificationError("Token role is invalid");
  }

  if (
    typeof payload.tokenVersion !== "number" ||
    !Number.isInteger(payload.tokenVersion)
  ) {
    throw new AccessTokenVerificationError("Token version is invalid");
  }

  if (
    payload.phone !== undefined &&
    payload.phone !== null &&
    typeof payload.phone !== "string"
  ) {
    throw new AccessTokenVerificationError("Token phone claim is invalid");
  }

  if (
    payload.silo !== undefined &&
    (typeof payload.silo !== "string" || payload.silo.trim().length === 0)
  ) {
    throw new AccessTokenVerificationError("Token silo claim is invalid");
  }

  if (
    payload.capabilities !== undefined &&
    (!Array.isArray(payload.capabilities) ||
      payload.capabilities.some((cap) => !isCapability(cap)))
  ) {
    throw new AccessTokenVerificationError(
      "Token capabilities claim is invalid"
    );
  }
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = requireJwtSecret();
  const expiresIn = getAccessTokenExpiresIn() as SignOptions["expiresIn"];

  try {
    return jwt.sign(payload, secret, {
      algorithm: "HS256",
      expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch (err) {
    throw new AccessTokenSigningError("Failed to sign access token");
  }
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = requireJwtSecret();

  let decoded: JwtPayload | string;

  try {
    decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      clockTolerance: getJwtClockSkewSeconds(),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    throw new AccessTokenVerificationError("Access token verification failed");
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new AccessTokenVerificationError("Decoded token is not an object");
  }

  validatePayload(decoded);

  return {
    sub: decoded.sub,
    role: decoded.role,
    tokenVersion: decoded.tokenVersion,
    phone: decoded.phone ?? null,
    silo: typeof decoded.silo === "string" ? decoded.silo : undefined,
  };
}
