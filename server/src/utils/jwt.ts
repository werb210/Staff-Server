// server/src/utils/jwt.ts
import { TokenPayload } from "../auth/auth.types";
import { jwtService } from "../services/jwt.service";

export function generateAccessToken(user: {
  id: string;
  email: string;
  role: string;
}): { token: string; payload: TokenPayload } {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as TokenPayload["role"],
  };

  return { token: jwtService.signAccessToken(payload), payload };
}

export function verifyAccessToken(token: string) {
  return jwtService.verifyAccessToken(token);
}
