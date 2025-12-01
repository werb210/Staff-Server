// server/src/services/authService.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { ENV } from "../utils/env.js";

const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

const getJwtSecret = (): string => {
  if (!ENV.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return ENV.JWT_SECRET;
};

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  phone?: string | null;
}

export type SafeUser = NonNullable<ReturnType<typeof sanitizeUser>>;

export const authService = {
  async register(data: RegisterInput): Promise<SafeUser> {
    return prismaRemoved();
  },

  async login(
    email: string,
    password: string,
  ): Promise<{ user: SafeUser; token: string }> {
    return prismaRemoved();
  },
};
