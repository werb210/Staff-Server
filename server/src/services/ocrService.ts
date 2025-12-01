import { ocrRepo } from "../db/repositories/ocr.repo";

export const ocrService = {
  async save(applicationId: string, docId: string, data: any) {
    return ocrRepo.save(applicationId, docId, data);
  },

  async getByDocument(docId: string) {
    return ocrRepo.findByDocument(docId);
  },

  async getByApplication(applicationId: string) {
    return ocrRepo.findByApplication(applicationId);
  }
};
