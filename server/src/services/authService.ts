// server/src/services/authService.ts
import type { User } from "@prisma/client";
import { prisma } from "../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "insecure-default";

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  phone?: string | null;
}

export const authService = {
  async register(data: RegisterInput): Promise<User> {
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

    return user as User;
  },

  async login(
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid credentials");

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return { user: user as User, token };
  },
};
