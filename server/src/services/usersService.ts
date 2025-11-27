// server/src/services/usersService.ts
import bcrypt from "bcrypt";
import { prisma } from "../db/index";

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  phone: true,
  createdAt: true,
};

const usersService = {
  /**
   * Get all users ordered by creation date (newest first)
   */
  async list() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: userSelect,
    });
  },

  /**
   * Get a single user by ID
   */
  async get(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
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

    return prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone ?? null,
      },
      select: userSelect,
    });
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
    const dataToUpdate: Record<string, unknown> = {
      email: updates.email,
      firstName: updates.firstName,
      lastName: updates.lastName,
      role: updates.role,
      phone: updates.phone,
    };

    if (updates.password) {
      dataToUpdate.password = await bcrypt.hash(updates.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { ...userSelect, updatedAt: true },
    });
  },

  /**
   * Delete a user by ID
   */
  delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
};

export { usersService };
export default usersService;
