import prisma from "../db/prisma.js";
import bcrypt from "bcryptjs";

export const usersService = {
  async list() {
    return prisma.user.findMany();
  },

  async get(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async create(data: any) {
    const hashed = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone ?? null
      }
    });
  },

  async update(id: string, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return prisma.user.update({
      where: { id },
      data
    });
  },

  async remove(id: string) {
    return prisma.user.delete({ where: { id } });
  }
};

export default usersService;
