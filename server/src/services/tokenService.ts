// server/src/services/tokenService.ts
import { signToken, verifyToken } from "../utils/jwt.js";
import type { Role, SiloAccess } from "../types/user.js";
import { ROLE_VALUES } from "../types/user.js";

export interface TokenPayload {
  userId: string;
  email: string;
  roles: Role[];
  siloAccess: SiloAccess;
}

const ensureRoles = (roles: unknown): Role[] => {
  if (!Array.isArray(roles)) return [];
  return Array.from(
    new Set(
      roles
        .map((role) => (typeof role === "string" ? role.toUpperCase() : ""))
        .filter((role): role is Role => ROLE_VALUES.includes(role as Role)),
    ),
  );
};

export const tokenService = {
  issue(payload: TokenPayload) {
    return signToken(payload);
  },

  verify(token: string): TokenPayload {
    const decoded = verifyToken(token) as Partial<TokenPayload> | string;
    if (!decoded || typeof decoded !== "object" || !decoded.userId || !decoded.email) {
      throw new Error("Invalid token payload");
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      siloAccess: (decoded.siloAccess ?? {}) as SiloAccess,
      roles: ensureRoles(decoded.roles),
    };
  },
};

export default tokenService;
