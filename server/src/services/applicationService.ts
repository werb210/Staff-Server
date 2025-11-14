import type { Prisma, Application } from "@prisma/client";
import {
  prisma,
  requireUserSiloAccess,
  type Silo,
  type UserContext,
} from "./prisma.js";

type CreateApplicationInput = Omit<
  Prisma.ApplicationUncheckedCreateInput,
  "id" | "createdAt" | "updatedAt"
>;

type UpdateApplicationInput = Prisma.ApplicationUpdateInput;

export const applicationService = {
  async listBySilo(user: UserContext, silo: Silo): Promise<Application[]> {
    requireUserSiloAccess(user.silos, silo);

    return prisma.application.findMany({
      where: { silo },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(
    user: UserContext,
    data: CreateApplicationInput
  ): Promise<Application> {
    requireUserSiloAccess(user.silos, data.silo as Silo);

    const userId = data.userId ?? user.id;
    if (!userId) {
      throw new Error("Missing userId when creating application");
    }

    return prisma.application.create({
      data: {
        ...data,
        userId,
      },
    });
  },

  async getById(
    user: UserContext,
    silo: Silo,
    id: string
  ): Promise<Application | null> {
    const app = await prisma.application.findFirst({
      where: { id, silo },
      include: { documents: true, user: true },
    });
    if (!app) return null;

    requireUserSiloAccess(user.silos, app.silo);
    return app;
  },

  async update(
    user: UserContext,
    silo: Silo,
    id: string,
    data: UpdateApplicationInput
  ): Promise<Application | null> {
    requireUserSiloAccess(user.silos, silo);

    const existing = await prisma.application.findFirst({ where: { id, silo } });
    if (!existing) return null;

    return prisma.application.update({
      where: { id },
      data,
    });
  },

  async remove(user: UserContext, silo: Silo, id: string): Promise<boolean> {
    requireUserSiloAccess(user.silos, silo);

    const result = await prisma.application.deleteMany({
      where: { id, silo },
    });

    return result.count > 0;
  },
};
