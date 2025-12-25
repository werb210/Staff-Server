import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { requireEnv } from "../env.js";

export interface AccessTokenPayload extends JwtPayload {
  email: string;
  userId: string;
}

const SIGN_OPTIONS: SignOptions = {
  expiresIn: "1h",
};

function getJwtSecret(): string {
  return requireEnv("JWT_SECRET");
}

function isAccessTokenPayload(payload: JwtPayload): payload is AccessTokenPayload {
  return (
    typeof payload.email === "string" && typeof payload.userId === "string"
  );
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), SIGN_OPTIONS);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());

  if (typeof decoded === "string") {
    throw new Error("Invalid JWT payload");
  }

  if (!isAccessTokenPayload(decoded)) {
    throw new Error("Invalid JWT payload");
  }

  return decoded;
}
