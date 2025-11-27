// =============================================================================
// server/src/services/ocrExtractService.ts
// BLOCK 19 — Complete rewrite for Prisma
// =============================================================================

import db from "../db/index";

type OcrExtractPayload = {
  applicationId?: string;
  documentId?: string;
  payload?: object;
  summary?: string | null;
};

const baseSelect = {
  id: true,
  applicationId: true,
  documentId: true,
  payload: true,
  summary: true,
  createdAt: true,
};

const ocrExtractService = {
  /**
   * Fetch OCR extracts for an application (or all if applicationId not provided)
   * @param {string} [applicationId]
   */
  async list(applicationId?: string) {
    return db.ocrExtract.findMany({
      where: applicationId ? { applicationId } : undefined,
      orderBy: { createdAt: "desc" },
      select: baseSelect,
    });
  },

  /**
   * Create OCR extract record
   * @param {string} applicationId
   * @param {string} documentId
   * @param {object} data
   */
  async create(applicationId: string, documentId: string, data: OcrExtractPayload) {
    return db.ocrExtract.create({
      data: {
        applicationId,
        documentId,
        payload: data.payload ?? {},
        summary: data.summary ?? null,
      },
      select: baseSelect,
    });
  },

  /**
   * Update existing OCR extract
   * @param {string} id
   * @param {object} data
   */
  async update(id: string, data: OcrExtractPayload) {
    return db.ocrExtract.update({
      where: { id },
      data: {
        payload: data.payload ?? undefined,
        summary: data.summary ?? undefined,
      },
      select: {
        id: true,
        payload: true,
        summary: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Delete OCR extract by id
   * @param {string} id
   */
  async delete(id: string) {
    await db.ocrExtract.delete({
      where: { id },
    });

    return { deleted: true };
  },

  /**
   * Create a new OCR extract from request payload
   * @param {{ applicationId?: string; documentId?: string; payload?: object; summary?: string | null }} data
   */
  async extract(data: OcrExtractPayload) {
    const { applicationId, documentId, payload, summary } = data || {};

    if (!applicationId) {
      throw new Error("applicationId is required");
    }

    if (!documentId) {
      throw new Error("documentId is required");
    }

    return this.create(applicationId, documentId, { payload, summary });
  },

  /**
   * Fetch all OCR extracts for a specific document
   * @param {string} documentId
   */
  async getByDocument(documentId: string) {
    if (!documentId) {
      throw new Error("documentId is required");
    }

    return db.ocrExtract.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      select: baseSelect,
    });
  },

  /**
   * Delete OCR extracts by document id
   * @param {string} documentId
   */
  async remove(documentId: string) {
    if (!documentId) {
      throw new Error("documentId is required");
    }

    const result = await db.ocrExtract.deleteMany({ where: { documentId } });

    return { deleted: result.count > 0 };
  },
};

export default ocrExtractService;

// =============================================================================
// END OF FILE
// =============================================================================
