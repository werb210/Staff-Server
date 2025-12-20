import { AuthenticatedUser, TokenPayload } from "./auth.types";
import { jwtService } from "../services/jwt.service";

export interface AccessTokenResult {
  accessToken: string;
  accessExpiresAt: Date;
}

function buildPayload(user: AuthenticatedUser): TokenPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

export function createAccessToken(user: AuthenticatedUser): AccessTokenResult {
  const payload = buildPayload(user);
  const accessToken = jwtService.signAccessToken(payload);
  const decodedAccess = jwtService.decode(accessToken);
  const accessExpiresAt = decodedAccess?.exp ? new Date(decodedAccess.exp * 1000) : new Date();

  return { accessToken, accessExpiresAt };
}

export const tokenService = {
  createAccessToken,
};
