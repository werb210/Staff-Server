import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "15m") as string;

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export function signAccessToken(
  payload: AccessTokenPayload,
  options: SignOptions = {}
): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    ...options
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as AccessTokenPayload;
}
