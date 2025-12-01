// server/src/services/authService.ts
import bcrypt from "bcrypt";
import usersRepo from "../db/repositories/users.repo.js";
import { extractRoles, normalizeRole, normalizeSiloAccess, toAuthUser } from "../utils/userUtils.js";
import tokenService from "./tokenService.js";
import type { AuthUser, Role, SiloAccess } from "../types/user.js";

export interface RegisterInput {
  email: string;
  password: string;
  role?: Role | string;
  siloAccess?: SiloAccess;
}

export type SafeUser = AuthUser;

const buildUserPayload = (user: AuthUser) => ({
  userId: user.id,
  email: user.email,
  roles: user.roles,
  siloAccess: user.siloAccess,
});

const getSiloAccessFromInput = (input: RegisterInput, fallback?: SiloAccess) => {
  const fallbackRole = normalizeRole(input.role ?? null) ?? null;
  return normalizeSiloAccess(input.siloAccess ?? fallback ?? {}, fallbackRole ?? undefined);
};

export const authService = {
  async register(data: RegisterInput): Promise<SafeUser> {
    const siloAccess = getSiloAccessFromInput(data);
    const roles = extractRoles(siloAccess);
    if (roles.length === 0) {
      throw new Error("At least one valid role is required");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const created = await usersRepo.create({
      email: data.email,
      passwordHash,
      siloAccess,
    });

    const user = toAuthUser(created);
    if (!user) throw new Error("Failed to create user");
    return user;
  },

  async login(
    email: string,
    password: string,
  ): Promise<{ user: SafeUser; token: string }> {
    const [user] = await usersRepo.findMany({ email });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, (user as any).passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    const safeUser = toAuthUser(user);
    if (!safeUser) {
      throw new Error("Unable to sanitize user");
    }

    const token = tokenService.issue(buildUserPayload(safeUser));

    return { user: safeUser, token };
  },
};
