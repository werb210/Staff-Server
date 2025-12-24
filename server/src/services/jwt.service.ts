import jwt, { JwtPayload } from "jsonwebtoken";

export interface AccessTokenPayload extends JwtPayload {
  email: string;
  userId: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token");
  }

  if (!("email" in decoded) || !("userId" in decoded)) {
    throw new Error("Invalid token payload");
  }

  return decoded as AccessTokenPayload;
}
