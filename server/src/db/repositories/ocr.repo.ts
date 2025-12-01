import { randomUUID } from "crypto";

type OcrRecord = {
  id: string;
  applicationId: string;
  documentId: string;
  data: any;
  createdAt: Date;
};

const records: OcrRecord[] = [];

export const ocrRepo = {
  async save(applicationId: string, documentId: string, data: any) {
    const record: OcrRecord = {
      id: randomUUID(),
      applicationId,
      documentId,
      data,
      createdAt: new Date()
    };
    records.push(record);
    return record;
  },

  async findByDocument(documentId: string) {
    return records.filter((entry) => entry.documentId === documentId);
  },

  async findByApplication(applicationId: string) {
    return records.filter((entry) => entry.applicationId === applicationId);
  }
};

export default ocrRepo;
