import { PrismaClient, type Application, type Silo } from "@prisma/client";

const prisma = new PrismaClient();

const normalizeSilos = (silos: readonly (Silo | string)[]): Silo[] =>
  silos.map((silo) => silo as Silo);

/* ---------------------------------------------------------
   STAGE RULES
--------------------------------------------------------- */
export async function moveApplicationToStage(
  applicationId: string,
  stage: Application["status"],
) {
  return prisma.application.update({
    where: { id: applicationId },
    data: { status: stage },
  });
}

export async function getApplicationsForSilos(silos: readonly (Silo | string)[]) {
  const allowed = normalizeSilos(silos);
  return prisma.application.findMany({
    where: { silo: { in: allowed } },
    include: {
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApplicationSafe(
  id: string,
  silos: readonly (Silo | string)[],
) {
  const allowed = normalizeSilos(silos);
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      documents: true,
    },
  });

  if (!app) return null;
  if (!allowed.includes(app.silo)) return null; // Silo guardrail

  return app;
}
