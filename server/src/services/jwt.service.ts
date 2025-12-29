import jwt from "jsonwebtoken";

export interface AccessTokenPayload {
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}
const jwtSecret = JWT_SECRET;

const JWT_EXPIRES_IN = "7d";

export function signJwt(payload: AccessTokenPayload): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: JWT_EXPIRES_IN });
}

function isAccessTokenPayload(
  decoded: string | jwt.JwtPayload,
): decoded is AccessTokenPayload {
  if (typeof decoded !== "object" || decoded === null) {
    return false;
  }

  const { email } = decoded as { email?: unknown };
  return typeof email === "string";
}

export function verifyJwt(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, jwtSecret);

  if (!isAccessTokenPayload(decoded)) {
    throw new Error("Invalid token payload");
  }

  return decoded;
}
