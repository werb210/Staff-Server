// server/src/services/authService.ts
import { prisma } from "../db/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const authService = {
  async register(data) {
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

    return user;
  },

  async login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid credentials");

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { user, token };
  },
};
