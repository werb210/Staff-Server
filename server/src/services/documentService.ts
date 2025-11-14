import type { DocumentStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import type { Silo, UserContext } from "./prisma.js";
import { requireUserSiloAccess } from "./prisma.js";

type DocumentCreateData = Prisma.DocumentCreateInput & { silo: Silo };

export async function getDocument(user: UserContext, docId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { application: true }
  });
  if (!doc) return null;

  requireUserSiloAccess(user.silos, doc.silo);
  return doc;
}

export async function listDocumentsForApplication(
  user: UserContext,
  appId: string
) {
  const app = await prisma.application.findUnique({ where: { id: appId } });
  if (!app) return [];

  requireUserSiloAccess(user.silos, app.silo);

  return prisma.document.findMany({
    where: { applicationId: appId },
    orderBy: { createdAt: "desc" }
  });
}

export async function uploadDocument(user: UserContext, data: DocumentCreateData) {
  requireUserSiloAccess(user.silos, data.silo);

  return prisma.document.create({ data });
}

export async function updateDocumentStatus(
  user: UserContext,
  docId: string,
  status: DocumentStatus
) {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) return null;

  requireUserSiloAccess(user.silos, doc.silo);

  return prisma.document.update({
    where: { id: docId },
    data: { status }
  });
}
