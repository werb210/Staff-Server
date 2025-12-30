import jwt from "jsonwebtoken";

export interface JwtUserPayload {
  userId: string;
  email: string;
}

interface JwtTokenPayload extends JwtUserPayload {
  type: "access" | "refresh";
}

const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ??
  "15m") as jwt.SignOptions["expiresIn"];
const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ??
  "30d") as jwt.SignOptions["expiresIn"];

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is required");
  }

  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is required");
  }

  return secret;
}

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
  return jwt.sign({ ...payload, type: "access" }, getAccessSecret(), {
    expiresIn: accessExpiresIn,
  });
}

export function signRefreshToken(payload: JwtUserPayload): string {
  return jwt.sign({ ...payload, type: "refresh" }, getRefreshSecret(), {
    expiresIn: refreshExpiresIn,
  });
}

export function verifyAccessToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, getAccessSecret());
  if (!isJwtTokenPayload(decoded, "access")) {
    throw new Error("Invalid access token");
  }

  return { userId: decoded.userId, email: decoded.email };
}

export function verifyRefreshToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, getRefreshSecret());
  if (!isJwtTokenPayload(decoded, "refresh")) {
    throw new Error("Invalid refresh token");
  }

  return { userId: decoded.userId, email: decoded.email };
}
