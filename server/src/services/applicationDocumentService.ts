import { prisma } from "../db/index.js";

export const applicationDocumentService = {
  list(applicationId: string) {
    return prisma.applicationDocument.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
  },

  attach(applicationId: string, name: string, category: string, s3Key: string) {
    return prisma.applicationDocument.create({
      data: { applicationId, name, category, s3Key },
    });
  },

  updateStatus(documentId: string, status: string) {
    return prisma.applicationDocument.update({
      where: { id: documentId },
      data: { status },
    });
  },
};

export default applicationDocumentService;
