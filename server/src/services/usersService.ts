// server/src/services/usersService.ts
import bcrypt from "bcrypt";
import usersRepo from "../db/repositories/users.repo.js";

const mapUser = (user: any) => {
  if (!user) return null;
  const profile = (user.siloAccess as any)?.profile ?? {};
  return {
    id: user.id,
    email: user.email,
    firstName: profile.firstName ?? null,
    lastName: profile.lastName ?? null,
    role: profile.role ?? null,
    phone: profile.phone ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const usersService = {
  /**
   * Get all users ordered by creation date (newest first)
   */
  async list() {
    const list = await usersRepo.findMany();
    return (await list).sort((a: any, b: any) =>
      new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime(),
    ).map(mapUser);
  },

  /**
   * Get a single user by ID
   */
  async get(id: string) {
    const user = await usersRepo.findById(id);
    return mapUser(user);
  },

  /**
   * Create a new user (hashing password before persisting)
   */
  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
  }) {
    const hashed = await bcrypt.hash(data.password, 10);

    const created = await usersRepo.create({
      email: data.email,
      passwordHash: hashed,
      siloAccess: {
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          phone: data.phone ?? null,
        },
      },
    });

    return mapUser(created);
  },

  /**
   * Update an existing user; hashes password only when provided
   */
  async update(
    id: string,
    updates: Partial<{
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
      phone: string;
    }>,
  ) {
    const existing = await usersRepo.findById(id);
    if (!existing) return null;
    const profile = (existing.siloAccess as any)?.profile ?? {};

    const updatedProfile = {
      firstName: updates.firstName ?? profile.firstName ?? null,
      lastName: updates.lastName ?? profile.lastName ?? null,
      role: updates.role ?? profile.role ?? null,
      phone: updates.phone ?? profile.phone ?? null,
    };

    const dataToUpdate: Record<string, unknown> = {
      email: updates.email ?? existing.email,
      siloAccess: {
        ...(existing.siloAccess ?? {}),
        profile: updatedProfile,
      },
    };

    if (updates.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(updates.password, 10);
    }

    const updated = await usersRepo.update(id, dataToUpdate);
    return mapUser(updated);
  },

  /**
   * Delete a user by ID
   */
  async delete(id: string) {
    const deleted = await usersRepo.delete(id);
    return mapUser(deleted);
  },
};

export { usersService };
export default usersService;
