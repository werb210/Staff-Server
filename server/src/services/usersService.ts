// server/src/services/usersService.ts
import bcrypt from "bcrypt";

const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

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
    prismaRemoved();
  },

  /**
   * Get a single user by ID
   */
  async get(id: string) {
    prismaRemoved();
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

    prismaRemoved();
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
    }>
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

    prismaRemoved();
  },

  /**
   * Delete a user by ID
   */
  delete(id: string) {
    prismaRemoved();
  },
};

export { usersService };
export default usersService;
