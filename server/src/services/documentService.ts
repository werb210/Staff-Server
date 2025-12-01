import { documentsRepo } from "../db/repositories/documents.repo";
import { documentVersionsRepo } from "../db/repositories/documentVersions.repo";

export const documentService = {
  async upload(applicationId: string, data: any) {
    const doc = await documentsRepo.create({
      ...data,
      applicationId,
      uploadedAt: new Date()
    });

    await documentVersionsRepo.createVersion(doc.id, data);

    return doc;
  },

  async get(id: string) {
    return documentsRepo.findById(id);
  },

  async list(applicationId: string) {
    return documentsRepo.listByApplication(applicationId);
  },

  async update(id: string, data: any) {
    return documentsRepo.update(id, data);
  }
};
