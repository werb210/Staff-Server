import { db } from "./db";
import { applicationTimelineEvents, ocrResults } from "./db/schema";

export interface OcrRequest {
  applicationId: string;
  documentId: string;
  documentVersionId: string;
  blobKey: string;
  userId?: string;
}

export class OCREngine {
  async processDocument(request: OcrRequest) {
    await this.logEvent(request.applicationId, "OCR_REQUESTED", { documentVersionId: request.documentVersionId }, request.userId);

    const result = await db
      .insert(ocrResults)
      .values({
        applicationId: request.applicationId,
        documentId: request.documentId,
        documentVersionId: request.documentVersionId,
        blobKey: request.blobKey,
        extractedText: { content: "Stub OCR result" },
        status: "completed",
      })
      .returning();

    await this.logEvent(request.applicationId, "OCR_COMPLETED", { documentVersionId: request.documentVersionId }, request.userId);
    return result[0];
  }

  private async logEvent(applicationId: string, eventType: string, metadata: Record<string, any>, actorUserId?: string) {
    await db.insert(applicationTimelineEvents).values({
      applicationId,
      eventType,
      metadata,
      actorUserId: actorUserId ?? null,
      timestamp: new Date(),
    });
  }
}
