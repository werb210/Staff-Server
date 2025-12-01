import { documentsRepo } from "../db/repositories/documents.repo";
import { documentVersionsRepo } from "../db/repositories/documentVersions.repo";

export const documentsService = {
  async addVersion(documentId: string, data: any) {
    return documentVersionsRepo.createVersion(documentId, data);
  },

  async versions(documentId: string) {
    return documentVersionsRepo.listVersions(documentId);
  },

  async delete(documentId: string) {
    return documentsRepo.remove(documentId);
  }
};
