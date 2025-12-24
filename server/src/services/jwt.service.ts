import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

export interface AccessTokenPayload extends JwtPayload {
  email: string;
  userId: string;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const SIGN_OPTIONS: SignOptions = {
  expiresIn: "1h",
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, SIGN_OPTIONS);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET as string);

  if (typeof decoded === "string") {
    throw new Error("Invalid JWT payload");
  }

  return decoded as AccessTokenPayload;
}
