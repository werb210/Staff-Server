// server/src/utils/jwt.ts
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "insecure-default";

export function signToken(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as any;
}
