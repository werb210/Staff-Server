// server/src/services/authService.ts
import type { User } from "@prisma/client";
import { prisma } from "../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sanitizeUser } from "../utils/sanitizeUser.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "insecure-default";

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  phone?: string | null;
}

export type SafeUser = Omit<User, "password">;

export const authService = {
  async register(data: RegisterInput): Promise<SafeUser> {
    const hashed = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || "staff",
        phone: data.phone || null,
      },
    });

    const safeUser = sanitizeUser(user);
    if (!safeUser) throw new Error("Failed to create user");
    return safeUser;
  },

  async login(
    email: string,
    password: string,
  ): Promise<{ user: SafeUser; token: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid credentials");

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const safeUser = sanitizeUser(user);
    if (!safeUser) throw new Error("Invalid credentials");
    return { user: safeUser, token };
  },
};
