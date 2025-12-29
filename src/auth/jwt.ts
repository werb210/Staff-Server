import jwt from "jsonwebtoken";

export interface JwtUserPayload {
  userId: string;
  email: string;
}

interface JwtTokenPayload extends JwtUserPayload {
  type: "access" | "refresh";
}

const accessSecret = process.env.JWT_SECRET ?? "dev-secret";
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret";

const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ??
  "15m") as jwt.SignOptions["expiresIn"];
const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ??
  "30d") as jwt.SignOptions["expiresIn"];

function isJwtTokenPayload(
  decoded: unknown,
  expectedType: "access" | "refresh",
): decoded is JwtTokenPayload {
  if (typeof decoded !== "object" || decoded === null) {
    return false;
  }

  const payload = decoded as JwtTokenPayload;
  return (
    typeof payload.userId === "string" &&
    typeof payload.email === "string" &&
    payload.type === expectedType
  );
}

export function signAccessToken(payload: JwtUserPayload): string {
  return jwt.sign({ ...payload, type: "access" }, accessSecret, {
    expiresIn: accessExpiresIn,
  });
}

export function signRefreshToken(payload: JwtUserPayload): string {
  return jwt.sign({ ...payload, type: "refresh" }, refreshSecret, {
    expiresIn: refreshExpiresIn,
  });
}

export function verifyAccessToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, accessSecret);
  if (!isJwtTokenPayload(decoded, "access")) {
    throw new Error("Invalid access token");
  }

  return { userId: decoded.userId, email: decoded.email };
}

export function verifyRefreshToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, refreshSecret);
  if (!isJwtTokenPayload(decoded, "refresh")) {
    throw new Error("Invalid refresh token");
  }

  return { userId: decoded.userId, email: decoded.email };
}
