// server/src/services/usersService.ts
import bcrypt from "bcrypt";
import usersRepo from "../db/repositories/users.repo.js";
import { extractRoles, normalizeRole, normalizeSiloAccess, toAuthUser } from "../utils/userUtils.js";
import type { AuthUser, Role, SiloAccess } from "../types/user.js";

const sortByCreatedDesc = (a: AuthUser, b: AuthUser) =>
  new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime();

const usersService = {
  async listUsers() {
    const list = await usersRepo.findMany();
    const normalized = (await list)
      .map((user: any) => toAuthUser(user))
      .filter((user): user is AuthUser => Boolean(user));
    return normalized.sort(sortByCreatedDesc);
  },

  async getUser(id: string) {
    const user = await usersRepo.findById(id);
    return toAuthUser(user);
  },

  async findByEmail(email: string) {
    const [user] = await usersRepo.findMany({ email });
    return toAuthUser(user);
  },

  async createUser(data: {
    email: string;
    password: string;
    siloAccess?: SiloAccess;
    role?: Role | string;
  }) {
    const siloAccess = normalizeSiloAccess(
      data.siloAccess ?? {},
      normalizeRole(data.role ?? null) ?? undefined,
    );
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

    return toAuthUser(created);
  },

  async updateUser(
    id: string,
    updates: Partial<{
      email: string;
      password: string;
      siloAccess: SiloAccess;
      role: Role | string;
    }>,
  ) {
    const existing = await usersRepo.findById(id);
    if (!existing) return null;

    const existingSilo = normalizeSiloAccess((existing as any).siloAccess ?? {});
    const requestedRole = normalizeRole(updates.role ?? null);

    if (updates.role && !requestedRole) {
      throw new Error("Invalid role provided");
    }

    let siloInput = updates.siloAccess;
    if (!siloInput && requestedRole) {
      const existingKeys = Object.keys(existingSilo);
      if (existingKeys.length > 0) {
        siloInput = Object.fromEntries(existingKeys.map((key) => [key, { role: requestedRole }]));
      } else {
        siloInput = { default: { role: requestedRole } } as SiloAccess;
      }
    }

    const mergedSilo = normalizeSiloAccess(
      siloInput ?? existingSilo,
      requestedRole ?? undefined,
      siloInput ? existingSilo : {},
    );

    const roles = extractRoles(mergedSilo);
    if (roles.length === 0) {
      throw new Error("At least one valid role is required");
    }

    const dataToUpdate: Record<string, unknown> = {
      email: updates.email ?? (existing as any).email,
      siloAccess: mergedSilo,
    };

    if (updates.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(updates.password, 10);
    }

    const updated = await usersRepo.update(id, dataToUpdate);
    return toAuthUser(updated);
  },

  async deleteUser(id: string) {
    const deleted = await usersRepo.delete(id);
    return toAuthUser(deleted);
  },

  async changePassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await usersRepo.update(id, { passwordHash });
    return Boolean(updated);
  },

  async assignRoles(id: string, siloAccess: SiloAccess) {
    const normalized = normalizeSiloAccess(siloAccess ?? {});
    const roles = extractRoles(normalized);
    if (roles.length === 0) {
      throw new Error("At least one valid role is required");
    }

    const updated = await usersRepo.update(id, { siloAccess: normalized });
    return toAuthUser(updated);
  },
};

export { usersService };
export default usersService;
