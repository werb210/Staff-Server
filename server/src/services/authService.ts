// server/src/services/authService.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import usersRepo from "../db/repositories/users.repo.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";
import { ENV } from "../utils/env.js";

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

const toSafeUser = (user: any): SafeUser | null => {
  if (!user) return null;
  const profile = (user.siloAccess as any)?.profile ?? {};
  return sanitizeUser({
    id: user.id,
    email: user.email,
    firstName: profile.firstName ?? null,
    lastName: profile.lastName ?? null,
    role: profile.role ?? null,
    phone: profile.phone ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    password: undefined,
  }) as SafeUser;
};

export const authService = {
  async register(data: RegisterInput): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const created = await usersRepo.create({
      email: data.email,
      passwordHash,
      siloAccess: {
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role ?? null,
          phone: data.phone ?? null,
        },
      },
    });

    const user = toSafeUser(created);
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

    const safeUser = toSafeUser(user);
    if (!safeUser) {
      throw new Error("Unable to sanitize user");
    }

    const token = jwt.sign({ userId: user.id }, getJwtSecret(), {
      expiresIn: "7d",
    });

    return { user: safeUser, token };
  },
};
