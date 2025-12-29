import jwt from "jsonwebtoken";

export interface AccessTokenPayload {
  email: string;
}

const jwtSecret = process.env.JWT_SECRET ?? "dev-secret";
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
