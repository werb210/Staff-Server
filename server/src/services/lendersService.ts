import { Lender, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

const handleError = (error: unknown, action: string): never => {
  if (error instanceof Error) {
    throw new Error(`${action}: ${error.message}`);
  }
  throw new Error(action);
};

export const lendersService = {
  async list(): Promise<Lender[]> {
    try {
      return await prisma.lender.findMany({ include: { products: true } });
    } catch (error) {
      handleError(error, "Failed to list lenders");
    }
  },

  async get(id: string): Promise<Lender | null> {
    try {
      return await prisma.lender.findUnique({
        where: { id },
        include: { products: true },
      });
    } catch (error) {
      handleError(error, `Failed to fetch lender ${id}`);
    }
  },

  async create(data: Prisma.LenderUncheckedCreateInput): Promise<Lender> {
    try {
      return await prisma.lender.create({ data });
    } catch (error) {
      handleError(error, "Failed to create lender");
    }
  },

  async update(id: string, data: Prisma.LenderUncheckedUpdateInput): Promise<Lender> {
    try {
      return await prisma.lender.update({ where: { id }, data });
    } catch (error) {
      handleError(error, `Failed to update lender ${id}`);
    }
  },

  async delete(id: string): Promise<Lender> {
    try {
      return await prisma.lender.delete({ where: { id } });
    } catch (error) {
      handleError(error, `Failed to delete lender ${id}`);
    }
  },
};
