import { prisma } from "./prisma.js";
import type { Silo, UserContext } from "./prisma.js";
import { requireUserSiloAccess } from "./prisma.js";
import type { ApplicationStage } from "@prisma/client";

export async function getApplication(user: UserContext, appId: string) {
  const app = await prisma.application.findUnique({
    where: { id: appId },
    include: { documents: true, user: true }
  });
  if (!app) return null;

  requireUserSiloAccess(user.silos, app.silo);
  return app;
}

export async function listApplicationsForSilo(user: UserContext, silo: Silo) {
  requireUserSiloAccess(user.silos, silo);

  return prisma.application.findMany({
    where: { silo },
    orderBy: { createdAt: "desc" }
  });
}

export async function updateApplicationStage(
  user: UserContext,
  appId: string,
  stage: ApplicationStage
) {
  const app = await prisma.application.findUnique({ where: { id: appId } });
  if (!app) return null;

  requireUserSiloAccess(user.silos, app.silo);

  return prisma.application.update({
    where: { id: appId },
    data: { stage }
  });
}
