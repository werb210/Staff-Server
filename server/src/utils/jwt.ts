// server/src/utils/jwt.ts
import jwt from "jsonwebtoken";
import { ENV } from "./env";

const getSecret = (): string => {
  if (!ENV.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return ENV.JWT_SECRET;
};

export function signToken(payload: object) {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getSecret()) as any;
}
