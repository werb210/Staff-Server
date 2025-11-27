import { Application, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

const handleError = (error: unknown, action: string): never => {
  if (error instanceof Error) {
    throw new Error(`${action}: ${error.message}`);
  }
  throw new Error(action);
};

export const applicationsService = {
  async list(): Promise<Application[]> {
    try {
      return await prisma.application.findMany({
        include: {
          company: true,
          user: true,
        },
      });
    } catch (error) {
      return handleError(error, "Failed to list applications");
    }
  },

  async get(id: string): Promise<Application | null> {
    try {
      return await prisma.application.findUnique({
        where: { id },
        include: {
          company: true,
          user: true,
        },
      });
    } catch (error) {
      return handleError(error, `Failed to fetch application ${id}`);
    }
  },

  async create(data: Prisma.ApplicationUncheckedCreateInput): Promise<Application> {
    try {
      return await prisma.application.create({ data });
    } catch (error) {
      return handleError(error, "Failed to create application");
    }
  },

  async update(
    id: string,
    data: Prisma.ApplicationUncheckedUpdateInput,
  ): Promise<Application> {
    try {
      return await prisma.application.update({ where: { id }, data });
    } catch (error) {
      return handleError(error, `Failed to update application ${id}`);
    }
  },

  async delete(id: string): Promise<Application> {
    try {
      return await prisma.application.delete({ where: { id } });
    } catch (error) {
      return handleError(error, `Failed to delete application ${id}`);
    }
  },
};
