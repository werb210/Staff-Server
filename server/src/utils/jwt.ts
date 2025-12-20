import jwt from "jsonwebtoken";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";

export function generateAccessToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: ACCESS_TTL },
  );
}

export function generateRefreshToken(user: { id: string }) {
  return jwt.sign(
    { sub: user.id },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: REFRESH_TTL },
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
    sub: string;
    email: string;
    role: string;
  };
}
