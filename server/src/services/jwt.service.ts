import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export interface AccessTokenPayload extends JwtPayload {
  email: string;
  userId: string;
}

const SIGN_OPTIONS: SignOptions = {
  expiresIn: "1h",
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, SIGN_OPTIONS);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }
  return decoded as AccessTokenPayload;
}
